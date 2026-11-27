export interface RepairRegion { x: number; y: number; width: number; height: number }
export const MAX_REPAIR_REGIONS = 8
export function validRegions(regions: RepairRegion[]) {
  return regions.length > 0 && regions.length <= MAX_REPAIR_REGIONS && regions.every(validRegion)
}
export type CleanupMode = 'quick' | 'ai' | 'subtitle-track'
export const SUBTITLE_REGION: RepairRegion = { x: .08, y: .76, width: .84, height: .15 }
export const WATERMARK_REGION: RepairRegion = { x: .76, y: .04, width: .2, height: .13 }
export function validRegion(r: RepairRegion) {
  return [r.x,r.y,r.width,r.height].every(Number.isFinite) && r.x>=0 && r.y>=0 && r.width>0 && r.height>0 && r.x+r.width<=1.000001 && r.y+r.height<=1.000001
}
export function regionPixels(r: RepairRegion, width: number, height: number) {
  if (!validRegion(r) || !Number.isInteger(width) || !Number.isInteger(height) || width<8 || height<8) throw new Error('请在视频画面内框选有效区域')
  const x=Math.max(1,Math.min(width-3,Math.round(r.x*width))),y=Math.max(1,Math.min(height-3,Math.round(r.y*height)))
  return {x,y,width:Math.max(1,Math.min(width-x-1,Math.round(r.width*width))),height:Math.max(1,Math.min(height-y-1,Math.round(r.height*height)))}
}
export function repairFilter(region: RepairRegion | RepairRegion[], width: number, height: number) {
  const regions = Array.isArray(region) ? region : [region]
  if (!validRegions(regions)) throw new Error(`请选择 1 至 ${MAX_REPAIR_REGIONS} 个有效修补区域`)
  const filters = regions.map(r => {
    const p = regionPixels(r, width, height)
    return `delogo=x=${p.x}:y=${p.y}:w=${p.width}:h=${p.height}:show=0`
  })
  return [`scale=${width}:${height}`, 'setsar=1', ...filters].join(',')
}
export function outputDimensions(width:number,height:number) {
  const scale=Math.min(1,1280/width,720/height)
  return {width:Math.max(2,Math.floor(width*scale/2)*2),height:Math.max(2,Math.floor(height*scale/2)*2)}
}

export const RESIZE_HANDLES = ['nw','n','ne','e','se','s','sw','w'] as const
export type ResizeHandle = typeof RESIZE_HANDLES[number]
export const RESIZE_LABELS: Record<ResizeHandle,string> = {nw:'左上角',n:'上边',ne:'右上角',e:'右边',se:'右下角',s:'下边',sw:'左下角',w:'左边'}
/** Keep the opposite edge fixed; stop at the image boundary or minimum size. */
export function resizeRegion(region:RepairRegion,handle:ResizeHandle,dx:number,dy:number,minWidth=.005,minHeight=.005):RepairRegion {
  if(!validRegion(region)||![dx,dy,minWidth,minHeight].every(Number.isFinite)||!RESIZE_HANDLES.includes(handle))throw new Error('选区调整参数无效')
  let left=region.x,top=region.y,right=Math.min(1,left+region.width),bottom=Math.min(1,top+region.height)
  const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value))
  const minW=Math.min(Math.max(.0001,minWidth),handle.includes('w')?right:1-left)
  const minH=Math.min(Math.max(.0001,minHeight),handle.includes('n')?bottom:1-top)
  if(handle.includes('w'))left=clamp(left+dx,0,right-minW)
  if(handle.includes('e'))right=clamp(right+dx,left+minW,1)
  if(handle.includes('n'))top=clamp(top+dy,0,bottom-minH)
  if(handle.includes('s'))bottom=clamp(bottom+dy,top+minH,1)
  return {x:left,y:top,width:right-left,height:bottom-top}
}
