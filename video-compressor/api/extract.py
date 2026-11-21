"""Vercel 原生 Python 下载解析，不需要用户配置密钥。"""
import json
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse

import yt_dlp

HOSTS = {
    "youtube.com": "YouTube", "youtu.be": "YouTube",
    "bilibili.com": "Bilibili", "b23.tv": "Bilibili",
    "tiktok.com": "TikTok", "vimeo.com": "Vimeo",
    "facebook.com": "Facebook", "fb.watch": "Facebook",
    "reddit.com": "Reddit", "redd.it": "Reddit",
    "pinterest.com": "Pinterest", "pin.it": "Pinterest",
    "twitch.tv": "Twitch", "dailymotion.com": "Dailymotion",
    "dai.ly": "Dailymotion", "soundcloud.com": "SoundCloud",
    "instagram.com": "Instagram", "x.com": "X", "twitter.com": "X",
    "weibo.com": "微博", "weibo.cn": "微博", "acfun.cn": "AcFun",
    "ted.com": "TED", "tumblr.com": "Tumblr", "bandcamp.com": "Bandcamp",
    "streamable.com": "Streamable",
}


def extract(url):
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    platform = next((label for domain, label in HOSTS.items()
                     if host == domain or host.endswith("." + domain)), None)
    if parsed.scheme != "https" or not platform or parsed.username:
        raise ValueError("请使用支持平台的 HTTPS 作品链接")
    options = {
        "quiet": True, "no_warnings": True, "noplaylist": True,
        "socket_timeout": 12, "retries": 1, "extractor_retries": 1,
        "skip_download": True, "cachedir": False,
        "playlist_items": "1", "max_downloads": 1,
        "js_runtimes": {"node": {}},
    }
    with yt_dlp.YoutubeDL(options) as downloader:
        info = downloader.extract_info(url, download=False)
    if not info or info.get("_type") in ("playlist", "multi_video"):
        raise ValueError("请粘贴单个视频链接，不支持批量抓取播放列表")

    candidates = []
    for item in info.get("formats") or [info]:
        media_url = item.get("url", "")
        # 在线只提供完整文件，不把无声视频冒充完整视频。
        if not media_url.startswith("https://") or item.get("protocol") not in (
                "https", "http", None):
            continue
        video = item.get("vcodec") not in (None, "none")
        audio = item.get("acodec") not in (None, "none")
        if not audio:
            continue
        ext = item.get("ext", "mp4")
        height = item.get("height") or 0
        candidates.append({
            "id": str(item.get("format_id", len(candidates))),
            "label": f"{height}p · {ext.upper()}" if video else f"音频 · {ext.upper()}",
            "url": media_url, "ext": ext, "audioOnly": not video,
            "_score": (int(video), height, item.get("abr") or 0),
        })
    candidates.sort(key=lambda item: item["_score"], reverse=True)
    # 相同画质只保留一条，避免选项过长。
    formats = []
    labels = set()
    for candidate in candidates:
        candidate.pop("_score")
        if candidate["label"] not in labels:
            formats.append(candidate)
            labels.add(candidate["label"])
    if not formats:
        raise ValueError("此作品没有可直接下载的完整文件，请使用桌面版合并视频与音频")
    return {
        "platformName": platform, "title": info.get("title"),
        "author": info.get("uploader"), "url": formats[0]["url"],
        "type": "audio" if formats[0]["audioOnly"] else "video",
        "formats": formats[:16],
    }


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > 16384:
                raise ValueError("链接内容过长或为空")
            body = json.loads(self.rfile.read(size))
            result = {"ok": True, "data": extract(str(body.get("url", "")))}
            status = 200
        except Exception as error:
            message = str(error)
            if not isinstance(error, ValueError):
                message = "平台暂时拒绝访问，请换一条公开作品链接，或使用桌面版重试"
            result = {"ok": False, "error": message}
            status = 400
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(json.dumps(result, ensure_ascii=False).encode())


if __name__ == "__main__":
    try:
        print(json.dumps({"ok": True, "data": extract(json.loads(sys.stdin.read())["url"])}))
    except Exception:
        print(json.dumps({"ok": False, "error": "平台暂时拒绝访问，请换一条公开链接或使用桌面版重试"}))
