import {useDesktopTask} from '../lib/desktop-tasks'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Upload, Eraser, Download, Monitor, RotateCcw, ShieldCheck, X, Plus, Trash2, Languages } from 'lucide-react'
import { cleanVideo, previewQuick } from '../lib/cleanup'
import { SUBTITLE_REGION, WATERMARK_REGION, validRegions, MAX_REPAIR_REGIONS, RESIZE_HANDLES, RESIZE_LABELS, resizeRegion, type ResizeHandle, type CleanupMode, type RepairRegion } from '../lib/cleanup-geometry'
import {isTauri} from '../lib/env'
import {DesktopRepair} from '../lib/desktop-repair'
import ResultHistory from '../components/ResultHistory'
import {translateVideo,type TranslateOptions} from '../lib/translation'
import {rememberBrowserResult} from '../lib/result-history'
import '../cleanup.css'

export default function Cleanup(){
  const native=isTauri()
  const [historyVersion,setHistoryVersion]=useState(0)
  const [desktop]=useState(()=>new DesktopRepair())
  const [nativeResult,setNativeResult]=useState('')
  const [voice,setVoice]=useState('af_heart'),[removeRegions,setRemoveRegions]=useState(true),[repairMethod,setRepairMethod]=useState<'quick'|'ai'>('quick'),[srt,setSrt]=useState('')
  const [file,setFile]=useState<File|null>(null),[url,setUrl]=useState(''),[size,setSize]=useState({width:0,height:0,duration:0})
  const [regions,setRegions]=useState<RepairRegion[]>([{...SUBTITLE_REGION}]),[active,setActive]=useState(0),[mode,setMode]=useState<CleanupMode>('quick')
  const [time,setTime]=useState(0),[start,setStart]=useState(0),[end,setEnd]=useState(0),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0)
  const [status,setStatus]=useState(''),[error,setError]=useState(''),[preview,setPreview]=useState(''),[result,setResult]=useState('')
  const input=useRef<HTMLInputElement>(null),video=useRef<HTMLVideoElement>(null),origin=useRef<{x:number;y:number;index:number;action:ResizeHandle|'move'|'draw';region:RepairRegion;pointerId:number;minWidth:number;minHeight:number}|null>(null),abort=useRef<AbortController|null>(null),mounted=useRef(true)
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;abort.current?.abort();desktop.dispose()}},[desktop])
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url)},[url]);useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);useEffect(()=>()=>{if(result)URL.revokeObjectURL(result)},[result])
  useDesktopTask(busy)
  const region=regions[active]
  function invalidate(){setSrt('');setPreview('');setResult('');setNativeResult('');setStatus('');setError('')}
  function changeRegion(next:RepairRegion,index=active){setRegions(items=>items.map((r,i)=>i===index?next:r));invalidate()}
  function addRegion(){if(busy||regions.length>=MAX_REPAIR_REGIONS)return;setRegions(items=>[...items,{...WATERMARK_REGION}]);setActive(regions.length);invalidate()}
  function removeRegion(index:number){if(busy)return;setRegions(items=>items.filter((_,i)=>i!==index));setActive(Math.max(0,Math.min(active,regions.length-2)));invalidate()}

  function changeMode(next:CleanupMode){setMode(next);if(next==='translate'){setStart(0);setEnd(Math.min(60,size.duration))}else if(next==='ai'&&end-start>20)setEnd(Math.min(size.duration,start+20));invalidate()}
  function select(next?:File){if(!next||busy)return;if(next.size>500*1024*1024){setError('请使用 500 MB 以内的视频');return}desktop.dispose();setNativeResult('');setFile(next);setUrl(URL.createObjectURL(next));setSize({width:0,height:0,duration:0});setTime(0);setStart(0);setEnd(0);setRegions([{...SUBTITLE_REGION}]);setActive(0);setPreview('');setResult('');setError('');setStatus('');setProgress(0)}
  function point(e:PointerEvent<HTMLDivElement>){const b=e.currentTarget.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))}}
  function down(e:PointerEvent<HTMLDivElement>){
    if(busy||mode==='subtitle-track'||origin.current)return
    const hit=(e.target as HTMLElement).closest<HTMLElement>('[data-region]')
    const index=hit?Number(hit.dataset.region):active
    if(!regions[index])return
    e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);setActive(index)
    const handle=(e.target as HTMLElement).closest<HTMLElement>('[data-resize]')?.dataset.resize as ResizeHandle|undefined
    const bounds=e.currentTarget.getBoundingClientRect()
    origin.current={...point(e),index,action:handle||(hit?'move':'draw'),region:{...regions[index]},pointerId:e.pointerId,minWidth:Math.max(8/size.width,12/bounds.width),minHeight:Math.max(8/size.height,12/bounds.height)}
  }
  function drag(e:PointerEvent<HTMLDivElement>){
    const o=origin.current;if(!o||busy||o.pointerId!==e.pointerId)return
    const p=point(e)
    if(o.action!=='move'&&o.action!=='draw')changeRegion(resizeRegion(o.region,o.action,p.x-o.x,p.y-o.y,o.minWidth,o.minHeight),o.index)
    else if(o.action==='move')changeRegion({...o.region,x:Math.max(0,Math.min(1-o.region.width,o.region.x+p.x-o.x)),y:Math.max(0,Math.min(1-o.region.height,o.region.y+p.y-o.y))},o.index)
    else if(Math.abs(p.x-o.x)>.002&&Math.abs(p.y-o.y)>.002)changeRegion({x:Math.min(p.x,o.x),y:Math.min(p.y,o.y),width:Math.abs(p.x-o.x),height:Math.abs(p.y-o.y)},o.index)
  }
  function resizeKey(e:KeyboardEvent<HTMLButtonElement>,handle:ResizeHandle,index:number){
    if(busy||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return
    e.preventDefault();e.stopPropagation();const step=e.shiftKey ? .02 : .005
    const dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0
    changeRegion(resizeRegion(regions[index],handle,dx,dy,8/size.width,8/size.height),index)
  }
  async function run(job:(signal:AbortSignal)=>Promise<void>){if(busy)return;setBusy(true);setError('');setProgress(0);const controller=new AbortController();abort.current=controller;try{await job(controller.signal)}catch(e){if(mounted.current){setError(controller.signal.aborted?'操作已停止':(e instanceof Error?e.message:'处理失败，请重试'));setStatus('')}}finally{if(mounted.current)setBusy(false);abort.current=null}}
  async function showPreview(){
    if(!file||!video.current||!validRegions(regions)||mode==='ai'&&!native)return
    await run(async signal=>{
      setStatus('正在生成修补预览…')
      const blob=native?await desktop.run(file,mode,regions,size.width,size.height,start,end,time,true,(p,text)=>{setProgress(p);setStatus(text)},signal):await previewQuick(file,regions,size.width,size.height,time)
      signal.throwIfAborted();if(!(blob instanceof Blob))throw new Error('未生成预览');setPreview(URL.createObjectURL(blob));setStatus('预览已生成，请检查修补痕迹后导出')
    })
  }
  async function exportVideo(){
    if(!file||mode==='ai'&&!native)return
    invalidate()
    await run(async signal=>{
      setStatus('正在修补并导出视频…')
      const translation:TranslateOptions={start,end,voice,removeRegions,repairMethod}
      if(native){const job=await desktop.run(file,mode,regions,size.width,size.height,start,end,time,false,(p,text)=>{setProgress(p);setStatus(text)},signal,mode==='translate'?translation:undefined);if(typeof job!=='string')throw new Error('未生成结果');setNativeResult(job)}
      else{let blob:Blob;if(mode==='translate'){const translated=await translateVideo(file,regions,size.width,size.height,translation,(p,text)=>{setProgress(p);setStatus(text)},signal);blob=translated.blob;setSrt(translated.srt)}else blob=await cleanVideo(file,regions,size.width,size.height,setProgress,mode==='subtitle-track');signal.throwIfAborted();setResult(URL.createObjectURL(blob));try{await rememberBrowserResult(file.name,mode,blob)}catch{setError('处理成功，但浏览器未能保存历史，请立即下载结果')}}
      setHistoryVersion(v=>v+1);setProgress(100);setStatus('处理完成，已加入处理历史，原文件未改动')
    })
  }
  const ready=!!file&&size.width>0&&size.duration>0
  return <main className="workspace-page cleanup-page"><div className="page-intro"><span className="eyebrow">02 / REPAIR</span><h1>留下画面，<em>去掉干扰。</em></h1><p>去字幕、去水印，可同时修补多个固定区域，先看效果，再保存副本。</p></div>
    <div className="cleanup-layout"><section className="studio-panel"><div className="section-label"><span>视频与选区</span><ShieldCheck size={17}/></div>
      <input ref={input} hidden type="file" accept="video/*,.mp4,.mov,.mkv,.webm" onChange={e=>select(e.target.files?.[0])}/>
      {!file?<button className="cleanup-upload" onClick={()=>input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();select(e.dataTransfer.files[0])}}><Upload size={30}/><strong>选择需要处理的视频</strong><span>支持拖入 · 500 MB 以内 · 原文件保持不变</span></button>:<>
        <div className="cleanup-file"><strong title={file.name}>{file.name}</strong><button className="quiet-button" disabled={busy} onClick={()=>input.current?.click()}><RotateCcw size={14}/>更换视频</button></div>
        <div className="cleanup-view" style={{maxWidth:size.width?Math.min(850,450*size.width/size.height):850,aspectRatio:size.width?`${size.width}/${size.height}`:'16/9'}}>
          <video ref={video} src={url} muted playsInline preload="auto" onLoadedMetadata={e=>{const v=e.currentTarget;if(!Number.isFinite(v.duration)||!v.videoWidth){setError('无法读取视频信息，请先转换为 MP4');return}setSize({width:v.videoWidth,height:v.videoHeight,duration:v.duration});setEnd(Math.min(mode==='translate'?60:20,v.duration))}} onError={()=>setError('浏览器无法播放该格式，请先使用格式转换工具转换为 MP4')}/>
          <div className="cleanup-select" role="group" aria-label="在视频上拖动框选字幕或水印区域" onPointerDown={down} onPointerMove={drag} onPointerUp={()=>{origin.current=null}} onPointerCancel={()=>{origin.current=null}} onLostPointerCapture={()=>{origin.current=null}}>
            {mode!=='subtitle-track'&&regions.map((r,index)=><div key={index} data-region={index} className={`cleanup-rectangle ${index===active?'active':''}`} style={{left:`${r.x*100}%`,top:`${r.y*100}%`,width:`${r.width*100}%`,height:`${r.height*100}%`}}><span>区域 {index+1}</span>{index===active&&RESIZE_HANDLES.map(handle=><button key={handle} type="button" className={`cleanup-resize-handle handle-${handle}`} data-resize={handle} disabled={busy} aria-label={`调整区域 ${index+1} ${RESIZE_LABELS[handle]}`} title={`拖动${RESIZE_LABELS[handle]}调整大小`} onKeyDown={e=>resizeKey(e,handle,index)}/>)}</div>)}
          </div>
        </div>
        <label className="cleanup-timeline">预览位置 <span>{time.toFixed(1)} / {size.duration.toFixed(1)} 秒</span><input type="range" min={0} max={Math.max(0,size.duration-.02)} step={.1} value={time} disabled={busy||!ready} onChange={e=>{const next=Number(e.target.value);setTime(next);setPreview('');if(video.current)video.current.currentTime=next}}/></label>
        {mode!=='subtitle-track'&&<>
          <div className="cleanup-region-toolbar"><span>修补区域 {regions.length} / {MAX_REPAIR_REGIONS}</span><button className="add-region-button" disabled={busy||regions.length>=MAX_REPAIR_REGIONS} onClick={addRegion}><Plus size={18}/>添加修补选区<span>{regions.length}/{MAX_REPAIR_REGIONS}</span></button></div>
          <div className="cleanup-region-list">{regions.map((_,index)=><div key={index} className={active===index?'selected':''}><button disabled={busy} aria-pressed={active===index} onClick={()=>setActive(index)}>区域 {index+1}</button><button disabled={busy} aria-label={`删除区域 ${index+1}`} onClick={()=>removeRegion(index)}><Trash2 size={13}/></button></div>)}</div>
          <p className="cleanup-region-help">拖动边缘或四角调整大小，拖动框内移动位置；也可在空白处重新框选。点击「添加修补选区」可保留已有区域。</p>
          {region&&<><div className="cleanup-presets"><button className="quiet-button" disabled={busy} onClick={()=>changeRegion({...SUBTITLE_REGION})}>底部字幕区域</button><button className="quiet-button" disabled={busy} onClick={()=>changeRegion({...WATERMARK_REGION})}>右上角水印</button></div><div className="cleanup-coordinates">{(['x','y','width','height'] as const).map((key,i)=><label key={key}>{['左侧','顶部','宽度','高度'][i]} %<input type="number" min={0} max={100} step={.1} disabled={busy} value={Number((region[key]*100).toFixed(1))} onChange={e=>changeRegion({...region,[key]:Number(e.target.value)/100})}/></label>)}</div></>}
        </>}
      </>}
      {preview&&<div className="cleanup-preview"><div className="section-label"><span>当前帧处理效果</span><button className="icon-button" aria-label="关闭预览" onClick={()=>setPreview('')}><X size={15}/></button></div><img src={preview} alt="所选区域修补后的当前帧"/></div>}
    </section><aside className="studio-panel cleanup-options"><div className="section-label"><span>处理方式</span><Eraser size={17}/></div>
      <div className="cleanup-modes">{([{id:'quick',title:'区域快速修补',desc:'根据周围像素填补，适合固定字幕和简单背景。'},{id:'ai',title:'AI 智能修复',desc:native?'内置 AI 引擎与模型，离线修复多个选区。':'使用 AI 修复需要下载桌面版。'},{id:'translate',title:'中文视频转英文',desc:'本机生成英文配音和英文字幕，可叠加修补选区。'},{id:'subtitle-track',title:'移除独立字幕轨',desc:'仅去掉可开关的字幕轨，不处理画面上的文字。'}] as const).map(item=><button key={item.id} disabled={busy} aria-pressed={mode===item.id} className={mode===item.id?'selected':''} onClick={()=>changeMode(item.id)}><strong>{item.title}</strong><span>{item.desc}</span></button>)}</div>
      {mode==='ai'&&<div className="cleanup-ai-info">{native?<><p>AI 引擎与模型已内置，无需 API 或下载配置。视频在本机处理，可离线使用。</p><p>AI 视频限 100 MB，每次最多 20 秒，导出最高 720p / 12 帧。多个选区会增加处理时间，可能出现帧间闪烁，建议先预览。</p><div className="cleanup-range"><label>开始（秒）<input type="number" min={0} max={size.duration} step={.1} value={start} disabled={busy} onChange={e=>{setStart(Number(e.target.value));invalidate()}}/></label><label>结束（秒）<input type="number" min={0} max={size.duration} step={.1} value={end} disabled={busy} onChange={e=>{setEnd(Number(e.target.value));invalidate()}}/></label></div></>:<div className="cleanup-desktop-notice"><Monitor size={24}/><strong>使用 AI 修复需要下载桌面版</strong><p>桌面版内置修复模型，安装后即可在本机处理。在线可继续使用区域快速修补和字幕轨移除。</p><a className="primary-button" href="https://github.com/evanpanan/qingying/releases/download/v1.7.0/_1.7.0_aarch64.dmg" download><Download size={16}/>下载 macOS 版</a><small>Apple Silicon · v1.7.0 · 更新于 2026-11-27</small></div>}</div>}
      {mode==='translate'&&<div className="translation-options"><div className="translation-title"><Languages size={18}/><strong>中文语音 → 英文配音 + 英文字幕</strong></div><p>免费本机处理，无需 API。首次自动下载并缓存语音翻译与配音模型，处理可能较慢。建议使用电脑浏览器或桌面版。英文配音会替换原音轨，不保留原配音或背景音乐，不克隆原声。</p><label>英文配音<select value={voice} disabled={busy} onChange={e=>{setVoice(e.target.value);invalidate()}}><option value="af_heart">英文女声</option><option value="am_michael">英文男声</option></select></label><div className="cleanup-range"><label>开始（秒）<input type="number" min={0} step={.1} value={start} disabled={busy} onChange={e=>{setStart(Number(e.target.value));invalidate()}}/></label><label>结束（秒）<input type="number" min={0} max={size.duration} step={.1} value={end} disabled={busy} onChange={e=>{setEnd(Number(e.target.value));invalidate()}}/></label></div><label className="translation-check"><input type="checkbox" checked={removeRegions} disabled={busy} onChange={e=>{setRemoveRegions(e.target.checked);invalidate()}}/>同时修补选区，去掉原字幕／水印</label>{removeRegions&&<><p>画面上已有中文字幕时，请框选原字幕区域；水印可另加选区。不自动识别水印位置。</p>{native&&<label>叠加修补方式<select value={repairMethod} disabled={busy} onChange={e=>{setRepairMethod(e.target.value as 'quick'|'ai');invalidate()}}><option value="quick">区域快速修补</option><option value="ai">离线 AI 修复（最多 20 秒）</option></select></label>}</>}<p>每次最多 60 秒、源视频 200 MB，输出最高 720p。机器翻译与字幕时序可能有误，请检查结果；叠加 AI 修复限 20 秒。</p></div>}
      <p className="cleanup-note">支持位置固定的字幕和水印。复杂背景可能有修补痕迹；AI 也不能恢复真实被遮挡的内容。请先拖动时间轴检查位置。</p>
      {error&&<p className="tool-error" role="alert">{error}</p>}
      {status&&<p className="cleanup-status" role="status">{status}</p>}
      {busy&&<><progress max={100} value={progress} aria-label="处理进度"/><small>{progress}%</small>{(native||mode==='translate')&&<button className="quiet-button" onClick={()=>{abort.current?.abort();setStatus('正在停止，当前区域完成后结束…')}}>停止当前操作</button>}</>}
      <div className="cleanup-buttons">{mode!=='translate'&&mode!=='subtitle-track'&&(mode!=='ai'||native)&&<button className="quiet-button" disabled={busy||!ready||!validRegions(regions)} onClick={()=>void showPreview()}>预览当前帧</button>}{(mode!=='ai'||native)&&<button className="primary-button" disabled={busy||!ready||(mode!=='subtitle-track'&&(mode!=='translate'||removeRegions)&&!validRegions(regions))||(mode==='translate'&&(start<0||end<=start||end>size.duration||end-start>(native&&removeRegions&&repairMethod==='ai'?20.001:60.001)||!!file&&file.size>200*1024*1024))||(mode==='ai'&&(start<0||end<=start||end-start>20.001||end>size.duration||!!file&&file.size>100*1024*1024))} onClick={()=>void exportVideo()}><Eraser size={17}/>{busy?'处理中…':mode==='translate'?'翻译并合成英文视频':'处理并导出副本'}</button>}</div>
      {nativeResult&&<button className="primary-button" onClick={()=>void run(async()=>{if(await desktop.save(nativeResult,`${file?.name.replace(/\.[^.]+$/,'')}_${mode==='translate'?'english':'repaired'}.mp4`))setStatus('修复视频已保存')})}><Download size={17}/>保存处理后的视频</button>}
      {result&&<a className="primary-button" href={result} download={`${file?.name.replace(/\.[^.]+$/,'')}_${mode==='translate'?'english':mode==='ai'?'ai_repaired':'cleaned'}.mp4`}><Download size={17}/>保存处理后的视频</a>}
      {srt&&<button className="quiet-button" onClick={()=>{const url=URL.createObjectURL(new Blob([srt],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='english.srt';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}}><Download size={14}/>下载英文字幕 SRT</button>}
    </aside></div><ResultHistory version={historyVersion}/>
  </main>
}
