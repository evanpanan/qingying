import {useEffect,useState} from 'react'
import {invoke} from '@tauri-apps/api/core'
import {FolderOpen,Play,Download,History} from 'lucide-react'
import {isTauri} from '../lib/env'
import {browserResults,browserResultAction,type ResultRecord} from '../lib/result-history'
import {DesktopRepair} from '../lib/desktop-repair'
const labels:Record<string,string>={ai:'AI 修复',quick:'快速修补','subtitle-track':'移除字幕轨',translate:'英文配音与字幕'}
export default function ResultHistory({version}:{version:number}){
 const native=isTauri(),[items,setItems]=useState<ResultRecord[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState('')
 useEffect(()=>{let active=true;void (native?invoke<ResultRecord[]>('library_list'):browserResults()).then(result=>{if(active)setItems(result)}).catch(()=>{if(active)setError('暂时无法读取处理历史')});return()=>{active=false}},[native,version])
 async function action(item:ResultRecord,kind:'open'|'reveal'|'save'){
  setBusy(item.id);setError('')
  try{if(native){if(kind==='save')await new DesktopRepair().save(item.id,item.title.replace(/\.[^.]+$/,'')+(item.kind==='translate'?'_english':'_repaired')+'.mp4');else await invoke('library_action',{id:item.id,action:kind})}else if(kind!=='reveal')await browserResultAction(item,kind)}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy('')}
 }
 return <section className="result-history" aria-label="处理历史"><div className="section-label"><span><History size={16}/>处理历史</span><small>{native?'自动保存在本机，重启后仍可打开':'浏览器保留最近 10 条，最多 200 MB'}</small></div><p className="history-explanation">{native?'处理完成即生成独立文件，无需先另存。打开视频或在文件夹中查看，也可另存到其他位置。':'结果保存在当前浏览器。下载后的文件夹可从浏览器下载列表打开。'}</p>{error&&<p className="tool-error" role="alert">{error}</p>}<ol>{items.map(item=><li key={item.id}><div className="result-record-copy"><strong title={item.title}>{item.title}</strong><small>{labels[item.kind]||'处理视频'} · {new Date(item.created_at*1000).toLocaleString('zh-CN')} · {item.bytes<1024*1024?`${Math.ceil(item.bytes/1024)} KB`:`${(item.bytes/1024/1024).toFixed(1)} MB`}{!item.exists?' · 文件已移动或删除':''}</small></div><div className="result-record-actions"><button className="quiet-button" disabled={!item.exists||!!busy} onClick={()=>void action(item,'open')}><Play size={14}/>打开视频</button>{native&&<button className="quiet-button" disabled={!item.exists||!!busy} onClick={()=>void action(item,'reveal')}><FolderOpen size={14}/>所在文件夹</button>}<button className="quiet-button" disabled={!item.exists||!!busy} onClick={()=>void action(item,'save')}><Download size={14}/>{native?'另存为':'下载'}</button></div></li>)}</ol>{!items.length&&<p className="history-explanation">还没有处理记录，完成后会自动出现在这里。</p>}</section>
}
