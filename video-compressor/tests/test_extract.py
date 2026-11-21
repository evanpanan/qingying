import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("extract", Path(__file__).parents[1] / "api/extract.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ExtractTests(unittest.TestCase):
    def mock_info(self, info):
        mocked = patch.object(module.yt_dlp, "YoutubeDL")
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

    def test_private_urls_and_lookalikes_are_rejected(self):
        for url in ("https://localhost/a", "https://youtube.com.attacker.example/a",
                    "http://youtube.com/a", "https://user:password@youtube.com/a"):
            with self.assertRaises(ValueError):
                module.extract(url)

    def test_playlist_is_rejected(self):
        self.mock_info({"_type": "playlist"})
        with self.assertRaises(ValueError):
            module.extract("https://youtube.com/playlist?list=x")


if __name__ == "__main__":
    unittest.main()
