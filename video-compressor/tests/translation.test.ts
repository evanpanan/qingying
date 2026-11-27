import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,writeFile,readFile,rm,mkdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,dirname} from 'node:path'
import {createHash} from 'node:crypto'
import {timedText,wav,subtitles,wrapCaption} from '../desktop-ai/translation-core.mjs'
import {tempoFilter,compositeFilter} from '../desktop-ai/translation-render.mjs'
import {MODEL_FILES,prepareTranslationModels} from '../desktop-ai/translation-cache.mjs'
test('英文字幕时间戳、配音 WAV 和叠加选区保持同一个时间轴',()=>{
 const rows=timedText({text:'Hello world. Welcome!',chunks:[{text:'Hello world.',timestamp:[0,1.2]},{text:'Welcome!',timestamp:[1.2,null]}]},3)
 assert.deepEqual(rows,[{text:'Hello world.',start:0,end:1.2},{text:'Welcome!',start:1.2,end:3}])
 assert.match(subtitles(rows),/00:00:01,200 --> 00:00:03,000/)
 const bytes=wav(new Float32Array([0,.5,-.5]),24000),view=new DataView(bytes.buffer)
 assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.equal(view.getUint32(24,true),24000);assert.equal(view.getUint32(40,true),6)
 const graph=compositeFilter(640,360,[{x:.1,y:.1,width:.2,height:.2}],rows)
 assert.match(graph.filter,/delogo=x=64:y=36:w=128:h=72/);assert.match(graph.filter,/gte\(t,1.200\).*lt\(t,3.000\)/);assert.equal(graph.label,'[v2]')
 assert.equal(tempoFilter(5),'atempo=2,atempo=2,atempo=1.250000');assert.equal(tempoFilter(.5),'atempo=1.000000')
 assert(wrapCaption('A long English subtitle that wraps across lines',14).every((line:string)=>line.length<=14))
 assert.throws(()=>timedText({text:''},10));assert.throws(()=>tempoFilter(NaN))
})
test('本机模型断点续传并在校验后替换缓存，错误分段不能成为模型',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'lightvid-model-test-')),saved=[...MODEL_FILES],fetch=globalThis.fetch,bytes=Buffer.alloc(4*1024*1024+128,7),model={id:'test/model',revision:'fixed',file:'onnx/model.onnx',size:bytes.length,sha:createHash('sha256').update(bytes).digest('hex')}
 try{
  MODEL_FILES.splice(0,MODEL_FILES.length,model)
  const target=join(directory,model.id,model.revision,model.file);await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes.subarray(0,4*1024*1024));let requests=0
  globalThis.fetch=async(_input,init)=>{requests++;const range=(init?.headers as Record<string,string> | undefined)?.Range;assert.equal(range,`bytes=4194304-${bytes.length-1}`);return new Response(bytes.subarray(4194304),{status:206,headers:{'Content-Range':`bytes 4194304-${bytes.length-1}/${bytes.length}`}})}
  await prepareTranslationModels(directory);assert.equal(requests,1);assert.deepEqual(await readFile(target),bytes)
  await prepareTranslationModels(directory);assert.equal(requests,1)
  await rm(target);globalThis.fetch=async()=>new Response('broken',{status:206,headers:{'Content-Range':'bytes 0-2/3'}})
  await assert.rejects(prepareTranslationModels(directory));await assert.rejects(readFile(target))
 }finally{globalThis.fetch=fetch;MODEL_FILES.splice(0,MODEL_FILES.length,...saved);await rm(directory,{recursive:true,force:true})}
})

import {translationSegments} from '../desktop-ai/translate.mjs'
test('长视频自动分段并保留全局字幕偏移，末段不会截断或重叠',()=>{
 assert.deepEqual(translationSegments(10,135),[{start:10,end:70,offset:0},{start:70,end:130,offset:60},{start:130,end:135,offset:120}])
 assert.equal(translationSegments(0,3600).length,60);assert.throws(()=>translationSegments(5,4));assert.throws(()=>translationSegments(0,Infinity))
})
