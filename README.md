# 轻影 LightVid

> 视频一键瘦身，体积减半画质不变

轻影是一款本地视频压缩工具，采用智能 H.264 压缩算法，最高可减少 80% 文件体积。所有处理均在本地完成，文件不上传，保护隐私安全。

## 特性

- ⚡ **极速压缩** — 基于原生 FFmpeg 引擎，压缩速度远超在线工具
- 🔒 **隐私安全** — 所有处理在本地完成，视频绝不上传
- 🎬 **全格式支持** — MP4、MOV、MKV、AVI、WMV、FLV、WEBM 等 10+ 格式
- 🎚️ **灵活设置** — 4 档画质预设 + 4 档分辨率可选
- 📦 **批量处理** — 一次选择多个视频，逐个自动压缩
- 📜 **历史记录** — 自动保存压缩记录，快速定位文件

## 项目结构

```
.
├── video-compressor/      # 桌面应用 (Tauri v2 + React)
│   ├── src/               # 前端源码
│   ├── src-tauri/         # Rust 后端
│   │   ├── src/main.rs    # 压缩命令、FFmpeg 调用
│   │   ├── binaries/      # FFmpeg 二进制 (需自行下载)
│   │   └── tauri.conf.json
│   └── package.json
└── website/               # 官网
    ├── index.html
    ├── styles.css
    └── script.js
```

## 开发说明

### 前置要求

- Node.js 18+
- Rust 1.70+
- [Tauri CLI v2](https://v2.tauri.app/start/create-project/)

### 安装依赖

```bash
cd video-compressor
npm install
```

### 下载 FFmpeg 二进制

由于 FFmpeg 二进制文件较大，未包含在仓库中，请手动下载：

**macOS (Apple Silicon):**
```bash
# 从 osxexperts.net 下载静态构建
curl -L -o /tmp/ffmpeg.zip "https://www.osxexperts.net/ffmpeg711arm.zip"
unzip /tmp/ffmpeg.zip -d /tmp/ffmpeg
cp /tmp/ffmpeg/ffmpeg video-compressor/src-tauri/binaries/ffmpeg-aarch64-apple-darwin
chmod +x video-compressor/src-tauri/binaries/ffmpeg-aarch64-apple-darwin
```

**macOS (Intel):**
下载 `ffmpeg-x86_64-apple-darwin`，放入 `video-compressor/src-tauri/binaries/`。

**Windows:**
从 https://www.gyan.dev/ffmpeg/builds/ 下载 essentials 版本，将 `ffmpeg.exe` 重命名为 `ffmpeg-x86_64-pc-windows-msvc.exe`，放入 `video-compressor/src-tauri/binaries/`。

### 运行开发模式

```bash
cd video-compressor
npm run tauri:dev
```

### 构建发布包

**macOS:**
```bash
cd video-compressor
cargo tauri build
# 产物: src-tauri/target/release/bundle/macos/轻影.app
#       src-tauri/target/release/bundle/dmg/轻影_1.0.0_aarch64.dmg
```

**Windows:**
```bash
cd video-compressor
cargo tauri build
# 产物: src-tauri/target/release/bundle/nsis/轻影_1.0.0_x64-setup.exe
```

## 官网

官网位于 `website/` 目录，是纯静态页面，可直接部署到任何静态托管服务。

```bash
cd website
python3 -m http.server 8080
# 访问 http://localhost:8080
```

## 技术栈

- **桌面应用**: Tauri v2 (Rust + WebView)
- **前端**: React 19 + TypeScript + Vite + Tailwind CSS
- **压缩引擎**: FFmpeg (libx264)
- **官网**: 原生 HTML/CSS/JS

## 许可

MIT
