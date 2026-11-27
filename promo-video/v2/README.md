# 轻影新版功能介绍（2026-11-27）

42 秒，1920×1080，30 fps。覆盖视频下载与本机记录、格式转换与 MP3 音频提取、压缩设置与批量处理；沿用官网纸白、墨绿、朱红视觉。所有工作区来自产品真实组件的浏览器截图；解析结果、文件名及处理结果为明确标注的示例数据，不代表某平台的成功保证、速度或压缩率。

`npm ci` 后，在另一终端启动 `video-compressor` 的 Vite 服务器，再执行：

```
npx playwright install chromium
npm run capture
python3 score.py
npm run render
```

需要指定 Chrome 时设置 `CHROME_PATH`；界面地址可用 `APP_URL` 覆盖。配乐由 `score.py` 使用确定性音符合成生成，无第三方音乐素材。无口播，开声音可播放配乐。

发布采用已审片的视频静态文件：复制至 `video-compressor/public/qingying-promo-v2.mp4`，同步生成海报，并替换 Landing.tsx 的预览及弹窗两处引用。使用新的文件名避免旧视频缓存。工程不配置可写入主分支的自动发布流程。原工程保留在上级目录。
