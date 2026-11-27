use serde::Serialize;
use std::{fs::OpenOptions,path::{Path,PathBuf},time::{SystemTime,UNIX_EPOCH}};
#[derive(Serialize)]pub struct UpdateLocation{pub blocked:bool,pub kind:String,pub path:String}
fn bundle(exe:&Path)->Option<PathBuf>{exe.ancestors().find(|path|path.extension().is_some_and(|ext|ext=="app")).map(Path::to_path_buf)}
fn location_kind(path:&Path,error:Option<i32>)->&'static str{
 if path.components().any(|part|part.as_os_str()=="AppTranslocation"){"translocation"}
 else if error==Some(30){if path.starts_with("/Volumes"){"disk-image"}else{"read-only"}}
 else{"ready"}
}
fn inspect(exe:&Path)->Result<UpdateLocation,String>{
 let Some(app)=bundle(exe)else{return Ok(UpdateLocation{blocked:false,kind:"ready".into(),path:exe.to_string_lossy().into()})};
 let parent=app.parent().ok_or("无法确定应用安装位置")?;
 let probe=parent.join(format!(".lightvid-update-check-{}-{}",std::process::id(),SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos()));
 let code=match OpenOptions::new().write(true).create_new(true).open(&probe){Ok(file)=>{drop(file);std::fs::remove_file(&probe).map_err(|e|e.to_string())?;None},Err(error)=>error.raw_os_error()};
 // A permissions failure may be resolved by the updater's macOS authorization dialog.
 // Read-only volumes and App Translocation cannot be fixed by re-downloading.
 let kind=location_kind(&app,code);Ok(UpdateLocation{blocked:kind!="ready",kind:kind.into(),path:app.to_string_lossy().into()})
}
#[tauri::command]pub fn update_location()->Result<UpdateLocation,String>{inspect(&std::env::current_exe().map_err(|e|e.to_string())?)}
#[tauri::command]pub fn update_open_applications()->Result<(),String>{
 #[cfg(target_os="macos")]{let status=super::media_command("open").arg("/Applications").status().map_err(|e|e.to_string())?;if !status.success(){return Err("无法打开应用程序文件夹，请在访达手动打开".into())}}
 Ok(())
}
#[cfg(test)]mod tests{use super::*;
 #[test]fn recognizes_read_only_install_locations(){let image=Path::new("/Volumes/轻影 1.7.0/轻影.app");assert_eq!(location_kind(image,Some(30)),"disk-image");assert_eq!(location_kind(image,None),"ready");assert_eq!(location_kind(Path::new("/private/tmp/readonly/轻影.app"),Some(30)),"read-only");assert_eq!(location_kind(Path::new("/private/var/folders/a/AppTranslocation/uuid/d/轻影.app"),None),"translocation");assert_eq!(location_kind(Path::new("/Applications/轻影.app"),Some(13)),"ready");}
 #[test]fn writable_probe_stays_outside_bundle_and_is_removed(){let root=std::env::temp_dir().join(format!("lightvid-location-{}",SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));let exe=root.join("轻影.app/Contents/MacOS/lightvid");std::fs::create_dir_all(exe.parent().unwrap()).unwrap();std::fs::write(&exe,b"untouched").unwrap();let result=inspect(&exe).unwrap();assert!(!result.blocked);assert_eq!(std::fs::read_dir(&root).unwrap().count(),1);assert_eq!(std::fs::read(&exe).unwrap(),b"untouched");assert_eq!(bundle(&exe).unwrap(),root.join("轻影.app"));std::fs::remove_dir_all(root).unwrap();}
}
