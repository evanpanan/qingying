# 轻影 LightVid

> 喜欢的视频，留在你身边。

轻影是一款以**视频下载**为核心的媒体工具，提供格式转换与视频压缩。
在线版无需安装，桌面版内置媒体引擎，适合高清下载与大文件处理。

[在线使用](https://qingying-rosy.vercel.app) ·
[macOS 1.3.0 安装包](video-compressor/public/downloads/轻影_1.3.0_aarch64.dmg) ·
[开发指南](video-compressor/README.md) ·
[详细功能与架构](video-compressor/FEATURES.md) ·
[作者 Cooper](https://x.com/Yep_Cooper)

## 主要功能

| 功能 | 说明 |
| --- | --- |
| 视频下载 | 轻影自运行全量 yt-dlp 解析器与通用网页探测，不设推荐平台白名单 |
| 格式转换 | MP4、MOV、MKV、WebM、MP3；支持批量转换、提取音频与失败重试 |
| 视频压缩 | 4 档画质预设与原始、1080p、720p、480p 分辨率选项，支持批量处理 |
| 本地记录 | 下载记录仅存于当前设备，切换工具时保留正在处理的任务 |
| 全站统计 | 复用 PostgreSQL，仅展示视频下载次数；无全站数据时明确显示本机最近记录 |
| 交互界面 | 自动演示、粒子字标；页脚爱心点击变红、庆祝礼花和感谢气泡，作者绿点缓慢呼吸 |
| 手机适配 | 完整展示动效卡片，支持触控和减少动态效果偏好 |
| 网站图标 | 统一朱红播放 Logo，覆盖标签页、Safari 程序坞与手机主屏幕 |

格式转换与压缩在本机执行，不上传所选源文件。**下载需要联网**：
在线版由轻影部署的 Python 引擎直接访问作品平台与媒体资源；
桌面版在本机解析。**不再调用第三方解析网站或中转解析 API**。
在线媒体下载可能经轻影自己的代理传输。
转换与压缩会重新编码，不能保证无损或固定的体积缩减比例。

## 下载范围

开放当前 yt-dlp 引擎的全量解析器，并使用 Generic 探测普通网页里的媒体。
当前测试引擎 `2026.10.26` 包含 **1,753 个非 Generic 解析器**；
解析器数量不等于独立网站数量，界面通过接口读取运行版本的实际数量。
它会随引擎升级变化，不以固定“1800”作为成功率承诺。

首页默认展示 YouTube、抖音、Instagram、小红书、快手、X、Bilibili、TikTok
八个代表平台，两排连续自动流动，上排向左、下排向右，不提供装饰播放/暂停按钮。
搜索保留完整推荐目录，包括 ARTE、Archive.org、Bluesky、Mixcloud、Niconico 等，
最多显示前八项。
**列表外的网站也可直接粘贴链接尝试**，列表不是支持上限。

引擎覆盖不等于每条链接都可下载。仅处理公开、单个作品；登录要求、
地区限制、平台风控、链接失效或版权保护都可能阻止解析。
仅下载你拥有或获授权的内容，不提供付费权限或 DRM 绕过。

## 在线版与桌面版

| | 在线版 | 桌面版 |
| --- | --- | --- |
| 使用方式 | 浏览器直接使用 | 安装应用，内置 FFmpeg、独立 yt-dlp 与 Node.js |
| 下载 | 完整音视频直链或明确标注的独立音频 | 可合并分离音视频，最高 1080p |
| 转换与压缩 | FFmpeg.wasm，本机处理 | 原生 FFmpeg，本机处理 |
| 文件大小 | 在线下载与转换限制 500 MB | 更适合大文件，受设备资源与平台条件限制 |

macOS 1.3.0 安装包适用于 Apple Silicon。当前使用临时签名，**尚未通过 Apple 公证**。
安装后如系统提示无法打开，确认来源可信，再按官网安装说明处理。
Windows 已配置自动构建流程，但尚未确认构建成功和安装包发布；Intel Mac 安装包未发布。
1.3.0 包含统一 Logo、自有解析引擎、双排流动、全站统计与页脚彩蛋。
网页与桌面共用界面，桌面支持原生粘贴、文件拖放和通过系统浏览器打开外链。
历史 1.0.0/1.1.0 包不随源码更新，仍保留原有能力与限制。

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
应用无需用户填写 API 密钥。解析逻辑由轻影自己运行，作品平台的访问条件仍不受轻影控制。

全站统计需由部署者在已有 PostgreSQL / Supabase 执行统计建表 SQL，
并配置服务端数据库连接；详见[统计配置](video-compressor/README.md#全站统计配置)。
统计只在视频保存成功路径匿名上报，不收集视频链接或标题，不再展示设备数。
全站不可用且没有缓存时显示最近最多 6 条、按链接去重的本机记录，不是全站总数或
完整本机下载次数。旧记录需确认都是成功保存的视频后补报，固定事件标识保证重试不重复。
本轮统计修复仅更新网页版和服务端，不更新已有桌面安装包。
数字每 5 秒近实时刷新，DNT/GPC 开启时不上报；未连接数据库显示暂不可用，下载正常使用。
真实历史下载次数可作为一次性基数导入并继续叠加，必须有核实记录，不推算历史设备数；
本轮尚未取得生产连接及历史记录，未导入基数。详见[历史导入](video-compressor/README.md#真实历史基数)。

## 技术与第三方

React 19、TypeScript、Vite、Tailwind CSS、Tauri v2、Rust、
FFmpeg.wasm、FFmpeg 与 yt-dlp。
粒子页脚改编自 Dissolve 的 MIT 实现，见[第三方声明](video-compressor/THIRD_PARTY_NOTICES.md)。

LibreGet 仅提供架构参考，没有复制其应用源码。FFmpeg、yt-dlp 及其打包依赖
分别遵循各自许可证，不能将整个分发包统一描述为 MIT。
包含 libx264 的 FFmpeg 构建适用 GPL，分发时需履行对应源代码与构建信息义务。
仓库当前未提供独立 `LICENSE` 文件；本次文档更新不新增或变更项目授权。
详情见[第三方说明](video-compressor/FEATURES.md#第三方)。
