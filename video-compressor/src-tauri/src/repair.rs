use serde::{Deserialize,Serialize};
use std::{collections::HashMap,fs::{self,OpenOptions},io::{BufRead,BufReader,Read,Write},path::PathBuf,process::Stdio,sync::Mutex,time::{SystemTime,UNIX_EPOCH}};
use tauri::{Emitter,Manager,State};
#[derive(Default)]pub struct Jobs(pub Mutex<HashMap<String,u32>>);
#[derive(Clone,Deserialize,Serialize)]pub struct Region{pub x:f64,pub y:f64,pub width:f64,pub height:f64}
#[derive(Clone,Deserialize,Serialize)]pub struct RepairSpec{pub mode:String,pub regions:Vec<Region>,pub width:u32,pub height:u32,pub start:f64,pub end:f64,pub time:f64,pub preview:bool}
fn job_dir(app:&tauri::AppHandle,job:&str)->Result<PathBuf,String>{
 if job.is_empty()||job.len()>40||!job.chars().all(|c|c.is_ascii_digit()){return Err("任务编号无效".into())}
 Ok(app.path().app_cache_dir().map_err(|e|e.to_string())?.join("repair").join(job))
}
fn valid(spec:&RepairSpec)->bool{
 ["ai","quick","subtitle-track"].contains(&spec.mode.as_str())&&spec.width>=8&&spec.height>=8&&spec.width<=16384&&spec.height<=16384&&spec.time.is_finite()&&spec.time>=0.0&&
 (spec.mode=="subtitle-track"||(!spec.regions.is_empty()&&spec.regions.len()<=8&&spec.regions.iter().all(|r|[r.x,r.y,r.width,r.height].iter().all(|n|n.is_finite())&&r.x>=0.0&&r.y>=0.0&&r.width>0.0&&r.height>0.0&&r.x+r.width<=1.000001&&r.y+r.height<=1.000001)))&&
 (spec.mode!="ai"||(spec.start.is_finite()&&spec.end.is_finite()&&spec.start>=0.0&&spec.end>spec.start&&spec.end-spec.start<=20.001))
}
#[tauri::command]pub fn repair_begin(app:tauri::AppHandle)->Result<String,String>{
 let job=SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos().to_string();let dir=job_dir(&app,&job)?;fs::create_dir_all(dir).map_err(|e|e.to_string())?;Ok(job)
}
#[tauri::command]pub fn repair_upload(app:tauri::AppHandle,job:String,bytes:Vec<u8>)->Result<(),String>{
 if bytes.len()>1024*1024{return Err("上传分块过大".into())}let path=job_dir(&app,&job)?.join("source");let mut file=OpenOptions::new().create(true).append(true).open(path).map_err(|e|e.to_string())?;
 if file.metadata().map_err(|e|e.to_string())?.len()+bytes.len() as u64>500*1024*1024{return Err("文件超过 500 MB".into())}file.write_all(&bytes).map_err(|e|e.to_string())
}
#[tauri::command]pub async fn repair_run(app:tauri::AppHandle,job:String,spec:RepairSpec)->Result<String,String>{
 if !valid(&spec){return Err("修补参数无效".into())}
 tauri::async_runtime::spawn_blocking(move||{
 let dir=job_dir(&app,&job)?;let input=dir.join("source");if !input.is_file(){return Err("请先选择视频".into())}
 if spec.mode=="ai"&&fs::metadata(&input).map_err(|e|e.to_string())?.len()>100*1024*1024{return Err("AI 模式请使用 100 MB 以内的视频".into())}
 let resource=app.path().resource_dir().map_err(|e|e.to_string())?.join("desktop-ai");
 let runtime=if resource.join("repair.mjs").is_file(){resource}else{PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../desktop-ai")};
 let ffmpeg=super::resolve_ffmpeg_path(&app)?;
 let node=ffmpeg.parent().ok_or("引擎目录无效")?.join(if cfg!(windows){"node.exe"}else{"node"});
 let node=if node.is_file(){node}else{which::which("node").map_err(|_|"未找到内置 AI 运行引擎，请重新安装")?};
 let output=if spec.preview{"preview.png"}else{"result.mp4"};
 let mut value=serde_json::to_value(&spec).map_err(|e|e.to_string())?;
 value["input"]=input.to_string_lossy().to_string().into();value["output"]=dir.join(output).to_string_lossy().to_string().into();value["ffmpeg"]=ffmpeg.to_string_lossy().to_string().into();
 fs::write(dir.join("spec.json"),serde_json::to_vec(&value).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
 let state=app.state::<Jobs>();let mut running=state.0.lock().map_err(|_|"任务状态异常")?;if running.contains_key(&job){return Err("此视频正在处理中".into())}
 let mut child=super::media_command(node).arg(runtime.join("repair.mjs")).arg(dir.join("spec.json")).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().map_err(|e|e.to_string())?;
 running.insert(job.clone(),child.id());drop(running);
 let stderr=child.stderr.take().ok_or("无法读取引擎状态")?;
 let errors=std::thread::spawn(move||{let mut text=String::new();let _=BufReader::new(stderr).take(16384).read_to_string(&mut text);text});
 if let Some(stdout)=child.stdout.take(){for line in BufReader::new(stdout).lines().map_while(Result::ok){if let Ok(mut data)=serde_json::from_str::<serde_json::Value>(&line){data["job"]=job.clone().into();let _=app.emit("repair-progress",data);}}}
 let result=child.wait().map_err(|e|e.to_string());let _=state.0.lock().map(|mut jobs|jobs.remove(&job));let error=errors.join().unwrap_or_default();
 if !result?.success(){return Err(if error.is_empty(){"操作已停止或处理失败".into()}else{error.chars().take(1000).collect()})}
 if !dir.join(output).is_file(){return Err("未生成修复结果".into())}Ok(output.to_string())
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
#[cfg(test)]mod tests{use super::*;#[test]fn rejects_invalid_parameters(){let mut s=RepairSpec{mode:"ai".into(),regions:vec![Region{x:0.1,y:0.1,width:0.2,height:0.2}],width:640,height:360,start:0.0,end:1.0,time:0.0,preview:false};assert!(valid(&s));s.regions[0].width=2.0;assert!(!valid(&s));s.regions.clear();s.mode="subtitle-track".into();assert!(valid(&s));s.mode="ai".into();assert!(!valid(&s));}}
