import assert from 'node:assert/strict'
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
const app=process.env.LIGHTVID_APP,ffmpeg=app?join(app,'Contents/MacOS/ffmpeg'):process.env.LIGHTVID_FFMPEG||'/opt/homebrew/bin/ffmpeg',engine=app?join(app,'Contents/MacOS/yt-dlp'):process.env.LIGHTVID_YTDLP||'yt-dlp',dir=await mkdtemp(join(tmpdir(),'lightvid-mp3-'))
function run(binary,args){const r=spawnSync(binary,args,{encoding:'utf8',timeout:60000,maxBuffer:1024*1024});assert.equal(r.status,0,r.stderr||r.error?.message);return r}
try{const source=join(dir,'result.mp4'),output=join(dir,'result.mp3');run(ffmpeg,['-v','error','-y','-f','lavfi','-i','color=c=gray:s=160x120:d=1','-f','lavfi','-i','sine=frequency=440:duration=1','-c:v','libx264','-c:a','aac','-shortest',source]);
// Reuse an already downloaded fixture to exercise the packaged postprocessor
// without bypassing the public-network guard or making an external request.
const metadata=join(dir,'fixture.json');await writeFile(metadata,JSON.stringify({id:'fixture',title:'fixture',url:'https://example.com/fixture.mp4',webpage_url:'https://example.com/fixture',ext:'mp4',extractor:'generic',extractor_key:'Generic',protocol:'https',vcodec:'h264',acodec:'aac'}));
run(engine,['--ignore-config','--no-playlist','--ffmpeg-location',ffmpeg,'-f','ba/b','--extract-audio','--audio-format','mp3','--audio-quality','192K','-o',join(dir,'result.%(ext)s'),'--load-info-json',metadata]);assert((await readFile(output)).length>1000);const info=run(ffmpeg,['-i',output,'-map','0:a:0','-f','null','-']).stderr;assert.match(info,/Audio: mp3/);assert.doesNotMatch(info,/Video:/);console.log('PACKAGED MP3: audio extraction, actual MP3 codec and decode PASS')
}finally{await rm(dir,{recursive:true,force:true})}
