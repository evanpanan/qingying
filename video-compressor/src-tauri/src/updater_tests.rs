use tauri_plugin_updater::UpdaterExt;
#[test]
#[cfg(target_os="macos")]
fn signed_update_rejects_tampering_and_replaces_only_app_bundle(){
 let config:serde_json::Value=serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
 assert_eq!(config["plugins"]["updater"]["requireSignedVersion"],true);
 let pubkey=config["plugins"]["updater"]["pubkey"].as_str().unwrap();
 let mut context=tauri::test::mock_context(tauri::test::noop_assets());context.config_mut().plugins.0.insert("updater".into(),config["plugins"]["updater"].clone());
 let app=tauri::test::mock_builder().plugin(tauri_plugin_updater::Builder::new().pubkey(pubkey).build()).build(context).unwrap();
 let directory=std::env::temp_dir().join(format!("lightvid-update-test-{}",std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
 let bundle=directory.join("轻影.app");let binary=bundle.join("Contents/MacOS/lightvid");std::fs::create_dir_all(binary.parent().unwrap()).unwrap();std::fs::write(&binary,b"old version\n").unwrap();
 let data=directory.join("user-data");std::fs::create_dir(&data).unwrap();std::fs::write(data.join("history.json"),b"keep history").unwrap();
 let updater=app.updater_builder().executable_path(&binary).target("darwin-aarch64").build().unwrap();
 let metadata=serde_json::json!({"version":"1.7.0","platforms":{"darwin-aarch64":{"url":"https://github.com/evanpanan/qingying/releases/download/v1.7.0/fixture.tar.gz","signature":include_str!("../../tests/fixtures/update-test.app.tar.gz.sig").trim()}}});
 let update=updater.restore_update(metadata.clone()).unwrap().unwrap();
 let bytes=include_bytes!("../../tests/fixtures/update-test.app.tar.gz");update.verify(bytes).unwrap();let mut broken=bytes.to_vec();broken[10]^=1;assert!(update.verify(&broken).is_err());assert!(update.install(&broken).is_err());assert_eq!(std::fs::read(&binary).unwrap(),b"old version\n");
 let mut mismatch=metadata;mismatch["version"]="99.0.0".into();assert!(updater.restore_update(mismatch).unwrap().unwrap().verify(bytes).is_err());
 update.install(bytes).unwrap();assert_eq!(std::fs::read(&binary).unwrap(),b"new version\n");assert_eq!(std::fs::read(data.join("history.json")).unwrap(),b"keep history");
 if let Ok(archive)=std::env::var("LIGHTVID_UPDATE_ARCHIVE") {
  let manifest:serde_json::Value=serde_json::from_slice(&std::fs::read(std::env::var("LIGHTVID_UPDATE_MANIFEST").unwrap()).unwrap()).unwrap();
  let release=updater.restore_update(manifest).unwrap().unwrap();release.verify(&std::fs::read(archive).unwrap()).unwrap();
 }
 std::fs::remove_dir_all(directory).unwrap();
}
