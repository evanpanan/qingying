import {join,dirname} from 'node:path'
import {launch} from './process.mjs'
import {hasTextMask,textMask,maskReferenceTime} from './text-mask.mjs'
import {regionEnable} from './region-time.mjs'
export const filterFile=path=>"'"+path.replace(/\\/g,'\\\\').replace(/:/g,'\\:').replace(/'/g,"'\\''")+"'"
export async function repairFilters(spec,width,height,regions,offset=0){
 const pad=regions.some(hasTextMask)?16:0,filters=pad?[`pad=${width+32}:${height+32}:16:16`,`fillborders=left=16:right=16:top=16:bottom=16:mode=smear`]:[]
 for(let i=0;i<regions.length;i++){
  const r=regions[i]
  if(hasTextMask(r)){
   const p=launch(spec.ffmpeg,['-ss',String(maskReferenceTime(r)),'-i',spec.input,'-vf',`scale=${width}:${height}`,'-frames:v','1','-an','-f','rawvideo','-pix_fmt','rgb24','pipe:1']);p.child.stdin.end();let chunks=[],bytes=0;for await(const data of p.child.stdout){bytes+=data.length;if(bytes>width*height*3){p.child.kill();throw Error('文字参考帧尺寸异常')}chunks.push(data)}await p.done
   const {mask,pixels,coverage}=textMask(Buffer.concat(chunks),width,height,r);if(pixels<3||coverage>.65)throw Error('未可靠识别固定浅色文字，请缩小选区或将修补范围切换为整个选区')
   const file=join(dirname(spec.output),`text-mask-${i}.png`),sharp=(await import('sharp')).default;await sharp(Buffer.from(mask),{raw:{width,height,channels:1}}).extend({top:pad,bottom:pad,left:pad,right:pad,extendWith:'copy'}).png().toFile(file)
   filters.push(`removelogo=f=${filterFile(file)}${regionEnable(r,offset)}`)
  }else{const x=Math.max(1,Math.min(width-3,Math.round(r.x*width))),y=Math.max(1,Math.min(height-3,Math.round(r.y*height))),w=Math.max(1,Math.min(width-x-1,Math.round(r.width*width))),h=Math.max(1,Math.min(height-y-1,Math.round(r.height*height)));filters.push(`delogo=x=${x+pad}:y=${y+pad}:w=${w}:h=${h}:show=0${regionEnable(r,offset)}`)}
 }
 if(pad)filters.push(`crop=${width}:${height}:16:16`)
 return filters.join(',')||'null'
}
