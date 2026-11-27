import test from 'node:test'
import assert from 'node:assert/strict'
import {regionPixels,repairFilter,validRegion,outputDimensions} from '../src/lib/cleanup-geometry.ts'
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
