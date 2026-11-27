import test from 'node:test'
import assert from 'node:assert/strict'
import {cleanupLimit,fitCleanupRange,cleanupBlocked,repairSelection,goalOptions} from '../src/lib/cleanup-state'
const regions=[{x:.1,y:.1,width:.2,height:.2}],large={size:8*1024*1024*1024}
test('桌面完整视频不受固定秒数和文件体积限制，范围仍必须有效',()=>{
 assert.equal(cleanupLimit('translate',true,true,'ai'),Infinity)
 assert.deepEqual(fitCleanupRange(30,3630,7200,Infinity),{start:30,end:3630})
 assert.equal(cleanupBlocked(large,3840,7200,'translate',true,regions,true,'ai',0,7200,true,true),'')
 assert.equal(cleanupBlocked(large,3840,7200,'ai',true,regions,true,'ai',0,7200),'')
 assert.match(cleanupBlocked(large,3840,7200,'ai',true,regions,true,'ai',10,9),/有效的开始/)
})
test('用途预设拆开字幕、配音与修补，不会让只配音默认擦除画面',()=>{
 assert.deepEqual(goalOptions('subtitles'),{subtitles:true,dub:false,removeRegions:true})
 assert.deepEqual(goalOptions('dub'),{subtitles:false,dub:true,removeRegions:false})
 assert.deepEqual(goalOptions('both'),{subtitles:true,dub:true,removeRegions:true})
 assert.match(cleanupBlocked({size:100},640,100,'translate',true,regions,false,'quick',0,100,false,false),/至少选择/)
 assert.equal(cleanupBlocked({size:100},640,100,'translate',true,[],false,'quick',0,100,false,true),'')
})
test('浏览器仍有实际内存范围提示，AI 画面修复引导桌面版',()=>{
 assert.equal(cleanupLimit('translate',false,false,'quick'),60)
 assert.match(cleanupBlocked({size:100},640,100,'translate',false,[],false,'quick',0,100),/浏览器.*60 秒.*桌面版/)
 assert.match(cleanupBlocked(large,640,100,'translate',false,[],false,'quick',0,60),/200 MB/)
 assert.match(cleanupBlocked(null,0,0,'quick',true,regions,true,'quick',0,0),/选择或拖入/)
 assert.match(cleanupBlocked({size:100},640,100,'ai',false,regions,true,'ai',0,60),/需要桌面版/)
})

test('原字幕和水印选区分别启用，不会因换字幕而误擦水印',()=>{const original={kind:'subtitle' as const,x:.1,y:.8,width:.8,height:.1},watermark={kind:'watermark' as const,x:.8,y:.1,width:.1,height:.1},regions=[original,watermark];assert.deepEqual(repairSelection(regions,true,true,false),[original]);assert.deepEqual(repairSelection(regions,true,false,true),[watermark]);assert.deepEqual(repairSelection(regions,true,false,false),[]);assert.deepEqual(repairSelection(regions,false,false,false),regions)})
