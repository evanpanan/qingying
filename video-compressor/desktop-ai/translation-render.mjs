import {regionEnable} from './region-time.mjs'
import {wrapCaption} from './translation-core.mjs'
export function tempoFilter(ratio){if(!Number.isFinite(ratio)||ratio<=0)throw new Error('配音时长无效');const filters=[];while(ratio>2){filters.push('atempo=2');ratio/=2}filters.push(`atempo=${Math.max(1,ratio).toFixed(6)}`);return filters.join(',')}
export function compositeFilter(width,height,regions=[],cues=[],offset=0){
 const base=[`scale=${width}:${height}`,'setsar=1']
 for(const r of regions){const x=Math.max(1,Math.min(width-3,Math.round(r.x*width))),y=Math.max(1,Math.min(height-3,Math.round(r.y*height))),w=Math.max(1,Math.min(width-x-1,Math.round(r.width*width))),h=Math.max(1,Math.min(height-y-1,Math.round(r.height*height)));base.push(`delogo=x=${x}:y=${y}:w=${w}:h=${h}:show=0${regionEnable(r,offset)}`)}
 const filters=[`[0:v]${base.join(',')}[v0]`]
 cues.forEach((cue,i)=>filters.push(`[v${i}][${i+2}:v]overlay=x=0:y=H-h-${Math.max(8,Math.round(height*.035))}:enable='gte(t,${cue.start.toFixed(3)})*lt(t,${cue.end.toFixed(3)})':eof_action=repeat[v${i+1}]`))
 return {filter:filters.join(';'),label:`[v${cues.length}]`}
}
export function captionLayout(text,width){const font=Math.max(14,Math.round(width*.035)),lines=wrapCaption(text,Math.max(20,Math.floor((width-24)/(font*.59))));return {font,lines,height:Math.ceil(font*1.4*lines.length+16)}}
