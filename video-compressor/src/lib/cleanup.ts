import { repairFilter, type RepairRegion } from './cleanup-geometry'
import { withWasmEngine, repairVideoWasm } from './ffmpeg.wasm'
const encode=['-c:v','libx264','-crf','22','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart','-sn']
export function cleanVideo(file:File,regions:RepairRegion[],width:number,height:number,progress:(value:number)=>void,trackOnly=false) {
  return repairVideoWasm(file,trackOnly?['-map','0:v:0','-map','0:a?','-c:v','copy','-c:a','aac','-sn','-movflags','+faststart']:['-map','0:v:0','-map','0:a?','-vf',repairFilter(regions,width,height),...encode],progress)
}
export async function previewQuick(file:File,regions:RepairRegion[],width:number,height:number,time:number) {
  return withWasmEngine(async ff=>{
    const input='repair-preview-input.'+(file.name.split('.').pop()?.replace(/[^a-z0-9]/gi,'')||'mp4'),output='repair-preview.png'
    try{
      await ff.writeFile(input,new Uint8Array(await file.arrayBuffer()))
      const code=await ff.exec(['-ss',String(time),'-i',input,'-vf',repairFilter(regions,width,height),'-frames:v','1',output])
      if(code!==0)throw new Error('区域修补预览失败，请缩小选区或更换视频')
      const bytes=await ff.readFile(output);if(!(bytes instanceof Uint8Array))throw new Error('未生成预览')
      return new Blob([bytes.slice().buffer as ArrayBuffer],{type:'image/png'})
    }finally{await ff.deleteFile(input).catch(()=>{});await ff.deleteFile(output).catch(()=>{})}
  })
}
