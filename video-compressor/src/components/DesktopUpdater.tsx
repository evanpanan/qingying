import {useEffect,useRef,useState} from 'react'
import {check,type Update} from '@tauri-apps/plugin-updater'
import {relaunch} from '@tauri-apps/plugin-process'
import {getVersion} from '@tauri-apps/api/app'
import {listen} from '@tauri-apps/api/event'
import {Download,RefreshCw,X,CheckCircle2} from 'lucide-react'
import {desktopBusy,useDesktopBusy} from '../lib/desktop-tasks'
type Phase='idle'|'checking'|'available'|'latest'|'downloading'|'ready'|'installing'|'restart'|'error'
export default function DesktopUpdater(){
 const [open,setOpen]=useState(false),[phase,setPhase]=useState<Phase>('idle'),[version,setVersion]=useState(''),[target,setTarget]=useState(''),[notes,setNotes]=useState(''),[date,setDate]=useState(''),[error,setError]=useState(''),[downloaded,setDownloaded]=useState(0),[total,setTotal]=useState(0)
 const dialog=useRef<HTMLElement>(null),update=useRef<Update|null>(null),lock=useRef(false),alive=useRef(true),busy=useDesktopBusy()
 async function checkNow(manual=true){
  if(lock.current)return
  if(manual)setOpen(true)
  if(update.current){if(manual)setOpen(true);return}
  lock.current=true;setPhase('checking');setError('')
  try{const found=await check({timeout:20000});if(!alive.current){await found?.close();return}if(found){update.current=found;setTarget(found.version);setNotes(found.body||'功能改进与问题修复');setDate(found.date?new Date(found.date).toLocaleDateString('zh-CN'):'');setPhase('available');setOpen(true)}else setPhase(manual?'latest':'idle')}
  catch(e){if(alive.current){setError(`暂时无法检查更新，请检查网络后重试。${String(e)}`);setPhase('error')}}finally{lock.current=false}
 }
 useEffect(()=>{
  alive.current=true;void getVersion().then(setVersion).catch(()=>{})
  const timer=window.setTimeout(()=>void checkNow(false),5000)
  let off:(()=>void)|undefined,disposed=false
  void listen('desktop:check-update',()=>void checkNow()).then(fn=>{if(disposed)fn();else off=fn}).catch(()=>{})
  return()=>{alive.current=false;disposed=true;clearTimeout(timer);off?.();if(!lock.current){void update.current?.close();update.current=null}}
 },[])
 async function download(){
  const current=update.current;if(!current||lock.current)return
  lock.current=true;setPhase('downloading');setError('');setDownloaded(0);setTotal(0)
  try{let bytes=0;await current.download(event=>{if(event.event==='Started'){setTotal(event.data.contentLength||0);bytes=0}else if(event.event==='Progress'){bytes+=event.data.chunkLength;setDownloaded(bytes)}} ,{timeout:15*60*1000});setPhase('ready')}
  catch(e){setError(`下载或签名校验失败，当前版本未改动。${String(e)}`);setPhase('available')}finally{lock.current=false}
 }
 async function install(){
  if(lock.current||desktopBusy())return
  const current=update.current;if(!current)return
  lock.current=true;setError('');setPhase('installing')
  try{await current.install();setPhase('restart');try{await relaunch()}catch(e){setError(`更新已安装，自动重启失败，请退出后重新打开轻影。${String(e)}`)}}
  catch(e){setError(`安装未能完成，请重新下载后重试。若提示权限不足，请将轻影放入有写入权限的“应用程序”文件夹。${String(e)}`);setPhase('available')}finally{lock.current=false}
 }
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;dialog.current?.focus();return()=>previous?.focus()},[open])
 const locked=['downloading','installing'].includes(phase),percent=total?Math.min(100,Math.floor(downloaded/total*100)):null
 return <><button className="desktop-update-entry" onClick={()=>void checkNow()}><RefreshCw size={13}/>{phase==='available'||phase==='ready'?`更新至 ${target}`:'检查更新'}</button>{open&&<div className="desktop-update-backdrop"><section ref={dialog} tabIndex={-1} onKeyDown={event=>{if(event.key==='Escape'&&!locked){event.preventDefault();setOpen(false)}if(event.key==='Tab'){const controls=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));const first=controls[0],last=controls.at(-1);if(!first){event.preventDefault();return}if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last?.focus()}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog.current)){event.preventDefault();first.focus()}}}} className="desktop-update-dialog" role="dialog" aria-modal="true" aria-labelledby="update-title"><button className="icon-button update-close" disabled={locked} aria-label="关闭更新窗口" onClick={()=>setOpen(false)}><X size={18}/></button><span className="eyebrow">LIGHTVID UPDATE</span><h2 id="update-title">{phase==='latest'?'已是最新版本':target?`轻影 ${target}`:'软件更新'}</h2><p className="update-current">当前版本 {version||'…'}{date?` · 新版发布于 ${date}`:''}</p>{phase==='checking'&&<p role="status">正在检查新版本…</p>}{phase==='latest'&&<p><CheckCircle2 size={16}/>你正在使用最新版本。</p>}{target&&<p className="update-notes">{notes}</p>}{error&&<p className="tool-error" role="alert">{error}</p>}{phase==='downloading'&&<div role="status"><progress max={100} value={percent??undefined}/><p>{percent===null?'正在下载更新…':`正在下载 ${percent}%`} · {(downloaded/1024/1024).toFixed(1)} MB{total?` / ${(total/1024/1024).toFixed(1)} MB`:''}</p></div>}{phase==='ready'&&<p>更新包已下载并通过签名校验。安装会重启轻影，处理历史和模型缓存会保留。</p>}{busy&&phase==='ready'&&<p role="status">有任务正在处理，请等待全部任务结束后再安装。</p>}{phase==='installing'&&<p role="status">正在安装更新，请勿退出…</p>}{phase==='restart'&&<p role="status">更新已安装，请重新打开轻影。</p>}<div className="update-actions">{phase==='available'&&<button className="primary-button" onClick={()=>void download()}><Download size={16}/>{error?'重新下载':'下载更新'}</button>}{phase==='ready'&&<button className="primary-button" disabled={busy} onClick={()=>void install()}><RefreshCw size={16}/>安装并重启</button>}{phase==='error'&&<button className="primary-button" onClick={()=>void checkNow()}>重新检查</button>}{!locked&&<button className="quiet-button" onClick={()=>setOpen(false)}>{phase==='latest'?'完成':'稍后'}</button>}</div><small>启动时自动检查；只有点击“安装并重启”后才会安装。</small></section></div>}</>
}
