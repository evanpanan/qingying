export interface RepairRegion { x: number; y: number; width: number; height: number }
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
export function repairFilter(r: RepairRegion, width: number, height: number) {
  const p=regionPixels(r,width,height)
  return `scale=${width}:${height},setsar=1,delogo=x=${p.x}:y=${p.y}:w=${p.width}:h=${p.height}:show=0`
}
export function outputDimensions(width:number,height:number) {
  const scale=Math.min(1,1280/width,720/height)
  return {width:Math.max(2,Math.floor(width*scale/2)*2),height:Math.max(2,Math.floor(height*scale/2)*2)}
}
