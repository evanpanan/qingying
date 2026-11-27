import {createRequire} from 'node:module'
import {mkdir} from 'node:fs/promises'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
await mkdir('public/screens',{recursive:true})
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})})
const page=await browser.newPage({viewport:{width:1440,height:760},deviceScaleFactor:1.5})
await page.addInitScript(()=>{
 window.isTauri=true
 let id=0;const callbacks=new Map(),events=new Map()
 window.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener:()=>{}}
 window.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},transformCallback:f=>{callbacks.set(++id,f);return id},invoke:async(cmd,args={})=>{
  if(cmd==='plugin:event|listen'){events.set(args.event,args.handler);return ++id}
  if(cmd==='plugin:event|unlisten')return
  if(cmd==='native_extract')return {title:'海边日记 · 夏日片段',uploader:'轻影演示素材',extractor_key:'公开作品',formats:[{url:'https://example.com/demo.mp4',ext:'mp4',vcodec:'h264',acodec:'aac',height:1080,format_id:'demo'}]}
  if(cmd==='plugin:dialog|open')return ['/Users/demo/Movies/海边日记.mov','/Users/demo/Movies/城市散步.mp4']
  if(cmd==='plugin:clipboard-manager|read_text')return 'https://example.com/海边日记'
  if(cmd==='native_download')return '/Users/demo/Downloads/轻影/海边日记.mp4'
  if(cmd==='convert_video')return {output_path:'/Users/demo/Movies/海边日记.'+args.format,compressed_size:8388608}
  if(cmd==='compress_video')return {output_path:'/Users/demo/Movies/海边日记_compressed.mp4',original_size:33554432,compressed_size:18874368}
  return null
 }}
})
try{
 await page.goto(process.env.APP_URL||'http://127.0.0.1:1420')
 await page.getByRole('heading',{name:'新建下载'}).waitFor()
 const shot=async name=>{await page.mouse.move(5,5);await page.waitForTimeout(350);await page.screenshot({path:`public/screens/${name}.png`})}
 await shot('download-empty')
 await page.locator('#share-link').fill('https://example.com/海边日记')
 await shot('download-input')
 await page.getByRole('button',{name:'解析并下载',exact:true}).click()
 await page.getByRole('button',{name:/保存完整视频/}).waitFor()
 await shot('download-ready')
 await page.getByRole('button',{name:/保存完整视频/}).click()
 await page.getByText('文件已保存',{exact:false}).first().waitFor()
 await shot('download-done')
 await page.getByRole('button',{name:'格式转换'}).click()
 await page.getByRole('button',{name:'选择视频',exact:true}).click()
 await shot('convert-ready')
 await page.getByRole('button',{name:/MP3/}).first().click()
 await shot('convert-mp3')
 await page.getByRole('button',{name:'转换为 MP3',exact:true}).click()
 await page.getByRole('button',{name:'打开目录',exact:true}).first().waitFor()
 await shot('convert-done')
 await page.getByRole('button',{name:'视频压缩'}).click()
 await page.getByRole('button',{name:'添加视频',exact:true}).click()
 await page.locator('.desktop-content').evaluate(e=>e.scrollTop=235);await shot('compress-settings')
 await page.getByRole('button',{name:'开始压缩',exact:true}).click()
 await page.getByText('压缩完成',{exact:false}).first().waitFor({timeout:5000}).catch(()=>{})
 await page.locator('.desktop-content').evaluate(e=>e.scrollTop=e.scrollHeight)
 await shot('compress-done')
 console.log('Captured nine real UI states using labelled demo data')
}finally{await browser.close()}
