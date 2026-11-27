"""LightVid's embedded extractor transport: public hosts, pinned DNS, no proxies."""
import http.client
import ipaddress
import socket
import time
import urllib.request
from urllib.parse import urlsplit

import yt_dlp
from yt_dlp.networking._urllib import HTTPHandler, RedirectHandler, UrllibRH


def validate_url(url, *, entry=False):
    try:
        parsed = urlsplit(url)
        host = (parsed.hostname or "").rstrip(".").lower()
        port = parsed.port
        if (parsed.scheme not in (("https",) if entry else ("http", "https"))
                or parsed.username is not None or parsed.password is not None
                or port not in (None, 443 if parsed.scheme == "https" else 80)
                or not host or "." not in host
                or host.endswith((".localhost", ".local", ".internal"))
                or any(ord(char) < 33 for char in url)):
            raise ValueError()
        try:
            ipaddress.ip_address(host)
        except ValueError:
            return host
    except (ValueError, TypeError):
        pass
    raise ValueError("请使用公开网站的 HTTPS 作品链接，不支持本机、IP 或私网地址")


def public_addresses(host, port):
    records = socket.getaddrinfo(host, port, family=socket.AF_INET, type=socket.SOCK_STREAM)
    if not records or any(not ipaddress.ip_address(record[4][0]).is_global
                          for record in records):
        raise ValueError("该网站指向非公开网络地址，已阻止访问")
    return records


def public_connection(address, timeout=socket._GLOBAL_DEFAULT_TIMEOUT,
                      source_address=None, **_kwargs):
    host, port = address
    validate_url(f"{'https' if port == 443 else 'http'}://{host}:{port}")
    records = public_addresses(host, port)
    last_error = None
    # Connect to the exact addresses we validated, not a second DNS lookup.
    for family, kind, proto, _, target in records:
        connection = socket.socket(family, kind, proto)
        try:
            if timeout is not socket._GLOBAL_DEFAULT_TIMEOUT:
                connection.settimeout(timeout)
            if source_address:
                connection.bind(source_address)
            connection.connect(target)
            return connection
        except OSError as error:
            last_error = error
            connection.close()
    raise last_error or OSError("无法连接作品网站")


class PublicHTTPConnection(http.client.HTTPConnection):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._create_connection = public_connection


class PublicHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # HTTPSConnection retains TLS certificate checks and hostname/SNI.
        self._create_connection = public_connection


class PublicHTTPHandler(HTTPHandler):
    def http_open(self, request):
        validate_url(request.full_url)
        return self.do_open(PublicHTTPConnection, request)

    def https_open(self, request):
        validate_url(request.full_url)
        return self.do_open(PublicHTTPSConnection, request, context=self._context)


class PublicRH(UrllibRH):
    _SUPPORTED_URL_SCHEMES = ("http", "https")
    _SUPPORTED_PROXY_SCHEMES = ()
    RH_NAME = "LightVid public network"

    def __init__(self, **kwargs):
        kwargs["proxies"] = {}
        super().__init__(**kwargs)
        self._deadline = time.monotonic() + 45
        self._requests_left = 100

    def _get_proxies(self, request):
        return {}

    def _create_instance(self, proxies, cookiejar, legacy_ssl_support=None):
        opener = urllib.request.OpenerDirector()
        for handler in [
            urllib.request.ProxyHandler({}),
            PublicHTTPHandler(context=self._make_sslcontext()),
            urllib.request.HTTPCookieProcessor(cookiejar),
            urllib.request.UnknownHandler(),
            urllib.request.HTTPDefaultErrorHandler(),
            urllib.request.HTTPErrorProcessor(),
            RedirectHandler(),
        ]:
            opener.add_handler(handler)
        opener.addheaders = []
        return opener

    def _send(self, request):
        validate_url(request.url)
        self._requests_left -= 1
        remaining = self._deadline - time.monotonic()
        if remaining <= 0 or self._requests_left < 0:
            raise ValueError("解析请求过多或超时，请使用桌面版重试")
        request.extensions["timeout"] = min(12, remaining)
        return super()._send(request)


class LightVidDL(yt_dlp.YoutubeDL):
    def add_default_info_extractors(self):
        from lightvid_xiaohongshu import LightVidXiaoHongShuIE
        self.add_info_extractor(LightVidXiaoHongShuIE(self))
        super().add_default_info_extractors()

    def build_request_director(self, handlers, preferences=None):
        # No fallback to requests/curl/impersonation or file/FTP handlers.
        director = super().build_request_director([PublicRH])
        if not self.params.get("skip_download"):
            for handler in director.handlers.values():
                handler._deadline = float("inf")
                handler._requests_left = float("inf")
        return director


def engine_info():
    from yt_dlp.extractor import gen_extractor_classes
    return {
        "name": "LightVid / yt-dlp",
        "version": yt_dlp.version.__version__,
        "extractors": sum(1 for item in gen_extractor_classes()
                          if item.IE_NAME != "generic"),
        "generic": True,
        "thirdPartyParser": False,
    }

