import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {translateSpeech,wav,subtitles} from './translation-core.mjs'
import {tempoFilter,compositeFilter,captionLayout} from './translation-render.mjs'
import {prepareTranslationModels} from './translation-cache.mjs'
import {runRepair} from './repair.mjs'
function emit(progress,text){process.stdout.write(JSON.stringify({progress,text})+'\n')}
function run(ffmpeg,args){const result=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{maxBuffer:8*1024*1024,timeout:180000});if(result.status!==0)throw new Error(result.stderr?.toString().slice(-1500)||'媒体合成失败')}
const dims=(width,height)=>{const ratio=Math.min(1,1280/width,720/height);return {width:Math.max(2,Math.floor(width*ratio/2)*2),height:Math.max(2,Math.floor(height*ratio/2)*2)}}
export async function translateNative(spec){
 const duration=spec.end-spec.start;if(!Number.isFinite(duration)||duration<=0||duration>60.001||spec.start<0)throw new Error('翻译每次最多 60 秒');const dir=dirname(spec.output);await mkdir(spec.cacheDir,{recursive:true})
 emit(3,'正在提取中文语音…');run(spec.ffmpeg,['-ss',String(spec.start),'-i',spec.input,'-t',String(duration),'-vn','-ar','16000','-ac','1','-f','f32le',join(dir,'speech.raw')]);const buffer=await readFile(join(dir,'speech.raw')),samples=new Float32Array(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength))
 await prepareTranslationModels(spec.cacheDir,text=>emit(12,text))
 const result=await translateSpeech(samples,duration,{node:true,cacheDir:spec.cacheDir,voice:spec.voice||'af_heart',progress:text=>emit(25,text)}),mixed=new Float32Array(Math.ceil(duration*24000))
 for(let i=0;i<result.rows.length;i++){const row=result.rows[i],audio=result.audio[i],slot=Math.max(.05,row.end-row.start);emit(60+Math.round(i/result.rows.length*10),`正在对齐英文配音 ${i+1} / ${result.rows.length}…`);await writeFile(join(dir,'voice.wav'),wav(audio.samples,audio.rate));run(spec.ffmpeg,['-i',join(dir,'voice.wav'),'-af',tempoFilter(audio.samples.length/audio.rate/slot),'-t',String(slot),'-ar','24000','-ac','1','-f','f32le',join(dir,'voice.raw')]);const raw=await readFile(join(dir,'voice.raw')),fit=new Float32Array(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),offset=Math.round(row.start*24000);mixed.set(fit.subarray(0,Math.max(0,Math.min(fit.length,mixed.length-offset))),offset)}
 await writeFile(join(dir,'english.wav'),wav(mixed));await writeFile(spec.output.replace(/\.mp4$/,'.srt'),subtitles(result.rows));
 let source=spec.input,start=spec.start,regions=spec.removeRegions?spec.regions:[]
 if(spec.removeRegions&&spec.repairMethod==='ai'){
  if(duration>20.001)throw new Error('叠加 AI 修复时每次最多 20 秒，可改用快速修补处理较长片段')
  emit(72,'正在叠加本机 AI 去字幕与水印…');source=join(dir,'cleaned.mp4');await runRepair({...spec,mode:'ai',preview:false,output:source});start=0;regions=[]
 }
 const {width,height}=dims(spec.width,spec.height),args=['-ss',String(start),'-i',source,'-i',join(dir,'english.wav')],sharp=(await import('sharp')).default
 const escape=text=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
 for(let i=0;i<result.rows.length;i++){const {font,lines,height:ch}=captionLayout(result.rows[i].text,width),svg=`<svg width="${width}" height="${ch}" xmlns="http://www.w3.org/2000/svg"><text x="50%" font-family="sans-serif" font-weight="600" font-size="${font}" text-anchor="middle" fill="white" stroke="#101710" stroke-width="${Math.max(3,font*.14)}" stroke-linejoin="round" paint-order="stroke fill">${lines.map((line,n)=>`<tspan x="50%" y="${8+font+n*font*1.4}">${escape(line)}</tspan>`).join('')}</text></svg>`;const name=join(dir,`caption-${i}.png`);await sharp(Buffer.from(svg)).png().toFile(name);args.push('-i',name)}
 const graph=compositeFilter(width,height,regions,result.rows);emit(90,'正在合成英文配音、英文字幕和修补画面…');run(spec.ffmpeg,[...args,'-filter_complex',graph.filter,'-map',graph.label,'-map','1:a:0','-t',String(duration),'-r','24','-c:v','libx264','-crf','22','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-sn','-movflags','+faststart',spec.output]);emit(100,'英文配音与字幕视频已完成')
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){try{await translateNative(JSON.parse(await readFile(process.argv[2],'utf8')))}catch(error){process.stderr.write((error?.message||'翻译失败')+'\n');process.exitCode=1}}
