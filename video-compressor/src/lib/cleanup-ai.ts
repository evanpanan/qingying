import type { InferenceSession } from 'onnxruntime-web'
import { validRegions, regionPixels, type RepairRegion } from './cleanup-geometry'
const REV='c3c0c9e468934d62e79c329e35d82dd09ff8c444'
const PATH=`Carve/LaMa-ONNX/resolve/${REV}/lama_fp32.onnx`
export const MODEL_URL=`https://huggingface.co/${PATH}`
const MIRROR_URL=`https://hf-mirror.com/${PATH}`
const MODEL_SHA='1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6'
let session:InferenceSession|null=null
let loading:Promise<void>|null=null
let runtime:typeof import('onnxruntime-web/webgpu')|null=null
function aborted(signal?:AbortSignal){signal?.throwIfAborted()}
async function verify(bytes:ArrayBuffer) {
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('')
  if(hash!==MODEL_SHA)throw new Error('模型文件校验失败，请使用指定的 LaMa FP32 模型')
}
async function downloadModel(progress:(text:string)=>void,signal?:AbortSignal) {
  try { const cache=await caches.open('lightvid-lama-v1');const cached=await cache.match(MODEL_URL);if(cached){const b=await cached.arrayBuffer();await verify(b);return b} } catch { /* Storage can be disabled; downloading still works. */ }
  let last:unknown
  for(const url of [MODEL_URL,MIRROR_URL]){
    aborted(signal)
    try{
      progress(url===MODEL_URL?'正在下载 AI 模型（约 208 MB）':'正在通过镜像下载同版本模型')
      const headersTimeout=new AbortController(),timer=setTimeout(()=>headersTimeout.abort(),12000)
      let response:Response
      try{response=await fetch(url,{signal:AbortSignal.any([signal||new AbortController().signal,headersTimeout.signal,AbortSignal.timeout(240000)])})}finally{clearTimeout(timer)}
      if(!response.ok||!response.body)throw new Error('模型下载失败')
      const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0
      try { while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>230*1024*1024){await reader.cancel();throw new Error('模型文件过大')}chunks.push(part.value);progress(`模型下载中 · ${(size/1024/1024).toFixed(1)} / 约 198 MiB`)} } finally {reader.releaseLock()}
      const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length}
      await verify(bytes.buffer)
      try{const cache=await caches.open('lightvid-lama-v1');await cache.put(MODEL_URL,new Response(bytes))}catch{ /* Cache quota is optional. */ }
      return bytes.buffer
    }catch(error){if(signal?.aborted)throw error;last=error}
  }
  throw new Error(last instanceof Error?`${last.message}。请重试或稍后再试。`:'无法准备 AI 修复资源，请稍后再试')
}
export async function loadRepairModel(progress:(text:string)=>void,signal?:AbortSignal,local?:File) {
  if(session)return
  if(loading)return loading
  loading=(async()=>{
    if(local&&local.size>230*1024*1024)throw new Error('模型文件过大，请选择 LaMa FP32 模型')
    const bytes=local?await local.arrayBuffer():await downloadModel(progress,signal)
    aborted(signal);await verify(bytes);progress('正在初始化 AI 修复模型…')
    const ort=await import('onnxruntime-web/webgpu');runtime=ort
    ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths='/ort/'
    if('gpu' in navigator){try{session=await ort.InferenceSession.create(bytes,{executionProviders:['webgpu','wasm'],graphOptimizationLevel:'all'})}catch{/* Use CPU if GPU operators are unavailable. */}}
    if(!session)session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'})
    if(!session.inputNames.includes('image')||!session.inputNames.includes('mask')){await session.release();session=null;throw new Error('模型输入不匹配')}
    progress('AI 模型已就绪')
  })().finally(()=>{loading=null})
  return loading
}
export function repairModelReady(){return !!session}
export async function inpaintFrame(source:HTMLCanvasElement,region:RepairRegion,signal?:AbortSignal) {
  aborted(signal)
  if(!session||!runtime)throw new Error('请先加载 AI 模型')
  const p=regionPixels(region,source.width,source.height),pad=Math.max(48,Math.round(Math.max(p.width,p.height)*.35))
  const x=Math.max(0,p.x-pad),y=Math.max(0,p.y-pad),w=Math.min(source.width-x,p.width+pad*2),h=Math.min(source.height-y,p.height+pad*2)
  const small=document.createElement('canvas');small.width=small.height=512
  const ctx=small.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(source,x,y,w,h,0,0,512,512)
  const pixels=ctx.getImageData(0,0,512,512),image=new Float32Array(3*512*512),mask=new Float32Array(512*512)
  const left=(p.x-x)/w*512,top=(p.y-y)/h*512,right=(p.x+p.width-x)/w*512,bottom=(p.y+p.height-y)/h*512
  for(let i=0;i<512*512;i++){image[i]=pixels.data[i*4]/255;image[512*512+i]=pixels.data[i*4+1]/255;image[2*512*512+i]=pixels.data[i*4+2]/255;const a=i%512,b=Math.floor(i/512);mask[i]=a>=left&&a<right&&b>=top&&b<bottom?1:0}
  const imageTensor=new runtime.Tensor('float32',image,[1,3,512,512]),maskTensor=new runtime.Tensor('float32',mask,[1,1,512,512])
  let result:Record<string,import('onnxruntime-web').Tensor>|undefined
  try{
    result=await session.run({image:imageTensor,mask:maskTensor});aborted(signal)
    const output=result[session.outputNames[0]],data=output.data as Float32Array
    if(data.length!==3*512*512)throw new Error('AI 返回的画面尺寸异常')
    for(let i=0;i<512*512;i++){pixels.data[i*4]=Math.max(0,Math.min(255,data[i]));pixels.data[i*4+1]=Math.max(0,Math.min(255,data[512*512+i]));pixels.data[i*4+2]=Math.max(0,Math.min(255,data[2*512*512+i]));pixels.data[i*4+3]=255}
    ctx.putImageData(pixels,0,0)
    const repaired=document.createElement('canvas');repaired.width=source.width;repaired.height=source.height
    const target=repaired.getContext('2d')!;target.drawImage(source,0,0);target.save();target.beginPath();target.rect(p.x,p.y,p.width,p.height);target.clip();target.drawImage(small,x,y,w,h);target.restore();return repaired
  }finally{imageTensor.dispose();maskTensor.dispose();if(result)for(const value of Object.values(result))value.dispose()}
}

export async function inpaintRegions(source: HTMLCanvasElement, regions: RepairRegion[], signal?: AbortSignal) {
  if (!validRegions(regions)) throw new Error('请选择有效修补区域')
  let output = source
  for (const region of regions) {
    aborted(signal)
    output = await inpaintFrame(output, region, signal)
  }
  return output
}
