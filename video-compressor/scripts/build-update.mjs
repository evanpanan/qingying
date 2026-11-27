import {readFile,writeFile,mkdtemp,rm,mkdir} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {resolve,join} from 'node:path'
export function manifest(version,signature,date=new Date().toISOString()){
 if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('发布版本无效')
 if(!signature.trim()||!/^[A-Za-z0-9+/=\s]+$/.test(signature))throw Error('缺少有效更新签名')
 return {version,notes:'按需选择去字幕水印、只换字幕、只换配音或字幕配音。添加选区移至视频旁上方；桌面支持完整视频，无固定时长或文件大小上限。字幕区域、水印区域可独立选择。新增紧凑平台提示、版本和创作者推特入口。',pub_date:date,platforms:{'darwin-aarch64':{signature:signature.trim(),url:`https://github.com/evanpanan/qingying/releases/download/v${version}/LightVid_${version}_aarch64.app.tar.gz`}}}
}
if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname){
 const key=process.env.TAURI_SIGNING_PRIVATE_KEY;if(!key)throw Error('缺少 TAURI_SIGNING_PRIVATE_KEY，请在 GitHub Actions Secrets 中配置')
 const root=resolve('.'),version=JSON.parse(await readFile('src-tauri/tauri.conf.json','utf8')).version,folder=resolve('public/downloads'),archive=join(folder,`LightVid_${version}_aarch64.app.tar.gz`),dir=await mkdtemp(join(tmpdir(),'lightvid-sign-'))
 function run(cmd,args,extra={}){const result=spawnSync(cmd,args,{stdio:'inherit',...extra});if(result.status!==0)throw Error('更新包构建或签名失败')}
 try{
  await mkdir(folder,{recursive:true});run('tar',['-czf',archive,'-C','src-tauri/target/release/bundle/macos','轻影.app'],{env:{...process.env,COPYFILE_DISABLE:'1'}})
  const path=join(dir,'signing.key');await writeFile(path,key,{mode:0o600})
  // Sign only after package-macos.sh has sealed the final app and its native engines.
  const signEnv={...process.env,TAURI_SIGNING_PRIVATE_KEY_PASSWORD:process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD||''};delete signEnv.TAURI_SIGNING_PRIVATE_KEY
  run(join(root,'node_modules/.bin/tauri'),['signer','sign','--private-key-path',path,'--app-version',version,archive],{env:signEnv})
  const signature=await readFile(archive+'.sig','utf8');await writeFile(join(folder,'latest.json'),JSON.stringify(manifest(version,signature),null,2)+'\n')
 }finally{await rm(dir,{recursive:true,force:true})}
}
