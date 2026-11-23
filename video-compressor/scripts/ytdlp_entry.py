"""独立打包的下载引擎入口，不要求用户安装 Python。"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import yt_dlp
from lightvid_engine import LightVidDL, engine_info

# yt-dlp's CLI now uses the same embedded public-network transport as the website.
yt_dlp.YoutubeDL = LightVidDL

if __name__ == "__main__":
    if "--lightvid-info" in sys.argv:
        print(json.dumps(engine_info()))
    else:
        yt_dlp.main()
