import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {dirname,resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),app=process.env.LIGHTVID_APP,runtime=app?join(app,'Contents/Resources/desktop-ai'):join(root,'desktop-ai'),node=app?join(app,'Contents/MacOS/node'):process.execPath,ffmpeg=app?join(app,'Contents/MacOS/ffmpeg'):(process.env.LIGHTVID_FFMPEG||'ffmpeg'),dir=await mkdtemp(join(tmpdir(),'lightvid-translation-'))
function run(binary,args){const result=spawnSync(binary,args,{encoding:'utf8',maxBuffer:16*1024*1024,timeout:12*60*1000});if(result.status!==0)throw new Error(result.stderr||result.error?.message||`Exit ${result.status}`);return result.stdout}
try{
 const originalSubtitles=join(dir,'original.srt');await writeFile(originalSubtitles,'1\n00:00:00,000 --> 00:00:05,000\nOriginal subtitle to preserve\n')
 const input=join(dir,'source.mp4'),output=join(dir,'english.mp4'),spec=join(dir,'spec.json')
 run(ffmpeg,['-v','error','-y','-f','lavfi','-i','color=c=green:s=320x180:r=24:d=6','-i',join(root,'tests/fixtures/translation-zh.mp3'),'-i',originalSubtitles,'-vf','drawbox=x=230:y=10:w=70:h=20:color=black:t=fill','-af','apad','-t','6','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-c:s','mov_text',input])
 await writeFile(spec,JSON.stringify({input,output,ffmpeg,cacheDir:process.env.LIGHTVID_SPEECH_CACHE||join(tmpdir(),'lightvid-speech-models'),start:0,end:6,width:320,height:180,voice:'af_heart',removeRegions:true,repairMethod:'quick',regions:[{x:.7,y:.03,width:.27,height:.15}]}))
 console.log(run(node,[join(runtime,'translate.mjs'),spec]))
 const srt=await readFile(join(dir,'english.srt'),'utf8');assert(/[A-Za-z]{3,}/.test(srt));assert(srt.includes('-->'));assert((await readFile(output)).length>10000)
 run(ffmpeg,['-v','error','-i',output,'-map','0:a:0','-t','0.1','-f','null','-'])
 console.log('PACKAGED REAL TRANSLATION: Chinese speech + English dub + burned subtitles + region repair PASS')
 const common=JSON.parse(await readFile(spec,'utf8'))
 for(const [name,subtitles,dub] of [['subtitles',true,false],['dub',false,true]]){
  const destination=join(dir,name+'.mp4');await writeFile(spec,JSON.stringify({...common,output:destination,subtitles,dub,removeRegions:false,regions:[]}));console.log(run(node,[join(runtime,'translate.mjs'),spec]));assert((await readFile(destination)).length>1000)
 }
 function packetHash(file,kind){const result=spawnSync(ffmpeg,['-v','error','-i',file,'-map',`0:${kind}:0`,'-c','copy',...(kind==='v'?['-bsf:v','h264_mp4toannexb','-f','h264']:['-f','adts']),'-'],{maxBuffer:16*1024*1024});assert.equal(result.status,0,result.stderr?.toString());return createHash('sha256').update(result.stdout).digest('hex')}
 assert.equal(packetHash(input,'v'),packetHash(join(dir,'dub.mp4'),'v'))
 const preserved=run(ffmpeg,['-v','error','-i',join(dir,'dub.mp4'),'-map','0:s:0','-f','srt','-']);assert(preserved.includes('Original subtitle to preserve'))
 function samples(file){const result=spawnSync(ffmpeg,['-v','error','-i',file,'-map','0:a:0','-ar','16000','-ac','1','-f','f32le','-'],{maxBuffer:8*1024*1024});assert.equal(result.status,0);return new Float32Array(result.stdout.buffer.slice(result.stdout.byteOffset,result.stdout.byteOffset+result.stdout.byteLength))}
 const a=samples(input),b=samples(join(dir,'subtitles.mp4'));let cross=0,aa=0,bb=0;for(let i=0;i<Math.min(a.length,b.length);i++){cross+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}assert(cross/Math.sqrt(aa*bb)>.95)
 console.log('PACKAGED INDEPENDENT MODES: subtitle-only keeps original sound; dub-only keeps exact video and existing subtitle track PASS')
 const longInput=join(dir,'long.mp4'),longOutput=join(dir,'long-english.mp4');run(ffmpeg,['-v','error','-y','-f','lavfi','-i','color=c=green:s=320x180:r=24:d=65','-i',join(root,'tests/fixtures/translation-zh.mp3'),'-filter_complex','[1:a]asplit=2[a][b];[b]adelay=60000[late];[a][late]amix=inputs=2:duration=longest,apad[mix]','-map','0:v','-map','[mix]','-t','65','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',longInput]);await writeFile(spec,JSON.stringify({...common,input:longInput,output:longOutput,end:65,subtitles:true,dub:false,removeRegions:false,regions:[]}));console.log(run(node,[join(runtime,'translate.mjs'),spec]));assert(/00:01:0[0-5],/.test(await readFile(join(dir,'long-english.srt'),'utf8')));assert(run(ffmpeg,['-v','error','-ss','64','-i',longOutput,'-frames:v','1','-f','image2pipe','-vcodec','png','-']).length>100);console.log('PACKAGED LONG VIDEO: 65 seconds across speech segments with global subtitle times PASS')

}finally{await rm(dir,{recursive:true,force:true})}
