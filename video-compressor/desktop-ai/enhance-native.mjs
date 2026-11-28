import {rename,rm} from 'node:fs/promises'
import {join,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {launch} from './process.mjs'
import {enhancementFilter} from './enhancement.mjs'
const root=dirname(fileURLToPath(import.meta.url))
async function run(ffmpeg,args){const p=launch(ffmpeg,args);p.child.stdin.end();p.child.stdout.resume();await p.done}

async function runProgress(spec,args,progress){const p=launch(spec.ffmpeg,['-progress','pipe:1',...args]);p.child.stdin.end();let pending='';const duration=spec.mode==='translate'?spec.end-spec.start:spec.duration??spec.end;for await(const chunk of p.child.stdout){pending+=chunk.toString();let i;while((i=pending.indexOf('\n'))>=0){const line=pending.slice(0,i);pending=pending.slice(i+1);if(line.startsWith('out_time_us=')&&duration>0){const seconds=Number(line.slice(12))/1e6;if(Number.isFinite(seconds))progress(Math.max(2,Math.min(98,Math.floor(seconds/duration*98))),'正在降噪并增强细节…')}}}await p.done}
async function compatibleAudio(spec,args,progress){
 const execute=progress?()=>runProgress(spec,args,progress):()=>run(spec.ffmpeg,args)
 try{await execute()}catch(error){if(!/not currently supported|could not find tag|codec.*not supported/i.test(error.message))throw error;const retry=[...args];const at=retry.indexOf('-c:a');if(at>=0)retry[at+1]='aac';else retry.splice(retry.length-1,0,'-c:a','aac');retry.splice(retry.length-1,0,'-c:s','mov_text');if(progress)progress(2,'正在转换不兼容音轨并增强画面…');if(progress)await runProgress(spec,retry,progress);else await run(spec.ffmpeg,retry)}
}
export async function enhanceOutput(spec,progress){
 if(!spec.enhancement||spec.enhancement==='off')return
 const dir=dirname(spec.output),video=join(dir,'hd-video.mp4'),result=join(dir,'hd-result.mp4'),source=spec.output
 try{
  if(spec.enhancement==='ai2x'){
   if(process.platform!=='darwin')throw Error('Apple AI 2×增强仅支持 macOS 26 及支持的设备')
   const p=launch(join(root,'native/lightvid-enhance'),[source,video],false);p.child.stdin.end();let pending='';for await(const chunk of p.child.stdout){pending+=chunk.toString();let i;while((i=pending.indexOf('\n'))>=0){const line=pending.slice(0,i);pending=pending.slice(i+1);try{const v=JSON.parse(line);progress(Math.min(98,v.progress),v.text)}catch{}}}await p.done
   const duration=spec.mode==='translate'?spec.end-spec.start:spec.duration??spec.end;progress(99,'正在封装增强画面与原音轨…');
   await compatibleAudio(spec,['-i',video,'-i',source,...(Number.isFinite(duration)&&duration>0?['-t',String(duration)]:[]),'-map','0:v:0','-map','1:a?','-map','1:s?','-c','copy','-movflags','+faststart',result])
  }else{
   progress(2,'正在降噪并增强细节…');await compatibleAudio(spec,['-i',source,'-map','0:v:0','-map','0:a?','-map','0:s?','-vf',enhancementFilter(spec.width,spec.height,'natural',spec.enhancementSize||'original'),'-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-c:a','copy','-c:s','mov_text','-movflags','+faststart',result],progress)
  }
  await rename(result,source);progress(100,'高清增强完成')
 }finally{await rm(video,{force:true});await rm(result,{force:true})}
}

export async function enhancePreview(spec,progress){
 if(!spec.enhancement||spec.enhancement==='off')return
 const dir=dirname(spec.output),clip=join(dir,'hd-preview.mp4')
 try{await run(spec.ffmpeg,['-framerate','30','-i',spec.output,'-frames:v','1','-c:v','libx264','-crf','0','-pix_fmt','yuv420p',clip]);await enhanceOutput({...spec,output:clip},progress);await run(spec.ffmpeg,['-i',clip,'-frames:v','1',spec.output])}finally{await rm(clip,{force:true})}
}
