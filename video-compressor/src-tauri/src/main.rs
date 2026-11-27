// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(test)]
mod updater_tests;
mod repair;
mod library;
mod update_location;

use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{Emitter, Manager};

fn media_command(path: impl AsRef<std::ffi::OsStr>) -> Command {
    let mut command = Command::new(path);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    #[cfg(not(target_os = "windows"))]
    let _ = &mut command;
    command
}

/// Compression quality presets mapped to x264 CRF values.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum QualityPreset {
    Lossless,
    High,
    Standard,
    HighCompress,
}

impl QualityPreset {
    fn crf(&self) -> u8 {
        match self {
            QualityPreset::Lossless => 18,
            QualityPreset::High => 22,
            QualityPreset::Standard => 26,
            QualityPreset::HighCompress => 32,
        }
    }
}

/// Output resolution options.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ResolutionPreset {
    Original,
    #[serde(rename = "1080p")]
    P1080,
    #[serde(rename = "720p")]
    P720,
    #[serde(rename = "480p")]
    P480,
}

impl ResolutionPreset {
    fn width(&self) -> Option<u32> {
        match self {
            ResolutionPreset::Original => None,
            ResolutionPreset::P1080 => Some(1920),
            ResolutionPreset::P720 => Some(1280),
            ResolutionPreset::P480 => Some(854),
        }
    }
}

/// Settings passed from the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionSettings {
    pub quality: QualityPreset,
    pub resolution: ResolutionPreset,
    #[serde(default)]
    pub format: Option<String>,
}

/// Result returned after compression.
#[derive(Debug, Serialize)]
pub struct CompressionResult {
    pub output_path: String,
    pub original_size: u64,
    pub compressed_size: u64,
}

/// Progress payload emitted to the frontend.
#[derive(Debug, Serialize, Clone)]
struct ProgressPayload {
    task_id: String,
    progress: u8,
}

/// Resolve the ffmpeg binary path.
///
/// In production, the sidecar binary (named `ffmpeg`) bundled by Tauri is used.
/// In development, the sidecar at `src-tauri/binaries/ffmpeg-<target-triple>`
/// is used, falling back to a system-installed ffmpeg.
fn resolve_ffmpeg_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    // Sidecar binary name: ffmpeg.exe on Windows, ffmpeg elsewhere.
    #[cfg(target_os = "windows")]
    let sidecar_name = "ffmpeg.exe";
    #[cfg(not(target_os = "windows"))]
    let sidecar_name = "ffmpeg";

    // Build the dev sidecar name with target triple, e.g. ffmpeg-aarch64-apple-darwin.
    let arch = std::env::consts::ARCH;
    let os = std::env::consts::OS;
    let target_triple = match (arch, os) {
        ("aarch64", "macos") => "aarch64-apple-darwin",
        ("x86_64", "macos") => "x86_64-apple-darwin",
        ("x86_64", "windows") => "x86_64-pc-windows-msvc",
        ("x86", "windows") => "i686-pc-windows-msvc",
        (a, o) => {
            return Err(format!(
                "不支持的平台: {a}-{o}。请在 macOS 或 Windows 上使用。"
            ));
        }
    };
    let dev_sidecar_name = format!("ffmpeg-{target_triple}");

    let candidates: Vec<PathBuf> = vec![
        // Production: sidecar sits next to the executable.
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join(sidecar_name)))
            .unwrap_or_default(),
        // macOS .app / Windows bundle: sidecar in Resources.
        app.path()
            .resource_dir()
            .map(|d| d.join(sidecar_name))
            .unwrap_or_default(),
        // Development: src-tauri/binaries/ffmpeg-<target-triple>.
        app.path()
            .resource_dir()
            .ok()
            .and_then(|d| {
                d.parent()
                    .map(|p| p.join("binaries").join(&dev_sidecar_name))
            })
            .unwrap_or_default(),
    ];

    for candidate in candidates {
        if !candidate.as_os_str().is_empty() && candidate.exists() {
            return Ok(candidate);
        }
    }

    // Fallback to system ffmpeg.
    if let Ok(path) = which::which("ffmpeg") {
        return Ok(path);
    }
    Err("未找到 FFmpeg。请安装 FFmpeg 或重新安装应用。".to_string())
}

/// Compress a single video file.
///
/// Runs ffmpeg as a child process, parses its stderr for progress,
/// and emits `compress-progress` events to the frontend.
#[tauri::command]
async fn compress_video(
    app: tauri::AppHandle,
    task_id: String,
    input_path: String,
    output_path: String,
    settings: CompressionSettings,
) -> Result<CompressionResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        process_video(app, task_id, input_path, output_path, settings)
    })
    .await
    .map_err(|e| e.to_string())?
}

fn process_video(
    app: tauri::AppHandle,
    task_id: String,
    input_path: String,
    output_path: String,
    settings: CompressionSettings,
) -> Result<CompressionResult, String> {
    let ffmpeg = resolve_ffmpeg_path(&app)?;

    let original_size = std::fs::metadata(&input_path)
        .map_err(|e| format!("无法读取输入文件: {e}"))?
        .len();

    // Build ffmpeg arguments.
    let mut args: Vec<String> = vec![
        "-y".to_string(),
        "-i".to_string(),
        input_path.clone(),
        "-vcodec".to_string(),
        "libx264".to_string(),
        "-crf".to_string(),
        settings.quality.crf().to_string(),
        "-preset".to_string(),
        "medium".to_string(),
        "-acodec".to_string(),
        "aac".to_string(),
        "-b:a".to_string(),
        "128k".to_string(),
        "-movflags".to_string(),
        "+faststart".to_string(),
        "-progress".to_string(),
        "pipe:1".to_string(),
        "-nostats".to_string(),
    ];

    if let Some(format) = &settings.format {
        let codec_args: Vec<&str> = match format.as_str() {
            "mp4" | "mov" => vec![
                "-c:v",
                "libx264",
                "-crf",
                "22",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-movflags",
                "+faststart",
            ],
            "mkv" => vec!["-c:v", "libx264", "-crf", "22", "-c:a", "aac"],
            "webm" => vec!["-c:v", "libvpx", "-b:v", "1800k", "-c:a", "libopus"],
            "mp3" => vec!["-vn", "-c:a", "libmp3lame", "-b:a", "192k"],
            _ => return Err("不支持的输出格式".into()),
        };
        args = vec!["-n".into(), "-i".into(), input_path.clone()];
        args.extend(codec_args.into_iter().map(String::from));
        args.extend(["-progress".into(), "pipe:1".into(), "-nostats".into()]);
    }

    if let Some(width) = settings.resolution.width() {
        args.push("-vf".to_string());
        args.push(format!("scale={width}:-2"));
    }

    args.push(output_path.clone());

    // Probe duration first so we can compute progress percentage.
    let duration = probe_duration(&ffmpeg, &input_path).unwrap_or(0.0);

    // Spawn ffmpeg.
    let mut child = media_command(&ffmpeg)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("启动 FFmpeg 失败: {e}"))?;

    let stdout = child.stdout.take().ok_or("无法获取 FFmpeg 输出")?;

    let app_clone = app.clone();
    let task_id_clone = task_id.clone();

    // Parse progress lines in a blocking thread.
    let reader_handle = std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        let mut out_time_ms: f64 = 0.0;
        for line in reader.lines().map_while(Result::ok) {
            if let Some(val) = line.strip_prefix("out_time_ms=") {
                if let Ok(ms) = val.parse::<f64>() {
                    out_time_ms = ms;
                }
            }
            if line == "progress=end" {
                let _ = app_clone.emit(
                    "compress-progress",
                    ProgressPayload {
                        task_id: task_id_clone.clone(),
                        progress: 100,
                    },
                );
                break;
            }
            // Emit progress after reading out_time_ms.
            if duration > 0.0 && out_time_ms > 0.0 {
                let pct = ((out_time_ms / 1_000_000.0) / duration * 100.0).min(99.0) as u8;
                let _ = app_clone.emit(
                    "compress-progress",
                    ProgressPayload {
                        task_id: task_id_clone.clone(),
                        progress: pct,
                    },
                );
            }
        }
    });

    let status = child
        .wait()
        .map_err(|e| format!("等待 FFmpeg 完成失败: {e}"))?;

    reader_handle
        .join()
        .map_err(|_| "进度读取线程异常退出".to_string())?;

    if !status.success() {
        return Err(format!("FFmpeg 压缩失败 (退出码: {:?})", status.code()));
    }

    let compressed_size = std::fs::metadata(&output_path)
        .map_err(|e| format!("无法读取输出文件: {e}"))?
        .len();

    Ok(CompressionResult {
        output_path,
        original_size,
        compressed_size,
    })
}

#[tauri::command]
async fn convert_video(
    app: tauri::AppHandle,
    task_id: String,
    input_path: String,
    format: String,
) -> Result<CompressionResult, String> {
    if !["mp4", "mov", "mkv", "webm", "mp3"].contains(&format.as_str()) {
        return Err("不支持的输出格式".into());
    }
    let input = PathBuf::from(&input_path);
    let stem = input.file_stem().ok_or("文件名不正确")?.to_string_lossy();
    let parent = input.parent().ok_or("文件目录不正确")?;
    let mut output = parent.join(format!("{stem}_converted.{format}"));
    let mut counter = 1;
    while output.exists() {
        output = parent.join(format!("{stem}_converted_{counter}.{format}"));
        counter += 1;
    }
    compress_video(
        app,
        task_id,
        input_path,
        output.to_string_lossy().to_string(),
        CompressionSettings {
            quality: QualityPreset::High,
            resolution: ResolutionPreset::Original,
            format: Some(format),
        },
    )
    .await
}

fn downloader_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let name = if cfg!(target_os = "windows") {
        "yt-dlp.exe"
    } else {
        "yt-dlp"
    };
    let adjacent = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.join(name)));
    if let Some(path) = adjacent.filter(|p| p.exists()) {
        return Ok(path);
    }
    if let Ok(dir) = app.path().resource_dir() {
        let path = dir.join(name);
        if path.exists() {
            return Ok(path);
        }
    }
    Err("自有下载引擎缺失，请重新安装最新版轻影".into())
}

fn validate_share_url(url: &str) -> Result<(), String> {
    let parsed = tauri::Url::parse(url).map_err(|_| "链接格式不正确")?;
    let host = parsed.host_str().unwrap_or("").trim_end_matches('.').to_lowercase();
    if parsed.scheme() != "https"
        || !parsed.username().is_empty()
        || parsed.password().is_some()
        || parsed.port().is_some_and(|port| port != 443)
        || !host.contains('.')
        || host.parse::<std::net::IpAddr>().is_ok()
        || host.ends_with(".localhost")
        || host.ends_with(".local")
        || host.ends_with(".internal")
    {
        return Err("请使用公开网站的 HTTPS 作品链接".into());
    }
    Ok(())
}

fn javascript_runtime(engine: &std::path::Path) -> Result<String, String> {
    let name = if cfg!(target_os = "windows") { "node.exe" } else { "node" };
    let runtime = engine.parent().ok_or("下载引擎目录异常")?.join(name);
    if !runtime.exists() {
        return Err("内置 JavaScript 引擎缺失，请安装最新版轻影".into());
    }
    Ok(format!("node:{}", runtime.to_string_lossy()))
}

#[tauri::command]
async fn native_engine_info(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let output = media_command(downloader_path(&app)?)
            .arg("--lightvid-info")
            .output()
            .map_err(|e| format!("启动下载引擎失败：{e}"))?;
        if !output.status.success() {
            return Err("请安装包含自有引擎的最新版轻影".into());
        }
        serde_json::from_slice(&output.stdout).map_err(|_| "引擎信息返回异常".into())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn native_extract(app: tauri::AppHandle, url: String) -> Result<serde_json::Value, String> {
    validate_share_url(&url)?;
    tauri::async_runtime::spawn_blocking(move || {
        let engine = downloader_path(&app)?;
        let runtime = javascript_runtime(&engine)?;
        let output = media_command(engine)
            .args([
                "--ignore-config",
                "--js-runtimes",
                &runtime,
                "--dump-single-json",
                "--skip-download",
                "--no-playlist",
                "--playlist-items",
                "1",
                "--no-warnings",
                "--socket-timeout",
                "12",
                "--retries",
                "1",
                "--extractor-retries",
                "1",
                "--",
                &url,
            ])
            .output()
            .map_err(|e| format!("启动下载引擎失败：{e}"))?;
        if !output.status.success() {
            return Err("平台暂时拒绝访问，请使用公开作品链接重试".into());
        }
        serde_json::from_slice(&output.stdout).map_err(|_| "下载引擎返回异常".into())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn native_download(
    app: tauri::AppHandle,
    url: String,
    task_id: String,
) -> Result<String, String> {
    validate_share_url(&url)?;
    if !task_id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err("任务编号不正确".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let directory = app
            .path()
            .download_dir()
            .map_err(|e| e.to_string())?
            .join("轻影");
        std::fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
        let ffmpeg = resolve_ffmpeg_path(&app)?;
        let template = directory
            .join(format!("{task_id}-%(title).80B.%(ext)s"))
            .to_string_lossy()
            .to_string();
        let engine = downloader_path(&app)?;
        let runtime = javascript_runtime(&engine)?;
        let mut child = media_command(engine)
            .args([
                "--ignore-config",
                "--js-runtimes",
                &runtime,
                "--no-playlist",
                "--playlist-items",
                "1",
                "--no-warnings",
                "--no-overwrites",
                "--no-simulate",
                "--newline",
                "--socket-timeout",
                "15",
                "--retries",
                "1",
                "--extractor-retries",
                "1",
                "--ffmpeg-location",
                &ffmpeg.to_string_lossy(),
                "-f",
                "bv*[height<=1080]+ba/b[height<=1080]/b/ba",
                "--merge-output-format",
                "mp4",
                "--progress-template",
                "download:LIGHTVID_PROGRESS:%(progress._percent_str)s",
                "--print",
                "after_move:LIGHTVID_FILE:%(filepath)s",
                "-o",
                &template,
                "--",
                &url,
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("启动下载失败：{e}"))?;
        let stdout = child.stdout.take().ok_or("无法读取下载进度")?;
        let mut path = None;
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            if let Some(value) = line.strip_prefix("LIGHTVID_PROGRESS:") {
                if let Ok(value) = value.trim().trim_end_matches('%').parse::<f64>() {
                    let _ = app.emit(
                        "download-progress",
                        ProgressPayload {
                            task_id: task_id.clone(),
                            progress: value.min(99.0) as u8,
                        },
                    );
                }
            }
            if let Some(value) = line.strip_prefix("LIGHTVID_FILE:") {
                path = Some(value.to_string());
            }
        }
        let status = child.wait().map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("下载失败，可能受到平台登录或访问限制，请换一条公开链接重试".into());
        }
        let path = path.ok_or("未生成下载文件")?;
        let _ = app.emit(
            "download-progress",
            ProgressPayload {
                task_id,
                progress: 100,
            },
        );
        Ok(path)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Probe the duration of a video file in seconds using ffmpeg.
///
/// Runs `ffmpeg -i input` (with no output) and parses the
/// `Duration: HH:MM:SS.xx` line from stderr.
fn probe_duration(ffmpeg: &PathBuf, input: &str) -> Option<f64> {
    let output = media_command(ffmpeg).args(["-i", input]).output().ok()?;

    // ffmpeg prints file info to stderr even on "error" (no output specified).
    let stderr = String::from_utf8_lossy(&output.stderr);
    for line in stderr.lines() {
        let line = line.trim();
        if let Some(rest) = line.strip_prefix("Duration:") {
            let rest = rest.trim();
            // Format: HH:MM:SS.xx, start: ..., bitrate: ...
            let time_part = rest.split(',').next()?.trim();
            let parts: Vec<&str> = time_part.split(':').collect();
            if parts.len() == 3 {
                let hours = parts[0].parse::<f64>().ok()?;
                let minutes = parts[1].parse::<f64>().ok()?;
                let seconds = parts[2].parse::<f64>().ok()?;
                return Some(hours * 3600.0 + minutes * 60.0 + seconds);
            }
        }
    }
    None
}

/// Reveal a file in the system file manager (Finder on macOS, Explorer on Windows).
#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-R", &path])
            .output()
            .map_err(|e| format!("无法打开访达: {e}"))?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &path])
            .output()
            .map_err(|e| format!("无法打开资源管理器: {e}"))?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(repair::Jobs::default())
        .manage(repair::DroppedFiles::default())
        .on_window_event(|window,event| {
            if let tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Drop{paths,..})=event {
                let state=window.state::<repair::DroppedFiles>();if let Ok(mut allowed)=state.0.lock(){allowed.clear();allowed.extend(paths.iter().filter_map(|p|p.canonicalize().ok()));};
            }
        })
        .setup(|app| {
            // Only per-process temporary repair copies; saved originals/results are elsewhere.
            library::migrate_legacy(app.handle());
            Ok(())
        })
        .menu(|app| {
            use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
            // Retain standard macOS application, Edit and Window menus.
            let menu = Menu::default(app)?;
            let tools = Submenu::with_items(app, "工具", true, &[
                &MenuItem::with_id(app, "download", "视频下载", true, Some("CmdOrCtrl+1"))?,
                &MenuItem::with_id(app, "cleanup", "画面修复", true, Some("CmdOrCtrl+2"))?,
                &MenuItem::with_id(app, "convert", "格式转换", true, Some("CmdOrCtrl+3"))?,
                &MenuItem::with_id(app, "compress", "视频压缩", true, Some("CmdOrCtrl+4"))?,
                &PredefinedMenuItem::separator(app)?,
            ])?;
            menu.append(&tools)?;
            #[cfg(target_os="macos")]
            if let Some(tauri::menu::MenuItemKind::Submenu(app_menu)) = menu.items()?.first() {
                app_menu.insert(&MenuItem::with_id(app, "check-update", "检查更新…", true, None::<&str>)?, 1)?;
            }
            #[cfg(not(target_os="macos"))]
            tools.append(&MenuItem::with_id(app, "check-update", "检查更新…", true, None::<&str>)?)?;
            Ok(menu)
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            if id == "check-update" { let _ = app.emit("desktop:check-update", ()); }
            if matches!(id, "download" | "convert" | "compress" | "cleanup") {
                let _ = app.emit("desktop:navigate", id);
            }
        })
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            update_location::update_location, update_location::update_open_applications,
            library::library_list, library::library_action, library::library_save,
            repair::repair_import, repair::repair_begin, repair::repair_upload, repair::repair_run, repair::repair_cancel, repair::repair_preview, repair::repair_save, repair::repair_discard,
            compress_video,
            convert_video,
            native_extract,
            native_engine_info,
            native_download,
            reveal_in_finder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}

#[cfg(test)]
mod tests {
    use super::validate_share_url;

    #[test]
    fn accepts_public_sites_beyond_featured_list() {
        for url in [
            "https://youtu.be/video",
            "https://www.instagram.com/reel/123",
            "https://www.bilibili.com/video/BV1",
            "https://www.ted.com/talks/test",
            "https://v.douyin.com/test/",
            "https://www.arte.tv/video",
            "https://video.example.org/watch",
            "https://youtube.com.attacker.example/file",
        ] {
            assert!(validate_share_url(url).is_ok());
        }
    }

    #[test]
    fn rejects_local_and_unsafe_urls() {
        for url in [
            "https://localhost/file",
            "https://127.0.0.1/file",
            "https://host.local/file",
            "https://host.internal/file",
            "http://youtube.com/file",
            "https://youtube.com:8000/file",
            "https://user:password@youtube.com/file",
        ] {
            assert!(validate_share_url(url).is_err());
        }
    }
}

