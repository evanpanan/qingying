"""抖音自有解析：轻影直接请求抖音公开作品接口，不经过任何第三方解析站。

抖音网页详情接口在 2026 年启用签名风控后，yt-dlp 已无法直接解析。
这里以来源为 `open.douyin.com` 的公开请求读取 `aweme/detail`，
再把作品映射到轻影自己的下载契约（视频多档画质 / 图集原图）。
"""
import json
import re
import ssl
import urllib.request

from lightvid_engine import PublicHTTPHandler, engine_info, validate_url

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36")
DETAIL = "https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id={}&aid=6383"
# 抖音网页接口只对轻影这类无签名的公开来源返回作品详情。
SOURCE_HEADERS = {"Origin": "https://open.douyin.com", "Referer": "https://open.douyin.com/"}
ID_PATTERNS = (
    re.compile(r"/(?:video|note|slides)/(\d{6,})"),
    re.compile(r"(?:modal_id|aweme_id)=(\d{6,})"),
)
DOUYIN_HOSTS = ("douyin.com", "iesdouyin.com")


def is_douyin(host):
    return bool(host) and any(host == name or host.endswith("." + name) for name in DOUYIN_HOSTS)


def public_opener():
    # 与解析器一致：只用公开网络、禁用代理，重定向每一跳都重新校验。
    opener = urllib.request.OpenerDirector()
    for handler in (
        urllib.request.ProxyHandler({}),
        PublicHTTPHandler(context=ssl.create_default_context()),
        urllib.request.UnknownHandler(),
        urllib.request.HTTPDefaultErrorHandler(),
        urllib.request.HTTPErrorProcessor(),
        urllib.request.HTTPRedirectHandler(),
    ):
        opener.add_handler(handler)
    return opener


def fetch(url, headers=None):
    request = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    return public_opener().open(request, timeout=12)


def aweme_id(url):
    for pattern in ID_PATTERNS:
        match = pattern.search(url)
        if match:
            return match.group(1)
    # 短链（v.douyin.com）需要跟随一次跳转才能拿到真实作品地址。
    with fetch(url) as response:
        final = response.geturl()
    for pattern in ID_PATTERNS:
        match = pattern.search(final)
        if match:
            return match.group(1)
    raise ValueError("未从链接中识别到抖音作品，请粘贴单个作品的分享链接")


def aweme_detail(identifier):
    with fetch(DETAIL.format(identifier), SOURCE_HEADERS) as response:
        payload = response.read()
    try:
        data = json.loads(payload or b"{}")
    except ValueError:
        raise ValueError("抖音返回了非预期内容，可能受到平台风控；请稍后重试")
    detail = (data or {}).get("aweme_detail") or {}
    if not detail:
        raise ValueError("抖音未返回该作品，可能已删除、设为私密或需要登录")
    return detail


def video_formats(video):
    candidates = []
    for index, item in enumerate(video.get("bit_rate") or []):
        play = item.get("play_addr") or {}
        urls = [url for url in (play.get("url_list") or []) if isinstance(url, str)]
        if not urls:
            continue
        # gear_name 里的数字是清晰度档位（如 low_720_0 → 720p），
        # 竖屏作品的高度是旋转后的像素，不能直接当作画质。
        gear = str(item.get("gear_name") or "")
        quality = int(match.group(1)) if (match := re.search(r"_(\d{3,4})(?:_|$)", gear)) else 0
        candidates.append({
            "id": gear or f"douyin-{index}",
            "label": f"{quality}p · MP4" if quality else "原文件 · MP4",
            "url": urls[0], "ext": "mp4", "audioOnly": False,
            "_order": (quality, int(play.get("data_size") or 0)),
            "_h265": bool(item.get("is_h265")) or "hvc1" in urls[0],
        })
    if not candidates:
        play = video.get("play_addr") or {}
        urls = [url for url in (play.get("url_list") or []) if isinstance(url, str)]
        if urls:
            candidates.append({
                "id": "douyin-play", "label": "原文件 · MP4", "url": urls[0],
                "ext": "mp4", "audioOnly": False,
                "_order": (0, int(play.get("data_size") or 0)), "_h265": "hvc1" in urls[0],
            })

    # 浏览器预览以 H.264 为准，没有 H.264 时才退回 H.265。
    candidates = [item for item in candidates if not item["_h265"]] or candidates
    candidates.sort(key=lambda item: item["_order"], reverse=True)
    formats, labels = [], set()
    for item in candidates:
        if item["label"] in labels:
            continue
        try:
            validate_url(item["url"], entry=True)
        except ValueError:
            continue
        labels.add(item["label"])
        formats.append({key: item[key] for key in ("id", "label", "url", "ext", "audioOnly")})
    return formats[:6]


def image_urls(images):
    result = []
    for item in images or []:
        urls = [url for url in (item.get("url_list") or []) if isinstance(url, str)]
        # 抖音图集在同一列表里混有带水印副本，优先取无水印原图。
        clean = [url for url in urls if "watermark=1" not in url] or urls
        if clean:
            result.append({"url": clean[0]})
    return result


def parse_aweme(aweme):
    if not aweme:
        raise ValueError("抖音未返回该作品，请确认是公开的单个作品链接")
    data = {
        "platformName": "抖音",
        "title": (aweme.get("desc") or "").strip() or "抖音作品",
        "author": (aweme.get("author") or {}).get("nickname"),
        "engine": engine_info(),
    }
    images = image_urls(aweme.get("images"))
    if images:
        return {**data, "type": "image", "url": images[0]["url"], "images": images}
    formats = video_formats(aweme.get("video") or {})
    if not formats:
        raise ValueError("此抖音作品没有可直接下载的完整文件，请换一条公开作品")
    return {**data, "type": "video", "url": formats[0]["url"], "formats": formats}


def douyin_extract(url):
    host = validate_url(url, entry=True)
    if not is_douyin(host):
        raise ValueError("这不是抖音作品链接")
    return parse_aweme(aweme_detail(aweme_id(url)))
