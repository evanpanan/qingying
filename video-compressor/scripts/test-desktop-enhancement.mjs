import assert from 'node:assert/strict'
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {resolve,join,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),app=process.env.LIGHTVID_APP,runtime=app?join(app,'Contents/Resources/desktop-ai'):join(root,'desktop-ai'),node=app?join(app,'Contents/MacOS/node'):process.execPath,ffmpeg=app?join(app,'Contents/MacOS/ffmpeg'):process.env.LIGHTVID_FFMPEG||'ffmpeg',dir=await mkdtemp(join(tmpdir(),'lightvid-hd-'))
function run(binary,args,raw=false){const r=spawnSync(binary,args,{encoding:raw?undefined:'utf8',maxBuffer:20*1024*1024,timeout:180000});assert.equal(r.status,0,r.stderr?.toString()||r.error?.message);return r.stdout}
function pixel(file,time,x,y){const data=run(ffmpeg,['-v','error','-ss',String(time),'-i',file,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'],true);return Array.from(data.subarray((y*468+x)*3,(y*468+x)*3+3))}
try{
 const input=join(dir,'source.mp4'),spec=join(dir,'spec.json');run(ffmpeg,['-v','error','-y','-f','lavfi','-i','color=c=gray:s=468x832:r=30:d=2','-f','lavfi','-i','sine=frequency=440:duration=2','-vf','drawbox=x=0:y=20:w=4:h=24:color=white:t=fill,drawbox=x=18:y=20:w=4:h=24:color=white:t=fill,drawbox=x=35:y=20:w=4:h=24:color=white:t=fill','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-t','2',input])
 const base={input,ffmpeg,width:468,height:832,start:0,end:2,duration:2,time:0,preview:false,regions:[{x:0,y:0,width:.15,height:.08,fill:'text',start:0,end:1}]}
 const output=join(dir,'fine.mp4');await writeFile(spec,JSON.stringify({...base,mode:'quick',output}));run(node,[join(runtime,'repair.mjs'),spec]);assert(pixel(output,.2,1,30)[0]<180,'edge strokes must be removed');assert(pixel(output,1.2,1,30)[0]>200,'inactive interval must retain original strokes');assert(pixel(output,.2,200,200)[0]>100,'background must remain')
 const maskFile=join(dir,'text-mask-0.png');assert((await readFile(maskFile)).length>50)
 const natural=join(dir,'natural.mp4');await writeFile(spec,JSON.stringify({...base,mode:'enhance',regions:[],enhancement:'natural',enhancementSize:'1080p',output:natural}));run(node,[join(runtime,'repair.mjs'),spec]);run(ffmpeg,['-v','error','-i',natural,'-map','0:a:0','-t','0.1','-f','null','-']);const image=run(ffmpeg,['-v','error','-i',natural,'-frames:v','1','-f','image2pipe','-vcodec','png','-'],true);assert.equal(image.readUInt32BE(16),1080);assert.equal(image.readUInt32BE(20),1920)
 const helper=join(runtime,'native/lightvid-enhance'),support=run(helper,['--probe','468','832']).trim();assert(['supported','unsupported'].includes(support));
 if(support==='supported'){const hd=join(dir,'ai2x.mp4');await writeFile(spec,JSON.stringify({...base,mode:'enhance',enhancement:'ai2x',regions:[],output:hd}));run(node,[join(runtime,'repair.mjs'),spec]);const image=run(ffmpeg,['-v','error','-i',hd,'-frames:v','1','-f','image2pipe','-vcodec','png','-'],true);assert.equal(image.readUInt32BE(16),936);assert.equal(image.readUInt32BE(20),1664);run(ffmpeg,['-v','error','-i',hd,'-map','0:a:0','-t','0.1','-f','null','-']);const rotated=join(dir,'rotated.mp4'),rotatedHD=join(dir,'rotated-hd.mp4');run(ffmpeg,['-v','error','-y','-display_rotation','90','-i',input,'-c','copy',rotated]);run(helper,[rotated,rotatedHD]);const frame=run(ffmpeg,['-v','error','-i',rotatedHD,'-frames:v','1','-f','image2pipe','-vcodec','png','-'],true);assert.equal(frame.readUInt32BE(16),1664);assert.equal(frame.readUInt32BE(20),936)}
 else{const result=spawnSync(helper,[input,join(dir,'unsupported.mp4')],{encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/macOS 26|不支持/)}
 console.log('PACKAGED HD AND FINE WATERMARK: edge protection + independent interval + natural HD + AI capability gate PASS')
}finally{await rm(dir,{recursive:true,force:true})}
