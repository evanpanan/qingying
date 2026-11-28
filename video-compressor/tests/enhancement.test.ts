import test from 'node:test'
import assert from 'node:assert/strict'
import {enhancementDimensions,validEnhancement,enhancementFilter} from '../desktop-ai/enhancement.mjs'
import {textMask,maskReferenceTime} from '../desktop-ai/text-mask.mjs'
import {goalOptions,cleanupBlocked} from '../src/lib/cleanup-state'
test('高清增强是独立用途，也可以叠加；自然放大与 AI 超分明确区分',()=>{
 assert.deepEqual(goalOptions('enhance'),{subtitles:false,dub:false,removeRegions:false})
 assert.equal(cleanupBlocked({size:10},468,10,'enhance',true,[],false,'quick',0,10),'')
 assert.deepEqual(enhancementDimensions(468,832,'ai2x'),{width:936,height:1664})
 assert.deepEqual(enhancementDimensions(468,832,'natural','1080p'),{width:1080,height:1920})
 assert.deepEqual(enhancementDimensions(3840,2160,'natural','1080p'),{width:3840,height:2160})
 assert(!validEnhancement('fake-ai'));assert.throws(()=>enhancementFilter(468,832,'ai2x'))
})
test('精细水印掩膜覆盖文字描边与相邻小图标，保留区域内外背景',()=>{
 const w=96,h=96,rgb=new Uint8Array(w*h*3).fill(120),set=(x:number,y:number,c:number[])=>rgb.set(c,(y*w+x)*3)
 for(let y=20;y<40;y++)for(let x=20;x<24;x++)set(x,y,[240,240,240])
 for(let y=30;y<38;y++)for(let x=12;x<20;x++)set(x,y,[255,0,150])
 const r={x:0,y:0,width:.5,height:.5},result=textMask(rgb,w,h,r)
 assert(result.pixels>50);assert.equal(result.mask[25*w+20],255);assert.equal(result.mask[34*w+14],255)
 assert.equal(result.mask[45*w+45],0);assert.equal(result.mask[60*w+60],0)
 assert.equal(maskReferenceTime({...r,start:60,end:60.1}),60.05)
 assert.equal(textMask(new Uint8Array(w*h*3).fill(120),w,h,r).pixels,0)
})
