import {useEffect,useRef,type RefObject} from 'react'
const rest=[[-18,19,-7],[0,5,0],[15,-7,7],[28,-17,14]]
const hold=3100,extract=850,returning=1050,settle=500,cycle=hold+extract+returning+settle
const ease=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
type Pose={x:number;y:number;angle:number;scale:number}
const mix=(a:Pose,b:Pose,t:number):Pose=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle+(b.angle-a.angle)*t,scale:a.scale+(b.scale-a.scale)*t})
export function useCardChoreography(stage:RefObject<HTMLDivElement|null>,front:number,inspect:boolean,select:(n:number)=>void){
 const poses=useRef<Pose[]>([]),clock=useRef({front,elapsed:0})
 useEffect(()=>{const node=stage.current;if(!node)return;const cards=[...node.querySelectorAll<HTMLElement>('.feature-sheet')];if(clock.current.front!==front)clock.current={front,elapsed:0};let raf=0,last=0,elapsed=clock.current.elapsed,visible=true;const media=matchMedia('(prefers-reduced-motion: reduce)');let reduced=media.matches
 function paint(now:number){raf=0;if(document.hidden||!visible){last=0;return}const dt=last?Math.min(48,now-last):16;last=now;const w=node!.clientWidth,h=node!.clientHeight,cw=cards[0].offsetWidth,ch=cards[0].offsetHeight,scale=Math.min(1,(w-42)/(cw*1.14)),inspectScale=Math.min(.78,(w-38)/(cw*2),(h-40)/(ch*2)),stepX=(cw*inspectScale+16)/2,stepY=(ch*inspectScale+16)/2
 const pose=(rank:number):Pose=>({x:rest[rank][0]*(w<380?.72:1),y:rest[rank][1]*(w<380?.72:1),angle:rest[rank][2]*(w<330?.8:1),scale})
 if(!inspect&&!reduced){elapsed+=dt;if(elapsed>=cycle){select((front+1)%cards.length);return}}
 node!.dataset.phase=inspect?'inspect':elapsed<hold?'hold':elapsed<hold+extract?'extract':elapsed<hold+extract+returning?'return':'settle'
 cards.forEach((card,i)=>{const rank=(i-front+cards.length)%cards.length;let target=pose(rank),z=cards.length-rank;if(inspect)target={x:(i%2?1:-1)*stepX,y:(i<2?-1:1)*stepY,angle:i%2?3.5:-3.5,scale:inspectScale};else if(elapsed>=hold){const out={x:-Math.min(cw*.56,Math.max(65,(w-cw)/2+12)),y:30,angle:-13,scale:scale*1.015};if(elapsed<hold+extract){if(rank===0)target=mix(pose(0),out,ease((elapsed-hold)/extract))}else{const t=ease((elapsed-hold-extract)/returning);if(rank===0){target=mix(out,pose(3),t);z=0}else{target=mix(pose(rank),pose(rank-1),t);z=cards.length-rank+1}}}const current=poses.current[i]||{...pose(rank),y:pose(rank).y+(reduced?0:25),scale:scale*(reduced?1:.94)};poses.current[i]=mix(current,target,reduced?1:1-Math.exp(-dt/78));const p=poses.current[i];card.style.zIndex=String(z);card.style.transform=`translate(${p.x}px,${p.y}px) rotate(${p.angle}deg) scale(${p.scale})`})
 if(!reduced)raf=requestAnimationFrame(paint)
 }
 const schedule=()=>{if(!raf)raf=requestAnimationFrame(paint)},visibility=()=>{cancelAnimationFrame(raf);raf=0;last=0;if(!document.hidden)schedule()},change=()=>{reduced=media.matches;schedule()},resize=new ResizeObserver(schedule),observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;visibility()},{threshold:.08});resize.observe(node);observer.observe(node);document.addEventListener('visibilitychange',visibility);media.addEventListener('change',change);schedule();return()=>{clock.current={front,elapsed};cancelAnimationFrame(raf);resize.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',change)}
 },[stage,front,inspect,select])
}
