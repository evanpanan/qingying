import test from 'node:test'
import assert from 'node:assert/strict'
import {cleanupLimit,fitCleanupRange,cleanupBlocked} from '../src/lib/cleanup-state'
const regions=[{x:.1,y:.1,width:.2,height:.2}],file={size:20*1024*1024}
test('切换叠加 AI 后 60 秒范围收敛到 20 秒，并保留非零开始位置',()=>{
 const limit=cleanupLimit('translate',true,true,'ai');assert.equal(limit,20)
 assert.deepEqual(fitCleanupRange(0,60,304.6,limit),{start:0,end:20})
 assert.deepEqual(fitCleanupRange(30,90,304.6,limit),{start:30,end:50})
 assert.deepEqual(fitCleanupRange(300,304.6,304.6,limit),{start:300,end:304.6})
 assert.equal(cleanupLimit('translate',true,false,'ai'),60);assert.equal(cleanupLimit('translate',false,true,'ai'),60)
 assert.equal(cleanupBlocked(file,640,304.6,'translate',true,regions,true,'ai',0,20),'')
 assert.match(cleanupBlocked(file,640,304.6,'translate',true,regions,true,'ai',0,60),/60.0 秒.*最多 20 秒/)
})
test('按钮禁用原因覆盖缺视频、无效选区、文件体积及无效时间',()=>{
 const blocked=(f:typeof file|null,width=640,duration=100,start=0,end=20)=>cleanupBlocked(f,width,duration,'ai',true,regions,true,'ai',start,end)
 assert.match(blocked(null),/选择或拖入/);assert.match(blocked(file,0),/读取视频/)
 assert.match(blocked({size:101*1024*1024}),/超过 100 MB/);assert.match(blocked(file,640,100,NaN,20),/有效的开始/)
 assert.match(cleanupBlocked(file,640,100,'ai',true,[],true,'ai',0,20),/至少一个有效选区/)
})
