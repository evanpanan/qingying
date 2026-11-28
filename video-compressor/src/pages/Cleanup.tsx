import Select from '../components/Select'
import {invoke} from '@tauri-apps/api/core'
import {regionActive} from '../../desktop-ai/region-time.mjs'
import {useDesktopTask} from '../lib/desktop-tasks'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Upload, Eraser, Download, Monitor, RotateCcw, ShieldCheck, X, Plus, Trash2, Languages } from 'lucide-react'
import { cleanVideo, previewQuick } from '../lib/cleanup'
import { SUBTITLE_REGION, WATERMARK_REGION, validRegions, MAX_REPAIR_REGIONS, RESIZE_HANDLES, RESIZE_LABELS, resizeRegion, type ResizeHandle, type CleanupMode, type RepairRegion } from '../lib/cleanup-geometry'
import {isTauri} from '../lib/env'
import {DesktopRepair,type RepairFile} from '../lib/desktop-repair'
import {useDesktopVideoDrop} from '../lib/desktop'
import {cleanupLimit,fitCleanupRange,cleanupBlocked,repairSelection,goalOptions,type ProcessingGoal} from '../lib/cleanup-state'
import ResultHistory from '../components/ResultHistory'
import {translateVideo,type TranslateOptions} from '../lib/translation'
import {rememberBrowserResult} from '../lib/result-history'
import '../cleanup.css'

function regionActiveSafe(r:RepairRegion,t:number){try{return regionActive(r,t)}catch{return false}}

export default function Cleanup({active:visible=true}:{active?:boolean}){
  const native=isTauri()
  const [historyVersion,setHistoryVersion]=useState(0)
  const [desktop]=useState(()=>new DesktopRepair())
  const [nativeResult,setNativeResult]=useState('')
  const [goal,setGoal]=useState<ProcessingGoal>('repair'),[subtitles,setSubtitles]=useState(true),[dub,setDub]=useState(true),[eraseWatermarks,setEraseWatermarks]=useState(false)
  const [enhancement,setEnhancement]=useState<'off'|'natural'|'ai2x'>('off'),[enhancementSize,setEnhancementSize]=useState<'original'|'1080p'>('original'),[hdSupport,setHDSupport]=useState({supported:false,reason:'正在检测 AI 2×增强支持情况…'})
  const [voice,setVoice]=useState('af_heart'),[removeRegions,setRemoveRegions]=useState(true),[repairMethod,setRepairMethod]=useState<'quick'|'ai'>('quick'),[srt,setSrt]=useState('')
  const [file,setFile]=useState<RepairFile|null>(null),[url,setUrl]=useState(''),[size,setSize]=useState({width:0,height:0,duration:0})
  const [regions,setRegions]=useState<RepairRegion[]>([{...SUBTITLE_REGION}]),[active,setActive]=useState(0),[mode,setMode]=useState<CleanupMode>('quick')
  const [time,setTime]=useState(0),[start,setStart]=useState(0),[end,setEnd]=useState(0),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0)
  const [dragging,setDragging]=useState(false),[rangeNotice,setRangeNotice]=useState('')
  const [status,setStatus]=useState(''),[error,setError]=useState(''),[preview,setPreview]=useState(''),[result,setResult]=useState('')
  const input=useRef<HTMLInputElement>(null),video=useRef<HTMLVideoElement>(null),origin=useRef<{x:number;y:number;index:number;action:ResizeHandle|'move'|'draw';region:RepairRegion;pointerId:number;minWidth:number;minHeight:number}|null>(null),abort=useRef<AbortController|null>(null),mounted=useRef(true)
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;abort.current?.abort();desktop.dispose()}},[desktop])
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url)},[url]);useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);useEffect(()=>()=>{if(result)URL.revokeObjectURL(result)},[result])
  useDesktopTask(busy)
  const region=regions[active]
  function invalidate(){setSrt('');setPreview('');setResult('');setNativeResult('');setStatus('');setError('')}
  function changeRegion(next:RepairRegion,index=active){setRegions(items=>items.map((r,i)=>i===index?next:r));invalidate()}
  function addRegion(){if(busy||regions.length>=MAX_REPAIR_REGIONS)return;setRegions(items=>[...items,{...(mode==='translate'&&removeRegions&&!eraseWatermarks?SUBTITLE_REGION:WATERMARK_REGION)}]);setActive(regions.length);invalidate()}
  function removeRegion(index:number){if(busy)return;setRegions(items=>items.filter((_,i)=>i!==index));setActive(Math.max(0,Math.min(active,regions.length-2)));invalidate()}

  function normalizeRange(nextMode:CleanupMode=mode,remove=removeRegions,method=repairMethod,from=start,to=end){
    const limit=cleanupLimit(nextMode,native,remove,method),range=fitCleanupRange(from,to,size.duration,limit)
    setStart(range.start);setEnd(range.end)
    setRangeNotice(range.start!==from||range.end!==to?(Number.isFinite(limit)?`浏览器处理范围已调整为 ${range.start.toFixed(1)}–${range.end.toFixed(1)} 秒，较长视频可使用桌面版。`:'已将处理范围调整到视频有效时段。'):'')
  }
  function changeMode(next:CleanupMode){setMode(next);invalidate();normalizeRange(next,removeRegions,repairMethod,next==='translate'?0:start,next==='translate'?Math.min(native?size.duration:60,size.duration):end)}
  function chooseGoal(next:ProcessingGoal){
    setGoal(next);if(next==='enhance'&&enhancement==='off')setEnhancement('natural');const options=goalOptions(next);setSubtitles(options.subtitles);setDub(options.dub);setRemoveRegions(options.removeRegions);setEraseWatermarks(false)
    changeMode(next==='repair'?repairMethod:next==='subtitle-track'?'subtitle-track':next==='enhance'?'enhance':'translate')
  }
  const effectiveRegions=mode==='enhance'?[]:repairSelection(regions,mode==='translate',removeRegions,eraseWatermarks)
  const wantsRepair=mode!=='enhance'&&(mode!=='translate'||removeRegions||eraseWatermarks)
  function loadFile(next:RepairFile,source:string,prepared=false){
    if(!prepared)desktop.dispose();setNativeResult('');setFile(next);setUrl(source);setSize({width:0,height:0,duration:0});setTime(0);setStart(0);setEnd(0);setRegions([{...SUBTITLE_REGION}]);setActive(0);setPreview('');setResult('');setSrt('');setRangeNotice('');setError('');setStatus('');setProgress(0);setDragging(false)
  }
  function select(next?:File){if(!next||busy)return;if(!next.type.startsWith('video/')&&!/\.(mp4|mov|mkv|webm|avi|m4v|wmv|flv|3gp|mpg|mpeg|ts|m2ts|vob|ogv)$/i.test(next.name)){setError('请拖入视频文件，暂不支持文件夹或其他文件类型。');return}if(!native&&next.size>500*1024*1024){setError('请使用 500 MB 以内的视频');return}loadFile(next,URL.createObjectURL(next))}
  async function importNative(path:string){if(busy)return;await run(async signal=>{setStatus('正在导入本机视频…');const loaded=await desktop.open(path,signal);loadFile(loaded.file,loaded.url,true)})}
  useDesktopVideoDrop(visible&&!busy,files=>{if(typeof files[0]?.file==='string')void importNative(files[0].file)},{tool:'cleanup',hover:setDragging,invalid:()=>setError('请拖入视频文件，暂不支持文件夹或其他文件类型。')})
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
    else if(Math.abs(p.x-o.x)>.002&&Math.abs(p.y-o.y)>.002)changeRegion({...o.region,x:Math.min(p.x,o.x),y:Math.min(p.y,o.y),width:Math.abs(p.x-o.x),height:Math.abs(p.y-o.y)},o.index)
  }
  function resizeKey(e:KeyboardEvent<HTMLButtonElement>,handle:ResizeHandle,index:number){
    if(busy||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return
    e.preventDefault();e.stopPropagation();const step=e.shiftKey ? .02 : .005
    const dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0
    changeRegion(resizeRegion(regions[index],handle,dx,dy,8/size.width,8/size.height),index)
  }
  async function run(job:(signal:AbortSignal)=>Promise<void>){if(busy)return;setBusy(true);setError('');setProgress(0);const controller=new AbortController();abort.current=controller;try{await job(controller.signal)}catch(e){if(mounted.current){setError(controller.signal.aborted?'操作已停止':(e instanceof Error?e.message:typeof e==='string'?e:'处理失败，请重试'));setStatus('')}}finally{if(mounted.current)setBusy(false);abort.current=null}}
  async function showPreview(){
    if(!file||!video.current||mode!=='enhance'&&!validRegions(regions)||mode==='ai'&&!native)return
    await run(async signal=>{
      setStatus('正在生成修补预览…')
      if(!native&&!(file instanceof File))throw new Error('请重新选择视频')
      const blob=native?await desktop.run(file,mode,regions,size.width,size.height,start,end,time,true,(p,text)=>{setProgress(p);setStatus(text)},signal,{enhancement,enhancementSize,duration:size.duration}):await previewQuick(file as File,regions,size.width,size.height,time,{enhancement,enhancementSize,duration:size.duration},mode==='enhance')
      signal.throwIfAborted();if(!(blob instanceof Blob))throw new Error('未生成预览');setPreview(URL.createObjectURL(blob));setStatus('预览已生成，请检查修补痕迹后导出')
    })
  }
  async function exportVideo(){
    if(!file||blocked||mode==='ai'&&!native)return
    invalidate()
    await run(async signal=>{
      setStatus(mode==='enhance'?'正在增强并导出视频…':'正在修补并导出视频…')
      const translation:TranslateOptions={duration:size.duration,start,end,voice,removeRegions:wantsRepair,repairMethod,subtitles,dub,enhancement,enhancementSize}
      if(native){const job=await desktop.run(file,mode,effectiveRegions,size.width,size.height,start,end,time,false,(p,text)=>{setProgress(p);setStatus(text)},signal,mode==='translate'?translation:{enhancement,enhancementSize,duration:size.duration});if(typeof job!=='string')throw new Error('未生成结果');setNativeResult(job)}
      else{if(!(file instanceof File))throw new Error('请重新选择视频');let blob:Blob;if(mode==='translate'){const translated=await translateVideo(file,effectiveRegions,size.width,size.height,translation,(p,text)=>{setProgress(p);setStatus(text)},signal);blob=translated.blob;setSrt(translated.srt)}else blob=await cleanVideo(file,regions,size.width,size.height,setProgress,mode==='subtitle-track',{enhancement,enhancementSize,duration:size.duration},mode==='enhance');signal.throwIfAborted();setResult(URL.createObjectURL(blob));try{await rememberBrowserResult(file.name,(mode==='translate'?!dub?'translate-subtitles':!subtitles?'translate-dub':'translate':mode)+(enhancement!=='off'&&mode!=='enhance'?'+hd':''),blob)}catch{setError('处理成功，但浏览器未能保存历史，请立即下载结果')}}
      setHistoryVersion(v=>v+1);setProgress(100);setStatus('处理完成，已加入处理历史，原文件未改动')
    })
  }
  const ready=!!file&&size.width>0&&size.duration>0
  const timeError=effectiveRegions.some(r=>r.end!==undefined&&r.end>size.duration+.001)?'选区结束时间不能超过视频长度。':''
  const enhancementError=!native&&enhancement==='ai2x'?'AI 2×高清增强需要支持的 macOS 桌面设备。':!native&&enhancement!=='off'&&(size.duration>60||Number(file?.size)>200*1024*1024)?'网页高清增强请使用 60 秒、200 MB 以内的视频，较大或较长视频请用桌面版。':mode==='enhance'&&enhancement==='off'?'请选择高清增强方式。':''
  const blocked=enhancementError||timeError||cleanupBlocked(file,size.width,size.duration,mode,native,effectiveRegions,wantsRepair,repairMethod,start,end,subtitles,dub)
  const rangeLimit=cleanupLimit(mode,native,wantsRepair,repairMethod)
  const showRegions=mode!=='subtitle-track'&&wantsRepair
  useEffect(()=>{if(!native||!ready)return;let active=true;void invoke<{supported:boolean;reason:string}>('enhancement_support',{width:size.width,height:size.height}).then(r=>{if(active)setHDSupport(r||{supported:false,reason:'请升级桌面版以使用 AI 高清增强'})}).catch(()=>{if(active)setHDSupport({supported:false,reason:'AI 高清增强暂不可用，可选择自然增强'})});return()=>{active=false}},[native,ready,size.width,size.height])
  const goalItems=[{id:'repair',title:'去字幕／水印',desc:'只修补选区，保留原声音'},{id:'subtitles',title:'只换字幕',desc:'生成英文字幕，保留原声音'},{id:'dub',title:'只换配音',desc:'生成英文配音，保留原画面和字幕'},{id:'both',title:'字幕＋配音',desc:'同时生成英文字幕和英文配音'},{id:'enhance',title:'高清增强',desc:'降噪、增强细节，或 AI 2×超分'}] as const
  return <main className="workspace-page cleanup-page"><div className="page-intro"><span className="eyebrow">02 / REPAIR & LANGUAGE</span><h1>留下画面，<em>换一种表达。</em></h1><p>去掉字幕和水印，或换成英文字幕、英文配音，按需要选择。</p></div>
    <div className="cleanup-layout"><section className={`studio-panel cleanup-source ${dragging?'is-dragging':''}`} onDragOver={e=>{e.preventDefault();if(!busy)setDragging(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragging(false)}} onDrop={e=>{e.preventDefault();setDragging(false);if(!native)select(e.dataTransfer.files[0])}}>
      <div className="section-label"><span>视频与选区</span><ShieldCheck size={17}/></div>
      <input ref={input} hidden type="file" accept="video/*,.mp4,.mov,.mkv,.webm" onChange={e=>select(e.target.files?.[0])}/>
      {dragging&&<div className="cleanup-drop-indicator" role="status"><Upload size={28}/>松开即可导入视频</div>}
      {!file?<button className="cleanup-upload" disabled={busy} onClick={()=>input.current?.click()}><Upload size={30}/><strong>选择需要处理的视频</strong><span>{native?'支持拖入 · 可处理完整视频 · 原文件保持不变':'支持拖入 · 500 MB 以内 · 原文件保持不变'}</span></button>:<>
        <div className="cleanup-file"><strong title={file.name}>{file.name}</strong><button className="quiet-button" disabled={busy} onClick={()=>input.current?.click()}><RotateCcw size={14}/>更换视频</button></div>
        <div className={`cleanup-preview-layout ${showRegions?'with-tools':''}`} style={{maxWidth:size.width?Math.min(850,450*size.width/size.height)+(showRegions?166:0):undefined}}><div className="cleanup-view" style={{maxWidth:size.width?Math.min(850,450*size.width/size.height):850,aspectRatio:size.width?`${size.width}/${size.height}`:'16/9'}}>
          <video ref={video} src={url} muted playsInline preload="auto" onLoadedMetadata={e=>{const v=e.currentTarget;if(!Number.isFinite(v.duration)||!v.videoWidth){setError('无法读取视频信息，请先转换为 MP4');return}setSize({width:v.videoWidth,height:v.videoHeight,duration:v.duration});setEnd(Math.min(native?v.duration:mode==='translate'?60:v.duration,v.duration))}} onError={()=>setError('无法预览该视频格式，请先转换为 MP4')}/>
          {showRegions&&<div className="cleanup-select" role="group" aria-label="在视频上拖动框选字幕或水印区域" onPointerDown={down} onPointerMove={drag} onPointerUp={()=>{origin.current=null}} onPointerCancel={()=>{origin.current=null}} onLostPointerCapture={()=>{origin.current=null}}>
            {regions.map((r,index)=><div key={index} data-region={index} className={`cleanup-rectangle ${index===active?'active':''} ${effectiveRegions.includes(r)&&regionActiveSafe(r,time)?'':'preserved'}`} style={{left:`${r.x*100}%`,top:`${r.y*100}%`,width:`${r.width*100}%`,height:`${r.height*100}%`}}><span>{r.kind==='subtitle'?'字幕':'水印'} {index+1}{!effectiveRegions.includes(r)?' · 保留':!regionActiveSafe(r,time)?' · 此时不处理':''}</span>{index===active&&RESIZE_HANDLES.map(handle=><button key={handle} type="button" className={`cleanup-resize-handle handle-${handle}`} data-resize={handle} disabled={busy} aria-label={`调整区域 ${index+1} ${RESIZE_LABELS[handle]}`} title={`拖动${RESIZE_LABELS[handle]}调整大小`} onKeyDown={e=>resizeKey(e,handle,index)}/>)}</div>)}
          </div>}
        </div>{showRegions&&<aside className="cleanup-region-tools" aria-label="修补选区工具"><button className="add-region-button" disabled={busy||regions.length>=MAX_REPAIR_REGIONS} onClick={addRegion}><Plus size={18}/>添加修补选区</button><small>选区 {regions.length} / {MAX_REPAIR_REGIONS}</small><div className="cleanup-region-list">{regions.map((r,index)=><div key={index} className={active===index?'selected':''}><button disabled={busy} aria-pressed={active===index} onClick={()=>setActive(index)}>{r.kind==='subtitle'?'字幕':'水印'} {index+1}</button><button disabled={busy} aria-label={`删除区域 ${index+1}`} onClick={()=>removeRegion(index)}><Trash2 size={13}/></button></div>)}</div>
          {region&&<><label className="region-purpose">选区用途<Select aria-label="选区用途" value={region.kind||'watermark'} disabled={busy} onChange={e=>changeRegion({...region,kind:e.target.value as 'subtitle'|'watermark'})}><option value="subtitle">原字幕</option><option value="watermark">水印／其他</option></Select></label><label className="region-purpose">修补范围<Select aria-label="当前选区修补范围" value={region.fill||'area'} disabled={busy} onChange={e=>changeRegion({...region,fill:e.target.value as 'area'|'text'})}><option value="area">整个选区 · 通用修补</option><option value="text">文字笔画 · 固定浅色字</option></Select></label>{region.fill==='text'&&<small>只填补浅色字及描边，保留字缝背景。固定水印请先预览；移动、变色或不透明图案请用整个选区。</small>}<div className="region-timing"><label>生效范围<Select aria-label="当前选区生效范围" value={region.start===undefined?'all':'timed'} disabled={busy||!ready} onChange={e=>changeRegion({...region,start:e.target.value==='all'?undefined:Math.min(time,Math.max(0,size.duration-.1)),end:e.target.value==='all'?undefined:Math.min(size.duration,time+5)})}><option value="all">整段视频</option><option value="timed">指定时间段</option></Select></label>{region.start!==undefined&&<><label>从（秒）<input aria-label="选区开始（秒）" type="number" min={0} max={size.duration} step={.1} value={region.start} disabled={busy} onChange={e=>changeRegion({...region,start:Number(e.target.value)})}/></label><label>到（秒）<input aria-label="选区结束（秒）" type="number" min={0} max={size.duration} step={.1} value={region.end??size.duration} disabled={busy} onChange={e=>changeRegion({...region,end:Number(e.target.value)})}/></label><button className="quiet-button" disabled={busy} onClick={()=>changeRegion({...region,start:time})}>当前帧设为开始</button><button className="quiet-button" disabled={busy} onClick={()=>changeRegion({...region,end:time})}>当前帧设为结束</button><small>{regionActiveSafe(region,time)?'当前时间会修补此选区':'当前时间不修补此处'}</small></>}<small>时间以原视频为准，仅在此时间段修补。</small></div><button className="quiet-button" disabled={busy} onClick={()=>changeRegion({...region,...SUBTITLE_REGION})}>底部字幕位置</button><button className="quiet-button" disabled={busy} onClick={()=>changeRegion({...region,...WATERMARK_REGION})}>右上角水印位置</button></>}
          <p className="cleanup-region-help">框内拖动位置，边缘或四角调整大小。只处理勾选用途的选区。</p></aside>}</div>
        <label className="cleanup-timeline">预览位置 <span>{time.toFixed(1)} / {size.duration.toFixed(1)} 秒</span><input type="range" min={0} max={Math.max(0,size.duration-.02)} step={.1} value={time} disabled={busy||!ready} onChange={e=>{const next=Number(e.target.value);setTime(next);setPreview('');if(video.current)video.current.currentTime=next}}/></label>
        {showRegions&&region&&<details className="cleanup-coordinate-details"><summary>精确调整当前选区</summary><div className="cleanup-coordinates">{(['x','y','width','height'] as const).map((key,i)=><label key={key}>{['左侧','顶部','宽度','高度'][i]} %<input type="number" min={0} max={100} step={.1} disabled={busy} value={Number((region[key]*100).toFixed(1))} onChange={e=>changeRegion({...region,[key]:Number(e.target.value)/100})}/></label>)}</div></details>}
      </>}
      {preview&&<div className="cleanup-preview"><div className="section-label"><span>当前帧处理效果</span><button className="icon-button" aria-label="关闭预览" onClick={()=>setPreview('')}><X size={15}/></button></div><img src={preview} alt="所选区域修补后的当前帧"/></div>}
    </section><aside className="studio-panel cleanup-options"><div className="section-label"><span>你想做什么？</span><Eraser size={17}/></div>
      <div className="cleanup-goals">{goalItems.map(item=><button key={item.id} disabled={busy} aria-pressed={goal===item.id} className={goal===item.id?'selected':''} onClick={()=>chooseGoal(item.id)}><strong>{item.title}</strong><span>{item.desc}</span></button>)}</div>
      {mode==='translate'&&<div className="translation-options"><div className="translation-title"><Languages size={18}/><strong>中文语音 → 英文</strong></div><p className="language-summary">{subtitles?(dub?'生成英文字幕和英文配音':'生成英文字幕，保留原声音'):'生成英文配音，保留原字幕'}</p>
        <p>{dub?'英文配音会替换原音轨，不保留原配音或背景音乐，不克隆原声。':'保留原配音和背景音乐，仅更换字幕。'}{!subtitles?(wantsRepair?'不新增字幕，只清除勾选的选区。':'不新增字幕，保留原画面和原字幕。'):''}</p>
        {dub&&<label>英文配音<Select aria-label="英文配音" value={voice} disabled={busy} onChange={e=>{setVoice(e.target.value);invalidate()}}><option value="af_heart">英文女声</option><option value="am_michael">英文男声</option></Select></label>}
        <div className="optional-repairs"><strong>需要同时清除画面内容吗？</strong><label><input type="checkbox" checked={removeRegions} disabled={busy} onChange={e=>{setRemoveRegions(e.target.checked);invalidate()}}/>清除原字幕选区</label><label><input type="checkbox" checked={eraseWatermarks} disabled={busy} onChange={e=>{setEraseWatermarks(e.target.checked);invalidate()}}/>同时清除水印／其他选区</label><p>烧录的旧字幕需框选清除；未勾选的水印会保留。</p></div>
        <p className="model-first-use">免费本机处理；首次自动下载语音模型并缓存。</p>
      </div>}
      <div className="enhancement-options"><label><input type="checkbox" checked={enhancement!=='off'} disabled={busy} onChange={e=>{setEnhancement(e.target.checked?'natural':'off');invalidate()}}/>高清增强{mode==='enhance'?'':' · 处理后叠加'}</label>{enhancement!=='off'&&<><label>增强方式<Select aria-label="高清增强方式" value={enhancement} disabled={busy} onChange={e=>{setEnhancement(e.target.value as 'natural'|'ai2x');invalidate()}}><option value="natural">自然增强 · 轻降噪＋细节增强</option><option value="ai2x" disabled={native&&!hdSupport.supported}>AI 2×超分辨率 · Mac 原生引擎</option></Select></label>{enhancement==='natural'?<><label>输出尺寸<Select aria-label="高清输出尺寸" value={enhancementSize} disabled={busy} onChange={e=>{setEnhancementSize(e.target.value as 'original'|'1080p');invalidate()}}><option value="original">原尺寸</option><option value="1080p">1080p · 插值放大（不足时放大）</option></Select></label><p>自然增强使用轻降噪和适度锐化；尺寸放大采用插值，不冒充 AI 超分。</p></>:<p>Apple 机器学习 2×超分，保留输入帧率，目前支持 SDR 视频。无法保证还原真实细节；先用短片段预览检查效果。</p>}{native&&<small>{hdSupport.reason}</small>}{!native&&<p>网页支持自然增强；AI 2×超分需要 macOS 26 及支持的桌面设备。</p>}</>}</div>
      {wantsRepair&&mode!=='subtitle-track'&&<div className="repair-methods"><label>修补方式<Select aria-label="修补方式" value={mode==='ai'?'ai':repairMethod} disabled={busy} onChange={e=>{const next=e.target.value as 'quick'|'ai';setRepairMethod(next);if(goal==='repair')setMode(next);invalidate()}}><option value="quick">快速修补 · 简单背景</option><option value="ai">AI 智能修复 · 更自然的填补</option></Select></label><p>{(mode==='ai'||repairMethod==='ai')?'本机离线 AI · 最高 720p / 12 帧，长视频耗时较长。':'快速修补根据周围像素填补，适合背景简单、位置固定的文字和水印。'}</p></div>}
      {(mode==='ai'||mode==='translate')&&<details className="processing-range"><summary>处理范围<span>{start===0&&end>=size.duration-.001?'整段视频':`${start.toFixed(1)}–${end.toFixed(1)} 秒`}</span></summary><div className="range-heading"><strong>处理范围</strong><button className="quiet-button" disabled={busy||!ready} onClick={()=>{setStart(0);setEnd(Math.min(size.duration,native?size.duration:60));invalidate()}}>{native?'整段视频':'前 60 秒'}</button></div><div className="cleanup-range"><label>开始（秒）<input type="number" min={0} step={.1} value={start} disabled={busy} onChange={e=>{setStart(Number(e.target.value));setRangeNotice('');invalidate()}}/></label><label>结束（秒）<input type="number" min={0} max={size.duration} step={.1} value={end} disabled={busy} onChange={e=>{setEnd(Number(e.target.value));setRangeNotice('');invalidate()}}/></label></div><p>{native?'桌面无固定时长或文件大小上限，实际受设备性能与磁盘空间影响，可随时停止。':'浏览器语音处理每次最多 60 秒、200 MB；较长或较大的视频请用桌面版。'}</p></details>}
      {!native&&mode==='translate'&&<p className="cleanup-capacity-note">网页语音处理每次最多 60 秒、200 MB；完整视频请使用桌面版。</p>}
      {((mode==='ai' ||mode==='translate'&&wantsRepair&&repairMethod==='ai'||enhancement==='ai2x')&&!native)&&<div className="cleanup-desktop-notice"><Monitor size={22}/><strong>{enhancement==='ai2x'?'AI 2×高清增强需要桌面版':'AI 画面修复需要桌面版'}</strong><p>网页可用快速修补和语音处理，桌面版内置离线 AI，支持完整视频。</p><a className="primary-button" href="https://github.com/evanpanan/qingying/releases/download/v1.10.0/_1.10.0_aarch64.dmg" download><Download size={16}/>下载 macOS 版</a><small>Apple Silicon · v1.10.0 · 更新于 2026-11-28</small></div>}
      <details className="cleanup-advanced"><summary>处理说明与其他字幕工具</summary><p>AI 填补可能有痕迹或帧间闪烁；字幕合成最高 720p / 24 帧。仅换配音且不修补画面时保留原画质。机器翻译与时间可能有误，请检查结果。</p><button className="quiet-button" disabled={busy} onClick={()=>{chooseGoal('subtitle-track')}}>移除独立字幕轨</button><p>只删除可开关的字幕轨，不清除烧录在画面上的文字。</p></details>
      {mode==='subtitle-track'&&<p className="cleanup-note">当前任务：移除独立字幕轨，画面和声音保持不变。</p>}
      {error&&<p className="tool-error" role="alert">{error}</p>}{status&&<p className="cleanup-status" role="status">{status}</p>}
      {rangeNotice&&<p className="cleanup-range-notice" role="status">{rangeNotice}</p>}
      {!busy&&blocked&&<div id="cleanup-blocked" className="cleanup-blocked"><p>{blocked}</p>{ready&&mode==='translate'&&Number.isFinite(rangeLimit)&&end-start>rangeLimit+.001&&<button className="quiet-button" onClick={()=>{invalidate();normalizeRange()}}>调整为 {rangeLimit} 秒</button>}</div>}
      {busy&&<><progress max={100} value={progress} aria-label="处理进度"/><small>{progress}%</small><button className="quiet-button" onClick={()=>{abort.current?.abort();setStatus('正在停止当前操作…')}}>停止当前操作</button></>}
      {!(mode==='ai'&&!native)&&<div className="cleanup-buttons">{mode!=='translate'&&mode!=='subtitle-track'&&<button className="quiet-button" disabled={busy||!ready||!!enhancementError||mode!=='enhance'&&!validRegions(regions)} onClick={()=>void showPreview()}>预览当前帧</button>}<button className="primary-button" disabled={busy||!!blocked} aria-describedby={blocked?'cleanup-blocked':undefined} onClick={()=>void exportVideo()}><Eraser size={17}/>{busy?'处理中…':mode==='translate'?(subtitles?(dub?'生成英文字幕与配音':'生成英文字幕'):'生成英文配音'):mode==='enhance'?'高清增强并导出':'处理并导出副本'}</button></div>}
      {nativeResult&&<button className="primary-button" onClick={()=>void run(async()=>{if(await desktop.save(nativeResult,`${file?.name.replace(/\.[^.]+$/,'')}_${mode==='translate'?'english':'repaired'}.mp4`))setStatus('处理视频已保存')})}><Download size={17}/>保存处理后的视频</button>}
      {result&&<a className="primary-button" href={result} download={`${file?.name.replace(/\.[^.]+$/,'')}_${mode==='translate'?'english':'repaired'}.mp4`}><Download size={17}/>保存处理后的视频</a>}
      {srt&&<button className="quiet-button" onClick={()=>{const url=URL.createObjectURL(new Blob([srt],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='english.srt';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}}><Download size={14}/>下载英文字幕 SRT</button>}
    </aside></div><ResultHistory version={historyVersion}/>
  </main>
}
