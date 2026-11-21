# LightVid 1.1

## 产品结构

- 首页直接输入视频链接，下载是主功能。
- 格式转换与压缩是辅助工具，在线版和桌面版共用界面。
- 工具切换保留正在执行的任务，下载记录仅保存在当前设备。

## 下载

接入 YouTube、抖音、Instagram、小红书、快手、X、Bilibili、TikTok、
Vimeo、Facebook、Reddit、Pinterest、Twitch、Dailymotion、SoundCloud、
微博、AcFun、TED、Tumblr、Bandcamp、Streamable。

这些是已接入解析器的平台，不代表每个作品都能下载。仅处理公开、单个作品；
登录、地区、平台风控与 DRM 可能阻止解析。没有实现付费权限或 DRM 绕过。

在线版：

- 国内平台及 Instagram/X 使用现有公开中转。
- 其他平台由 Vercel Python Function `api/extract.py` 与 yt-dlp 解析。
- 只展示可直接保存的完整音视频文件或明确标注的独立音频文件。
- 不把无声的高清视频伪装成完整视频。需要合并音视频时使用桌面版。
- 媒体代理保留 URL 签名，检查公开资源地址及每一跳重定向，支持 Range。
- 在线下载和转换限制 500 MB，避免浏览器内存耗尽。

桌面版：

- 包含 yt-dlp 独立可执行文件，用户不需要安装 Python。
- yt-dlp 选择最高 1080p 音视频并使用内置 FFmpeg 合并。
- 原中转平台直接下载原文件，保存至系统下载目录下的 `轻影` 文件夹。
- 下载引擎版本 2026.10.26；平台签名变化时需要更新引擎。
- 某些 YouTube 挑战需要 JavaScript runtime，已安装的 Node/Deno 可被引擎使用；
  目前安装包未内置该额外 runtime，相关作品仍可能受限。

## 转换

| 输出 | 编码 | 用途 |
| --- | --- | --- |
| MP4 | H.264 / AAC | 通用视频 |
| MOV | H.264 / AAC | 剪辑工作流 |
| MKV | H.264 / AAC | 开放容器 |
| WebM | VP8 / Opus | 网页视频 |
| MP3 | MP3 192 kbps | 提取声音 |

两端都重新编码，并非无损转封装。桌面输出放在原文件目录，使用
`_converted` 后缀；已有文件则自动编号，不覆盖源视频。
浏览器 FFmpeg 任务串行运行，检查实际退出码并清理虚拟文件。

## 部署与验证

Vercel 项目 Root Directory 保持 `video-compressor`。Python 依赖由根目录
`requirements.txt` 自动安装，无需 API 密钥。不要把项目配置为仅导出静态文件。

```sh
npm ci
npm test
npm run lint
npm run build
python3 -m pip install -r requirements.txt
npm run test:extract
npm run dev
```

macOS 引擎可按以下命令重新打包：

```sh
python3 -m pip install -r requirements.txt pyinstaller
python3 -m PyInstaller --onefile --collect-all yt_dlp --collect-all yt_dlp_ejs \
  --name yt-dlp-aarch64-apple-darwin --distpath src-tauri/binaries \
  --workpath /tmp/lightvid-engine-build --specpath /tmp scripts/ytdlp_entry.py
npm run tauri:build -- --bundles app
```

Windows 安装包由仓库根目录 `.github/workflows/desktop-windows.yml` 构建，
作为 GitHub Actions artifact 输出；未验证成功前不在官网宣称已发布。

## 第三方

LibreGet 提供了使用 yt-dlp 的架构参考，没有复制其 GPL-3.0 应用源码。
本项目独立调用 yt-dlp 与 FFmpeg：

- yt-dlp: <https://github.com/yt-dlp/yt-dlp>，Unlicense；独立发行版中
  Python、PyInstaller 和其他依赖各有自己的许可证。
- FFmpeg: <https://ffmpeg.org>。包含 libx264 的桌面引擎适用 GPL；
  对外分发需按对应许可证提供源代码与构建信息。
- FFmpeg.wasm: <https://github.com/ffmpegwasm/ffmpeg.wasm>。
- 中转服务: <https://douyin.laobaitv.net>，无可用性或长期稳定性保证。

macOS 安装包为临时签名，未通过 Apple 公证；官网保留隔离属性处理说明。
