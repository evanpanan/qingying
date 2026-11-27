import {mkdir,readFile,writeFile,rename,stat,rm,open} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {join,dirname} from 'node:path'
import {WHISPER,KOKORO} from './translation-core.mjs'
export const MODEL_FILES=[
 {...WHISPER,file:'onnx/encoder_model_quantized.onnx',size:92326160,sha:'a43a83f3c5361cd591cfa7c36f14b43cf7cb22f47a415cc14a8d557be800fa92'},
 {...WHISPER,file:'onnx/decoder_model_merged_quantized.onnx',size:156750845,sha:'ec07c3cbb64172c39791e26ee870a65ac22b458c36722bfe2776b3dbf741e0c9'},
 {...KOKORO,file:'onnx/model_quantized.onnx',size:92361116,sha:'fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478'},
]
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
export async function prepareTranslationModels(cacheDir,progress=()=>{}){
 for(const model of MODEL_FILES){
  const target=join(cacheDir,model.id,model.revision,model.file),parts=target+'.parts',size=4*1024*1024,total=Math.ceil(model.size/size)
  try{const bytes=await readFile(target);if(bytes.length===model.size&&hash(bytes)===model.sha)continue}catch{}
  await mkdir(parts,{recursive:true});let complete=0,next=0
  // Reuse complete prefix blocks from an interrupted legacy cache download.
  try{const file=await open(target,'r'),info=await file.stat();try{for(let i=0;(i+1)*size<=Math.min(info.size,model.size);i++){const part=join(parts,String(i));try{await stat(part)}catch{const bytes=Buffer.alloc(size);await file.read(bytes,0,size,i*size);await writeFile(part,bytes)}}}finally{await file.close()}}catch{}
  async function loadPart(index){
   const start=index*size,end=Math.min(model.size,start+size)-1,name=join(parts,String(index)),expected=end-start+1
   try{if((await stat(name)).size===expected){complete+=expected;return}}catch{}
   let last
   for(let attempt=0;attempt<3;attempt++){
    try{
     const host=attempt===2?'https://huggingface.co/':'https://hf-mirror.com/',url=`${host}${model.id}/resolve/${model.revision}/${model.file}?download=true&lightvid_part=${index}`
     const response=await fetch(url,{headers:{Range:`bytes=${start}-${end}`,'Accept-Encoding':'identity'},signal:AbortSignal.timeout(90000)})
     const range=response.headers.get('content-range')
     if(response.status!==206||range!==`bytes ${start}-${end}/${model.size}`){await response.body?.cancel();throw new Error('模型源未返回完整分段')}
     const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length!==expected)throw new Error('模型分段不完整')
     await writeFile(name+'.tmp',bytes);await rename(name+'.tmp',name);complete+=bytes.length;progress(`首次准备翻译模型 · ${model.file.split('/').pop()} ${Math.round(complete/model.size*100)}%`);return
    }catch(error){last=error}
   }
   throw last||new Error('模型下载失败，请稍后重试')
  }
  progress(`正在下载并校验本机翻译模型 · ${Math.round(model.size/1024/1024)} MiB`)
  await Promise.all(Array.from({length:4},async()=>{while(next<total){const i=next++;await loadPart(i)}}))
  const output=await open(target+'.tmp','w');try{for(let i=0;i<total;i++)await output.write(await readFile(join(parts,String(i))))}finally{await output.close()}
  const data=await readFile(target+'.tmp');if(data.length!==model.size||hash(data)!==model.sha){await rm(parts,{recursive:true,force:true});await rm(target+'.tmp',{force:true});await rm(target,{force:true});throw new Error('翻译模型校验失败，请重试')}
  await mkdir(dirname(target),{recursive:true});await rename(target+'.tmp',target);await rm(parts,{recursive:true,force:true})
 }
 // Only complete, parseable small model metadata files may be reused after a crash.
 for(const model of [WHISPER,KOKORO])for(const name of ['config.json','tokenizer.json','tokenizer_config.json','generation_config.json','preprocessor_config.json']){const path=join(cacheDir,model.id,model.revision,name);try{JSON.parse(await readFile(path,'utf8'))}catch{await rm(path,{force:true})}}
}
