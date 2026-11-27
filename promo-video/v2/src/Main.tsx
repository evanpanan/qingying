import React from 'react'
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, Easing} from 'remotion'
const PAPER='#f6f5f0',INK='#272b25',MUTED='#747a6e',RED='#d54b38'
const ease=Easing.bezier(.22,1,.36,1)
const move=(f:number,a:number,b:number,x:number,y:number)=>interpolate(f,[a,b],[x,y],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease})
const shots=[
 {start:0,end:120,title:'从一个链接开始。',sub:'分享文案直接粘贴，自动识别链接。',label:'视频下载',files:['download-empty','download-input'],change:42,zoom:[1.2,1],pan:[60,0]},
 {start:120,end:300,title:'把好内容，留在身边。',sub:'解析公开作品，保存视频或音频到本机。',label:'视频下载',files:['download-ready','download-done'],change:112,zoom:[1,1.08],pan:[0,-70]},
 {start:300,end:450,title:'任务继续，创作不停。',sub:'下载队列、独立进度、最近记录，集中管理。',label:'下载与记录',files:['download-done','download-done'],change:100,zoom:[1.08,1.08],pan:[-70,90]},
 {start:450,end:630,title:'换个格式，继续创作。',sub:'MP4 / MOV / MKV / WebM，或提取 MP3 音频。',label:'格式转换',files:['convert-ready','convert-mp3'],change:90,zoom:[1,1],pan:[0,0]},
 {start:630,end:750,title:'只留下，你喜欢的声音。',sub:'批量选择文件，转换完成后直接打开目录。',label:'提取音频',files:['convert-mp3','convert-done'],change:30,zoom:[1.1,1],pan:[-75,0]},
 {start:750,end:930,title:'轻一点，分享快一点。',sub:'按需要选择画质与分辨率，转换与压缩在本机完成。',label:'视频压缩',files:['compress-settings','compress-settings'],change:90,zoom:[1,1.08],pan:[0,-55]},
 {start:930,end:1080,title:'一批文件，一起处理。',sub:'查看每个文件的结果，原视频保持不变。',label:'批量处理',files:['compress-done','compress-done'],change:90,zoom:[1.08,1.08],pan:[-55,65]},
 {start:1080,end:1260,title:'轻影，让创作更从容。',sub:'下载 · 转换 · 压缩，一个工作台。',label:'macOS 1.4.0',files:['convert-done','convert-done'],change:90,zoom:[1,1],pan:[0,0]},
]
const Pointer:React.FC<{x:number;y:number;click:number}>=({x,y,click})=><div style={{position:'absolute',left:x,top:y,width:32,height:42,filter:'drop-shadow(0 2px 3px #0003)',transform:`scale(${1-click*.12})`}}><svg viewBox="0 0 28 36" width="28" height="36"><path d="M3 2L24 23L14 24L9 33Z" fill={INK} stroke="white" strokeWidth="2"/></svg>{click>0&&<div style={{position:'absolute',left:-15,top:-15,width:40,height:40,border:`2px solid ${RED}`,borderRadius:'50%',transform:`scale(${1+(1-click)*1.5})`,opacity:click}}/>}</div>
export const Main:React.FC=()=>{
 const f=useCurrentFrame(),i=shots.findIndex(s=>f>=s.start&&f<s.end),s=shots[Math.max(0,i)],t=f-s.start
 const closing=i===7,enter=move(t,0,22,0,1),z=move(t,0,45,s.zoom[0],s.zoom[1]),pan=move(t,0,50,s.pan[0],s.pan[1]),second=move(t,s.change,s.change+9,0,1)
 const sx=[.57,.56,.7,.62,.79,.7,.7,.8][i],sy=[.24,.65,.75,.27,.54,.54,.6,.6][i]
 const px=move(t,15,62,.85,sx),py=move(t,15,62,.76,sy),click=t>62&&t<80?1-(t-62)/18:0
 return <AbsoluteFill style={{background:closing?INK:PAPER,fontFamily:'"Avenir Next", "PingFang SC", "Noto Sans CJK SC", sans-serif',color:closing?PAPER:INK,overflow:'hidden'}}>
  <Audio src={staticFile('score.wav')} volume={.65}/>
  <AbsoluteFill style={{backgroundImage:'radial-gradient(#747a6e20 .7px, transparent .7px)',backgroundSize:'6px 6px',opacity:.25,pointerEvents:'none'}}/>
  {!closing&&<div style={{position:'absolute',inset:'0 0 auto',height:150,background:PAPER,zIndex:3}}/>}
  <div style={{position:'absolute',left:100,top:38,zIndex:4,opacity:enter,transform:`translateY(${(1-enter)*12}px)`}}><div style={{fontSize:14,letterSpacing:3,color:closing?'#b2b9a9':MUTED,marginBottom:8}}>LIGHTVID / {s.label}</div><div style={{fontSize:48,fontWeight:500,letterSpacing:-1.5}}>{s.title}</div></div>
  <div style={{position:'absolute',right:100,top:69,color:closing?'#d8ddcf':MUTED,fontSize:20,zIndex:5}}>下载<span style={{color:RED,margin:'0 14px'}}>／</span>转换<span style={{color:RED,margin:'0 14px'}}>／</span>压缩</div>
  <div style={{position:'absolute',left:200,top:188,width:1520,height:838,transformOrigin:'center center',transform:closing?`translate(${move(t,0,48,0,-250)}px,${move(t,0,48,0,-28)}px) scale(${move(t,0,48,1,.72)})`:`translateX(${pan}px) scale(${z})`,opacity:enter}}>
   <div style={{borderRadius:16,overflow:'hidden',border:'1px solid #d6dacd',boxShadow:closing?'0 30px 90px #0006':'0 22px 65px #29302422',background:PAPER}}>
    <div style={{height:36,display:'flex',alignItems:'center',background:'#eeeee6',borderBottom:'1px solid #dedfd5',padding:'0 16px',gap:8}}>{['#d98c7c','#d6bd7b','#94ad86'].map(c=><span key={c} style={{width:10,height:10,borderRadius:'50%',background:c}}/>)}<span style={{position:'absolute',left:'46%',fontSize:13,color:MUTED}}>轻影 · 媒体工作台</span></div>
    <div style={{position:'relative',width:1520,height:802}}><Img src={staticFile(`screens/${s.files[0]}.png`)} style={{position:'absolute',width:'100%',height:'100%'}}/><Img src={staticFile(`screens/${s.files[1]}.png`)} style={{position:'absolute',width:'100%',height:'100%',opacity:second}}/>{!closing&&<Pointer x={px*1520} y={py*802} click={click}/>}</div>
   </div>
  </div>
  {(i===0||i===3||i===6)&&[0,1].slice(0,i===6?2:1).map(k=>{
   const l=t-k*12
   const incoming=move(l,0,38,1970,1040),depart=move(l,72,110,0,1280)
   const type=i===0?'LINK':i===3?(l<66?'MOV':'MP3'):'MP4'
   return <div key={k} style={{position:'absolute',left:incoming-depart+k*28,top:330+k*50,width:720,height:430,background:INK,color:PAPER,borderRadius:22,border:'1px solid #76836b',boxShadow:'0 28px 65px #0004',padding:48,transform:`rotate(${move(l,0,38,8,0)+k*3}deg)`,zIndex:6}}><div style={{fontSize:18,color:'#c2cbb8',letterSpacing:3}}>{i===0?'粘贴分享链接':i===3?'选择输出格式':'批量选择视频'}</div><div style={{fontSize:100,fontWeight:500,marginTop:26,letterSpacing:6}}>{type}<span style={{fontSize:40,color:'#a6b793',marginLeft:30}}>{i===3?'→':'↘'}</span></div><div style={{height:1,background:'#ffffff30',margin:'26px 0'}}/><div style={{fontSize:28}}>{k?'城市散步.mp4':'海边日记'+(i===0?'':i===3&&l>=66?'.mp3':'.mov')}</div><div style={{fontSize:18,color:'#c2cbb8',marginTop:18}}>{i===0?'链接进入下载工作区':i===3?'视频格式转换 / 提取音频':'原文件保持不变'}</div></div>
  })}
  {closing&&<div style={{position:'absolute',right:120,top:360,width:390,transform:`translateX(${move(t,12,50,380,0)}px)`,opacity:move(t,12,45,0,1)}}><div style={{width:74,height:74,background:RED,borderRadius:'50%',display:'grid',placeItems:'center',fontSize:36,marginBottom:26}}>▶</div><div style={{fontSize:64,letterSpacing:8,marginBottom:22}}>轻影</div>{['视频下载','格式转换','视频压缩'].map((a,k)=><div key={a} style={{fontSize:26,borderTop:'1px solid #ffffff25',padding:'15px 0',opacity:move(t,40+k*9,56+k*9,0,1),transform:`translateX(${move(t,40+k*9,56+k*9,50,0)}px)`}}><span style={{color:'#b2b9a9',fontSize:16,marginRight:30}}>0{k+1}</span>{a}</div>)}<div style={{fontSize:17,color:'#b2b9a9',marginTop:26}}>macOS 1.4.0 · 2026-11-27</div></div>}
  <div style={{position:'absolute',left:0,right:0,bottom:0,padding:'16px 100px 22px',background:closing?INK:'linear-gradient(transparent, #f6f5f0 30%)',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:7}}><span style={{fontSize:23,color:closing?'#d8ddcf':INK}}>{s.sub}</span><span style={{fontSize:14,color:closing?'#b2b9a9':MUTED}}>操作演示 · 示例文件</span></div>
 </AbsoluteFill>
}
