import {mkdir,readFile,writeFile,access,rename,readdir,rm} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {dirname,resolve} from 'node:path'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),runtime=resolve(root,'desktop-ai'),target=resolve(runtime,'models/lama_fp32.onnx')
if(!process.env.TAURI_ENV_PLATFORM&&!process.argv.includes('--force'))process.exit(0)
if(process.platform==='darwin'){const r=spawnSync(process.execPath,[resolve(root,'scripts/build-native-enhancement.mjs')],{cwd:root,stdio:'inherit'});if(r.status!==0)throw Error('无法准备原生高清增强引擎')}
try{await access(resolve(runtime,'node_modules/onnxruntime-node/package.json'));await access(resolve(runtime,'node_modules/kokoro-js/package.json'));await access(resolve(runtime,'node_modules/@huggingface/transformers/package.json'))}catch{
 const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['ci','--omit=dev','--no-audit','--no-fund'],{cwd:runtime,stdio:'inherit',shell:process.platform==='win32',env:{...process.env,ONNXRUNTIME_NODE_INSTALL_CUDA:'skip'}})
 if(result.status!==0)throw new Error('无法安装桌面 AI 引擎')
}
// Keep only current-platform native libraries, including nested speech runtimes.
async function prune(directory){
 for(const item of await readdir(directory,{withFileTypes:true})){
  if(!item.isDirectory())continue
  const path=resolve(directory,item.name)
  if(item.name==='onnxruntime-node'){
   for(const abi of await readdir(resolve(path,'bin'))){const bins=resolve(path,'bin',abi);for(const platform of await readdir(bins))if(platform!==process.platform)await rm(resolve(bins,platform),{recursive:true,force:true});for(const arch of await readdir(resolve(bins,process.platform)))if(arch!==process.arch)await rm(resolve(bins,process.platform,arch),{recursive:true,force:true})}
  }
  if(item.name.startsWith('@')||item.name==='node_modules')await prune(path)
  else {try{await access(resolve(path,'node_modules'));await prune(resolve(path,'node_modules'))}catch{}}
 }
}
await prune(resolve(runtime,'node_modules'))
const voices=resolve(runtime,'node_modules/kokoro-js/voices')
for(const name of await readdir(voices))if(!['af_heart.bin','am_michael.bin'].includes(name))await rm(resolve(voices,name),{force:true})
const hash='1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6',valid=bytes=>createHash('sha256').update(bytes).digest('hex')===hash
try{if(valid(await readFile(target)))process.exit(0)}catch{}
await mkdir(dirname(target),{recursive:true})
const path='Carve/LaMa-ONNX/resolve/c3c0c9e468934d62e79c329e35d82dd09ff8c444/lama_fp32.onnx'
let bytes
if(process.env.LIGHTVID_MODEL_PATH)bytes=await readFile(process.env.LIGHTVID_MODEL_PATH)
else for(const host of ['https://huggingface.co/','https://hf-mirror.com/']){try{const response=await fetch(host+path,{signal:AbortSignal.timeout(240000)});if(!response.ok)continue;const data=Buffer.from(await response.arrayBuffer());if(valid(data)){bytes=data;break}}catch{}}
if(!bytes||!valid(bytes))throw new Error('桌面 AI 模型下载或校验失败')
await writeFile(target+'.tmp',bytes);await rename(target+'.tmp',target);console.log('内置 AI 模型校验完成')
