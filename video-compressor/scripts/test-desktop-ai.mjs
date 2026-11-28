import assert from 'node:assert/strict'
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {dirname,resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),app=process.env.LIGHTVID_APP
const runtime=app?join(app,'Contents/Resources/desktop-ai'):join(root,'desktop-ai'),node=app?join(app,'Contents/MacOS/node'):process.execPath,ffmpeg=app?join(app,'Contents/MacOS/ffmpeg'):(process.env.LIGHTVID_FFMPEG||'ffmpeg')
const dir=await mkdtemp(join(tmpdir(),'lightvid-ai-test-'))
function run(command,args){const result=spawnSync(command,args,{encoding:'utf8',maxBuffer:8*1024*1024,timeout:180000});if(result.status!==0)throw new Error(result.stderr||result.error?.message||`Exit ${result.status}`);return result.stdout}
try{
 const input=join(dir,'source.mp4')
 run(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=green:s=320x180:r=12:d=65','-f','lavfi','-i','sine=frequency=440:duration=65','-vf','drawbox=x=210:y=10:w=80:h=25:color=black:t=fill,drawbox=x=40:y=140:w=240:h=20:color=black:t=fill','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',input])
 const common={input,ffmpeg,mode:'ai',regions:[{x:210/320,y:10/180,width:80/320,height:25/180},{x:40/320,y:140/180,width:240/320,height:20/180}],width:320,height:180,start:0,end:21,time:0}
 const spec=join(dir,'spec.json'),preview=join(dir,'preview.png'),output=join(dir,'repaired.mp4')
 await writeFile(spec,JSON.stringify({...common,end:65,preview:true,output:preview}));console.log(run(node,[join(runtime,'repair.mjs'),spec]))
 assert((await readFile(preview)).length>100)
 const decoded=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-i',preview,'-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:4*1024*1024});assert.equal(decoded.status,0)
 const rgb=decoded.stdout
 for(const [x,y] of [[250,22],[150,150]]){const index=(y*320+x)*3;assert(rgb[index+1]>50,`selected black box not repaired at ${x},${y}`)}
 await writeFile(spec,JSON.stringify({...common,preview:false,output}));console.log(run(node,[join(runtime,'repair.mjs'),spec]))
 assert((await readFile(output)).length>1000)
 run(ffmpeg,['-hide_banner','-loglevel','error','-i',output,'-map','0:a:0','-t','0.05','-f','null','-'])
 for(const mode of ['quick','subtitle-track']){await writeFile(spec,JSON.stringify({...common,mode,preview:false,output:join(dir,mode+'.mp4')}));run(node,[join(runtime,'repair.mjs'),spec]);assert((await readFile(join(dir,mode+'.mp4'))).length>1000)}
 const timed=join(dir,'timed.mp4');await writeFile(spec,JSON.stringify({...common,end:1,regions:[{...common.regions[0],start:0,end:.25},{...common.regions[1],start:.5,end:.75}],preview:false,output:timed}));run(node,[join(runtime,'repair.mjs'),spec]);
 for(const [time,first,second] of [[.125,true,false],[.375,false,false],[.625,false,true],[.875,false,false]]){const frame=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-ss',String(time),'-i',timed,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:4*1024*1024});assert.equal(frame.status,0);for(const [x,y,active] of [[250,22,first],[150,150,second]]){const green=frame.stdout[(y*320+x)*3+1];assert(active?green>50:green<40,`time ${time}, region ${x}, green ${green}`)}}
 console.log('TIMED AI REGIONS: independent intervals and untouched inactive regions PASS')
 console.log('OFFLINE REAL AI: two-region preview + video + audio + quick repair + subtitle-track PASS')
}finally{await rm(dir,{recursive:true,force:true})}
