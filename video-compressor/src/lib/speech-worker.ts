/// <reference lib="webworker" />
import {translateSpeech,KOKORO} from '../../desktop-ai/translation-core.mjs'
const nativeFetch=globalThis.fetch.bind(globalThis)
globalThis.fetch=(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input instanceof Request?input.url:input);if(url.startsWith('https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/'))return nativeFetch(url.replace('https://huggingface.co/','https://hf-mirror.com/').replace('/resolve/main/',`/resolve/${KOKORO.revision}/`),init);return nativeFetch(input,init)}
self.onmessage=async event=>{
 try{const {samples,duration,voice,dub}=event.data;const result=await translateSpeech(new Float32Array(samples),duration,{voice,dub,progress:(text:string)=>self.postMessage({type:'progress',text})});self.postMessage({type:'done',result},result.audio.map((a:{samples:Float32Array})=>a.samples.buffer))}catch(error){self.postMessage({type:'error',error:error instanceof Error?error.message:'翻译失败'})}
}
