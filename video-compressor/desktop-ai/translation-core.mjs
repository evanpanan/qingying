export const WHISPER={id:'onnx-community/whisper-small',revision:'36050c46d777d46dc4b5f43f6d90574fc38f8732'}
export const KOKORO={id:'onnx-community/Kokoro-82M-v1.0-ONNX',revision:'1939ad2a8e416c0acfeecc08a694d14ef25f2231'}
export const VOICES={af_heart:'英文女声',am_michael:'英文男声'}
export function wav(samples,rate=24000){const bytes=new Uint8Array(44+samples.length*2),view=new DataView(bytes.buffer),text=(offset,value)=>{for(let i=0;i<value.length;i++)bytes[offset+i]=value.charCodeAt(i)};text(0,'RIFF');view.setUint32(4,bytes.length-8,true);text(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);for(let i=0;i<samples.length;i++)view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);return bytes}
export function timedText(output,duration){
 const rows=(output.chunks||[]).map((item,index,all)=>({text:String(item.text||'').trim().replace(/\s+/g,' '),start:Math.max(0,Number(item.timestamp?.[0]??0)),end:Math.min(duration,Number(item.timestamp?.[1]??all[index+1]?.timestamp?.[0]??duration))})).filter(r=>r.text&&Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.end>r.start)
 const text=String(output.text||'').trim().replace(/\s+/g,' ')
 if(!text||!/[A-Za-z]/.test(text))throw new Error('未识别到可翻译的中文语音，请确认视频有清晰的人声')
 if(rows.length)return rows
 const sentences=text.match(/[^.!?]+[.!?]?/g)||[text],total=sentences.reduce((n,s)=>n+s.length,0);let position=0
 return sentences.map(sentence=>{const start=position;position+=duration*sentence.length/total;return {text:sentence.trim(),start,end:position}})
}
export function subtitles(rows){const stamp=t=>{const ms=Math.round(Math.max(0,t)*1000);return [Math.floor(ms/3600000),Math.floor(ms/60000)%60,Math.floor(ms/1000)%60].map(n=>String(n).padStart(2,'0')).join(':')+','+String(ms%1000).padStart(3,'0')};return rows.map((r,i)=>`${i+1}\n${stamp(r.start)} --> ${stamp(r.end)}\n${r.text}\n`).join('\n')}
export function wrapCaption(text,max=48){const words=text.trim().split(/\s+/),lines=[];let line='';for(const word of words){if(line&&line.length+word.length+1>max){lines.push(line);line=word}else line+=(line?' ':'')+word}if(line)lines.push(line);return lines}
let engine=null
export async function translationEngine({node=false,cacheDir,progress=()=>{}}={}){
 if(engine)return engine
 const {env,pipeline,StyleTextToSpeech2Model,AutoTokenizer}=await import('@huggingface/transformers')
 const {KokoroTTS}=await import('kokoro-js')
 env.allowLocalModels=false;env.remoteHost='https://hf-mirror.com';if(node&&cacheDir)env.cacheDir=cacheDir
 if(!node){env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.wasmPaths='/speech-runtime/'}
 const percents=new Map()
 const callback=item=>{if(item.status==='progress'){const percent=Math.floor((item.progress||0)/5)*5;if(percents.get(item.file)!==percent){percents.set(item.file,percent);progress(`正在准备本机模型 · ${item.file||''} ${percent}%`)}}}
 progress('首次使用正在准备语音翻译模型…')
 const asr=await pipeline('automatic-speech-recognition',WHISPER.id,{revision:WHISPER.revision,dtype:'q8',device:node?'cpu':'wasm',progress_callback:callback,session_options:{intraOpNumThreads:4}})
 progress('正在准备英文配音模型…')
 const options={revision:KOKORO.revision,dtype:'q8',device:node?'cpu':'wasm',progress_callback:callback,session_options:{intraOpNumThreads:4}}
 const model=await StyleTextToSpeech2Model.from_pretrained(KOKORO.id,options),tokenizer=await AutoTokenizer.from_pretrained(KOKORO.id,{revision:KOKORO.revision,progress_callback:callback})
 engine={asr,tts:new KokoroTTS(model,tokenizer)};return engine
}
export async function translateSpeech(samples,duration,{node=false,cacheDir,voice='af_heart',progress=()=>{},check=()=>{}}={}){
 if(!VOICES[voice])throw new Error('请选择有效的英文配音')
 const {asr,tts}=await translationEngine({node,cacheDir,progress});check();progress('正在识别中文并翻译为英文…')
 const result=await asr(samples,{language:'chinese',task:'translate',return_timestamps:true,chunk_length_s:25,stride_length_s:4,max_new_tokens:384});check()
 const rows=timedText(result,duration),audio=[]
 if(rows.length>80)throw new Error('字幕段落过多，请缩短处理时段')
 for(let i=0;i<rows.length;i++){check();progress(`正在生成英文配音 ${i+1} / ${rows.length}…`);const generated=await tts.generate(rows[i].text,{voice,speed:1});check();audio.push({samples:generated.audio,rate:generated.sampling_rate||24000})}
 return {rows,audio}
}
