# 轻影 LightVid

> 喜欢的视频，留在你身边。

轻影是一款以**视频下载**为核心的媒体工具，提供格式转换与视频压缩。
在线版无需安装，桌面版内置媒体引擎，适合高清下载与大文件处理。

[在线使用](https://qingying-rosy.vercel.app) ·
[macOS 1.1.0 安装包](video-compressor/public/downloads/轻影_1.1.0_aarch64.dmg) ·
[开发指南](video-compressor/README.md) ·
[详细功能与架构](video-compressor/FEATURES.md) ·
[作者 Cooper](https://x.com/Yep_Cooper)

## 主要功能

| 功能 | 说明 |
| --- | --- |
| 视频下载 | 首页直接粘贴作品链接或分享文案，自动识别平台；接入 21 个常用平台 |
| 格式转换 | MP4、MOV、MKV、WebM、MP3；支持批量转换、提取音频与失败重试 |
| 视频压缩 | 4 档画质预设与原始、1080p、720p、480p 分辨率选项，支持批量处理 |
| 本地记录 | 下载记录仅存于当前设备，切换工具时保留正在处理的任务 |
| 交互界面 | 三组演示自动循环，悬停光影与倾斜、暂停与继续、柔和焦点样式 |
| 手机适配 | 完整展示动效卡片，支持触控和减少动态效果偏好 |

格式转换与压缩在本机执行，不上传所选源文件。**下载需要联网**：
作品链接会交给平台解析器或第三方中转，媒体可能经在线代理传输。
转换与压缩会重新编码，不能保证无损或固定的体积缩减比例。

## 接入平台

YouTube、抖音、Instagram、小红书、快手、X、Bilibili、TikTok、Vimeo、
Facebook、Reddit、Pinterest、Twitch、Dailymotion、SoundCloud、
微博、AcFun、TED、Tumblr、Bandcamp、Streamable。

“已接入”不等于每条链接都可下载。仅处理公开、单个作品；登录要求、
地区限制、平台风控、链接失效或版权保护都可能阻止解析。
仅下载你拥有或获授权的内容，不提供付费权限或 DRM 绕过。

## 在线版与桌面版

| | 在线版 | 桌面版 |
| --- | --- | --- |
| 使用方式 | 浏览器直接使用 | 安装应用，内置 FFmpeg 与独立 yt-dlp |
| 下载 | 完整音视频直链或明确标注的独立音频 | 可合并分离音视频，最高 1080p |
| 转换与压缩 | FFmpeg.wasm，本机处理 | 原生 FFmpeg，本机处理 |
| 文件大小 | 在线下载与转换限制 500 MB | 更适合大文件，受设备资源与平台条件限制 |

macOS 1.1.0 安装包适用于 Apple Silicon。当前使用临时签名，**尚未通过 Apple 公证**。
安装后如系统提示无法打开，确认来源可信，再按官网安装说明处理。
Windows 已配置自动构建流程，但尚未确认构建成功和安装包发布；Intel Mac 安装包未发布。
当前桌面安装包未内置额外 JavaScript runtime，部分 YouTube 作品仍可能受限。

最新源码包含后续 UI 打磨，现有 1.1.0 DMG 不代表包含每一次后续界面更新。

## 本地开发

Web 开发建议使用 Node.js 22.12+ 和 Python 3.10+。
以下命令在 macOS/Linux 上从仓库根目录执行：

```bash
cd video-compressor
npm ci
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
npm run dev
```

打开 <http://localhost:1420>。Python 用于本地多平台解析，不是终端用户的安装要求。
桌面开发还需要 Rust stable、系统构建依赖及原生引擎，见[应用开发指南](video-compressor/README.md)。

## 项目结构

```text
.
├── video-compressor/          # 当前官网与桌面应用，共用 React 前端
│   ├── src/                   # 下载、转换、压缩、导航与动效
│   ├── api/                   # Vercel 解析与媒体代理函数
│   ├── src-tauri/             # Rust 原生后端与打包配置
│   ├── public/downloads/      # 官网分发的安装包
│   ├── tests/                 # Node 与 Python 回归测试
│   └── FEATURES.md            # 功能契约、架构与限制
├── .github/workflows/         # Windows 桌面自动构建
├── promo-video/               # 宣传视频工程
└── website/                   # 历史静态官网，不是当前部署入口
```

当前官网的 Vercel **Root Directory 为 `video-compressor`**。
必须同时部署 TypeScript/Python Functions；仅托管 `dist/` 无法提供完整下载功能。
应用无需用户填写 API 密钥，但解析服务与平台的可用性不受轻影控制。

## 技术与第三方

React 19、TypeScript、Vite、Tailwind CSS、Tauri v2、Rust、
FFmpeg.wasm、FFmpeg 与 yt-dlp。

LibreGet 仅提供架构参考，没有复制其应用源码。FFmpeg、yt-dlp 及其打包依赖
分别遵循各自许可证，不能将整个分发包统一描述为 MIT。
包含 libx264 的 FFmpeg 构建适用 GPL，分发时需履行对应源代码与构建信息义务。
仓库当前未提供独立 `LICENSE` 文件；本次文档更新不新增或变更项目授权。
详情见[第三方说明](video-compressor/FEATURES.md#第三方)。
