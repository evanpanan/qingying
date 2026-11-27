# LightVid 1.3

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
- 首屏有持续的链接/文件流动、标题描线和光影动效；自动播放，离屏、隐藏标签或
  减少动态效果时停止。动画不表示实际解析或下载进度。
- “从一个链接开始”使用向右箭头，聚焦链接框并给予两次柔和亮起反馈；
  输入框已可见时不滚动，手机或离屏场景才移入视野，不覆盖输入也不自动解析。
- 推荐平台为 Embla Auto Scroll 双排连续流动：默认8个代表平台，桌面每排4个、
  手机每排2个可见，上排向左、下排向右；支持拖动、悬停/键盘焦点暂停和离屏暂停。
  搜索仍覆盖完整目录，最多显示前8项，推荐目录不限制解析范围。
- `ExperienceGallery` 的三组插画同时循环播放，并自动轮换选中卡片。
  鼠标悬停临时接管选择，离开后继续轮换。首屏、平台和互动演示不显示播放/暂停按钮。
- 指针光影和轻微倾斜通过 CSS 变量与 requestAnimationFrame 更新，不逐帧重渲染页面。
- 卡片离开可见区域或浏览器标签隐藏时暂停演示，支持动态切换减少动画偏好。
- 手机完整显示三张动效卡片，支持点选；输入字号避免 iOS 聚焦时自动放大。
- 演示中的文件与大小数字不是实际处理任务，界面明确标注为互动演示。
- 页脚展示作者 Cooper，跳转 <https://x.com/Yep_Cooper>。真实头像缓存于
  `public/cooper-avatar.jpg`，来源为该主页公开的头像（2026-11-21）。
- 头像绿点以4.8秒周期缓慢呼吸，离屏、隐藏标签和减少动画时停止；这是装饰，不代表实时在线。
- “用心制作”旁的爱心采用 Dissolve LikeButton，点击变红并爆开小礼花，
  显示“感谢您的喜欢”气泡；支持键盘和触控，本机记住喜欢状态。
- 页脚 LIGHTVID 使用 Dissolve 同款粒子文字：自动变换、指针避让、点击散开再聚合。
  支持触控、键盘、动态减少动画偏好；离屏和隐藏标签暂停，卸载时清理帧与观察器。
- 双排浏览器回归覆盖反向连续运动、悬停后恢复、目录搜索、真实公开视频保存、
  减少动态效果和 320/390/768/1024px 布局。

## 多任务下载

- 网页保存任务与链接解析分离，下载过程中仍可粘贴下一条链接、解析并选择格式保存。
- 同时下载2个任务，其他任务按添加顺序等待，空闲后自动开始；每项独立显示进度、
  原始标题、格式、成功或失败状态。活动中的同一来源与格式不重复入队。
- 任务保存不可变的标题、作品链接、媒体链接和媒体类型，新的解析结果或格式选择
  不改变既有任务的文件名或历史记录。
- 网页任务支持独立取消和失败重试；取消、失败、图片及独立音频不会写入下载记录。
  切换工具保留队列；刷新或关闭页面会中断未完成任务，队列不持久化。
- 原生共享源码按任务ID监听进度；原生命令运行中不提供无效取消，等待中的任务可取消。
  本轮不重打桌面安装包，已有包不自动获得新的队列界面。
- 回归覆盖并发上限、自动排队、快照隔离、取消与重试、真实媒体保存，
  以及320/390px布局和工具切换。

## 下载

轻影直接运行 yt-dlp 全量解析器与 Generic 网页探测。
2026.10.26 引擎包含 1,753 个非 Generic 解析器，运行时接口返回当前版本及数量。
数量不是独立网站数或下载成功保证；不将固定“1800”用作产品承诺。
首页常用平台目录扩充为示例列表，不再限制列表以外的公开网站。

不调用第三方解析网站、laobaitv 或 fxtwitter。仅处理公开、单个作品；
登录、地区、平台风控与 DRM 可能阻止解析。没有实现付费权限或 DRM 绕过。

在线版：

- 所有平台由轻影自己的 Vercel Python Function `api/extract.py` 与 yt-dlp 解析。
- 抖音网页接口启用签名风控后，改由 `lightvid_douyin.py` 读取公开 `aweme/detail`
  作品数据（视频多档画质与图集原图），请求仍走 `lightvid_engine.py` 的同一受限传输；
  桌面版原生解析仍基于内置 yt-dlp，抖音可能受同一风控影响。
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
- macOS 1.4.0（2026-11-27）使用独立桌面工作台，保持官网配色、字体与 Logo；新增侧边栏、系统工具菜单与快捷键。仍为临时签名，未 Apple 公证。
- 使用 Tauri 2 官方运行检测，避免桌面误走浏览器处理；原生剪贴板读取已授权，
  转换/压缩支持原生拖放，仅当前工具接收。作者与源码外链使用系统浏览器。
- `npm run release:macos` 构建、临时签名原生引擎及 App 资源、严格校验并生成 DMG，
  修复单纯 Tauri 构建后资源签名不完整的问题。

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
Python 函数通过 `vercel.json` 的 `excludeFiles` 排除静态资源、安装包、前端、
原生构建和开发目录，保留自有解析模块与运行依赖。静态下载不受此规则影响。

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
在线媒体透传每次最长约 280 秒；支持 Range 的资源按 256 KB 分段保存，
保留 If-Range 并核对总长度，避免拼接变化或不完整的文件。
极慢源或大文件建议使用桌面版本。

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
- Dissolve 粒子页脚与 LikeButton：MIT，来源与许可证位于 `THIRD_PARTY_NOTICES.md`。

macOS 安装包为临时签名，未通过 Apple 公证；官网保留隔离属性处理说明。

