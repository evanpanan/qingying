import type {RepairRegion} from './cleanup-geometry'
import {withWasmEngine,repairVideoWasm} from './ffmpeg.wasm'
import {wasmRepairFilter} from './repair-masks'
import {enhancementFilter} from '../../desktop-ai/enhancement.mjs'
export interface EnhanceOptions {duration?:number;enhancement?:'off'|'natural'|'ai2x';enhancementSize?:'original'|'1080p'}
const encode=['-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart','-sn']
export function cleanVideo(file:File,regions:RepairRegion[],width:number,height:number,progress:(value:number)=>void,trackOnly=false,options:EnhanceOptions={},enhanceOnly=false){
 if(trackOnly&&(!options.enhancement||options.enhancement==='off'))return repairVideoWasm(file,['-map','0:v:0','-map','0:a?','-c:v','copy','-c:a','aac','-sn','-movflags','+faststart'],progress)
 return withWasmEngine(async ff=>{
  const input='cleanup-source',output='cleanup-result.mp4',files=new Set([input,output]);try{await ff.writeFile(input,new Uint8Array(await file.arrayBuffer()));progress(5);const filter=enhanceOnly||trackOnly?'null':await wasmRepairFilter(ff,input,regions,width,height,0,files);const hd=enhancementFilter(width,height,options.enhancement||'off',options.enhancementSize||'original');const onProgress=(e:{progress:number})=>progress(Math.max(5,Math.min(99,Math.round(e.progress*100))));ff.on('progress',onProgress);let code:number;try{code=await ff.exec(['-y','-i',input,'-map','0:v:0','-map','0:a?','-vf',`${filter},${hd}`,...encode,output])}finally{ff.off('progress',onProgress)}if(code!==0)throw Error('视频处理失败，请缩小选区或调整增强设置');const bytes=await ff.readFile(output);if(!(bytes instanceof Uint8Array))throw Error('未生成处理结果');progress(100);return new Blob([bytes.slice().buffer as ArrayBuffer],{type:'video/mp4'})}finally{await Promise.all([...files].map(name=>ff.deleteFile(name).catch(()=>{})))}
 })
}
export function previewQuick(file:File,regions:RepairRegion[],width:number,height:number,time:number,options:EnhanceOptions={},enhanceOnly=false){
 return withWasmEngine(async ff=>{const input='cleanup-preview-source',output='cleanup-preview.png',files=new Set([input,output]);try{await ff.writeFile(input,new Uint8Array(await file.arrayBuffer()));const filter=enhanceOnly?'null':await wasmRepairFilter(ff,input,regions,width,height,time,files),hd=enhancementFilter(width,height,options.enhancement||'off',options.enhancementSize||'original');if(await ff.exec(['-y','-ss',String(time),'-i',input,'-vf',`${filter},${hd}`,'-frames:v','1',output])!==0)throw Error('预览生成失败');const bytes=await ff.readFile(output);if(!(bytes instanceof Uint8Array))throw Error('未生成预览');return new Blob([bytes.slice().buffer as ArrayBuffer],{type:'image/png'})}finally{await Promise.all([...files].map(name=>ff.deleteFile(name).catch(()=>{})))}})
}
