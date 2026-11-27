"""Vercel 原生 Python 下载解析，不需要用户配置密钥。"""
import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

# Also works when invoked directly by Vite and frozen into the desktop engine.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lightvid_engine import LightVidDL, engine_info, validate_url
from lightvid_douyin import douyin_extract, is_douyin
from lightvid_xiaohongshu import normalize_share_url


def error_message(error):
    message = str(error)
    if isinstance(error, ValueError):
        return message
    if "小红书" in message:
        return "小红书解析失败：请从 App 重新复制完整公开视频链接（保留 xsec_token）；作品可能需要登录、验证或已删除"
    if "Unsupported URL" in message:
        return "自有引擎未找到此页面的视频，请使用单个作品链接"
    if any(word in message.lower() for word in ("timed out", "timeout")):
        return "连接作品网站超时，请稍后重试或检查网络是否可以访问该网站"
    if any(word in message.lower() for word in
           ("cookies", "login", "sign in", "403", "401", "private")):
        return "平台要求登录或拒绝访问；轻影不会将链接转交第三方解析"
    return "自有引擎解析失败，可能受到平台限制；请换一条公开作品或使用桌面版"


def extract(url):
    url = normalize_share_url(url)
    host = validate_url(url, entry=True)
    if is_douyin(host):
        # 抖音网页接口需要签名风控，这里走轻影自己的抖音解析。
        return douyin_extract(url)
    options = {
        "quiet": True, "no_warnings": True, "noplaylist": True,
        "socket_timeout": 12, "retries": 1, "extractor_retries": 1,
        "skip_download": True, "cachedir": False,
        "playlist_items": "1", "max_downloads": 1,
        "js_runtimes": {"node": {}},
        "proxy": "", "remote_components": set(),
    }
    with LightVidDL(options) as downloader:
        info = downloader.extract_info(url, download=False)
    if not info or info.get("_type") in ("playlist", "multi_video"):
        raise ValueError("请粘贴单个视频链接，不支持批量抓取播放列表")
    if info.get("is_live"):
        raise ValueError("在线版仅下载已发布的作品，不支持持续录制直播")

    candidates = []
    for item in info.get("formats") or [info]:
        media_url = item.get("url", "")
        # 在线只提供完整文件，不把无声视频冒充完整视频。
        if item.get("has_drm") or not media_url.startswith("https://") or item.get("protocol") not in (
                "https", "http", None):
            continue
        try:
            validate_url(media_url, entry=True)
        except ValueError:
            continue
        ext = item.get("ext", "mp4")
        direct = item.get("vcodec") is None and item.get("acodec") is None
        video = item.get("vcodec") not in (None, "none") or (
            direct and ext in ("mp4", "mov", "webm", "mkv", "avi", "m4v"))
        audio = item.get("acodec") not in (None, "none") or (
            direct and ext in ("mp4", "mov", "webm", "mkv", "avi", "m4v", "mp3", "m4a", "ogg", "opus", "wav", "flac"))
        if not audio:
            continue
        height = item.get("height") or 0
        candidates.append({
            "id": str(item.get("format_id", len(candidates))),
            "label": f"原文件 · {ext.upper()}" if direct else
                     f"{height}p · {ext.upper()}" if video else f"音频 · {ext.upper()}",
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
        "platformName": "小红书" if info.get("extractor_key") == "LightVidXiaoHongShu" else info.get("extractor_key") or host, "title": info.get("title"),
        "author": info.get("uploader"), "url": formats[0]["url"],
        "type": "audio" if formats[0]["audioOnly"] else "video",
        "formats": formats[:16],
        "engine": engine_info(),
    }


class handler(BaseHTTPRequestHandler):
    def respond(self, status, result):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(json.dumps(result, ensure_ascii=False).encode())

    def do_GET(self):
        self.respond(200, {"ok": True, "engine": engine_info()})

    def do_POST(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > 16384:
                raise ValueError("链接内容过长或为空")
            body = json.loads(self.rfile.read(size))
            if not isinstance(body, dict):
                raise ValueError("请求格式不正确")
            result = {"ok": True, "data": extract(str(body.get("url", "")))}
            status = 200
        except Exception as error:
            result = {"ok": False, "error": error_message(error)}
            status = 400
        self.respond(status, result)


if __name__ == "__main__":
    try:
        if "--info" in sys.argv:
            print(json.dumps({"ok": True, "engine": engine_info()}))
        else:
            print(json.dumps({"ok": True, "data": extract(json.loads(sys.stdin.read())["url"])}))
    except Exception as error:
        print(json.dumps({"ok": False, "error": error_message(error)}))

