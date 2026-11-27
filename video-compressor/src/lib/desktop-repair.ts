import {invoke} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import {save} from '@tauri-apps/plugin-dialog'
import type {TranslateOptions} from './translation'
import type {CleanupMode,RepairRegion} from './cleanup-geometry'
export class DesktopRepair {
  private file:File|null=null
  private job:string|null=null
  async prepare(file:File,signal:AbortSignal,onProgress:(value:number,text:string)=>void){
    if(this.file===file&&this.job)return this.job
    this.dispose()
    const job=await invoke<string>('repair_begin');this.job=job
    try{
      for(let offset=0;offset<file.size;offset+=512*1024){signal.throwIfAborted();const bytes=new Uint8Array(await file.slice(offset,offset+512*1024).arrayBuffer());await invoke('repair_upload',{job,bytes:Array.from(bytes)});onProgress(Math.round((offset+bytes.length)/file.size*5),'正在准备本机视频…')}
      signal.throwIfAborted();this.file=file;return job
    }catch(error){this.dispose();throw error}
  }
  async run(file:File,mode:CleanupMode,regions:RepairRegion[],width:number,height:number,start:number,end:number,time:number,preview:boolean,onProgress:(value:number,text:string)=>void,signal:AbortSignal,translation?:TranslateOptions){
    const job=await this.prepare(file,signal,onProgress)
    const off=await listen<{job:string;progress:number;text:string}>('repair-progress',event=>{if(event.payload.job===job)onProgress(event.payload.progress,event.payload.text)})
    const stop=()=>{void invoke('repair_cancel',{job}).catch(()=>{})}
    signal.addEventListener('abort',stop,{once:true})
    try{
      signal.throwIfAborted()
      await invoke('repair_run',{job,spec:{title:file.name,mode,regions,width,height,start,end,time,preview,...translation}})
      signal.throwIfAborted()
      if(preview){const bytes=await invoke<number[]>('repair_preview',{job});return new Blob([new Uint8Array(bytes)],{type:'image/png'})}
      return job
    }finally{signal.removeEventListener('abort',stop);off()}
  }
  async save(job:string,name:string){
    const destination=await save({defaultPath:name,filters:[{name:'MP4 视频',extensions:['mp4']}]})
    if(!destination)return false
    await invoke('library_save',{id:job,destination});return true
  }
  dispose(){
    const job=this.job;this.job=null;this.file=null
    if(job){void invoke('repair_cancel',{job}).catch(()=>{}).finally(()=>{window.setTimeout(()=>void invoke('repair_discard',{job}).catch(()=>{}),2000)})}
  }
}
