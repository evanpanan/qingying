import test from 'node:test'
import assert from 'node:assert/strict'
import {regionPixels,repairFilter,validRegion,outputDimensions,resizeRegion,RESIZE_HANDLES} from '../src/lib/cleanup-geometry.ts'
test('选区映射使用视频坐标，不随预览缩放改变，并留出修补边缘',()=>{
 assert.deepEqual(regionPixels({x:.1,y:.8,width:.8,height:.1},1920,1080),{x:192,y:864,width:1536,height:108})
 assert.deepEqual(regionPixels({x:0,y:0,width:1,height:1},640,360),{x:1,y:1,width:638,height:358})
 assert.equal(repairFilter({x:.1,y:.8,width:.8,height:.1},1920,1080),'scale=1920:1080,setsar=1,delogo=x=192:y=864:w=1536:h=108:show=0')
})
test('错误选区和尺寸不能进入滤镜参数',()=>{
 for(const r of [{x:-.1,y:0,width:.5,height:.5},{x:.9,y:0,width:.2,height:.5},{x:0,y:0,width:0,height:.5},{x:NaN,y:0,width:.5,height:.5}]){assert.equal(validRegion(r),false);assert.throws(()=>regionPixels(r,640,360))}
 assert.throws(()=>regionPixels({x:0,y:0,width:.5,height:.5},0,360))
})
test('AI 导出保持长宽比、偶数尺寸，不放大小视频',()=>{
 assert.deepEqual(outputDimensions(1920,1080),{width:1280,height:720})
 assert.deepEqual(outputDimensions(1080,1920),{width:404,height:720})
 assert.deepEqual(outputDimensions(320,180),{width:320,height:180})
})
test('多个选区全部进入同一修补滤镜，空列表或过多区域被拒绝',()=>{
 const first={x:.1,y:.8,width:.8,height:.1},second={x:.05,y:.05,width:.15,height:.15}
 const filter=repairFilter([first,second],640,360)
 assert.equal(filter,'scale=640:360,setsar=1,delogo=x=64:y=288:w=512:h=36:show=0,delogo=x=32:y=18:w=96:h=54:show=0')
 assert.throws(()=>repairFilter([],640,360))
 assert.throws(()=>repairFilter(Array(9).fill(first),640,360))
 assert.throws(()=>repairFilter([first,{...second,width:2}],640,360))
})

test('八个方向缩放固定对边，保持有效尺寸并限制在视频内',()=>{
 const original={x:.2,y:.3,width:.4,height:.3}
 for(const handle of RESIZE_HANDLES){
  const next=resizeRegion(original,handle,.1,.1)
  assert(validRegion(next),handle)
  if(!handle.includes('w'))assert(Math.abs(next.x-original.x)<1e-9,handle)
  if(!handle.includes('n'))assert(Math.abs(next.y-original.y)<1e-9,handle)
  if(!handle.includes('e'))assert(Math.abs(next.x+next.width-original.x-original.width)<1e-9,handle)
  if(!handle.includes('s'))assert(Math.abs(next.y+next.height-original.y-original.height)<1e-9,handle)
  for(const delta of [-10,10]){const clamped=resizeRegion(original,handle,delta,delta,.02,.03);assert(validRegion(clamped),handle);assert(clamped.width>=.02-1e-9);assert(clamped.height>=.03-1e-9)}
 }
 assert.deepEqual(original,{x:.2,y:.3,width:.4,height:.3})
 assert.throws(()=>resizeRegion(original,'se',NaN,0))
})

test('选区生效时间采用原视频半开区间，缩放保留类别和时间',async()=>{
 const {regionActive,regionEnable,validRegionTime}=await import('../desktop-ai/region-time.mjs')
 const r={kind:'watermark' as const,x:.1,y:.1,width:.2,height:.2,start:60,end:65}
 assert.equal(regionActive(r,59.99),false);assert.equal(regionActive(r,60),true);assert.equal(regionActive(r,64.99),true);assert.equal(regionActive(r,65),false)
 assert.equal(regionActive({...r,start:undefined,end:undefined},1000),true)
 for(const v of [{start:5,end:5},{start:-1,end:5},{start:0},{start:0,end:Infinity}])assert.equal(validRegionTime(v),false)
 assert.match(regionEnable(r,60),/gte\(t,0.000000\).*lt\(t,5.000000\)/)
 assert.match(repairFilter(r,640,360,62),/gte\(t,-2.000000\).*lt\(t,3.000000\)/)
 const resized=resizeRegion(r,'se',.1,.1);assert.equal(resized.start,60);assert.equal(resized.end,65);assert.equal(resized.kind,'watermark')
 const {compositeFilter}=await import('../desktop-ai/translation-render.mjs');assert.match(compositeFilter(640,360,[r],[],60).filter,/gte\(t,0.000000\).*lt\(t,5.000000\)/)
})
