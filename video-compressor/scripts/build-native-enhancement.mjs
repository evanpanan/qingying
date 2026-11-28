import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'
import {chmod,mkdir} from 'node:fs/promises'
if(process.platform!=='darwin')process.exit(0)
const sdk=spawnSync('xcrun',['--sdk','macosx','--show-sdk-version'],{encoding:'utf8'});if(sdk.status!==0||parseInt(sdk.stdout)<26)throw Error('构建 AI 高清增强需要 Xcode 26 或更新的 macOS SDK')
const dir=resolve('desktop-ai/native'),target=resolve(dir,'lightvid-enhance');await mkdir(dir,{recursive:true})
const r=spawnSync('xcrun',['swiftc','-O','-swift-version','5','-parse-as-library','-target',`${process.arch==='arm64'?'arm64':'x86_64'}-apple-macosx12.0`,resolve(dir,'enhance.swift'),'-o',target],{stdio:'inherit'});if(r.status!==0)throw Error('原生高清增强引擎编译失败');await chmod(target,0o755)
