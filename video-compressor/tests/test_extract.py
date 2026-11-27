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


class XhsExtractTests(unittest.TestCase):
    def test_http_short_entry_upgrades_and_complete_stream_is_returned(self):
        with patch.object(module,'LightVidDL') as dl:
            dl.return_value.__enter__.return_value.extract_info.return_value={
                'extractor_key':'LightVidXiaoHongShu','title':'小红书视频','formats':[
                    {'url':'https://sns-video-bd.xhscdn.com/video.mp4?sign=a%2Fb','ext':'mp4','vcodec':'h264','acodec':'aac','height':1080}]}
            result=module.extract('http://xhslink.com/o/a?xsec_token=a%2Fb%3D')
            dl.return_value.__enter__.return_value.extract_info.assert_called_once_with('https://xhslink.com/o/a?xsec_token=a%2Fb%3D',download=False)
            self.assertEqual(result['platformName'],'小红书')
            self.assertEqual(result['type'],'video')
    def test_expired_or_gated_note_has_actionable_error(self):
        message=module.error_message(Exception('ERROR: [LightVidXiaoHongShu] 小红书未返回作品'))
        self.assertIn('xsec_token',message)
        self.assertIn('登录',message)
