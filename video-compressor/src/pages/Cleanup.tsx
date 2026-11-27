import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Upload, Sparkles, Eraser, Download, RotateCcw, ShieldCheck, X } from 'lucide-react'
import { cleanVideo, cleanVideoAI, previewQuick, seekVideo } from '../lib/cleanup'
import { inpaintFrame, loadRepairModel, repairModelReady, MODEL_URL } from '../lib/cleanup-ai'
import { SUBTITLE_REGION, WATERMARK_REGION, validRegion, outputDimensions, type CleanupMode, type RepairRegion } from '../lib/cleanup-geometry'
import '../cleanup.css'

export default function Cleanup(){
  const [file,setFile]=useState<File|null>(null),[url,setUrl]=useState(''),[size,setSize]=useState({width:0,height:0,duration:0})
  const [region,setRegion]=useState<RepairRegion>(SUBTITLE_REGION),[mode,setMode]=useState<CleanupMode>('quick')
  const [time,setTime]=useState(0),[start,setStart]=useState(0),[end,setEnd]=useState(0),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0)
  const [status,setStatus]=useState(''),[error,setError]=useState(''),[preview,setPreview]=useState(''),[result,setResult]=useState(''),[model,setModel]=useState(repairModelReady)
  const input=useRef<HTMLInputElement>(null),modelInput=useRef<HTMLInputElement>(null),video=useRef<HTMLVideoElement>(null),origin=useRef<{x:number;y:number}|null>(null),abort=useRef<AbortController|null>(null),mounted=useRef(true)
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;abort.current?.abort()}},[])
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url)},[url]);useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);useEffect(()=>()=>{if(result)URL.revokeObjectURL(result)},[result])
  function changeRegion(next:RepairRegion){setRegion(next);setPreview('');setResult('')}
  function changeMode(next:CleanupMode){setMode(next);setPreview('');setResult('')}
  function select(next?:File){if(!next||busy)return;if(next.size>500*1024*1024){setError('请使用 500 MB 以内的视频');return}setFile(next);setUrl(URL.createObjectURL(next));setSize({width:0,height:0,duration:0});setTime(0);setStart(0);setEnd(0);setPreview('');setResult('');setError('');setStatus('');setProgress(0)}
  function point(e:PointerEvent<HTMLDivElement>){const b=e.currentTarget.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))}}
  function down(e:PointerEvent<HTMLDivElement>){if(busy||mode==='subtitle-track')return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);origin.current=point(e)}
  function drag(e:PointerEvent<HTMLDivElement>){if(!origin.current||busy)return;const p=point(e),o=origin.current;changeRegion({x:Math.min(p.x,o.x),y:Math.min(p.y,o.y),width:Math.abs(p.x-o.x),height:Math.abs(p.y-o.y)})}
  async function run(job:(signal:AbortSignal)=>Promise<void>){if(busy)return;setBusy(true);setError('');setProgress(0);const controller=new AbortController();abort.current=controller;try{await job(controller.signal)}catch(e){if(mounted.current){setError(controller.signal.aborted?'操作已停止':(e instanceof Error?e.message:'处理失败，请重试'));setStatus('')}}finally{if(mounted.current)setBusy(false);abort.current=null}}
  async function ensureModel(signal:AbortSignal,local?:File){await loadRepairModel(setStatus,signal,local);setModel(true)}
  async function showPreview(){if(!file||!video.current||!validRegion(region))return;await run(async signal=>{setStatus(mode==='ai'?'正在准备 AI 预览…':'正在生成区域修补预览…');let blob:Blob;if(mode==='ai'){await ensureModel(signal);await seekVideo(video.current!,time);const source=document.createElement('canvas');const dims=outputDimensions(size.width,size.height);source.width=dims.width;source.height=dims.height;source.getContext('2d')!.drawImage(video.current!,0,0,source.width,source.height);const canvas=await inpaintFrame(source,region,signal);blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('无法生成预览')),'image/png'))}else blob=await previewQuick(file,region,size.width,size.height,time);signal.throwIfAborted();setPreview(URL.createObjectURL(blob));setStatus('预览已生成，请检查修补痕迹后导出')})}
  async function exportVideo(){if(!file)return;setResult('');await run(async signal=>{let blob:Blob;if(mode==='ai'){if(file.size>100*1024*1024)throw new Error('AI 导出请使用 100 MB 以内的视频，可先压缩文件');await ensureModel(signal);blob=await cleanVideoAI(file,url,region,size.width,size.height,start,end,(p,text)=>{setProgress(p);setStatus(text)},signal)}else{setStatus(mode==='subtitle-track'?'正在移除独立字幕轨…':'正在修补并导出视频…');blob=await cleanVideo(file,region,size.width,size.height,setProgress,mode==='subtitle-track')}signal.throwIfAborted();setResult(URL.createObjectURL(blob));setProgress(100);setStatus('处理完成，原文件未改动')})}
  const ready=!!file&&size.width>0&&size.duration>0
  return <main className="workspace-page cleanup-page"><div className="page-intro"><span className="eyebrow">04 / REPAIR</span><h1>留下画面，<em>去掉干扰。</em></h1><p>去字幕、去水印，在本机完成。框选固定区域，先看效果，再保存副本。</p></div>
    <div className="cleanup-layout"><section className="studio-panel"><div className="section-label"><span>视频与选区</span><ShieldCheck size={17}/></div>
      <input ref={input} hidden type="file" accept="video/*,.mp4,.mov,.mkv,.webm" onChange={e=>select(e.target.files?.[0])}/>
      {!file?<button className="cleanup-upload" onClick={()=>input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();select(e.dataTransfer.files[0])}}><Upload size={30}/><strong>选择需要处理的视频</strong><span>支持拖入 · 500 MB 以内 · 原文件保持不变</span></button>:<>
        <div className="cleanup-file"><strong title={file.name}>{file.name}</strong><button className="quiet-button" disabled={busy} onClick={()=>input.current?.click()}><RotateCcw size={14}/>更换视频</button></div>
        <div className="cleanup-view" style={{maxWidth:size.width?Math.min(850,450*size.width/size.height):850,aspectRatio:size.width?`${size.width}/${size.height}`:'16/9'}}>
          <video ref={video} src={url} muted playsInline preload="auto" onLoadedMetadata={e=>{const v=e.currentTarget;if(!Number.isFinite(v.duration)||!v.videoWidth){setError('无法读取视频信息，请先转换为 MP4');return}setSize({width:v.videoWidth,height:v.videoHeight,duration:v.duration});setEnd(Math.min(20,v.duration))}} onError={()=>setError('浏览器无法播放该格式，请先使用格式转换工具转换为 MP4')}/>
          <div className="cleanup-select" role="img" aria-label="在视频上拖动框选字幕或水印区域" onPointerDown={down} onPointerMove={drag} onPointerUp={()=>{origin.current=null}} onPointerCancel={()=>{origin.current=null}}>
            {mode!=='subtitle-track'&&<div className="cleanup-rectangle" style={{left:`${region.x*100}%`,top:`${region.y*100}%`,width:`${region.width*100}%`,height:`${region.height*100}%`}}><span>修补区域</span></div>}
          </div>
        </div>
        <label className="cleanup-timeline">预览位置 <span>{time.toFixed(1)} / {size.duration.toFixed(1)} 秒</span><input type="range" min={0} max={Math.max(0,size.duration-.02)} step={.1} value={time} disabled={busy||!ready} onChange={e=>{const next=Number(e.target.value);setTime(next);setPreview('');if(video.current)video.current.currentTime=next}}/></label>
        {mode!=='subtitle-track'&&<><div className="cleanup-presets"><button className="quiet-button" disabled={busy} onClick={()=>changeRegion({...SUBTITLE_REGION})}>底部字幕区域</button><button className="quiet-button" disabled={busy} onClick={()=>changeRegion({...WATERMARK_REGION})}>右上角水印</button></div><div className="cleanup-coordinates">{(['x','y','width','height'] as const).map((key,i)=><label key={key}>{['左侧','顶部','宽度','高度'][i]} %<input type="number" min={0} max={100} step={.1} disabled={busy} value={Number((region[key]*100).toFixed(1))} onChange={e=>changeRegion({...region,[key]:Number(e.target.value)/100})}/></label>)}</div></>}
      </>}
      {preview&&<div className="cleanup-preview"><div className="section-label"><span>当前帧处理效果</span><button className="icon-button" aria-label="关闭预览" onClick={()=>setPreview('')}><X size={15}/></button></div><img src={preview} alt="所选区域修补后的当前帧"/></div>}
    </section><aside className="studio-panel cleanup-options"><div className="section-label"><span>处理方式</span><Eraser size={17}/></div>
      <div className="cleanup-modes">{([{id:'quick',title:'区域快速修补',desc:'根据周围像素填补，适合固定字幕和简单背景。'},{id:'ai',title:'AI 智能修复',desc:'LaMa 模型重绘选区，适合纹理背景，处理更慢。'},{id:'subtitle-track',title:'移除独立字幕轨',desc:'仅去掉可开关的字幕轨，不处理画面上的文字。'}] as const).map(item=><button key={item.id} disabled={busy} aria-pressed={mode===item.id} className={mode===item.id?'selected':''} onClick={()=>changeMode(item.id)}><strong>{item.title}</strong><span>{item.desc}</span></button>)}</div>
      {mode==='ai'&&<div className="cleanup-ai-info"><p>首次需下载约 208 MB 模型，可缓存重复使用。视频不会上传；模型下载可能使用同版本镜像并校验文件。</p><p>首版 AI 视频限 100 MB，每次最多 20 秒，导出最高 720p / 12 帧。逐帧重绘可能有闪烁，建议先预览。</p><div className="cleanup-range"><label>开始（秒）<input type="number" min={0} max={size.duration} step={.1} value={start} disabled={busy} onChange={e=>setStart(Number(e.target.value))}/></label><label>结束（秒）<input type="number" min={0} max={size.duration} step={.1} value={end} disabled={busy} onChange={e=>setEnd(Number(e.target.value))}/></label></div>
        <button className="quiet-button" disabled={busy||model} onClick={()=>void run(async signal=>ensureModel(signal))}><Sparkles size={16}/>{model?'AI 模型已就绪':'下载并加载 AI 模型'}</button><input ref={modelInput} hidden type="file" accept=".onnx" onChange={e=>{const local=e.target.files?.[0];if(local)void run(async signal=>ensureModel(signal,local))}}/><button className="quiet-button" disabled={busy||model} onClick={()=>modelInput.current?.click()}>从本机导入模型</button><a className="quiet-button" href={MODEL_URL} target="_blank" rel="noopener noreferrer">模型文件与下载地址</a>
      </div>}
      <p className="cleanup-note">支持位置固定的字幕和水印。复杂背景可能有修补痕迹；AI 也不能恢复真实被遮挡的内容。请先拖动时间轴检查位置。</p>
      {error&&<p className="tool-error" role="alert">{error}</p>}
      {status&&<p className="cleanup-status" role="status">{status}</p>}
      {busy&&<><progress max={100} value={progress} aria-label="处理进度"/><small>{progress}%</small>{mode==='ai'&&<button className="quiet-button" onClick={()=>{abort.current?.abort();setStatus('正在停止，当前帧完成后结束…')}}>停止当前操作</button>}</>}
      <div className="cleanup-buttons">{mode!=='subtitle-track'&&<button className="quiet-button" disabled={busy||!ready||!validRegion(region)} onClick={()=>void showPreview()}>预览当前帧</button>}<button className="primary-button" disabled={busy||!ready||(mode!=='subtitle-track'&&!validRegion(region))||(mode==='ai'&&(start<0||end<=start||end-start>20.001||end>size.duration||!!file&&file.size>100*1024*1024))} onClick={()=>void exportVideo()}><Eraser size={17}/>{busy?'处理中…':'处理并导出副本'}</button></div>
      {result&&<a className="primary-button" href={result} download={`${file?.name.replace(/\.[^.]+$/,'')}_${mode==='ai'?'ai_repaired':'cleaned'}.mp4`}><Download size={17}/>保存处理后的视频</a>}
    </aside></div>
  </main>
}
