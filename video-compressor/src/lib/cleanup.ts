import { repairFilter, outputDimensions, type RepairRegion } from './cleanup-geometry'
import { inpaintFrame } from './cleanup-ai'
import { withWasmEngine, repairVideoWasm } from './ffmpeg.wasm'
const encode=['-c:v','libx264','-crf','22','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart','-sn']
export function cleanVideo(file:File,region:RepairRegion,width:number,height:number,progress:(value:number)=>void,trackOnly=false) {
  return repairVideoWasm(file,trackOnly?['-map','0:v:0','-map','0:a?','-c:v','copy','-c:a','aac','-sn','-movflags','+faststart']:['-map','0:v:0','-map','0:a?','-vf',repairFilter(region,width,height),...encode],progress)
}
export async function previewQuick(file:File,region:RepairRegion,width:number,height:number,time:number) {
  return withWasmEngine(async ff=>{
    const input='repair-preview-input.'+(file.name.split('.').pop()?.replace(/[^a-z0-9]/gi,'')||'mp4'),output='repair-preview.png'
    try{
      await ff.writeFile(input,new Uint8Array(await file.arrayBuffer()))
      const code=await ff.exec(['-ss',String(time),'-i',input,'-vf',repairFilter(region,width,height),'-frames:v','1',output])
      if(code!==0)throw new Error('区域修补预览失败，请缩小选区或更换视频')
      const bytes=await ff.readFile(output);if(!(bytes instanceof Uint8Array))throw new Error('未生成预览')
      return new Blob([bytes.slice().buffer as ArrayBuffer],{type:'image/png'})
    }finally{await ff.deleteFile(input).catch(()=>{});await ff.deleteFile(output).catch(()=>{})}
  })
}
export function seekVideo(video:HTMLVideoElement,time:number):Promise<void>{
  if(Math.abs(video.currentTime-time)<.001&&video.readyState>=2)return Promise.resolve()
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{off();reject(new Error('读取视频帧超时'))},15000);const off=()=>{clearTimeout(timer);video.removeEventListener('seeked',done);video.removeEventListener('error',fail)};const done=()=>{off();resolve()};const fail=()=>{off();reject(new Error('浏览器无法读取这个视频'))};video.addEventListener('seeked',done,{once:true});video.addEventListener('error',fail,{once:true});video.currentTime=time})
}
function png(canvas:HTMLCanvasElement){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('无法生成视频帧')),'image/png'))}
export async function cleanVideoAI(file:File,url:string,region:RepairRegion,width:number,height:number,start:number,end:number,progress:(value:number,text:string)=>void,signal:AbortSignal) {
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end-start>20.001)throw new Error('AI 每次可处理最多 20 秒，请调整起止时间')
  if(file.size>100*1024*1024)throw new Error('AI 模式请使用 100 MB 以内的视频')
  const video=document.createElement('video');video.muted=true;video.preload='auto';video.src=url
  await new Promise<void>((resolve,reject)=>{video.onloadeddata=()=>resolve();video.onerror=()=>reject(new Error('浏览器无法解码此视频，请先转换为 MP4'))})
  const dims=outputDimensions(width,height),fps=12,total=Math.ceil((end-start)*fps),canvas=document.createElement('canvas');canvas.width=dims.width;canvas.height=dims.height
  return withWasmEngine(async ff=>{
    const input='ai-source.'+(file.name.split('.').pop()?.replace(/[^a-z0-9]/gi,'')||'mp4'),output='ai-cleaned.mp4';let written=0
    try{
      await ff.writeFile(input,new Uint8Array(await file.arrayBuffer()))
      for(let i=0;i<total;i++){
        signal.throwIfAborted();await seekVideo(video,Math.min(start+i/fps,video.duration-.001));canvas.getContext('2d')!.drawImage(video,0,0,dims.width,dims.height)
        const repaired=await inpaintFrame(canvas,region,signal),frame=await png(repaired)
        await ff.writeFile(`ai-frame-${String(i).padStart(5,'0')}.png`,new Uint8Array(await frame.arrayBuffer()));written++
        progress(Math.round((i+1)/total*85),`AI 修复 ${i+1} / ${total} 帧`)
        await new Promise(r=>setTimeout(r,0))
      }
      signal.throwIfAborted();progress(90,'正在编码视频并保留原音频…')
      const code=await ff.exec(['-framerate',String(fps),'-i','ai-frame-%05d.png','-ss',String(start),'-i',input,'-map','0:v:0','-map','1:a?','-t',String(end-start),...encode,output])
      if(code!==0)throw new Error('AI 修复后的视频编码失败')
      const bytes=await ff.readFile(output);if(!(bytes instanceof Uint8Array)||!bytes.length)throw new Error('未生成视频')
      signal.throwIfAborted();progress(100,'AI 修复完成');return new Blob([bytes.slice().buffer as ArrayBuffer],{type:'video/mp4'})
    }finally{video.removeAttribute('src');video.load();await Promise.all([input,output,...Array.from({length:written},(_,i)=>`ai-frame-${String(i).padStart(5,'0')}.png`)].map(name=>ff.deleteFile(name).catch(()=>{})))}
  })
}
