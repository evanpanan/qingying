"""Public Xiaohongshu notes: retain signed share URLs and normalize CDN streams.

No login/captcha bypass, third-party parser or caller-supplied request headers.
Transport and redirects continue through LightVidDL's public-network handler.
"""
import re
from urllib.parse import urlsplit, urlunsplit
from yt_dlp.extractor.common import InfoExtractor
from yt_dlp.utils import ExtractorError, js_to_json, int_or_none

REFERER = 'https://www.xiaohongshu.com/'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36')
HEADERS = {'Referer': REFERER, 'User-Agent': UA}
NOTE_ID = re.compile(r'/(?:explore|discovery/item|user/profile/[a-f0-9]+)/([a-f0-9]{24})(?:[/?#]|$)')


def normalize_share_url(url):
    parsed = urlsplit(url)
    if (parsed.scheme == 'http' and parsed.hostname in ('xhslink.com', 'www.xhslink.com')
            and not parsed.username and not parsed.password and parsed.port in (None, 80)):
        # The app still emits HTTP short links; never request them in clear text.
        return urlunsplit(('https', parsed.hostname, parsed.path, parsed.query, parsed.fragment))
    return url


def media_url(raw):
    if not isinstance(raw, str):
        return None
    try:
        parsed = urlsplit(raw)
        host = (parsed.hostname or '').lower().rstrip('.')
        if (not (host == 'xhscdn.com' or host.endswith('.xhscdn.com'))
                or parsed.username or parsed.password or parsed.port not in (None, 80, 443)
                or parsed.scheme not in ('http', 'https')
                or any(ord(c) < 33 for c in raw)):
            return None
        # Web state still supplies HTTP URLs; these CDNs serve the same signed path over TLS.
        return urlunsplit(('https', host, parsed.path, parsed.query, ''))
    except ValueError:
        return None


def note_formats(note):
    video = note.get('video') or {}
    streams = (video.get('media') or {}).get('stream') or {}
    formats, seen = [], set()
    for codec, variants in streams.items() if isinstance(streams, dict) else []:
        for index, item in enumerate(variants if isinstance(variants, list) else [variants]):
            if not isinstance(item, dict) or item.get('has_drm') or item.get('hasDrm'):
                continue
            backups = item.get('backupUrls') or []
            for backup_index, raw in enumerate([item.get('masterUrl'), *(backups if isinstance(backups, list) else [])]):
                url = media_url(raw)
                if not url or url in seen:
                    continue
                seen.add(url)
                formats.append({
                    'format_id': f'{codec}-{index}-{len(formats)}', 'url': url, 'ext': 'mp4',
                    'source_preference': -backup_index,
                    'width': int_or_none(item.get('width')), 'height': int_or_none(item.get('height')),
                    'vcodec': str(item.get('videoCodec') or codec),
                    # Missing codec metadata is not equivalent to an explicitly silent stream.
                    'acodec': str(item.get('audioCodec') or 'aac'),
                    'http_headers': HEADERS,
                })
    # Original keys are optional now; don't require them or probe them ahead of valid streams.
    key = (video.get('consumer') or {}).get('originVideoKey')
    if not formats and isinstance(key, str) and re.fullmatch(r'[\w/-]+', key):
        url = media_url('https://sns-video-bd.xhscdn.com/' + key.lstrip('/'))
        if url:
            formats.append({'format_id': 'original', 'url': url, 'ext': 'mp4', 'http_headers': HEADERS})
    return formats


def parse_note(state, identifier):
    mapping = (state.get('note') or {}).get('noteDetailMap') or {}
    entry = mapping.get(identifier) or {}
    note = entry.get('note') or {}
    # New page builds may key the map by a route key instead of the note ID.
    if not note:
        note = next((entry.get('note') for entry in mapping.values()
                     if isinstance(entry, dict) and isinstance(entry.get('note'), dict)
                     and entry['note'].get('noteId') == identifier), {})
    if not note or (note.get('noteId') and note['noteId'] != identifier):
        raise ExtractorError('小红书未返回该作品，请重新从 App 复制完整分享链接（保留 xsec_token）；作品也可能需要登录或已删除', expected=True)
    formats = note_formats(note)
    if not formats:
        raise ExtractorError('小红书未返回可下载视频；请确认是公开视频，并重新复制完整分享链接', expected=True)
    user = note.get('user') or {}
    return {'id': identifier, 'title': note.get('title') or note.get('desc') or '小红书视频',
            'description': note.get('desc'), 'uploader': user.get('nickname') or user.get('nickName'),
            'uploader_id': user.get('userId'), 'formats': formats, 'http_headers': HEADERS}


class LightVidXiaoHongShuIE(InfoExtractor):
    IE_NAME = 'LightVidXiaoHongShu'
    _VALID_URL = (r'https?://(?:(?:www\.)?(?:xiaohongshu|rednote)\.com/'
                  r'(?:explore|discovery/item|user/profile/[a-f0-9]+)/[a-f0-9]{24}(?:[/?#]|$)'
                  r'|(?:www\.)?xhslink\.com/[^\s]+)')

    def _real_extract(self, url):
        url = normalize_share_url(url)
        match = NOTE_ID.search(url)
        webpage, response = self._download_webpage_handle(
            url, match.group(1) if match else 'share', headers=HEADERS)
        # Keep all original signed query parameters while following short links.
        match = NOTE_ID.search(response.url)
        if not match:
            raise ExtractorError('小红书分享链接已失效或要求登录，请从 App 重新复制完整作品链接', expected=True)
        identifier = match.group(1)
        state = self._search_json(r'window\.__INITIAL_STATE__\s*=', webpage,
                                  'initial state', identifier, transform_source=js_to_json, fatal=False)
        if not state:
            raise ExtractorError('小红书未返回公开作品数据，可能需要登录或验证；请重新复制分享链接后重试', expected=True)
        return parse_note(state, identifier)
