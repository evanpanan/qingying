import {repairFilters} from './repair-filters.mjs'
import {textMask,hasTextMask} from './text-mask.mjs'
import {enhanceOutput,enhancePreview} from './enhance-native.mjs'
import {validEnhancement} from './enhancement.mjs'
import {validRegionTime,regionActive} from './region-time.mjs'
import {readFile,copyFile} from 'node:fs/promises'
import {once} from 'node:events'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'
import {launch} from './process.mjs'
export {launch} from './process.mjs'
function emit(progress,text){process.stdout.write(JSON.stringify({progress,text})+'\n')}
function validate(spec){
  if(spec.duration!==undefined&&(!Number.isFinite(spec.duration)||spec.duration<=0))throw Error('视频时长无效')
  if(!validEnhancement(spec.enhancement,spec.enhancementSize))throw Error('高清增强参数无效')
  if(spec.mode==='enhance'&&(!spec.enhancement||spec.enhancement==='off'))throw Error('请选择高清增强方式')
  if(!['ai','quick','subtitle-track','enhance'].includes(spec.mode))throw new Error('处理模式无效')
  if(!spec.input||!spec.output||!spec.ffmpeg)throw new Error('缺少输入或输出')
  if(!Number.isFinite(spec.width)||!Number.isFinite(spec.height)||spec.width<8||spec.height<8)throw new Error('视频尺寸无效')
  if(!['subtitle-track','enhance'].includes(spec.mode)&&(!Array.isArray(spec.regions)||spec.regions.length<1||spec.regions.length>8||spec.regions.some(r=>!validRegionTime(r)||![r.x,r.y,r.width,r.height].every(Number.isFinite)||r.x<0||r.y<0||r.width<=0||r.height<=0||r.x+r.width>1.000001||r.y+r.height>1.000001)))throw new Error('修补区域无效')
  if(spec.mode==='ai'&&(!Number.isFinite(spec.start)||!Number.isFinite(spec.end)||spec.start<0||spec.end<=spec.start))throw new Error('请设置有效的处理起止时间')
}
function pixelRegion(r,width,height){const x=Math.max(1,Math.min(width-3,Math.round(r.x*width))),y=Math.max(1,Math.min(height-3,Math.round(r.y*height)));return {x,y,width:Math.max(1,Math.min(width-x-1,Math.round(r.width*width))),height:Math.max(1,Math.min(height-y-1,Math.round(r.height*height)))}}
function dimensions(width,height){const scale=Math.min(1,1280/width,720/height);return {width:Math.max(2,Math.floor(width*scale/2)*2),height:Math.max(2,Math.floor(height*scale/2)*2)}}
function sample(data,width,height,x,y,channel){
  x=Math.max(0,Math.min(width-1,x));y=Math.max(0,Math.min(height-1,y));const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),dx=x-x0,dy=y-y0
  const at=(a,b)=>data[(b*width+a)*3+channel]
  return (at(x0,y0)*(1-dx)+at(x1,y0)*dx)*(1-dy)+(at(x0,y1)*(1-dx)+at(x1,y1)*dx)*dy
}
export async function inpaintRGB(source,width,height,regions,session,ort,stats){
  let frame=Buffer.from(source)
  for(const r of regions){
    const fine=hasTextMask(r)?textMask(frame,width,height,r):null;if(fine&&!fine.pixels)continue;if(fine&&fine.coverage>.65)throw Error('文字范围不可靠，请缩小选区或使用整个选区修补')
    const p=pixelRegion(r,width,height),pad=Math.max(48,Math.round(Math.max(p.width,p.height)*.35)),x=Math.max(0,p.x-pad),y=Math.max(0,p.y-pad),w=Math.min(width-x,p.width+pad*2),h=Math.min(height-y,p.height+pad*2)
    const image=new Float32Array(3*512*512),mask=new Float32Array(512*512)
    for(let b=0;b<512;b++)for(let a=0;a<512;a++){
      const i=b*512+a,sx=x+(a+.5)*w/512-.5,sy=y+(b+.5)*h/512-.5
      for(let c=0;c<3;c++)image[c*512*512+i]=sample(frame,width,height,sx,sy,c)/255
      mask[i]=(fine?!!fine.mask[Math.max(0,Math.min(height-1,Math.round(sy)))*width+Math.max(0,Math.min(width-1,Math.round(sx)))]:true)&&sx>=p.x&&sx<p.x+p.width&&sy>=p.y&&sy<p.y+p.height?1:0
    }
    const it=new ort.Tensor('float32',image,[1,3,512,512]),mt=new ort.Tensor('float32',mask,[1,1,512,512]);let results
    try{
      if(stats)stats.inferences++;results=await session.run({image:it,mask:mt});const values=results[session.outputNames[0]].data
      if(values.length!==3*512*512)throw new Error('AI 输出尺寸异常')
      const result=Buffer.alloc(512*512*3)
      for(let i=0;i<512*512;i++)for(let c=0;c<3;c++)result[i*3+c]=Math.max(0,Math.min(255,Math.round(values[c*512*512+i])))
      const next=Buffer.from(frame)
      for(let b=p.y;b<p.y+p.height;b++)for(let a=p.x;a<p.x+p.width;a++)for(let c=0;c<3;c++)if(!fine||fine.mask[b*width+a])next[(b*width+a)*3+c]=Math.round(sample(result,512,512,(a-x+.5)*512/w-.5,(b-y+.5)*512/h-.5,c))
      frame=next
    }finally{it.dispose();mt.dispose();if(results)for(const tensor of Object.values(results))tensor.dispose()}
  }
  return frame
}
export async function runRepair(spec,onProgress=emit){
  validate(spec)
  if(spec.mode==='enhance'&&!spec.preview){await copyFile(spec.input,spec.output);return}
  if(spec.mode!=='ai'){
    const args=spec.preview?['-ss',String(spec.time||0),'-i',spec.input]:['-i',spec.input]
    if(spec.mode==='quick')args.push('-vf',await repairFilters(spec,spec.width,spec.height,spec.regions,spec.preview?spec.time||0:0))
    if(spec.preview)args.push('-frames:v','1',spec.output)
    else args.push('-map','0:v:0','-map','0:a?','-c:v',spec.mode==='subtitle-track'?'copy':'libx264',...(spec.mode==='quick'?['-crf','22','-preset','fast','-pix_fmt','yuv420p']:[]),'-c:a','aac',...(spec.preserveSubtitles?['-map','0:s?','-c:s','mov_text']:['-sn']),'-movflags','+faststart',spec.output)
    onProgress(10,'正在处理视频…');const task=launch(spec.ffmpeg,args);task.child.stdin.end();await task.done;onProgress(100,'处理完成');return
  }
  const root=dirname(fileURLToPath(import.meta.url)),model=await readFile(spec.model||join(root,'models/lama_fp32.onnx'))
  if(createHash('sha256').update(model).digest('hex')!=='1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6')throw new Error('内置模型校验失败，请重新安装客户端')
  onProgress(2,'正在加载内置 AI 引擎…')
  const ort=await import('onnxruntime-node'),session=await ort.InferenceSession.create(model,{executionProviders:['cpu'],intraOpNumThreads:4,graphOptimizationLevel:'all'})
  const {width,height}=dimensions(spec.width,spec.height),fps=12,length=spec.end-spec.start,total=spec.preview?1:Math.ceil(length*fps),start=spec.preview?(spec.time||0):spec.start
  const decode=launch(spec.ffmpeg,['-ss',String(start),'-i',spec.input,...(spec.preview?['-frames:v','1']:['-t',String(length)]),'-vf',`scale=${width}:${height},setsar=1,fps=${fps}`,'-an','-sn','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
  const args=['-f','rawvideo','-pix_fmt','rgb24','-s',`${width}x${height}`,'-r',String(fps),'-i','pipe:0']
  if(spec.preview)args.push('-frames:v','1',spec.output)
  else args.push('-ss',String(spec.start),'-i',spec.input,'-map','0:v:0','-map','1:a?','-t',String(length),'-c:v','libx264','-crf','22','-preset','fast','-pix_fmt','yuv420p','-c:a','aac',...(spec.preserveSubtitles?['-map','1:s?','-c:s','mov_text']:['-sn']),'-movflags','+faststart',spec.output)
  const encode=launch(spec.ffmpeg,args);decode.child.stdin.end();encode.child.stdout.resume()
  const frameBytes=width*height*3;let buffer=Buffer.alloc(0),frames=0,previousInput=null,previousOutput=null,previousKey=null
  const stats={inferences:0}
  try{
    for await(const chunk of decode.child.stdout){buffer=buffer.length?Buffer.concat([buffer,chunk]):chunk;while(buffer.length>=frameBytes){const sourceFrame=buffer.subarray(0,frameBytes),active=spec.regions.filter(r=>regionActive(r,start+frames/fps)),key=JSON.stringify(active);let frame;if(!active.length){frame=sourceFrame;previousInput=null;previousKey=null;}else if(previousInput&&key===previousKey&&sourceFrame.equals(previousInput))frame=previousOutput;else{frame=await inpaintRGB(sourceFrame,width,height,active,session,ort,stats);previousKey=key;previousInput=Buffer.from(sourceFrame);previousOutput=frame;}buffer=buffer.subarray(frameBytes);if(!encode.child.stdin.write(frame))await once(encode.child.stdin,'drain');frames++;onProgress(Math.min(96,Math.round(frames/total*95)),`处理 ${frames} / ${total} 帧 · ${active.length?`${active.length} 个生效选区`:'当前帧不修补'}`)}}
    if(buffer.length||!frames)throw new Error('未能读取完整视频帧')
    encode.child.stdin.end();await Promise.all([decode.done,encode.done]);onProgress(100,`AI 修复完成 · 实际推理 ${stats.inferences} 次`)
  }finally{decode.child.kill();encode.child.kill();await session.release()}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  try{const spec=JSON.parse(await readFile(process.argv[2],'utf8'));const hd=spec.enhancement&&spec.enhancement!=='off',split=hd&&spec.mode!=='enhance';await runRepair(spec,(p,t)=>emit(split?Math.round(p*.7):p,t));const post=(p,t)=>emit(split?70+Math.round(p*.3):p,t);if(spec.preview)await enhancePreview(spec,post);else await enhanceOutput(spec,post)}catch(error){process.stderr.write((error?.message||'处理失败')+'\n');process.exitCode=1}
}
