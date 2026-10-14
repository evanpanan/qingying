// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{Emitter, Manager};

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
            return Err(format!("不支持的平台: {a}-{o}。请在 macOS 或 Windows 上使用。"));
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
            .and_then(|d| d.parent().map(|p| p.join("binaries").join(&dev_sidecar_name)))
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

    if let Some(width) = settings.resolution.width() {
        args.push("-vf".to_string());
        args.push(format!("scale={width}:-2"));
    }

    args.push(output_path.clone());

    // Probe duration first so we can compute progress percentage.
    let duration = probe_duration(&ffmpeg, &input_path).unwrap_or(0.0);

    // Spawn ffmpeg.
    let mut child = Command::new(&ffmpeg)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("启动 FFmpeg 失败: {e}"))?;

    let stdout = child
        .stdout
        .take()
        .ok_or("无法获取 FFmpeg 输出")?;

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

/// Probe the duration of a video file in seconds using ffmpeg.
///
/// Runs `ffmpeg -i input` (with no output) and parses the
/// `Duration: HH:MM:SS.xx` line from stderr.
fn probe_duration(ffmpeg: &PathBuf, input: &str) -> Option<f64> {
    let output = Command::new(ffmpeg)
        .args(["-i", input])
        .output()
        .ok()?;

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
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![compress_video, reveal_in_finder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}
