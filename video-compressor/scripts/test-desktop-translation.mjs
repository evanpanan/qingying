import assert from 'node:assert/strict'
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {dirname,resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),app=process.env.LIGHTVID_APP,runtime=app?join(app,'Contents/Resources/desktop-ai'):join(root,'desktop-ai'),node=app?join(app,'Contents/MacOS/node'):process.execPath,ffmpeg=app?join(app,'Contents/MacOS/ffmpeg'):(process.env.LIGHTVID_FFMPEG||'ffmpeg'),dir=await mkdtemp(join(tmpdir(),'lightvid-translation-'))
function run(binary,args){const result=spawnSync(binary,args,{encoding:'utf8',maxBuffer:16*1024*1024,timeout:12*60*1000});if(result.status!==0)throw new Error(result.stderr||result.error?.message||`Exit ${result.status}`);return result.stdout}
try{
 const input=join(dir,'source.mp4'),output=join(dir,'english.mp4'),spec=join(dir,'spec.json')
 run(ffmpeg,['-v','error','-y','-f','lavfi','-i','color=c=green:s=320x180:r=24:d=6','-i',join(root,'tests/fixtures/translation-zh.mp3'),'-vf','drawbox=x=230:y=10:w=70:h=20:color=black:t=fill','-af','apad','-t','6','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',input])
 await writeFile(spec,JSON.stringify({input,output,ffmpeg,cacheDir:process.env.LIGHTVID_SPEECH_CACHE||join(tmpdir(),'lightvid-speech-models'),start:0,end:6,width:320,height:180,voice:'af_heart',removeRegions:true,repairMethod:'quick',regions:[{x:.7,y:.03,width:.27,height:.15}]}))
 console.log(run(node,[join(runtime,'translate.mjs'),spec]))
 const srt=await readFile(join(dir,'english.srt'),'utf8');assert(/[A-Za-z]{3,}/.test(srt));assert(srt.includes('-->'));assert((await readFile(output)).length>10000)
 run(ffmpeg,['-v','error','-i',output,'-map','0:a:0','-t','0.1','-f','null','-'])
 console.log('PACKAGED REAL TRANSLATION: Chinese speech + English dub + burned subtitles + region repair PASS')
}finally{await rm(dir,{recursive:true,force:true})}
