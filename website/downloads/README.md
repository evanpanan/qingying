# 轻影 LightVid - 下载文件

## macOS

✅ `轻影_1.0.0_aarch64.dmg` — 已编译好的 macOS 安装包（支持 Apple Silicon）

## Windows

Windows 版本需要在 Windows 机器上编译生成。请按以下步骤操作：

1. 在 Windows 10/11 上安装 [Rust](https://www.rust-lang.org/tools/install) 和 [Node.js](https://nodejs.org/)
2. 安装 Tauri CLI：`npm install -g @tauri-apps/cli`
3. 下载 FFmpeg Windows 静态构建：https://www.gyan.dev/ffmpeg/builds/ (下载 `ffmpeg-release-essentials.zip`)
4. 解压后将 `ffmpeg.exe` 重命名为 `ffmpeg-x86_64-pc-windows-msvc.exe`，放入 `src-tauri/binaries/` 目录
5. 在项目根目录运行：`cargo tauri build`
6. 编译完成后，将生成的 `轻影_1.0.0_x64-setup.exe`（位于 `src-tauri/target/release/bundle/nsis/`）复制到此目录

编译完成后，官网的 Windows 下载按钮将自动指向该文件。
