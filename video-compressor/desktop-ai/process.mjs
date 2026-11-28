import {spawn} from 'node:child_process'
const children=new Set()
process.on('SIGTERM',()=>{for(const child of children)child.kill('SIGKILL');process.exit(130)})
export function launch(binary,args,ffmpeg=true){
  const child=spawn(binary,ffmpeg?['-hide_banner','-loglevel','error','-y',...args]:args,{stdio:['pipe','pipe','pipe']});children.add(child);child.stdin.on('error',()=>{})
  let errors='';child.stderr.on('data',chunk=>{errors=(errors+chunk.toString()).slice(-8000)})
  const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>{children.delete(child);if(code===0)resolve();else reject(new Error('视频处理失败：'+errors.slice(-1000)))})})
  done.catch(()=>{});return {child,done}
}
