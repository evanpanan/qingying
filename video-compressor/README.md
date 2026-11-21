# 轻影应用开发指南

本目录是 LightVid 当前官网和 Tauri 桌面应用的共同工程。
视频下载为主功能，格式转换与压缩为辅助工具。

[项目介绍](../README.md) · [功能与架构](FEATURES.md) ·
[在线使用](https://qingying-rosy.vercel.app) · [作者 Cooper](https://x.com/Yep_Cooper)

## 功能与入口

- 首页与 `#download`：链接解析、21 平台目录、文件保存和本机下载记录。
- `#convert`：MP4、MOV、MKV、WebM、MP3，批量重新编码与音频提取。
- `#compress`：画质、分辨率设置与批量压缩。
- 共享界面：自动循环演示、悬停光影、柔和焦点、手机触控与减少动态效果支持。

源文件转换与压缩在本机执行；作品解析与媒体下载需要联网。
在线下载与转换限制 500 MB。已接入平台不保证每个作品可用，不支持付费权限或 DRM 绕过。

## 环境要求

| 场景 | 依赖 |
| --- | --- |
| Web 前端 | Node.js 22.12+、npm |
| 本地平台解析 | Python 3.10+ 与 `requirements.txt` |
| 桌面开发 | Rust stable、Tauri 系统依赖、FFmpeg 与 yt-dlp 原生引擎 |

Tauri CLI 已包含在项目开发依赖中，无需额外全局安装。
系统依赖参见 [Tauri 前置要求](https://v2.tauri.app/start/prerequisites/)。
普通用户使用官网或安装包，不需要安装 Python，也不需要填写解析 API 密钥。

下文命令除特别说明外，均在本目录执行。

## Web 开发

macOS/Linux：

```bash
npm ci
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
npm run dev
```

Windows PowerShell：

```powershell
npm ci
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:LIGHTVID_PYTHON = (Resolve-Path .\.venv\Scripts\python.exe).Path
npm run dev
```

访问 <http://localhost:1420>。本地 Vite 中间件提供 `/api/parse`、`/api/proxy`
和 `/api/extract`；后者调用 Python。需要选择其他解释器时设置 `LIGHTVID_PYTHON`。

```bash
LIGHTVID_PYTHON=/path/to/python3 npm run dev
```

`npm run preview` 仅预览静态构建，不挂载本地解析函数，
不能替代完整的下载功能开发服务器。

## Logo 与网站图标

`public/lightvid.svg` 是唯一 Logo 源文件，导航直接引用其中的 `brand-mark`。
更改 Logo 后运行：

```bash
npm run icons:generate
```

该命令同步生成默认 favicon、各尺寸 PNG/ICO、Apple Touch 图标、
Safari 固定标签图标、主屏幕图标，以及 Tauri 的 ICNS/ICO 和各平台打包资源。
`site.webmanifest` 声明应用名称与安装图标；页面显式引用
`apple-touch-icon-v2.png`，避免继续选择旧图标缓存。
后续更换品牌时应同步更新图标版本路径或查询参数。

Safari 已添加到程序坞的 Web App 会保存自己的图标，网站更新不保证自动替换；
确认新版已部署后，可移除旧快捷方式，再从 Safari 重新添加。
图标生成不会改写已发布的原生 DMG，需要重新打包才能更新安装包内的图标。

## 桌面引擎

`src-tauri/binaries/` 被 Git 忽略，干净克隆后需要创建目录并准备两个引擎。
Tauri 按当前目标平台寻找对应文件，不能仅准备 FFmpeg。

| 目标 | FFmpeg 文件名 | yt-dlp 文件名 |
| --- | --- | --- |
| macOS Apple Silicon | `ffmpeg-aarch64-apple-darwin` | `yt-dlp-aarch64-apple-darwin` |
| macOS Intel | `ffmpeg-x86_64-apple-darwin` | `yt-dlp-x86_64-apple-darwin` |
| Windows x64 | `ffmpeg-x86_64-pc-windows-msvc.exe` | `yt-dlp-x86_64-pc-windows-msvc.exe` |

FFmpeg 可从 [FFmpeg 下载页](https://ffmpeg.org/download.html)选择可信的平台构建；
Windows 工作流使用 [Gyan essentials](https://www.gyan.dev/ffmpeg/builds/)。
构建需包含 `libx264`、AAC、`libvpx`、`libopus`、`libmp3lame`，
对应当前五种转换格式。yt-dlp 可使用[官方独立发行版](https://github.com/yt-dlp/yt-dlp/releases)。
macOS 上给两个引擎设置可执行权限。

当前 Apple Silicon 包使用 PyInstaller 打包独立 yt-dlp 与 Python 运行时。
可在 Apple Silicon Mac 的虚拟环境中生成：

```bash
mkdir -p src-tauri/binaries
python3 -m pip install -r requirements.txt pyinstaller
python3 -m PyInstaller --onefile --collect-all yt_dlp --collect-all yt_dlp_ejs \
  --name yt-dlp-aarch64-apple-darwin --distpath src-tauri/binaries \
  --workpath /tmp/lightvid-engine-build --specpath /tmp scripts/ytdlp_entry.py
chmod +x src-tauri/binaries/ffmpeg-aarch64-apple-darwin \
  src-tauri/binaries/yt-dlp-aarch64-apple-darwin
```

该命令不负责下载 FFmpeg；请先准备表中对应文件。
Intel Mac 的引擎必须在匹配架构的环境中准备，现有 ARM 包不能直接用于 Intel。

## 运行与构建

准备引擎后启动桌面开发：

```bash
npm run tauri:dev
```

构建 Web 和 macOS 应用：

```bash
npm run build
npm run tauri:build -- --bundles app
```

应用输出至 `src-tauri/target/release/bundle/macos/轻影.app`。
需要 DMG 时使用 `--bundles dmg`；正式分发前还需完成适当的签名、打包和校验，
不能将编译成功等同于已通过 Apple 公证。

Windows x64 在对应系统上构建：

```powershell
npm run tauri:build -- --bundles nsis,msi
```

仓库根目录的 [Windows 工作流](../.github/workflows/desktop-windows.yml)
会准备引擎、运行 Node 测试并上传 NSIS/MSI 产物。
当前未确认其构建成功与安装包发布，不应宣传为已发布 Windows 版。

## 回归检查

```bash
npm test
npm run lint
npm run build
npm run test:extract
```

Python 测试需要已安装 `requirements.txt`。Windows 可使用
`python -m unittest discover -s tests -p "test_*.py"`。
准备好原生引擎后，在 `src-tauri/` 内运行 `cargo test` 检查 Rust 测试。

UI 回归应覆盖默认自动播放、悬停、离开后恢复、暂停/继续、键盘焦点、
平台搜索、作者链接、手机触控与减少动态效果。
交互演示中的文件大小不是实际任务进度。

## Vercel 部署

- 项目 Root Directory：`video-compressor`，不是仓库根目录或历史 `website/`。
- 构建命令：`npm run build`；静态输出目录：`dist`。
- 同时保留 `api/*.ts`、`api/extract.py`、`requirements.txt` 和 `vercel.json`。
- `requirements.txt` 位于应用根目录，供 Python Function 安装解析依赖。
- 不要仅上传静态 `dist/`：这种方式无法运行完整的下载后端。
- 解析依赖第三方中转、yt-dlp 和平台访问条件，部署成功不代表所有作品都可下载。

## 发布与限制

现有 [macOS 1.1.0 DMG](public/downloads/轻影_1.1.0_aarch64.dmg)
包含 FFmpeg 与独立 yt-dlp，适用于 Apple Silicon，使用临时签名、未 Apple 公证。
它早于后续 UI 打磨，更新源码不会自动改写已打包的 DMG。
当前未发布 Intel Mac 包，也未确认 Windows 包发布。

下载引擎可能需要随平台规则更新。桌面包尚未内置额外 JavaScript runtime，
部分 YouTube 挑战仍可能失败；登录、地区、风控和 DRM 限制不会被自动绕过。

## 代码索引

| 路径 | 职责 |
| --- | --- |
| `src/pages/Landing.tsx` | 当前首页、平台列表、作者页脚 |
| `src/components/ExperienceGallery.tsx` | 自动演示与悬停、触控生命周期 |
| `src/components/DownloadTool.tsx` | 下载交互、结果与记录 |
| `src/pages/Convert.tsx` | 批量格式转换 |
| `src/lib/media.ts` | 平台目录、格式配置与结果类型 |
| `src/lib/ffmpeg.wasm.ts` | 浏览器串行编码队列 |
| `api/` | 在线解析和媒体代理 |
| `src-tauri/src/main.rs` | 原生下载、转换、压缩与进度事件 |

旧 `Home.tsx`、`Download.tsx` 和仓库 `website/` 不是当前首页入口。
第三方引擎、GPL 分发要求和 LibreGet 参考范围见 [FEATURES.md](FEATURES.md#第三方)。
