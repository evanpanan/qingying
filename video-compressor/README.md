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
- 下载卡片下方展示真实全站视频下载次数和参与下载设备数，
  使用 NumberFlow 滚动数字与 SWR 每 5 秒轮询，数据库不可用时不生成假数字。
- 页脚点击爱心变红、弹出小礼花和“感谢您的喜欢”气泡，本机记住喜欢状态，不计入下载统计；
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

访问 <http://localhost:1420>。本地 Vite 中间件提供 `/api/extract`、`/api/proxy`、`/api/stats`
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
`public/downloads/轻影_1.3.0_aarch64.dmg`。这不是 Apple 开发者签名或公证。
桌面运行检测使用 Tauri 2 官方接口，不依赖 `withGlobalTauri`；
粘贴按钮使用原生剪贴板，转换/压缩支持原生文件拖放，仅当前可见工具接收文件；
作者与源码链接通过系统浏览器打开。网页和桌面共用 App、首页、动画和品牌源文件。

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

统计事务集成测试仅在隔离的本机 `lightvid_test` 数据库执行，且会重置该库的统计表：

```bash
LIGHTVID_STATS_TEST_DATABASE_URL=postgresql://lightvid_test@127.0.0.1:15439/lightvid_test npm test
```

不要将该测试指向生产数据库，也不要把测试计数当作历史使用量。

## 全站统计配置

复用已有 PostgreSQL / Supabase，不需要新增 Redis。解析与下载不依赖统计数据库。

1. 在现有数据库中执行一次 [`server/stats-schema.sql`](server/stats-schema.sql)。
   它只创建私有 `lightvid_stats` schema，不修改现有业务表。
2. 在 Vercel 的服务端环境变量中添加 `LIGHTVID_STATS_DATABASE_URL`；
   也兼容已有 `POSTGRES_URL` 或 `DATABASE_URL`，按此顺序读取。
   使用执行建表的角色，或授予统计专用角色对应 schema、表和索引权限。
3. Supabase 建议使用 IPv4 可达的 Session Pooler 连接。远端连接强制验证 TLS 证书；
   需要专用 CA 时设置服务端 `LIGHTVID_STATS_CA`，不要关闭证书验证。
4. 重新部署后确认 `/api/stats` 返回真实计数。不要把连接串放入 `VITE_*`、
   前端、Git 或聊天消息。本地开发可通过同名服务端环境变量连接数据库。

桌面源码使用同一线上统计接口；`VITE_PUBLIC_SITE_URL` 只用于配置公开网站域名，
不是数据库连接。macOS 1.3.0 已重新打包，包含双排流动、全站统计和页脚彩蛋；
统计仍需生产数据库接通，安装包不会内置数据库密码或假数字。

仅视频完整接收并触发浏览器保存，或原生下载命令返回成功文件路径后上报；
浏览器不能证明用户最终写入磁盘。解析、失败、图片及音频下载不计入视频统计。
设备数按浏览器/安装实例的随机 UUID 去重，服务端仅保存设备标识的 SHA-256；
清除本机数据或更换浏览器会产生新实例，所以不能称为准确人数。
统计请求仅发送事件与设备 UUID，不发送视频链接、标题、用户身份或客户端时间，
统计表不保存 IP；部署平台可能仍保留正常访问日志。

DNT / Global Privacy Control 开启或本机存储被禁用时不匿名上报。
失败事件保留原 ID 在本机最多 72 小时、100 条，下次联网或读取统计时重试。
同一事件服务端只计一次，单设备每分钟最多 12 个新事件；这是客户端成功自报告，
不是经过完整防作弊认证的数据。可见区域每 5 秒刷新，隐藏标签、离线或离屏时不轮询。
数据库未配置或断连显示“统计暂不可用”，已有数字会标为上次统计；不会伪造增长。

### 真实历史基数

只允许导入已核实、早于新统计且未被新事件记录的历史成功视频下载总数。
没有真实记录时不能随意填一个非零起点。重新执行统计建表 SQL 以添加来源审计表，
然后使用已有服务端数据库环境变量运行：

```bash
npm run stats:import-history -- --downloads <已核实次数> --source "<核实记录与时间范围>" --confirm-verified
```

相同基数重复执行不会再加一次，不同基数会拒绝覆盖；核实来源只保存在私有表。
导入后新下载自动继续叠加。单纯历史设备总数无法与新匿名设备去重，因此不会直接加到
设备数，也不会生成假设备 UUID。导入前必须核对时间范围和原始记录，避免重复计数。
本次尚未获得生产连接或真实历史记录，未执行生产导入。

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

新版 [macOS 1.3.0 DMG](public/downloads/轻影_1.3.0_aarch64.dmg)
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
| `src/components/DownloadStats.tsx` | 全站统计与数字动效 |
| `src/lib/stats-reporter.ts` | 匿名上报、离线队列与幂等事件 |
| `api/stats.ts`、`server/stats-store.ts` | PostgreSQL 统计读写与限流 |
| `src/components/ParticleWordmark.tsx` | Dissolve 风格粒子页脚 |
| `lightvid_engine.py` | 在线与桌面共用的自有解析网络传输 |
| `src/pages/Convert.tsx` | 批量格式转换 |
| `src/lib/media.ts` | 平台目录、格式配置与结果类型 |
| `src/lib/ffmpeg.wasm.ts` | 浏览器串行编码队列 |
| `api/` | 在线解析和媒体代理 |
| `src-tauri/src/main.rs` | 原生下载、转换、压缩与进度事件 |

旧 `Home.tsx`、`Download.tsx` 和仓库 `website/` 不是当前首页入口。
第三方引擎、GPL 分发要求和 LibreGet 参考范围见 [FEATURES.md](FEATURES.md#第三方)。
