import {repairFilters} from './repair-filters.mjs'
import {enhanceOutput} from './enhance-native.mjs'
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {translateSpeech,wav,subtitles} from './translation-core.mjs'
import {tempoFilter,compositeFilter,captionLayout} from './translation-render.mjs'
import {prepareTranslationModels} from './translation-cache.mjs'
import {runRepair,launch} from './repair.mjs'
function emit(progress,text){process.stdout.write(JSON.stringify({progress,text})+'\n')}
async function run(ffmpeg,args){const task=launch(ffmpeg,args);task.child.stdin.end();task.child.stdout.resume();await task.done}
const dims=(width,height)=>{const ratio=Math.min(1,1280/width,720/height);return {width:Math.max(2,Math.floor(width*ratio/2)*2),height:Math.max(2,Math.floor(height*ratio/2)*2)}}
export function translationSegments(start,end,seconds=60){if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||!Number.isFinite(seconds)||seconds<=0)throw Error('请选择有效的起止时间');const parts=[];for(let from=start;from<end-.00001;from+=seconds)parts.push({start:from,end:Math.min(end,from+seconds),offset:from-start});return parts}
function listEntry(path,duration){return `file '${path.replace(/'/g,"'\\''")}'\nduration ${duration.toFixed(6)}\n`}
async function speechSegment(spec,dir,progress){
 const duration=spec.end-spec.start;await run(spec.ffmpeg,['-ss',String(spec.start),'-i',spec.input,'-t',String(duration),'-vn','-ar','16000','-ac','1','-f','f32le',join(dir,'speech.raw')]);const buffer=await readFile(join(dir,'speech.raw')),samples=new Float32Array(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength))
 const result=await translateSpeech(samples,duration,{node:true,cacheDir:spec.cacheDir,voice:spec.voice||'af_heart',dub:spec.dub,allowEmpty:true,progress})
 if(spec.dub){const mixed=new Float32Array(Math.ceil(duration*24000));for(let i=0;i<result.rows.length;i++){const row=result.rows[i],audio=result.audio[i],slot=Math.max(.05,row.end-row.start);progress(`对齐英文配音 ${i+1}/${result.rows.length}`);await writeFile(join(dir,'voice.wav'),wav(audio.samples,audio.rate));await run(spec.ffmpeg,['-i',join(dir,'voice.wav'),'-af',tempoFilter(audio.samples.length/audio.rate/slot),'-t',String(slot),'-ar','24000','-ac','1','-f','f32le',join(dir,'voice.raw')]);const raw=await readFile(join(dir,'voice.raw')),fit=new Float32Array(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),offset=Math.round(row.start*24000);mixed.set(fit.subarray(0,Math.max(0,Math.min(fit.length,mixed.length-offset))),offset)}await writeFile(join(dir,'english.wav'),wav(mixed))}
 return result.rows
}
async function renderSegment(spec,dir,rows,videoSource,videoStart){
 const {width,height}=dims(spec.width,spec.height),args=['-ss',String(videoStart),'-i',videoSource]
 if(spec.dub)args.push('-i',join(dir,'english.wav'));else args.push('-ss',String(videoStart),'-i',videoSource)
 const sharp=(await import('sharp')).default,escape=text=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
 for(let i=0;i<rows.length;i++){const {font,lines,height:ch}=captionLayout(rows[i].text,width),svg=`<svg width="${width}" height="${ch}" xmlns="http://www.w3.org/2000/svg"><text x="50%" font-family="sans-serif" font-weight="600" font-size="${font}" text-anchor="middle" fill="white" stroke="#101710" stroke-width="${Math.max(3,font*.14)}" stroke-linejoin="round" paint-order="stroke fill">${lines.map((line,n)=>`<tspan x="50%" y="${8+font+n*font*1.4}">${escape(line)}</tspan>`).join('')}</text></svg>`;const name=join(dir,`caption-${i}.png`);await sharp(Buffer.from(svg)).png().toFile(name);args.push('-threads','1','-i',name)}
 const repair=spec.removeRegions&&spec.repairMethod!=='ai'?await repairFilters(spec,width,height,spec.regions,spec.start):undefined
 const graph=compositeFilter(width,height,spec.removeRegions&&spec.repairMethod!=='ai'?spec.regions:[],rows,spec.start,repair)
 await run(spec.ffmpeg,[...args,'-filter_complex_threads','1','-filter_complex',graph.filter,'-map',graph.label,'-an','-t',String(spec.end-spec.start),'-r','24','-c:v','libx264','-threads','4','-crf','22','-preset','fast','-pix_fmt','yuv420p','-sn','-movflags','+faststart',join(dir,'segment.mp4')])
}
export async function translateNative(input){
 const spec={...input,subtitles:input.subtitles!==false,dub:input.dub!==false},parts=translationSegments(spec.start,spec.end),duration=spec.end-spec.start
 if(!spec.subtitles&&!spec.dub)throw Error('请选择生成字幕或配音')
 const dir=dirname(spec.output),work=join(dir,'translation-parts');await rm(work,{recursive:true,force:true});await mkdir(work,{recursive:true});await mkdir(spec.cacheDir,{recursive:true})
 let videoSource=spec.input,videoBase=spec.start
 try{
  await prepareTranslationModels(spec.cacheDir,text=>emit(2,text),{dub:spec.dub})
  if(spec.removeRegions&&spec.repairMethod==='ai'){videoSource=join(work,'cleaned.mp4');videoBase=0;await runRepair({...spec,mode:'ai',preview:false,preserveSubtitles:!spec.subtitles,output:videoSource},(p,text)=>emit(Math.round(p*.35),text))}
  let allRows=[],videoEntries='',audioEntries=''
  for(let index=0;index<parts.length;index++){
   const part=parts[index],folder=join(work,`part-${String(index).padStart(6,'0')}`);await mkdir(folder,{recursive:true});const progress=text=>emit(35+Math.round(index/parts.length*55),`第 ${index+1}/${parts.length} 段 · ${text}`)
   progress('正在识别和翻译语音…');const rows=await speechSegment({...spec,start:part.start,end:part.end},folder,progress);allRows.push(...rows.map(row=>({...row,start:row.start+part.offset,end:row.end+part.offset})))
   if(spec.subtitles){progress('正在合成英文字幕…');await renderSegment({...spec,start:part.start,end:part.end},folder,rows,videoSource,videoBase+part.offset);videoEntries+=listEntry(join(folder,'segment.mp4'),part.end-part.start);for(const name of ['speech.raw','voice.raw','voice.wav',...rows.map((_,i)=>`caption-${i}.png`)])await rm(join(folder,name),{force:true})}
   else{for(const name of ['speech.raw','voice.raw','voice.wav'])await rm(join(folder,name),{force:true})}
   if(spec.dub)audioEntries+=listEntry(join(folder,'english.wav'),part.end-part.start)
  }
  if(!allRows.length)throw Error('未识别到清晰的中文人声，请确认原视频包含可翻译的语音')
  emit(94,'正在合并处理结果…')
  let audio=null
  if(spec.dub){const list=join(work,'audio.txt');await writeFile(list,audioEntries);audio=join(work,'english.m4a');await run(spec.ffmpeg,['-f','concat','-safe','0','-i',list,'-t',String(duration),'-c:a','aac',audio])}
  if(spec.subtitles){
   const list=join(work,'video.txt'),video=join(work,'video.mp4');await writeFile(list,videoEntries);await run(spec.ffmpeg,['-f','concat','-safe','0','-i',list,'-t',String(duration),'-an','-c:v','copy',video])
   const args=['-i',video,...(spec.dub?['-i',audio]:['-ss',String(spec.start),'-i',spec.input]),'-map','0:v:0','-map',spec.dub?'1:a:0':'1:a?','-t',String(duration),'-c:v','copy','-sn','-movflags','+faststart']
   try{await run(spec.ffmpeg,[...args,'-c:a','copy',spec.output])}catch(error){if(!/not currently supported|could not find tag|codec.*not supported/i.test(error.message))throw error;await run(spec.ffmpeg,[...args,'-c:a','aac',spec.output])}
   await writeFile(spec.output.replace(/\.mp4$/,'.srt'),subtitles(allRows))
  }else{
   const args=['-ss',String(videoBase),'-i',videoSource,'-i',audio,'-map','0:v:0','-map','1:a:0','-map','0:s?','-c:s','mov_text','-t',String(duration)]
   if(spec.removeRegions&&spec.repairMethod!=='ai'){args.push('-vf',await repairFilters(spec,spec.width,spec.height,spec.regions,spec.start),'-c:v','libx264','-threads','4','-crf','22','-preset','fast','-pix_fmt','yuv420p')}else args.push('-c:v','copy')
   await run(spec.ffmpeg,[...args,'-c:a','copy','-movflags','+faststart',spec.output]);await rm(spec.output.replace(/\.mp4$/,'.srt'),{force:true})
  }
  await enhanceOutput(spec,(p,t)=>emit(96+Math.round(p*.04),t))
  emit(100,spec.subtitles?(spec.dub?'英文字幕与配音已完成':'英文字幕已完成，原音轨已保留'):(spec.removeRegions?'英文配音与选区修补已完成':'英文配音已完成，原画面与字幕已保留'))
 }finally{await rm(work,{recursive:true,force:true})}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){try{await translateNative(JSON.parse(await readFile(process.argv[2],'utf8')))}catch(error){process.stderr.write((error?.message||'语言处理失败')+'\n');process.exitCode=1}}
