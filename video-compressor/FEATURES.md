# LightVid 1.2

## 产品结构

- 首页直接输入视频链接，下载是主功能。
- 格式转换与压缩是辅助工具，在线版和桌面版共用界面。
- 工具切换保留正在执行的任务，下载记录仅保存在当前设备。

## 界面与动效

- Logo 统一使用 `public/lightvid.svg` 中的朱红播放标志；`npm run icons:generate`
  同步网站 favicon、Apple Touch、主屏幕图标、Safari 固定标签与原生打包素材。
- 页面声明 Apple Touch 图标、安装清单和版本化图标地址；旧的 Safari 程序坞快捷方式
  可能需要在新版部署后重新添加。原生图标素材更新不等于旧 DMG 已重新打包。
- 纸白、墨色、朱红与鼠尾草色光影；导航使用滑动选中背景，输入框使用柔和焦点反馈。
- `ExperienceGallery` 的三组插画同时循环播放，并自动轮换选中卡片。
  鼠标悬停临时接管选择，离开后继续轮换；暂停按钮控制全部演示。
- 指针光影和轻微倾斜通过 CSS 变量与 requestAnimationFrame 更新，不逐帧重渲染页面。
- 卡片离开可见区域或浏览器标签隐藏时暂停演示，支持动态切换减少动画偏好。
- 手机完整显示三张动效卡片，支持点选；输入字号避免 iOS 聚焦时自动放大。
- 演示中的文件与大小数字不是实际处理任务，界面明确标注为互动演示。
- 页脚展示作者 Cooper，跳转 <https://x.com/Yep_Cooper>。真实头像缓存于
  `public/cooper-avatar.jpg`，来源为该主页公开的头像（2026-11-21）。
- 页脚 LIGHTVID 使用 Dissolve 同款粒子文字：自动变换、指针避让、点击散开再聚合。
  支持触控、键盘、动态减少动画偏好；离屏和隐藏标签暂停，卸载时清理帧与观察器。
- 本轮浏览器验证覆盖自动播放、悬停后恢复、暂停/继续、键盘焦点、搜索过滤、
  作者跳转、减少动态效果及 320/375/390/768/1024px 的三工具页面。

## 下载

轻影直接运行 yt-dlp 全量解析器与 Generic 网页探测。
2026.10.26 引擎包含 1,753 个非 Generic 解析器，运行时接口返回当前版本及数量。
数量不是独立网站数或下载成功保证；不将固定“1800”用作产品承诺。
首页常用平台目录扩充为示例列表，不再限制列表以外的公开网站。

不调用第三方解析网站、laobaitv 或 fxtwitter。仅处理公开、单个作品；
登录、地区、平台风控与 DRM 可能阻止解析。没有实现付费权限或 DRM 绕过。

在线版：

- 所有平台由轻影自己的 Vercel Python Function `api/extract.py` 与 yt-dlp 解析。
- 在线与桌面共同使用 `lightvid_engine.py` 的受限网络传输。
- 网络请求限制为公开 HTTP(S)，仅使用 IPv4 DNS，检查全部返回地址并固定到校验后的 IP，
  包括提取器子请求与重定向；不回退到其他传输、系统代理、文件或 FTP。
- 初始链接仅支持 HTTPS；在线解析设置请求数量与时长预算。
- 展示完整音视频、独立音频，或标为“原文件”的未提供音轨元数据的直链。
- 不把无声的高清视频伪装成完整视频。需要合并音视频时使用桌面版。
- 自有媒体代理保留 URL 签名，逐跳检查重定向并固定 DNS 地址，支持 Range。
- 在线下载和转换限制 500 MB，避免浏览器内存耗尽。

桌面版：

- 包含自有 yt-dlp 独立可执行文件、Python 运行时与 Node.js，用户无需另行安装。
- yt-dlp 选择最高 1080p 音视频并使用内置 FFmpeg 合并。
- 所有下载都使用本机引擎，保存至系统下载目录下的 `轻影` 文件夹。
- 下载引擎版本 2026.10.26；平台签名变化时需要更新引擎。
- 显式使用内置 Node.js 执行支持的 JavaScript 挑战，并忽略外部 yt-dlp 配置。
- macOS 1.2.0 同步新版 Logo、粒子页脚和自有引擎；仍为临时签名，未 Apple 公证。

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
python3 -m PyInstaller --onefile --paths . --collect-all yt_dlp --collect-all yt_dlp_ejs \
  --name yt-dlp-aarch64-apple-darwin --distpath src-tauri/binaries \
  --workpath /tmp/lightvid-engine-build --specpath /tmp scripts/ytdlp_entry.py
cp /tmp/node-v25.8.0-darwin-arm64/bin/node src-tauri/binaries/node-aarch64-apple-darwin
npm run tauri:build -- --bundles app
```

先下载、校验并解压 Node.js 官方独立发行版，不复制依赖本机动态库的 Homebrew Node。
在线媒体透传最长约 280 秒，极慢源或大文件建议使用桌面版本。

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
- Node.js: <https://nodejs.org>，完整声明位于 `NODE_LICENSE` 并随安装包分发。
- Dissolve 粒子页脚：MIT，来源与许可证位于 `THIRD_PARTY_NOTICES.md`。

macOS 安装包为临时签名，未通过 Apple 公证；官网保留隔离属性处理说明。
