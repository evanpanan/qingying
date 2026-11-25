import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    "lightvid_douyin", Path(__file__).parents[1] / "lightvid_douyin.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DouyinParseTests(unittest.TestCase):
    def test_share_links_are_recognised(self):
        for url, expected in (
            ("https://www.douyin.com/video/7422259756443667775", "7422259756443667775"),
            ("https://www.douyin.com/note/7525082444551310602", "7525082444551310602"),
            ("https://www.douyin.com/user/MS4wLjAB?modal_id=7422259756443667775",
             "7422259756443667775"),
        ):
            self.assertEqual(module.aweme_id(url), expected)

    def test_video_quality_is_sorted_and_deduplicated(self):
        aweme = {"desc": " 作品 ", "author": {"nickname": "作者"}, "video": {"bit_rate": [
            {"gear_name": "normal_540_0", "play_addr": {"url_list": ["https://v.douyinvod.com/540"],
             "height": 540, "data_size": 100}},
            {"gear_name": "low_720_0", "play_addr": {"url_list": ["https://v.douyinvod.com/720"],
             "height": 720, "data_size": 90}},
            {"gear_name": "normal_720_0", "play_addr": {"url_list": ["https://v.douyinvod.com/720b"],
             "height": 720, "data_size": 300}},
            {"gear_name": "h265_720_0", "is_h265": 1,
             "play_addr": {"url_list": ["https://v.douyinvod.com/hvc1"], "height": 720}},
        ]}}
        result = module.parse_aweme(aweme)
        self.assertEqual(result["type"], "video")
        self.assertEqual(result["title"], "作品")
        self.assertEqual(result["author"], "作者")
        self.assertEqual([f["label"] for f in result["formats"]], ["720p · MP4", "540p · MP4"])
        self.assertEqual(result["formats"][0]["url"], "https://v.douyinvod.com/720b")
        self.assertFalse(result["formats"][0]["audioOnly"])

    def test_play_addr_is_used_when_no_bit_rate(self):
        aweme = {"video": {"height": 1080, "play_addr": {"url_list": ["https://v.douyinvod.com/x"]}}}
        result = module.parse_aweme(aweme)
        self.assertEqual(result["formats"][0]["label"], "原文件 · MP4")

    def test_private_media_is_not_offered(self):
        aweme = {"video": {"bit_rate": [
            {"play_addr": {"url_list": ["https://127.0.0.1/private"], "height": 720}},
        ]}}
        with self.assertRaises(ValueError):
            module.parse_aweme(aweme)

    def test_image_post_returns_clean_originals(self):
        aweme = {"desc": "图集", "images": [
            {"url_list": ["https://p3.douyinpic.com/a?watermark=1", "https://p3.douyinpic.com/a"]},
            {"url_list": ["https://p6.douyinpic.com/b"]},
        ]}
        result = module.parse_aweme(aweme)
        self.assertEqual(result["type"], "image")
        self.assertEqual([image["url"] for image in result["images"]],
                         ["https://p3.douyinpic.com/a", "https://p6.douyinpic.com/b"])

    def test_empty_response_is_rejected(self):
        with self.assertRaises(ValueError):
            module.parse_aweme({})


if __name__ == "__main__":
    unittest.main()
