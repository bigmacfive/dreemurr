use std::fs;
use std::path::PathBuf;

use tauri::Manager;

fn documents_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  app.path().document_dir().map_err(|error| error.to_string())
}

fn dreemurr_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = documents_dir(app)?.join("dreemurr");
  fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
  Ok(dir)
}

fn migrate_root_dreem_files(app: &tauri::AppHandle) -> Result<(), String> {
  let documents = documents_dir(app)?;
  let destination = dreemurr_dir(app)?;
  let entries = match fs::read_dir(&documents) {
    Ok(entries) => entries,
    Err(_) => return Ok(())
  };
  for entry in entries.flatten() {
    let path = entry.path();
    let is_dreem = path.extension().and_then(|value| value.to_str()) == Some("dreem");
    if !is_dreem || !path.is_file() {
      continue;
    }
    let Some(name) = path.file_name() else { continue };
    let next = destination.join(name);
    if next.exists() {
      let _ = fs::remove_file(&path);
      continue;
    }
    fs::rename(&path, next).map_err(|error| error.to_string())?;
  }
  Ok(())
}

fn sanitize_dreem_filename(filename: &str) -> Result<String, String> {
  let safe_name = filename
    .chars()
    .filter(|character| !matches!(character, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|'))
    .collect::<String>()
    .replace("..", "");
  if !safe_name.ends_with(".dreem") || safe_name.trim() == ".dreem" {
    return Err("filename must end with .dreem".into());
  }
  Ok(safe_name)
}

fn dreem_path(app: &tauri::AppHandle, filename: &str) -> Result<PathBuf, String> {
  Ok(dreemurr_dir(app)?.join(sanitize_dreem_filename(filename)?))
}

pub fn dreem_filenames_in_dir(dir: &std::path::Path) -> Result<Vec<String>, String> {
  let entries = match fs::read_dir(dir) {
    Ok(entries) => entries,
    Err(_) => return Ok(Vec::new())
  };
  let mut names = Vec::new();
  for entry in entries.flatten() {
    let path = entry.path();
    if !path.is_file() {
      continue;
    }
    if path.extension().and_then(|value| value.to_str()) != Some("dreem") {
      continue;
    }
    if let Some(name) = path.file_name().and_then(|value| value.to_str()) {
      names.push(name.to_string());
    }
  }
  names.sort();
  Ok(names)
}

#[tauri::command]
fn save_dreem_file(app: tauri::AppHandle, filename: String, contents: String) -> Result<(), String> {
  migrate_root_dreem_files(&app)?;
  let path = dreem_path(&app, &filename)?;
  fs::write(path, contents).map_err(|error| error.to_string())
}

#[tauri::command]
fn remove_dreem_file(app: tauri::AppHandle, filename: String) -> Result<(), String> {
  migrate_root_dreem_files(&app)?;
  let path = dreem_path(&app, &filename)?;
  if path.exists() {
    fs::remove_file(path).map_err(|error| error.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn list_dreem_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
  migrate_root_dreem_files(&app)?;
  dreem_filenames_in_dir(&dreemurr_dir(&app)?)
}

#[tauri::command]
fn read_dreem_file(app: tauri::AppHandle, filename: String) -> Result<String, String> {
  migrate_root_dreem_files(&app)?;
  let path = dreem_path(&app, &filename)?;
  fs::read_to_string(path).map_err(|error| error.to_string())
}

#[cfg(target_os = "macos")]
fn apply_macos_window_chrome(window: &tauri::WebviewWindow) {
  use objc2::msg_send;
  use objc2::runtime::AnyObject;
  use tauri::window::{Effect, EffectsBuilder};

  let _ = window.set_effects(
    EffectsBuilder::new()
      .effects([Effect::WindowBackground])
      .radius(10.0)
      .build(),
  );
  let _ = window.set_shadow(true);

  let Ok(ns_window) = window.ns_window() else { return };
  let ns_window = ns_window as *mut AnyObject;
  if ns_window.is_null() { return }
  unsafe {
    let content_view: *mut AnyObject = msg_send![ns_window, contentView];
    clip_view_corners(content_view, 10.0);
    if !content_view.is_null() {
      let subviews: *mut AnyObject = msg_send![content_view, subviews];
      if !subviews.is_null() {
        let count: usize = msg_send![subviews, count];
        for index in 0..count {
          let child: *mut AnyObject = msg_send![subviews, objectAtIndex: index];
          clip_view_corners(child, 10.0);
        }
      }
    }
  }
}

#[cfg(target_os = "macos")]
unsafe fn clip_view_corners(view: *mut objc2::runtime::AnyObject, radius: f64) {
  use objc2::msg_send;
  if view.is_null() { return }
  let _: () = msg_send![view, setWantsLayer: true];
  let layer: *mut objc2::runtime::AnyObject = msg_send![view, layer];
  if layer.is_null() { return }
  let _: () = msg_send![layer, setCornerRadius: radius];
  let _: () = msg_send![layer, setMasksToBounds: true];
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      save_dreem_file,
      remove_dreem_file,
      list_dreem_files,
      read_dreem_file
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      if let Some(window) = app.get_webview_window("main") {
        #[cfg(target_os = "macos")]
        apply_macos_window_chrome(&window);
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.center();
        let _ = window.set_focus();
        #[cfg(target_os = "macos")]
        apply_macos_window_chrome(&window);
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
  use super::sanitize_dreem_filename;
  use std::path::PathBuf;

  #[test]
  fn rejects_non_dreem_extension() {
    assert!(sanitize_dreem_filename("notes.txt").is_err());
  }

  #[test]
  fn strips_parent_path_segments() {
    assert_eq!(sanitize_dreem_filename("../secret.dreem").unwrap(), "secret.dreem");
  }

  #[test]
  fn lists_only_dreem_files_in_a_folder() {
    use super::dreem_filenames_in_dir;
    let dir = std::env::temp_dir().join(format!("dreemurr-list-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).expect("temp dir");
    std::fs::write(dir.join("Alpha.dreem"), "{\"id\":\"a\"}").unwrap();
    std::fs::write(dir.join("Beta.dreem"), "{\"id\":\"b\"}").unwrap();
    std::fs::write(dir.join("notes.txt"), "nope").unwrap();
    std::fs::write(dir.join("readme.md"), "nope").unwrap();
    let names = dreem_filenames_in_dir(&dir).expect("list");
    let _ = std::fs::remove_dir_all(&dir);
    assert_eq!(names, vec!["Alpha.dreem".to_string(), "Beta.dreem".to_string()]);
  }

  #[test]
  fn writes_and_removes_documents_file() {
    let home = std::env::var("HOME").expect("HOME");
    let dir = PathBuf::from(home).join("Documents").join("dreemurr");
    std::fs::create_dir_all(&dir).expect("create dreemurr documents folder");
    let path = dir.join("_dreemurr_goal_test.dreem");
    std::fs::write(&path, "{\"id\":\"goal-test\"}").expect("write documents dreem file");
    let contents = std::fs::read_to_string(&path).expect("read documents dreem file");
    assert!(contents.contains("goal-test"));
    std::fs::remove_file(&path).expect("remove documents dreem file");
  }
}
