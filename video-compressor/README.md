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

## 画面修复（macOS 1.5.0，2026-11-27）

macOS 侧边栏和系统工具菜单新增「画面修复」（⌘4）。支持最多 8 个固定选区，可分别移动、重画、调整坐标和删除。快速修补、AI 修复和移除独立字幕轨均使用本机引擎；结果经系统保存对话框另存 MP4 副本，保留原音频，原文件不改动。

AI 引擎为 ONNX Runtime Node 1.23.2 CPU，LaMa FP32 模型随安装包附带，安装后可离线使用，无需 API、密钥或用户下载模型。模型固定版本及校验和见 THIRD_PARTY_NOTICES.md。AI 限 100 MB 源视频、每次最多 20 秒，输出最高 720p / 12fps；逐帧修复可能闪烁，复杂场景可能有痕迹，多个选区会增加处理时间，不承诺真实还原或移动水印跟踪。

网页只提供快速修补与字幕轨移除；选择 AI 修复时提示下载桌面版，并显示版本及更新日期。网页的 AI 修复入口不下载修复模型，也不接付费修复 API；视频翻译另使用本机语音模型，见下方 1.6.1。

桌面构建前运行 `node scripts/prepare-desktop-ai.mjs --force`：安装锁定版本的官方 ONNX Runtime、保留本平台原生库，并下载且校验模型。资源写入 `desktop-ai/models`，生成文件不提交仓库。打包流程将运行库、模型、许可证和处理脚本一起放入 app Resources，并签署原生库。`scripts/test-desktop-ai.mjs` 会在无模型下载的情况下验证真实双选区 AI 预览、修复视频、音频保留和快速模式；发布工作流对打包后的引擎重复此验收。

[下载 macOS 1.5.0](https://github.com/evanpanan/qingying/releases/download/v1.5.0/_1.5.0_aarch64.dmg)。适用 Apple Silicon，临时签名，未 Apple 公证。


## macOS 1.5.1（2026-11-27）

修补选区支持拖动四条边和四个角调整大小，框内仍可移动。选区限制在视频内，缩小到最小尺寸后不会翻转或消失；键盘聚焦手柄后可用方向键微调，Shift 加快。修改选区会清除旧预览和导出结果，避免保存旧范围。

网页导航、桌面侧边栏和 macOS 工具菜单顺序统一为：视频下载、画面修复、格式转换、视频压缩；桌面快捷键依次为 ⌘1–⌘4，画面修复为 ⌘2。


## macOS / 网页 1.6.1（2026-11-27）

两端「画面修复」中的添加修补选区使用醒目的朱红按钮，保留八方向缩放、多区域选择和 ⌘2 工具顺序。完成后自动进入处理历史：桌面结果独立保存到应用数据目录的 results 文件夹，未另存也能打开视频、定位所在文件夹、另存副本，重启仍保留；升级时迁移仍存在的旧版修复缓存。网页用 IndexedDB 保存最近 10 条、合计最多 200 MB；浏览器清理站点数据会删除历史，需及时下载。网页不能直接打开操作系统文件夹，可从浏览器下载列表定位。

选择「中文视频转英文」即可在本机识别中文语音、翻译英文、生成英文配音与烧录字幕，支持英文男女声，可同时修补原字幕及水印区域。无需 API、账号或付费云服务；桌面使用 CPU，网页使用 WASM Worker。首次下载约 350 MB Whisper-small / Kokoro q8 模型，后续从本机缓存加载。桌面分段下载、断点复用并校验模型 SHA-256；网页依赖浏览器模型缓存，建议使用电脑。每次最多 60 秒、源视频 200 MB，输出最高 720p / 24fps；桌面叠加 LaMa AI 修复限 20 秒。英文配音替换整个原音轨，不保留背景音乐，不复刻原声。烧录的中文字幕需手动框选覆盖，水印可另加选区；不自动跟踪。机器翻译与字幕时间可能不准确，完成后应检查。

模型固定版本和许可证见 THIRD_PARTY_NOTICES.md。脚本 scripts/test-desktop-translation.mjs 使用仓库中的中文语音合成测试素材，在打包应用内真实运行识别、翻译、英文 TTS、区域修补和字幕合成，并检查输出音轨。

[下载 macOS 1.6.1](https://github.com/evanpanan/qingying/releases/download/v1.6.1/_1.6.1_aarch64.dmg)。适用 Apple Silicon，更新于 2026-11-27。


## 应用内更新（1.7.0）

桌面版启动 5 秒后自动检查 GitHub Releases 的 latest.json，也可从状态栏或 macOS「轻影 → 检查更新…」手动检查。下载与安装分开：显示下载进度并验证 minisign 签名，通过后由用户点击「安装并重启」。有下载队列、解析、修复、转换、压缩任务时禁止安装。只替换应用本体，保留 app data / cache 内的修复历史和模型。网络、签名、权限错误会显示重试入口。1.6.1 及更早版本没有更新模块，需要手动安装 1.7.0 一次。

更新使用官方 tauri-plugin-updater / process；HTTPS 固定到本仓库 GitHub Releases，requireSignedVersion 防止把旧包伪装成新版本。更新包在 macOS 应用及 sidecars 最终签名后创建，再用独立更新签名密钥签署。scripts/build-update.mjs 生成 .app.tar.gz、.sig 和 latest.json，发布工作流一起上传。与 Apple 公证为不同机制；目前 app 仍使用临时 Apple 签名。

发布者需一次性在仓库 Settings → Secrets and variables → Actions 中添加 TAURI_SIGNING_PRIVATE_KEY（CLI 生成的私钥内容，无密码）；客户端只内置对应公钥。私钥不提交仓库，须安全备份，后续发布继续使用同一密钥。缺少密钥会在构建开始时明确失败，避免发布无法更新的版本。对新密钥重新生成公钥时，旧客户端无法验证新密钥签名，不应随意轮换。

测试通过官方 updater 对签名测试包验签，拒绝损坏及版本不匹配的包，并在临时目录中真实替换测试 app、确认外部历史文件保留。发布前另验证正式更新包与客户端公钥匹配。


## 拖入视频与 AI 范围修正（1.7.1）

macOS 画面修复接收访达拖入事件，支持拖入视频、拖入替换、悬停高亮。原生端只接受系统拖入的文件路径，校验格式与 500 MB 上限后在后台创建工作副本，预览仅授权缓存中的这个视频，不开放整个文件系统。修复与翻译直接复用工作副本，避免通过网页桥接重复上传大文件。转换、压缩与修复只响应当前工具的拖入事件；网页也支持拖入及替换。

翻译叠加 AI 的限制仍为 20 秒。切换处理方式、启用叠加修补、加载视频时同步时间范围，保留开始位置并提示自动调整；手动输入超限范围时显示具体原因和「调整为 20 秒」入口，不再只有灰色按钮。无视频、无效选区、超出大小限制和元数据尚未读取等状态也显示对应原因。

检查更新移至左下角侧边栏底部，侧边栏折叠后保留左下角入口，macOS 应用菜单仍可检查更新。1.7.0 用户可在应用内下载并安装本次更新。


## 更新安装位置检测（1.7.2，2026-11-28）

运行在只读 DMG 或 macOS App Translocation 中的应用无法原地更新。检查、下载、安装三个阶段均在本机确认安装位置，探测文件只创建于 app 父目录，随后立即删除，不改动 app 签名内容。只读镜像与隔离位置会显示先拖入应用程序、退出镜像中进程、从应用程序重新打开的步骤，以及打开应用程序文件夹的入口。普通权限不足仍交由官方 updater 的 macOS 授权流程处理，不强制阻止可通过管理员授权的安装。

官方 updater 安装失败时会保留下载资源，新版界面提供重试安装；不再把位置和权限错误统一引导为重新下载。后台启动检查失败不会关闭应用，也不会丢失处理任务或历史。


## 按需处理与完整视频（1.8.0，2026-11-28）

画面修复按「去字幕／水印」「只换字幕」「只换配音」「字幕＋配音」四种用途进入。字幕区与水印／其他区分别标记、分别勾选；换字幕默认清除字幕区并保留水印，只换配音默认不修补任何画面区域。添加修补选区、选区列表及用途选择移到视频旁上方，坐标输入与处理范围按需展开，默认处理整段。

字幕与配音为独立的后端选项。只换字幕时不下载、加载或运行 TTS，原音轨优先直接复用；源音频不能封装到 MP4 时才转为 AAC。只换配音且未修补画面时复制原视频码流并保留原有可关闭字幕轨；叠加修补时仅修改明确勾选的区域。硬字幕需在画面上选择字幕区，不自动识别或跟踪位置。当前语音功能支持中文语音转英文，不克隆原声；英文配音替换原音轨，不做背景音乐分离。

桌面移除固定的 20 秒 AI、60 秒翻译及 100/200/500 MB 文件上限，实际受系统文件能力、设备性能及可用磁盘空间影响。AI 逐帧读取、修复、编码，缓存相同的连续帧以节省静止画面的重复推理；语音按 60 秒内部工作段识别和合成，自动合并整段结果，并将 SRT 时间偏移到完整视频时间轴。内存不随整个视频时长一次增长。配音段先保存为临时音频，最后统一编码与封装，避免切段重复编码原音频或累计配音延迟。失败不会记为已完成，停止会终止子进程；工作副本由原有任务清理机制管理。AI 输出仍最高 720p / 12fps；新字幕烧录最高 720p / 24fps，可能存在修补痕迹、翻译错误和字幕时序误差。

网页采用相同用途和区域逻辑，保留浏览器内存约束：语音任务每次最多 60 秒、200 MB，普通视频导入最多 500 MB；AI 画面修复与更长、更大的任务引导至桌面版。

下载页增加单行主要平台提示；侧栏底部增加醒目版本、更新日期及「意见与交流 · 𝕏 @Yep_Cooper」，直接打开官网同一创作者主页，不收集意见表单。系统关于菜单的作者信息同步为 Cooper。

发布验证包含实际 AI 21 秒输出、65 秒视频预览和快速处理，以及完整语音处理、只换字幕保留原声音、只换配音保留视频码流和字幕轨、65 秒跨段输出与全局 SRT 时间。
