use serde::{Deserialize,Serialize};
use std::{fs,path::{Path,PathBuf},sync::Mutex,time::{SystemTime,UNIX_EPOCH}};
use tauri::Manager;
static LOCK:Mutex<()>=Mutex::new(());
#[derive(Clone,Deserialize,Serialize)]pub struct Record{pub id:String,pub title:String,pub kind:String,pub created_at:u64,pub bytes:u64,pub path:String,#[serde(default)]pub saved_path:Option<String>,#[serde(default)]pub exists:bool}
fn root(app:&tauri::AppHandle)->Result<PathBuf,String>{let path=app.path().app_data_dir().map_err(|e|e.to_string())?.join("results");fs::create_dir_all(&path).map_err(|e|e.to_string())?;Ok(path)}
fn records(dir:&Path)->Vec<Record>{fs::read(dir.join("history.json")).ok().and_then(|bytes|serde_json::from_slice(&bytes).ok()).unwrap_or_default()}
fn write(dir:&Path,items:&[Record])->Result<(),String>{let bytes=serde_json::to_vec_pretty(items).map_err(|e|e.to_string())?;fs::write(dir.join("history.tmp"),bytes).map_err(|e|e.to_string())?;fs::rename(dir.join("history.tmp"),dir.join("history.json")).map_err(|e|e.to_string())}
fn safe_name(name:&str)->String{let name=Path::new(name).file_stem().and_then(|s|s.to_str()).unwrap_or("video");let cleaned:String=name.chars().filter(|c|!c.is_control()&&!"/\\:*?\"<>|".contains(*c)).take(70).collect();if cleaned.is_empty(){"video".into()}else{cleaned}}
pub fn remember(app:&tauri::AppHandle,source:&Path,title:&str,kind:&str)->Result<String,String>{
 let _guard=LOCK.lock().map_err(|_|"历史记录不可用")?;let dir=root(app)?;remember_in(&dir,source,title,kind)
}
fn remember_in(dir:&Path,source:&Path,title:&str,kind:&str)->Result<String,String>{
 let dir=dir.to_path_buf();fs::create_dir_all(&dir).map_err(|e|e.to_string())?;let timestamp=SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?;let id=timestamp.as_nanos().to_string();let label=if kind.starts_with("translate"){"english"}else{"repaired"};let filename=format!("{}_{}_{}.mp4",safe_name(title),label,id);let target=dir.join(filename);
 fs::copy(source,&target).map_err(|e|e.to_string())?;let bytes=fs::metadata(&target).map_err(|e|e.to_string())?.len();
 let record=Record{id:id.clone(),title:if title.is_empty(){"视频".into()}else{title.into()},kind:kind.into(),created_at:timestamp.as_secs(),bytes,path:target.to_string_lossy().into(),saved_path:None,exists:true};
 let sidecar=source.with_extension("srt");if kind.starts_with("translate")&&sidecar.is_file(){fs::copy(sidecar,target.with_extension("srt")).map_err(|e|e.to_string())?;}
 let mut all=records(&dir);all.insert(0,record);if let Err(error)=write(&dir,&all){let _=fs::remove_file(target);return Err(error)}Ok(id)
}
pub fn migrate_legacy(app:&tauri::AppHandle){
 let Ok(cache)=app.path().app_cache_dir()else{return};let old=cache.join("repair");let Ok(entries)=fs::read_dir(&old)else{return};
 for entry in entries.flatten(){let path=entry.path();if !path.is_dir(){continue}let output=path.join("result.mp4");if output.is_file(){let spec=fs::read(path.join("spec.json")).ok().and_then(|v|serde_json::from_slice::<serde_json::Value>(&v).ok());let title=spec.as_ref().and_then(|s|s["title"].as_str()).unwrap_or("旧版修复视频");let kind=spec.as_ref().and_then(|s|s["mode"].as_str()).unwrap_or("quick");if remember(app,&output,title,kind).is_err(){continue}}
 let _=fs::remove_dir_all(path);
 }
}
#[tauri::command]pub fn library_list(app:tauri::AppHandle)->Result<Vec<Record>,String>{let _guard=LOCK.lock().map_err(|_|"历史记录不可用")?;let mut all=records(&root(&app)?);for item in &mut all{item.exists=Path::new(&item.path).is_file()||item.saved_path.as_ref().is_some_and(|p|Path::new(p).is_file())}Ok(all)}
fn find(app:&tauri::AppHandle,id:&str)->Result<Record,String>{records(&root(app)?).into_iter().find(|r|r.id==id).ok_or("未找到这条处理记录".into())}
fn usable(record:&Record)->Result<PathBuf,String>{if let Some(path)=record.saved_path.as_ref().map(PathBuf::from).filter(|p|p.is_file()){return Ok(path)}let path=PathBuf::from(&record.path);if !path.is_file(){return Err("文件已移动或删除".into())}Ok(path)}
#[tauri::command]pub fn library_action(app:tauri::AppHandle,id:String,action:String)->Result<(),String>{
 if !["open","reveal"].contains(&action.as_str()){return Err("操作无效".into())}let record={let _guard=LOCK.lock().map_err(|_|"历史记录不可用")?;find(&app,&id)?};let path=usable(&record)?;
 #[cfg(target_os="macos")]{let mut command=super::media_command("open");if action=="reveal"{command.arg("-R");}if !command.arg(path).status().map_err(|e|e.to_string())?.success(){return Err("无法打开文件，请检查系统默认播放器".into())}}
 #[cfg(target_os="windows")]{if action=="reveal"{super::media_command("explorer").arg(format!("/select,{}",path.to_string_lossy())).spawn().map_err(|e|e.to_string())?;}else{super::media_command("explorer").arg(path).spawn().map_err(|e|e.to_string())?;}}
 Ok(())
}
#[tauri::command]pub fn library_save(app:tauri::AppHandle,id:String,destination:String)->Result<(),String>{let _guard=LOCK.lock().map_err(|_|"历史记录不可用")?;let dir=root(&app)?;let record=find(&app,&id)?;let source=usable(&record)?;let dest=PathBuf::from(destination);if !dest.is_absolute()||!dest.extension().and_then(|s|s.to_str()).is_some_and(|s|s.eq_ignore_ascii_case("mp4")){return Err("请选择 MP4 保存路径".into())}if source!=dest{fs::copy(&source,&dest).map_err(|e|e.to_string())?;}let mut all=records(&dir);if let Some(item)=all.iter_mut().find(|r|r.id==id){item.saved_path=Some(dest.to_string_lossy().into())}write(&dir,&all)}
#[cfg(test)]mod tests{use super::*;#[test]fn result_survives_source_cleanup(){let root=std::env::temp_dir().join(format!("lightvid-history-test-{}",SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));let source=root.join("source.mp4");fs::create_dir_all(&root).unwrap();fs::write(&source,b"test video").unwrap();fs::write(source.with_extension("srt"),b"English subtitle").unwrap();let dir=root.join("results");let id=remember_in(&dir,&source,"中文视频.mp4","translate").unwrap();fs::remove_file(source).unwrap();let all=records(&dir);assert_eq!(all.len(),1);assert_eq!(all[0].id,id);assert_eq!(fs::read(&all[0].path).unwrap(),b"test video");assert!(Path::new(&all[0].path).with_extension("srt").exists());assert!(usable(&all[0]).is_ok());fs::remove_file(&all[0].path).unwrap();assert!(usable(&all[0]).is_err());fs::remove_dir_all(root).unwrap();}#[test]fn safe_output_names(){assert_eq!(safe_name("../demo.mp4"),"demo");assert_eq!(safe_name("a:b?c.mp4"),"abc");assert_eq!(safe_name(""),"video");}}
