import {mkdir,readFile,writeFile,access,rename,readdir,rm} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {dirname,resolve} from 'node:path'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),runtime=resolve(root,'desktop-ai'),target=resolve(runtime,'models/lama_fp32.onnx')
if(!process.env.TAURI_ENV_PLATFORM&&!process.argv.includes('--force'))process.exit(0)
try{await access(resolve(runtime,'node_modules/onnxruntime-node/package.json'))}catch{
 const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['ci','--omit=dev','--no-audit','--no-fund'],{cwd:runtime,stdio:'inherit',shell:process.platform==='win32'})
 if(result.status!==0)throw new Error('无法安装桌面 AI 引擎')
}
// Keep only the current platform's native library in the installer.
const binaries=resolve(runtime,'node_modules/onnxruntime-node/bin/napi-v6')
for(const platform of await readdir(binaries))if(platform!==process.platform)await rm(resolve(binaries,platform),{recursive:true,force:true})
for(const arch of await readdir(resolve(binaries,process.platform)))if(arch!==process.arch)await rm(resolve(binaries,process.platform,arch),{recursive:true,force:true})
const hash='1faef5301d78db7dda502fe59966957ec4b79dd64e16f03ed96913c7a4eb68d6',valid=bytes=>createHash('sha256').update(bytes).digest('hex')===hash
try{if(valid(await readFile(target)))process.exit(0)}catch{}
await mkdir(dirname(target),{recursive:true})
const path='Carve/LaMa-ONNX/resolve/c3c0c9e468934d62e79c329e35d82dd09ff8c444/lama_fp32.onnx'
let bytes
if(process.env.LIGHTVID_MODEL_PATH)bytes=await readFile(process.env.LIGHTVID_MODEL_PATH)
else for(const host of ['https://huggingface.co/','https://hf-mirror.com/']){try{const response=await fetch(host+path,{signal:AbortSignal.timeout(240000)});if(!response.ok)continue;const data=Buffer.from(await response.arrayBuffer());if(valid(data)){bytes=data;break}}catch{}}
if(!bytes||!valid(bytes))throw new Error('桌面 AI 模型下载或校验失败')
await writeFile(target+'.tmp',bytes);await rename(target+'.tmp',target);console.log('内置 AI 模型校验完成')
