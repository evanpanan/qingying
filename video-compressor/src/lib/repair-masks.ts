import type {FFmpeg} from '@ffmpeg/ffmpeg'
import {textMask,hasTextMask,maskReferenceTime} from '../../desktop-ai/text-mask.mjs'
import {regionEnable} from '../../desktop-ai/region-time.mjs'
import {repairFilter,regionPixels,type RepairRegion} from './cleanup-geometry'
export async function wasmRepairFilter(ff:FFmpeg,input:string,regions:RepairRegion[],width:number,height:number,offset:number,files:Set<string>){
 if(!regions.some(hasTextMask))return repairFilter(regions,width,height,offset)
 const filters=[`scale=${width}:${height}`,'setsar=1',`pad=${width+32}:${height+32}:16:16`,'fillborders=left=16:right=16:top=16:bottom=16:mode=smear']
 for(let i=0;i<regions.length;i++){
  const r=regions[i]
  if(hasTextMask(r)){
   const raw=`mask-reference-${i}.rgb`,file=`text-mask-${i}.png`;files.add(raw);files.add(file)
   if(await ff.exec(['-y','-ss',String(maskReferenceTime(r)),'-i',input,'-vf',`scale=${width}:${height}`,'-frames:v','1','-an','-f','rawvideo','-pix_fmt','rgb24',raw])!==0)throw Error('无法读取水印参考帧')
   const rgb=await ff.readFile(raw);if(!(rgb instanceof Uint8Array))throw Error('参考帧数据异常')
   const {mask,pixels,coverage}=textMask(rgb,width,height,r);if(pixels<3||coverage>.65)throw Error('未可靠识别固定浅色文字，请缩小选区或切换为整个选区修补')
   const canvas=document.createElement('canvas');canvas.width=width+32;canvas.height=height+32;const c=canvas.getContext('2d')!;c.fillStyle='black';c.fillRect(0,0,canvas.width,canvas.height);const data=c.createImageData(canvas.width,canvas.height);for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const v=mask[Math.max(0,Math.min(height-1,y-16))*width+Math.max(0,Math.min(width-1,x-16))],n=(y*canvas.width+x)*4;data.data[n]=v;data.data[n+1]=v;data.data[n+2]=v;data.data[n+3]=255}c.putImageData(data,0,0);const png=await new Promise<Blob>((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error('无法生成文字掩膜')),'image/png'));await ff.writeFile(file,new Uint8Array(await png.arrayBuffer()))
   filters.push(`removelogo=f=${file}${regionEnable(r,offset)}`)
  }else{const p=regionPixels(r,width,height);filters.push(`delogo=x=${p.x+16}:y=${p.y+16}:w=${p.width}:h=${p.height}:show=0${regionEnable(r,offset)}`)}
 }
 filters.push(`crop=${width}:${height}:16:16`);return filters.join(',')
}
