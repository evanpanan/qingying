use serde::{Deserialize,Serialize};
use std::{collections::{HashMap,HashSet},fs::{self,OpenOptions},io::{BufRead,BufReader,Read,Write},path::PathBuf,process::Stdio,sync::Mutex,time::{SystemTime,UNIX_EPOCH}};
use tauri::{Emitter,Manager,State};
#[derive(Default)]pub struct Jobs(pub Mutex<HashMap<String,u32>>);
#[derive(Default)]pub struct DroppedFiles(pub Mutex<HashSet<PathBuf>>);
#[derive(Serialize)]pub struct Imported{pub job:String,pub name:String,pub size:u64,pub preview_path:String}
fn copy_dropped(source:&std::path::Path,dir:&std::path::Path)->Result<(String,u64,PathBuf),String>{
 let ext=source.extension().and_then(|x|x.to_str()).unwrap_or("").to_ascii_lowercase();
 if !["mp4","mov","mkv","webm","avi","m4v","wmv","flv","3gp","mpg","mpeg","ts","m2ts","vob","ogv"].contains(&ext.as_str()){return Err("请拖入视频文件".into())}
 let info=fs::metadata(source).map_err(|e|format!("无法读取拖入文件：{e}"))?;
 if !info.is_file(){return Err("请拖入单个视频，暂不支持文件夹".into())}
 fs::create_dir_all(dir).map_err(|e|e.to_string())?;let target=dir.join("source");fs::copy(source,&target).map_err(|e|e.to_string())?;
 let preview=dir.join(format!("view.{ext}"));fs::hard_link(&target,&preview).or_else(|_|fs::copy(&target,&preview).map(|_|())).map_err(|e|e.to_string())?;
 Ok((source.file_name().and_then(|s|s.to_str()).unwrap_or("video").to_string(),info.len(),preview))
}
#[tauri::command]pub async fn repair_import(app:tauri::AppHandle,path:String)->Result<Imported,String>{
 let source=PathBuf::from(path).canonicalize().map_err(|_|"文件已移动或不存在")?;
 {let state=app.state::<DroppedFiles>();let mut allowed=state.0.lock().map_err(|_|"文件导入状态不可用")?;if !allowed.remove(&source){return Err("请从访达重新拖入这个视频".into())}}
 tauri::async_runtime::spawn_blocking(move||{let job=repair_begin(app.clone())?;let dir=job_dir(&app,&job)?;
 let result=(||{let (name,size,preview)=copy_dropped(&source,&dir)?;app.asset_protocol_scope().allow_file(&preview).map_err(|e|e.to_string())?;Ok(Imported{job,name,size,preview_path:preview.to_string_lossy().into()})})();
 if result.is_err(){let _=fs::remove_dir_all(dir);}result
 }).await.map_err(|e|e.to_string())?
}
#[derive(Clone,Deserialize,Serialize)]pub struct Region{pub x:f64,pub y:f64,pub width:f64,pub height:f64}
fn default_true()->bool{true}
#[derive(Clone,Deserialize,Serialize)]pub struct RepairSpec{#[serde(default)]pub title:String,pub mode:String,pub regions:Vec<Region>,pub width:u32,pub height:u32,pub start:f64,pub end:f64,pub time:f64,pub preview:bool,#[serde(default)]pub voice:String,#[serde(default,rename="removeRegions")]pub remove_regions:bool,#[serde(default,rename="repairMethod")]pub repair_method:String,#[serde(default="default_true")]pub subtitles:bool,#[serde(default="default_true")]pub dub:bool}
fn job_dir(app:&tauri::AppHandle,job:&str)->Result<PathBuf,String>{
 if job.is_empty()||job.len()>40||!job.chars().all(|c|c.is_ascii_digit()){return Err("任务编号无效".into())}
 Ok(app.path().app_cache_dir().map_err(|e|e.to_string())?.join("repair").join(job))
}
fn valid(spec:&RepairSpec)->bool{
 ["ai","quick","subtitle-track","translate"].contains(&spec.mode.as_str())&&spec.width>=8&&spec.height>=8&&spec.width<=16384&&spec.height<=16384&&spec.time.is_finite()&&spec.time>=0.0&&
 (spec.mode=="subtitle-track"||spec.mode=="translate"&&!spec.remove_regions||(!spec.regions.is_empty()&&spec.regions.len()<=8&&spec.regions.iter().all(|r|[r.x,r.y,r.width,r.height].iter().all(|n|n.is_finite())&&r.x>=0.0&&r.y>=0.0&&r.width>0.0&&r.height>0.0&&r.x+r.width<=1.000001&&r.y+r.height<=1.000001)))&&
 (spec.mode!="translate"||(spec.start.is_finite()&&spec.end.is_finite()&&spec.start>=0.0&&spec.end>spec.start&&["af_heart","am_michael"].contains(&spec.voice.as_str())&&["quick","ai"].contains(&spec.repair_method.as_str())&&(spec.subtitles||spec.dub)))&&
 (spec.mode!="ai"||(spec.start.is_finite()&&spec.end.is_finite()&&spec.start>=0.0&&spec.end>spec.start))
}
#[tauri::command]pub fn repair_begin(app:tauri::AppHandle)->Result<String,String>{
 let job=SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos().to_string();let dir=job_dir(&app,&job)?;fs::create_dir_all(dir).map_err(|e|e.to_string())?;Ok(job)
}
#[tauri::command]pub fn repair_upload(app:tauri::AppHandle,job:String,bytes:Vec<u8>)->Result<(),String>{
 if bytes.len()>1024*1024{return Err("上传分块过大".into())}let path=job_dir(&app,&job)?.join("source");let mut file=OpenOptions::new().create(true).append(true).open(path).map_err(|e|e.to_string())?;
 file.write_all(&bytes).map_err(|e|e.to_string())
}
#[tauri::command]pub async fn repair_run(app:tauri::AppHandle,job:String,spec:RepairSpec)->Result<String,String>{
 if !valid(&spec){return Err("修补参数无效".into())}
 tauri::async_runtime::spawn_blocking(move||{
 let dir=job_dir(&app,&job)?;let input=dir.join("source");if !input.is_file(){return Err("请先选择视频".into())}
 let resource=app.path().resource_dir().map_err(|e|e.to_string())?.join("desktop-ai");
 let runtime=if resource.join("repair.mjs").is_file(){resource}else{PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../desktop-ai")};
 let ffmpeg=super::resolve_ffmpeg_path(&app)?;
 let node=ffmpeg.parent().ok_or("引擎目录无效")?.join(if cfg!(windows){"node.exe"}else{"node"});
 let node=if node.is_file(){node}else{which::which("node").map_err(|_|"未找到内置 AI 运行引擎，请重新安装")?};
 let output=if spec.preview{"preview.png"}else{"result.mp4"};
 let mut value=serde_json::to_value(&spec).map_err(|e|e.to_string())?;
 value["input"]=input.to_string_lossy().to_string().into();value["output"]=dir.join(output).to_string_lossy().to_string().into();value["ffmpeg"]=ffmpeg.to_string_lossy().to_string().into();
 value["cacheDir"]=app.path().app_cache_dir().map_err(|e|e.to_string())?.join("speech-models").to_string_lossy().to_string().into();
 fs::write(dir.join("spec.json"),serde_json::to_vec(&value).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
 let state=app.state::<Jobs>();let mut running=state.0.lock().map_err(|_|"任务状态异常")?;if running.contains_key(&job){return Err("此视频正在处理中".into())}
 let mut child=super::media_command(node).arg(runtime.join(if spec.mode=="translate"{"translate.mjs"}else{"repair.mjs"})).arg(dir.join("spec.json")).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().map_err(|e|e.to_string())?;
 running.insert(job.clone(),child.id());drop(running);
 let stderr=child.stderr.take().ok_or("无法读取引擎状态")?;
 let errors=std::thread::spawn(move||{let mut reader=BufReader::new(stderr);let mut tail=Vec::new();let mut buffer=[0u8;4096];while let Ok(count)=reader.read(&mut buffer){if count==0{break}tail.extend_from_slice(&buffer[..count]);if tail.len()>16384{tail.drain(..tail.len()-16384);}}String::from_utf8_lossy(&tail).into_owned()});
 if let Some(stdout)=child.stdout.take(){for line in BufReader::new(stdout).lines().map_while(Result::ok){if let Ok(mut data)=serde_json::from_str::<serde_json::Value>(&line){data["job"]=job.clone().into();let _=app.emit("repair-progress",data);}}}
 let result=child.wait().map_err(|e|e.to_string());let _=state.0.lock().map(|mut jobs|jobs.remove(&job));let error=errors.join().unwrap_or_default();
 if !result?.success(){return Err(if error.is_empty(){"操作已停止或处理失败".into()}else{error.chars().take(1000).collect()})}
 if !dir.join(output).is_file(){return Err("未生成修复结果".into())}if spec.preview{Ok(output.to_string())}else{let id=super::library::remember(&app,&dir.join(output),&spec.title,if spec.mode=="translate"{if !spec.dub{"translate-subtitles"}else if !spec.subtitles{"translate-dub"}else{"translate"}}else{&spec.mode})?;let _=fs::remove_file(dir.join(output));let _=fs::remove_file(dir.join(output).with_extension("srt"));Ok(id)}
 }).await.map_err(|e|e.to_string())?
}
#[tauri::command]pub fn repair_cancel(app:tauri::AppHandle,job:String,state:State<'_,Jobs>)->Result<(),String>{
 job_dir(&app,&job)?;if let Some(pid)=state.0.lock().map_err(|_|"任务状态异常")?.get(&job).copied(){
 #[cfg(not(windows))]{super::media_command("kill").arg("-TERM").arg(pid.to_string()).status().map_err(|e|e.to_string())?;}
 #[cfg(windows)]{super::media_command("taskkill").args(["/PID",&pid.to_string(),"/T","/F"]).status().map_err(|e|e.to_string())?;}
 }Ok(())
}
#[tauri::command]pub fn repair_preview(app:tauri::AppHandle,job:String)->Result<Vec<u8>,String>{let path=job_dir(&app,&job)?.join("preview.png");if fs::metadata(&path).map_err(|e|e.to_string())?.len()>16*1024*1024{return Err("预览文件过大".into())}fs::read(path).map_err(|e|e.to_string())}
#[tauri::command]pub fn repair_save(app:tauri::AppHandle,job:String,destination:String)->Result<(),String>{
 let input=job_dir(&app,&job)?.join("result.mp4");let dest=PathBuf::from(destination);if !dest.is_absolute()||dest.extension().and_then(|s|s.to_str()).map(|s|s.to_lowercase())!=Some("mp4".into()){return Err("请选择 MP4 保存路径".into())}fs::copy(input,dest).map_err(|e|e.to_string())?;Ok(())
}
#[tauri::command]pub fn repair_discard(app:tauri::AppHandle,job:String,state:State<'_,Jobs>)->Result<(),String>{if state.0.lock().map_err(|_|"任务状态异常")?.contains_key(&job){return Err("请先停止任务".into())}let path=job_dir(&app,&job)?;if path.exists(){fs::remove_dir_all(path).map_err(|e|e.to_string())?}Ok(())}
#[cfg(test)]mod tests{use super::*;#[test]fn rejects_invalid_parameters(){let mut s=RepairSpec{title:String::new(),mode:"ai".into(),regions:vec![Region{x:0.1,y:0.1,width:0.2,height:0.2}],width:640,height:360,start:0.0,end:1.0,time:0.0,preview:false,voice:"af_heart".into(),remove_regions:false,repair_method:"quick".into(),subtitles:true,dub:true};assert!(valid(&s));s.regions[0].width=2.0;assert!(!valid(&s));s.regions.clear();s.mode="subtitle-track".into();assert!(valid(&s));s.mode="ai".into();assert!(!valid(&s));s.mode="translate".into();s.end=60.0;assert!(valid(&s));s.end=3600.0;assert!(valid(&s));s.subtitles=false;s.dub=false;assert!(!valid(&s));s.dub=true;assert!(valid(&s));s.subtitles=true;s.end=30.0;s.remove_regions=true;s.repair_method="ai".into();s.regions=vec![Region{x:0.1,y:0.1,width:0.2,height:0.2}];assert!(valid(&s));s.remove_regions=false;assert!(valid(&s));s.voice="invalid".into();assert!(!valid(&s));}}

#[cfg(test)]mod drop_tests{use super::*;#[test]fn imports_a_private_copy_for_processing_and_preview(){let root=std::env::temp_dir().join(format!("lightvid-drop-{}",SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));fs::create_dir_all(&root).unwrap();let source=root.join("中文 视频.MP4");fs::write(&source,b"video bytes").unwrap();let dir=root.join("job");let(name,size,preview)=copy_dropped(&source,&dir).unwrap();assert_eq!(name,"中文 视频.MP4");assert_eq!(size,11);fs::remove_file(&source).unwrap();assert_eq!(fs::read(dir.join("source")).unwrap(),b"video bytes");assert_eq!(fs::read(preview).unwrap(),b"video bytes");let invalid=root.join("note.txt");fs::write(&invalid,b"no").unwrap();assert!(copy_dropped(&invalid,&root.join("bad")).is_err());let folder=root.join("folder.mp4");fs::create_dir(&folder).unwrap();assert!(copy_dropped(&folder,&root.join("bad")).is_err());fs::remove_dir_all(root).unwrap();}}
