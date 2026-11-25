import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("extract", Path(__file__).parents[1] / "api/extract.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ExtractTests(unittest.TestCase):
    def mock_info(self, info):
        mocked = patch.object(module, "LightVidDL")
        downloader = mocked.start()
        self.addCleanup(mocked.stop)
        downloader.return_value.__enter__.return_value.extract_info.return_value = info

    def test_only_complete_files_are_shown(self):
        self.mock_info({"title": "Video", "formats": [
            {"format_id": "silent", "url": "https://cdn.example/a", "protocol": "https",
             "vcodec": "h264", "acodec": "none", "height": 1080, "ext": "mp4"},
            {"format_id": "complete", "url": "https://cdn.example/b", "protocol": "https",
             "vcodec": "h264", "acodec": "aac", "height": 720, "ext": "mp4"},
            {"format_id": "audio", "url": "https://cdn.example/c", "protocol": "https",
             "vcodec": "none", "acodec": "aac", "ext": "m4a"},
        ]})
        result = module.extract("https://www.youtube.com/watch?v=test")
        self.assertEqual(result["formats"][0]["id"], "complete")
        self.assertEqual(len(result["formats"]), 2)

    def test_unsafe_entry_urls_are_rejected(self):
        for url in ("https://localhost/a", "https://127.0.0.1/a", "https://host.local/a",
                    "http://youtube.com/a", "https://user:password@youtube.com/a"):
            with self.assertRaises(ValueError):
                module.extract(url)

    def test_unlisted_website_uses_own_engine(self):
        self.mock_info({"title": "Public", "extractor_key": "Generic", "formats": [
            {"url": "https://media.example.org/video.mp4", "vcodec": "h264",
             "acodec": "aac", "ext": "mp4"},
        ]})
        result = module.extract("https://unlisted.example.org/watch")
        self.assertEqual(result["platformName"], "Generic")
        self.assertFalse(result["engine"]["thirdPartyParser"])

    def test_drm_and_private_media_are_not_offered(self):
        self.mock_info({"formats": [
            {"url": "https://127.0.0.1/file", "vcodec": "h264", "acodec": "aac"},
            {"url": "https://cdn.example/drm", "vcodec": "h264", "acodec": "aac", "has_drm": True},
        ]})
        with self.assertRaises(ValueError):
            module.extract("https://unlisted.example.org/watch")

    def test_playlist_is_rejected(self):
        self.mock_info({"_type": "playlist"})
        with self.assertRaises(ValueError):
            module.extract("https://youtube.com/playlist?list=x")

    def test_douyin_uses_own_signed_parser(self):
        with patch.object(module, "LightVidDL") as downloader:
            with patch.object(module, "douyin_extract",
                              return_value={"platformName": "抖音", "type": "video"}) as douyin:
                result = module.extract("https://v.douyin.com/CbU9vClGu9U/")
        self.assertEqual(result["platformName"], "抖音")
        douyin.assert_called_once_with("https://v.douyin.com/CbU9vClGu9U/")
        downloader.assert_not_called()


if __name__ == "__main__":
    unittest.main()
