# 轻影应用开发指南

本目录是 LightVid 当前官网和 Tauri 桌面应用的共同工程。
视频下载为主功能，格式转换与压缩为辅助工具。

[项目介绍](../README.md) · [功能与架构](FEATURES.md) ·
[在线使用](https://qingying-rosy.vercel.app) · [作者 Cooper](https://x.com/Yep_Cooper)

## 功能与入口

- 首页与 `#download`：自有全量解析引擎、常用平台示例、文件保存和本机下载记录。
- `#convert`：MP4、MOV、MKV、WebM、MP3，批量重新编码与音频提取。
- `#compress`：画质、分辨率设置与批量压缩。
- 共享界面：自动循环演示、悬停光影、柔和焦点、手机触控与减少动态效果支持。
- 首屏：链接流向文件的循环动效；向右的引导按钮聚焦并轻亮链接框，
  已在视野中的输入框不会被额外滚动，也不会清空内容或自动发起下载。
- 平台区：Embla Auto Scroll 展示 8 个代表平台，桌面两排、每排四张，
  上排向左、下排向右连续流动；支持拖动，悬停或键盘聚焦时暂时停止。
  搜索仍查询完整推荐目录，最多显示前 8 项，不影响下载支持范围。
- 首屏、平台区和互动演示自动运行，不提供装饰性的播放/暂停按钮；
  离屏、隐藏标签和系统减少动态效果时停止动画。
- 页脚点击爱心变红、弹出小礼花和“感谢您的喜欢”气泡，本机记住喜欢状态；
  作者头像绿点缓慢呼吸，仅为装饰，不代表实时在线。

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

## 多任务下载

网页下载中可继续粘贴其他链接、解析并选择格式保存，不再锁住整个工具。
独立队列同时运行2个下载，其余自动等待；任务分别保留原始标题、链接、媒体类型与进度，
支持网页任务取消、失败重试和清理已结束任务。切换工具不打断下载；
刷新或关闭页面会中断未完成队列，任务不跨刷新恢复。
共享桌面源码也使用独立任务ID和进度监听；原生下载运行中不提供取消按钮。
本轮仅更新网页与共享源码，不修改现有DMG或桌面版本号。

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

访问 <http://localhost:1420>。本地 Vite 中间件提供 `/api/extract`、`/api/proxy`
和旧入口 `/api/parse`；解析调用 Python。需要选择其他解释器时设置 `LIGHTVID_PYTHON`。

```bash
LIGHTVID_PYTHON=/path/to/python3 npm run dev
```

`GET /api/extract` 返回运行中的引擎版本、解析器数量和 Generic 探测能力。
`POST /api/extract` 使用轻影自己的引擎直接解析；旧 `/api/parse` 以 307 重定向到它。
推荐平台目录不作为白名单；移除了第三方解析和 X 的 fxtwitter 回退。

`lightvid_engine.py` 在提取器请求、子请求和重定向中限制公开 HTTP(S)，
仅使用 IPv4 DNS，验证全部返回地址，并通过固定 IP 连接防止校验后重新解析。
保留 TLS 域名验证，不使用系统代理或不受限的备用传输。
在线解析有请求数量与时长预算，只有直接媒体可在浏览器保存；
分离音视频与分片流需要桌面引擎处理。没有绕过 DRM、登录或付费限制。
抖音网页接口启用签名风控后由 `lightvid_douyin.py` 单独解析公开作品
（视频多档画质与图集原图），仍不使用任何第三方解析站；桌面版原生解析未改动。

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
Git 推送会触发 Vercel 网站部署，但 Vercel 控制台的 Project Avatar 单独保存，
不随网站 favicon 或部署自动更新。

## 桌面引擎

`src-tauri/binaries/` 被 Git 忽略，干净克隆后需要创建目录并准备三个引擎。
Tauri 按当前目标平台寻找 FFmpeg、yt-dlp 与 Node.js，不能仅准备 FFmpeg。

| 目标 | FFmpeg 文件名 | yt-dlp 文件名 |
| --- | --- | --- |
| macOS Apple Silicon | `ffmpeg-aarch64-apple-darwin` | `yt-dlp-aarch64-apple-darwin` |
| macOS Intel | `ffmpeg-x86_64-apple-darwin` | `yt-dlp-x86_64-apple-darwin` |
| Windows x64 | `ffmpeg-x86_64-pc-windows-msvc.exe` | `yt-dlp-x86_64-pc-windows-msvc.exe` |

FFmpeg 可从 [FFmpeg 下载页](https://ffmpeg.org/download.html)选择可信的平台构建；
Windows 工作流使用 [Gyan essentials](https://www.gyan.dev/ffmpeg/builds/)。
构建需包含 `libx264`、AAC、`libvpx`、`libopus`、`libmp3lame`，
对应当前五种转换格式。yt-dlp 必须从 `scripts/ytdlp_entry.py` 打包，
以包含轻影的网络传输和能力查询，不能直接替换为官方独立发行版。
另需 `node-<target-triple>`（Windows 带 `.exe`）与对应 `NODE_LICENSE`。
macOS 上给三个引擎设置可执行权限。

当前 Apple Silicon 包使用 PyInstaller 打包独立 yt-dlp 与 Python 运行时。
可在 Apple Silicon Mac 的虚拟环境中生成：

```bash
mkdir -p src-tauri/binaries
python3 -m pip install -r requirements.txt pyinstaller
python3 -m PyInstaller --onefile --paths . --collect-all yt_dlp --collect-all yt_dlp_ejs \
  --name yt-dlp-aarch64-apple-darwin --distpath src-tauri/binaries \
  --workpath /tmp/lightvid-engine-build --specpath /tmp scripts/ytdlp_entry.py
cp /tmp/node-v25.8.0-darwin-arm64/bin/node src-tauri/binaries/node-aarch64-apple-darwin
chmod +x src-tauri/binaries/ffmpeg-aarch64-apple-darwin \
  src-tauri/binaries/yt-dlp-aarch64-apple-darwin \
  src-tauri/binaries/node-aarch64-apple-darwin
```

该命令不负责下载 FFmpeg 和 Node；请先准备表中对应文件，
并从 Node.js 官方下载、校验和解压匹配架构的独立发行版到上述目录。
不要复制 Homebrew Node，它可能依赖目标电脑上不存在的 Homebrew 动态库。
在线媒体透传每次最长约 280 秒；支持 Range 的来源按 256 KB 分段保存，
校验完整长度与资源版本。极慢源或大文件建议使用桌面版本。
分发时同步 `NODE_LICENSE` 到所用 Node.js 版本的完整许可证声明。
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
发布经过临时签名和完整性校验的 DMG：

```bash
npm run release:macos
```

脚本先构建 App，再签名原生引擎和包资源、严格校验，最后创建并校验
`https://github.com/evanpanan/qingying/releases/download/v1.4.0/_1.4.0_aarch64.dmg`。这不是 Apple 开发者签名或公证。
桌面运行检测使用 Tauri 2 官方接口，不依赖 `withGlobalTauri`；
粘贴按钮使用原生剪贴板，转换/压缩支持原生文件拖放，仅当前可见工具接收文件；
作者与源码链接通过系统浏览器打开。网页与桌面共用品牌样式和媒体处理组件；桌面使用独立工作台，默认进入下载，提供侧边栏、系统工具菜单与快捷键。

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

UI 回归应覆盖默认自动播放、两排反向流动、悬停、离开后恢复、键盘焦点、
平台搜索、作者链接、手机触控与减少动态效果。页脚粒子文字应验证自动变换、
鼠标避让、点击和键盘散开、离屏暂停及减少动画偏好动态切换。
交互演示中的文件大小不是实际任务进度。

## Vercel 部署

- 项目 Root Directory：`video-compressor`，不是仓库根目录或历史 `website/`。
- 构建命令：`npm run build`；静态输出目录：`dist`。
- 同时保留 `api/*.ts`、`api/extract.py`、`lightvid_engine.py`、`requirements.txt` 和 `vercel.json`。
- `requirements.txt` 位于应用根目录，供 Python Function 安装解析依赖。
- Python 函数不会自动剔除项目资源。`vercel.json` 用 `excludeFiles` 排除
  `public/`、`dist/`、`src/`、`src-tauri/`、`node_modules/` 和开发测试目录，
  避免安装包进入函数导致 `LAMBDA_SIZE_EXCEEDED`；保留 `lightvid_engine.py`
  和运行依赖。此设置只影响函数打包，官网安装包仍由静态托管提供。
- 不要仅上传静态 `dist/`：这种方式无法运行完整的下载后端。
- 解析由轻影部署的 yt-dlp 自行运行，不依赖第三方解析 API；平台访问条件仍影响成功率。

## 发布与限制

新版 [macOS 1.4.0 DMG](https://github.com/evanpanan/qingying/releases/download/v1.4.0/_1.4.0_aarch64.dmg)
包含 FFmpeg、自有 yt-dlp 与 Node.js，适用于 Apple Silicon，使用临时签名、未 Apple 公证。
同步了新版 Logo、自动动效、粒子页脚和广覆盖解析。历史包不会随源码自动更新。
当前未发布 Intel Mac 包，也未确认 Windows 包发布。

下载引擎可能需要随平台规则更新。即使内置 JavaScript runtime，
部分 YouTube 挑战仍可能失败；登录、地区、风控和 DRM 限制不会被自动绕过。

## 代码索引

| 路径 | 职责 |
| --- | --- |
| `src/pages/Landing.tsx` | 当前首页、平台列表、作者页脚 |
| `src/components/ExperienceGallery.tsx` | 自动演示与悬停、触控生命周期 |
| `src/components/DownloadTool.tsx` | 下载交互、结果与记录 |
| `src/components/ParticleWordmark.tsx` | Dissolve 风格粒子页脚 |
| `lightvid_engine.py` | 在线与桌面共用的自有解析网络传输 |
| `lightvid_douyin.py` | 抖音自有解析（公开作品接口、多档画质与图集） |
| `src/pages/Convert.tsx` | 批量格式转换 |
| `src/lib/media.ts` | 平台目录、格式配置与结果类型 |
| `src/lib/ffmpeg.wasm.ts` | 浏览器串行编码队列 |
| `api/` | 在线解析和媒体代理 |
| `src-tauri/src/main.rs` | 原生下载、转换、压缩与进度事件 |

旧 `Home.tsx`、`Download.tsx` 和仓库 `website/` 不是当前首页入口。
第三方引擎、GPL 分发要求和 LibreGet 参考范围见 [FEATURES.md](FEATURES.md#第三方)。


## macOS 1.4.0（2026-11-27）

独立桌面工作台保留网页的米白纸感、墨绿按钮、朱红 Logo 和字体。下载、转换与压缩使用原有处理组件，切换工具保持任务挂载。⌘1/2/3 切换工具，⌘L 聚焦下载链接。应用状态栏和官网下载入口显示版本及更新日期。安装包由 `.github/workflows/desktop-macos.yml` 在 Apple Silicon 构建机上构建，复用已发布 1.3.1 的便携原生引擎，校验签名、引擎运行及 App 启动后发布到 GitHub Releases。

## 网页画面修复

网页导航“画面修复”（`#cleanup`）支持固定区域快速修补、LaMa AI 智能修复、独立字幕轨移除。用户可拖动时间轴、框选区域或输入百分比坐标，先预览当前帧再导出 MP4 副本。原文件不改动，音频尽量保留，所有视频处理在浏览器内完成。

快速修补基于 FFmpeg delogo 的邻域插值，复杂背景会有痕迹。AI 使用固定版本、校验 SHA-256 的 208 MB LaMa FP32 模型，首用按需下载并尝试浏览器缓存，可从本机导入同一模型。官方源连接失败后可从镜像读取相同校验和的文件。AI 是逐帧图像修复，没有时序跟踪；首版每次选取最多 20 秒、输入限 100 MB、输出最高 720p / 12 fps，可能出现帧间闪烁。移动水印需要用户另行分段选区，不能声称自动跟踪或无损还原。

处理内核和 ONNX runtime 由 Vite 从锁定的 npm 包复制到同源静态资源；不新增有写入主分支权限的自动工作流。新功能暂未加入已发布的 macOS 1.4.0 安装包。
