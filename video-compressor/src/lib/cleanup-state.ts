import {validRegions,type CleanupMode,type RepairRegion} from './cleanup-geometry'
export function cleanupLimit(mode:CleanupMode,native:boolean,removeRegions:boolean,method:string){return mode==='ai'||mode==='translate'&&native&&removeRegions&&method==='ai'?20:60}
export function fitCleanupRange(start:number,end:number,duration:number,limit:number){
 const from=Math.max(0,Math.min(Number.isFinite(start)?start:0,Math.max(0,duration-.05)))
 const to=Math.min(duration,from+limit,Number.isFinite(end)&&end>from?end:duration)
 return {start:from,end:Math.max(from,to)}
}
export function cleanupBlocked(file:{size:number}|null,width:number,duration:number,mode:CleanupMode,native:boolean,regions:RepairRegion[],removeRegions:boolean,method:string,start:number,end:number){
 if(!file)return '请先选择或拖入需要处理的视频。'
 if(!width||!Number.isFinite(duration)||duration<=0)return '正在读取视频信息；如无法读取，请换用 MP4 格式。'
 if(mode!=='subtitle-track'&&(mode!=='translate'||removeRegions)&&!validRegions(regions))return '请保留至少一个有效选区，所有选区都需要在视频画面内。'
 if(mode==='ai'||mode==='translate'){
  const size=mode==='ai'?100:200,limit=cleanupLimit(mode,native,removeRegions,method)
  if(file.size>size*1024*1024)return `当前视频超过 ${size} MB，请先压缩或更换视频。`
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>duration+.001)return '请设置有效的开始、结束时间，结束时间不能超过视频长度。'
  if(end-start>limit+.001)return `当前选择 ${(end-start).toFixed(1)} 秒，${mode==='translate'&&limit===20?'叠加 AI 修复':'当前模式'}每次最多 ${limit} 秒，请缩短处理范围。`
 }
 return ''
}
