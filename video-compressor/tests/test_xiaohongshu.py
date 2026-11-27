import sys,json,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).parents[1]))
from lightvid_xiaohongshu import LightVidXiaoHongShuIE, media_url, normalize_share_url, parse_note
from lightvid_engine import LightVidDL
from yt_dlp.utils import ExtractorError
ID='674051740000000007027a15'
TOKEN='CBgeL8%2Btest%2Fabc%3D'


def state(note=None,key=ID):
    return {'note':{'noteDetailMap':{key:{'note':note or {
        'noteId':ID,'title':'视频','user':{'nickname':'作者'},
        'video':{'media':{'stream':{'h264':[{'masterUrl':'http://sns-video-bd.xhscdn.com/stream/file.mp4?sign=a%2Fb',
                         'backupUrls':['https://sns-video-hw.xhscdn.com/backup.mp4'], 'height':1080,'width':1920}]}}}}
    }}}}


class XhsTests(unittest.TestCase):
    def test_only_short_links_upgraded_and_signature_unchanged(self):
        url=f'http://xhslink.com/o/share?xsec_token={TOKEN}&xsec_source=app_share'
        self.assertEqual(normalize_share_url(url),url.replace('http:','https:',1))
        for bad in ['http://xhslink.com.attacker.example/a','http://u:p@xhslink.com/a','http://xhslink.com:8080/a','http://example.org/a']:
            self.assertEqual(normalize_share_url(bad),bad)

    def test_streams_work_without_origin_key_or_codec_metadata(self):
        info=parse_note(state(),ID)
        self.assertEqual(info['uploader'],'作者')
        self.assertEqual(len(info['formats']),2)
        fmt=info['formats'][0]
        self.assertEqual(fmt['url'],'https://sns-video-bd.xhscdn.com/stream/file.mp4?sign=a%2Fb')
        self.assertEqual(fmt['acodec'],'aac')
        self.assertEqual(fmt['http_headers']['Referer'],'https://www.xiaohongshu.com/')

    def test_route_map_uses_matching_note_not_recommendations(self):
        self.assertEqual(parse_note(state(key='route-key'),ID)['id'],ID)
        with self.assertRaises(ExtractorError):parse_note(state(), '0'*24)

    def test_non_cdn_credentials_bad_ports_and_drm_are_excluded(self):
        for url in ['http://xhscdn.com.attacker.example/a','http://127.0.0.1/a','https://u:p@sns-video-bd.xhscdn.com/a','https://sns-video-bd.xhscdn.com:8000/a','file:///etc/passwd']:
            self.assertIsNone(media_url(url))
        data=state();data['note']['noteDetailMap'][ID]['note']['video']['media']['stream']['h264'][0]['hasDrm']=True
        with self.assertRaises(ExtractorError):parse_note(data,ID)

    def test_new_domains_profiles_short_links_and_exact_host_match(self):
        for url in [f'https://www.rednote.com/explore/{ID}?xsec_token={TOKEN}',f'https://xiaohongshu.com/discovery/item/{ID}',f'https://www.xiaohongshu.com/user/profile/abcdef/{ID}','https://xhslink.com/o/share']:
            self.assertTrue(LightVidXiaoHongShuIE.suitable(url),url)
        self.assertFalse(LightVidXiaoHongShuIE.suitable(f'https://xiaohongshu.com.attacker.example/explore/{ID}'))

    def test_shared_engine_prioritizes_adapter_and_parses_undefined(self):
        url=f'https://www.xiaohongshu.com/explore/{ID}?xsec_token={TOKEN}'
        page='window.__INITIAL_STATE__='+json.dumps(state(),ensure_ascii=False)[:-1]+',"optional":undefined};'
        with LightVidDL({'quiet':True,'skip_download':True}) as dl:
            first=next(iter(dl._ies.values()))
            self.assertIsInstance(first,LightVidXiaoHongShuIE)
            with patch.object(first,'_download_webpage_handle',return_value=(page,SimpleNamespace(url=url))) as fetch:
                info=first.extract(url)
            self.assertEqual(fetch.call_args.args[0],url)
            self.assertEqual(info['formats'][0]['height'],1080)

    def test_short_redirect_preserves_final_note_and_login_is_actionable(self):
        final=f'https://www.rednote.com/explore/{ID}?xsec_token={TOKEN}'
        ie=LightVidXiaoHongShuIE(LightVidDL({'quiet':True,'skip_download':True}))
        with patch.object(ie,'_download_webpage_handle',return_value=('window.__INITIAL_STATE__='+json.dumps(state()),SimpleNamespace(url=final))):
            self.assertEqual(ie._real_extract('https://xhslink.com/o/abc')['id'],ID)
        with patch.object(ie,'_download_webpage_handle',return_value=('<html>login</html>',SimpleNamespace(url='https://www.xiaohongshu.com/404'))):
            with self.assertRaisesRegex(ExtractorError,'登录'):ie._real_extract('https://xhslink.com/o/abc')

if __name__=='__main__':unittest.main()
