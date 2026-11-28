import {useRef,useState,type CSSProperties} from 'react'
import {ArrowDown,ArrowRight,ArrowLeft,AudioLines,FileVideo,ScanLine,Sparkles,Play,Expand,Shrink,Check} from 'lucide-react'
import type {Page} from '../types'
import './feature-deck.css'
import {useCardChoreography} from '../lib/use-card-choreography'
const features=[
 {title:'把喜欢，留在身边。',tag:'01 / DOWNLOAD',name:'视频与音频下载',description:'粘贴作品链接，保存视频、图片或 MP3 音频。任务排队，进度和用时都看得见。',detail:'抖音 · 小红书 · B站 · YouTube 等主要平台',page:'download',icon:ArrowDown,chips:['MP4','MP3','图集']},
 {title:'去掉干扰，留住细节。',tag:'02 / REPAIR & ENHANCE',name:'画面修复与高清',description:'多选区清除字幕和水印，每个选区可设置出现时间。支持精细去字、自然增强与桌面 AI 修复。',detail:'支持的 macOS 26 设备可使用 AI 2× 超分',page:'cleanup',icon:ScanLine,chips:['多选区','分时修复','高清增强']},
 {title:'同一个故事，另一种语言。',tag:'03 / SUBTITLES & VOICE',name:'英文字幕与配音',description:'只换字幕、只换配音，或同时生成英文字幕和配音；也能叠加清除原字幕与水印。',detail:'本机处理 · 语音模型首次下载后缓存',page:'cleanup',icon:AudioLines,chips:['英文字幕','英文配音','自由组合']},
 {title:'恰好的格式，轻一点的分享。',tag:'04 / CONVERT & COMPRESS',name:'格式转换与压缩',description:'MP4、MOV、MKV、WebM 与 MP3，自由转换。按需要压缩体积，原文件始终保留。',detail:'转换和压缩在本机完成，原视频不上传',page:'convert',icon:FileVideo,chips:['格式转换','体积压缩','保留原文件']},
] as const
export default function NeedsGallery({onNavigate}:{onNavigate:(page:Page)=>void}){
 const[selected,setSelected]=useState(0),[expanded,setExpanded]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false)
 const stage=useRef<HTMLDivElement>(null)
 const inspecting=expanded||hovered||focused
 useCardChoreography(stage,selected,inspecting,setSelected)
 const item=features[selected]
 function navigate(page:Page){if(page==='download'){onNavigate('download');requestAnimationFrame(()=>document.getElementById('share-link')?.focus())}else onNavigate(page)}
 return <section className="feature-deck" id="features">
 <div className="feature-deck-heading"><span className="eyebrow">MAKE IT YOUR OWN.</span><h2>按你的需要，<em>刚刚好。</em></h2><p>四种能力，从保存到整理，再到新的表达。</p></div>
 <div className={`feature-deck-layout ${inspecting?'is-expanded':''}`}>
 <div className="feature-deck-detail" aria-live="off"><span className="eyebrow">{item.tag}</span><h3>{item.name}</h3><p>{item.description}</p><small>{item.detail}</small><div className="feature-deck-actions"><button className="primary-button" onClick={()=>navigate(item.page)}>开始使用 <ArrowRight size={17}/></button>{selected===3&&<button className="quiet-button" onClick={()=>navigate('compress')}>去压缩 <ArrowRight size={15}/></button>}</div></div>
 <div className="feature-deck-stage" aria-label="四项功能"><div ref={stage} className="feature-deck-stack" onPointerEnter={e=>{if(e.pointerType==='mouse')setHovered(true)}} onPointerLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false)}} onKeyDown={e=>{if(e.key==='Escape'){setExpanded(false);setHovered(false);setFocused(false);(e.target as HTMLElement).blur()}}}>{features.map((feature,index)=>{const offset=(index-selected+4)%4,Icon=feature.icon;return <button key={feature.tag} className={`feature-sheet ${index===selected?'is-selected':''}`} style={{'--offset':offset,'--index':index,'--order':4-offset} as CSSProperties} aria-pressed={index===selected} aria-label={feature.name} onClick={()=>{setSelected(index)}}><span className="feature-card-face"><span className="feature-sheet-top">{feature.tag}<Icon size={21}/></span><div className={`feature-art art-${index}`} aria-hidden="true">{index===0?<><div className="art-file"><Play size={35}/><span>YOUR GOOD FIND</span></div><div className="art-badge"><Check size={14}/>MP4 / MP3</div></>:index===1?<><div className="art-picture"><Sparkles size={48}/><span className="art-selection"/></div><div className="art-badge">REPAIR + HD</div></>:index===2?<><span className="art-language">你好<span>HELLO.</span></span><div className="art-wave">{Array.from({length:16},(_,n)=><i key={n} style={{height:14+(n*17%43)}}/>)}</div></>:<><div className="art-formats"><span>MOV</span><ArrowRight/><span>MP4</span></div><div className="art-size"><span/>LESS SIZE. SAME STORY.</div></>}</div><strong>{feature.title}</strong><span className="feature-sheet-chips">{feature.chips.map(chip=><span key={chip}>{chip}</span>)}</span></span></button>})}</div></div>
 </div><div className="feature-deck-controls"><div className="feature-deck-pagination"><button className="icon-button" aria-label="上一项功能" onClick={()=>{setSelected(n=>(n+3)%4)}}><ArrowLeft size={17}/></button>{features.map((f,i)=><button key={f.tag} className="feature-deck-dot" aria-label={`查看${f.name}`} aria-pressed={selected===i} onClick={()=>{setSelected(i)}}/>)}<button className="icon-button" aria-label="下一项功能" onClick={()=>{setSelected(n=>(n+1)%4)}}><ArrowRight size={17}/></button></div><button className="quiet-button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?<Shrink size={15}/>:<Expand size={15}/>} {expanded?'收起卡片':'展开四项功能'}</button></div>
 </section>
}
