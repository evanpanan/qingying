import {validRegions,type CleanupMode,type RepairRegion} from './cleanup-geometry'
export type ProcessingGoal='repair'|'subtitles'|'dub'|'both'|'subtitle-track'
export function goalOptions(goal:ProcessingGoal){return {subtitles:goal==='subtitles'||goal==='both',dub:goal==='dub'||goal==='both',removeRegions:goal!=='dub'}}
export function repairSelection(regions:RepairRegion[],language:boolean,subtitles:boolean,watermarks:boolean){return language?regions.filter(region=>(region.kind||'watermark')==='subtitle'?subtitles:watermarks):regions}
export function cleanupLimit(mode:CleanupMode,native:boolean,_removeRegions:boolean,_method:string){return native||mode!=='translate'?Infinity:60}
export function fitCleanupRange(start:number,end:number,duration:number,limit:number){const from=Math.max(0,Math.min(Number.isFinite(start)?start:0,Math.max(0,duration-.05)));return {start:from,end:Math.max(from,Math.min(duration,from+limit,Number.isFinite(end)&&end>from?end:duration))}}
export function cleanupBlocked(file:{size:number}|null,width:number,duration:number,mode:CleanupMode,native:boolean,regions:RepairRegion[],removeRegions:boolean,_method:string,start:number,end:number,subtitles=true,dub=true){
 if(!native&&(mode==='ai'||mode==='translate'&&removeRegions&&_method==='ai'))return 'AI 画面修复需要桌面版；网页可切换为快速修补。'
 if(!file)return '请先选择或拖入需要处理的视频。'
 if(!width||!Number.isFinite(duration)||duration<=0)return '正在读取视频信息；如无法读取，请换用 MP4 格式。'
 if(mode==='translate'&&!subtitles&&!dub)return '请至少选择生成英文字幕或英文配音。'
 if(mode!=='subtitle-track'&&(mode!=='translate'||removeRegions)&&!validRegions(regions))return '请添加需要清除的字幕或水印选区，并将选区保持在画面内。'
 if(mode==='ai'||mode==='translate'){
  if(!native&&file.size>200*1024*1024)return '浏览器处理请使用 200 MB 以内的视频，较大文件请使用桌面版。'
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>duration+.001)return '请设置有效的开始、结束时间，结束时间不能超过视频长度。'
  if(!native&&mode==='translate'&&end-start>60.001)return '浏览器语音处理每次最多 60 秒；桌面版可自动分段处理完整视频。'
 }
 return ''
}
