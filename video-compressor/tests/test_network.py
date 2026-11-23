import sys
from pathlib import Path
import socket
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).parents[1]))
from lightvid_engine import (
    LightVidDL, PublicRH, PublicHTTPHandler, public_addresses,
    public_connection, validate_url, engine_info,
)
from yt_dlp.networking import Request


def address(ip):
    return (socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 443))


class NetworkTests(unittest.TestCase):
    def test_public_unlisted_urls_are_eligible(self):
        self.assertEqual(validate_url("https://unlisted.example.org/watch", entry=True),
                         "unlisted.example.org")

    def test_protocol_credentials_and_private_names_blocked(self):
        for url in ["file:///etc/passwd", "ftp://public.example.org/a",
                    "https://127.0.0.1/a", "https://[::1]/a", "https://host.internal/a",
                    "https://example.org:8000/a", "https://u:p@example.org/a",
                    "https://example.org/\nHost:evil"]:
            with self.assertRaises(ValueError, msg=url):
                validate_url(url)

    def test_dns_private_reserved_and_mixed_answers_blocked(self):
        for ip in ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.1",
                   "100.64.0.1", "192.0.2.1", "198.18.0.1"]:
            with patch("lightvid_engine.socket.getaddrinfo",
                       return_value=[address("8.8.8.8"), address(ip)]):
                with self.assertRaises(ValueError, msg=ip):
                    public_addresses("example.org", 443)

    def test_connection_pins_validated_ip_without_second_dns(self):
        connection = MagicMock()
        with patch("lightvid_engine.socket.getaddrinfo", return_value=[address("8.8.8.8")]) as dns:
            with patch("lightvid_engine.socket.socket", return_value=connection):
                self.assertIs(public_connection(("example.org", 443), timeout=2), connection)
        dns.assert_called_once()
        connection.connect.assert_called_once_with(("8.8.8.8", 443))

    def test_redirect_target_is_checked_before_open(self):
        import urllib.request
        transport = PublicHTTPHandler()
        with patch.object(transport, "do_open") as open_request:
            with self.assertRaises(ValueError):
                transport.https_open(urllib.request.Request("https://127.0.0.1/secret"))
            open_request.assert_not_called()

    def test_no_other_transports_or_proxy_fallback(self):
        with LightVidDL({"quiet": True, "skip_download": True}) as downloader:
            director = downloader._request_director
            self.assertEqual(len(director.handlers), 1)
            handler = next(iter(director.handlers.values()))
            self.assertIsInstance(handler, PublicRH)
            self.assertEqual(handler._get_proxies(Request("https://example.org")), {})
            with self.assertRaises(Exception):
                downloader.urlopen("file:///etc/passwd")

    def test_engine_count_is_runtime_derived(self):
        result = engine_info()
        self.assertGreater(result["extractors"], 1000)
        self.assertTrue(result["generic"])
        self.assertFalse(result["thirdPartyParser"])


if __name__ == "__main__":
    unittest.main()
