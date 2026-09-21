use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::{Emitter, Manager};

struct OpenedDreemPaths(Mutex<Vec<String>>);

static EARLY_OPENED_DREEM_PATHS: Mutex<Vec<String>> = Mutex::new(Vec::new());

fn is_dreem_path(path: &Path) -> bool {
  path
    .extension()
    .and_then(|value| value.to_str())
    .map(|value| value.eq_ignore_ascii_case("dreem"))
    .unwrap_or(false)
}

fn path_from_open_string(raw: &str) -> Option<PathBuf> {
  let trimmed = raw.trim();
  if trimmed.is_empty() {
    return None;
  }
  if let Ok(url) = url::Url::parse(trimmed) {
    if url.scheme() == "file" {
      return url.to_file_path().ok();
    }
  }
  Some(PathBuf::from(trimmed))
}

fn dreem_paths_from_open_strings(values: impl IntoIterator<Item = String>) -> Vec<String> {
  let mut paths = Vec::new();
  for value in values {
    let Some(path) = path_from_open_string(&value) else { continue };
    if path.is_dir() {
      if let Ok(relative) = dreem_filenames_in_dir(&path) {
        for name in relative {
          paths.push(path.join(name).to_string_lossy().into_owned());
        }
      }
      continue;
    }
    if !is_dreem_path(&path) {
      continue;
    }
    paths.push(path.to_string_lossy().into_owned());
  }
  paths
}

fn store_opened_dreem_paths(app: Option<&tauri::AppHandle>, paths: Vec<String>) {
  if paths.is_empty() {
    return;
  }
  if let Some(app) = app {
    if let Some(state) = app.try_state::<OpenedDreemPaths>() {
      if let Ok(mut pending) = state.0.lock() {
        pending.extend(paths.clone());
      }
      let _ = app.emit("dreem-open", paths);
      return;
    }
  }
  if let Ok(mut pending) = EARLY_OPENED_DREEM_PATHS.lock() {
    pending.extend(paths);
  }
}

fn take_opened_dreem_paths(app: &tauri::AppHandle) -> Vec<String> {
  let mut paths = EARLY_OPENED_DREEM_PATHS
    .lock()
    .map(|mut pending| std::mem::take(&mut *pending))
    .unwrap_or_default();
  if let Some(state) = app.try_state::<OpenedDreemPaths>() {
    if let Ok(mut pending) = state.0.lock() {
      paths.extend(pending.drain(..));
    }
  }
  paths
}

fn dreem_paths_from_cli_args() -> Vec<String> {
  dreem_paths_from_open_strings(std::env::args().skip(1).filter(|value| !value.starts_with('-')))
}

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
  let safe_name = filename.replace('\\', "/");
  if safe_name.contains("..") || safe_name.starts_with('/') {
    return Err("invalid dreem filename".into());
  }
  let safe_name = safe_name
    .chars()
    .filter(|character| !matches!(character, ':' | '*' | '?' | '"' | '<' | '>' | '|'))
    .collect::<String>();
  if !safe_name.to_ascii_lowercase().ends_with(".dreem") || safe_name.trim() == ".dreem" {
    return Err("filename must end with .dreem".into());
  }
  Ok(safe_name)
}

fn dreem_path(app: &tauri::AppHandle, filename: &str) -> Result<PathBuf, String> {
  let dir = dreemurr_dir(app)?;
  let path = dir.join(sanitize_dreem_filename(filename)?);
  if !path.starts_with(&dir) {
    return Err("invalid dreem filename".into());
  }
  Ok(path)
}

const MAX_DREEM_WALK_DEPTH: usize = 8;

pub fn dreem_filenames_in_dir(dir: &std::path::Path) -> Result<Vec<String>, String> {
  let mut names = Vec::new();
  collect_dreem_filenames(dir, dir, 0, &mut names)?;
  names.sort();
  Ok(names)
}

fn collect_dreem_filenames(
  dir: &Path,
  root: &Path,
  depth: usize,
  names: &mut Vec<String>,
) -> Result<(), String> {
  if depth > MAX_DREEM_WALK_DEPTH {
    return Ok(());
  }
  let entries = match fs::read_dir(dir) {
    Ok(entries) => entries,
    Err(_) => return Ok(())
  };
  for entry in entries.flatten() {
    let path = entry.path();
    if path.is_dir() {
      collect_dreem_filenames(&path, root, depth + 1, names)?;
      continue;
    }
    if !path.is_file() || !is_dreem_path(&path) {
      continue;
    }
    if let Ok(relative) = path.strip_prefix(root) {
      if let Some(name) = relative.to_str() {
        names.push(name.replace('\\', "/"));
      }
    }
  }
  Ok(())
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

#[tauri::command]
fn list_dreem_paths(path: String) -> Result<Vec<String>, String> {
  let resolved = path_from_open_string(&path).ok_or_else(|| "invalid dreem path".to_string())?;
  if resolved.is_file() {
    if is_dreem_path(&resolved) {
      return Ok(vec![resolved.to_string_lossy().into_owned()]);
    }
    return Ok(Vec::new());
  }
  if !resolved.is_dir() {
    return Ok(Vec::new());
  }
  let names = dreem_filenames_in_dir(&resolved)?;
  Ok(
    names
      .into_iter()
      .map(|name| resolved.join(name).to_string_lossy().into_owned())
      .collect(),
  )
}

#[tauri::command]
fn read_dreem_path(path: String) -> Result<String, String> {
  let resolved = path_from_open_string(&path).ok_or_else(|| "invalid dreem path".to_string())?;
  if !is_dreem_path(&resolved) {
    return Err("path must end with .dreem".into());
  }
  if !resolved.is_file() {
    return Err("dreem file was not found".into());
  }
  fs::read_to_string(resolved).map_err(|error| error.to_string())
}

#[tauri::command]
fn opened_dreem_paths(app: tauri::AppHandle) -> Vec<String> {
  take_opened_dreem_paths(&app)
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
    .manage(OpenedDreemPaths(Mutex::new(Vec::new())))
    .invoke_handler(tauri::generate_handler![
      save_dreem_file,
      remove_dreem_file,
      list_dreem_files,
      read_dreem_file,
      read_dreem_path,
      list_dreem_paths,
      opened_dreem_paths
    ])
    .setup(|app| {
      store_opened_dreem_paths(Some(app.handle()), dreem_paths_from_cli_args());
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
    .build(tauri::generate_context!())
    .expect("error while running tauri application")
    .run(|app, event| {
      #[cfg(any(target_os = "macos", target_os = "ios"))]
      if let tauri::RunEvent::Opened { urls } = event {
        let paths = dreem_paths_from_open_strings(
          urls
            .into_iter()
            .filter_map(|url| url.to_file_path().ok())
            .map(|path| path.to_string_lossy().into_owned()),
        );
        store_opened_dreem_paths(Some(app), paths);
      }
    });
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
    assert!(sanitize_dreem_filename("../secret.dreem").is_err());
    assert_eq!(
      sanitize_dreem_filename("projects/Garden.dreem").unwrap(),
      "projects/Garden.dreem"
    );
  }

  #[test]
  fn lists_only_dreem_files_in_a_folder() {
    use super::dreem_filenames_in_dir;
    let dir = std::env::temp_dir().join(format!("dreemurr-list-{}", std::process::id()));
    let nested = dir.join("projects");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&nested).expect("temp dir");
    std::fs::write(dir.join("Alpha.dreem"), "{\"id\":\"a\"}").unwrap();
    std::fs::write(dir.join("Beta.dreem"), "{\"id\":\"b\"}").unwrap();
    std::fs::write(nested.join("Garden.dreem"), "{\"id\":\"g\"}").unwrap();
    std::fs::write(dir.join("notes.txt"), "nope").unwrap();
    std::fs::write(dir.join("readme.md"), "nope").unwrap();
    let names = dreem_filenames_in_dir(&dir).expect("list");
    let _ = std::fs::remove_dir_all(&dir);
    assert_eq!(
      names,
      vec![
        "Alpha.dreem".to_string(),
        "Beta.dreem".to_string(),
        "projects/Garden.dreem".to_string()
      ]
    );
  }

  #[test]
  fn accepts_only_dreem_paths() {
    use super::is_dreem_path;
    assert!(is_dreem_path(std::path::Path::new("/tmp/Garden.dreem")));
    assert!(is_dreem_path(std::path::Path::new("/tmp/Garden.DREEM")));
    assert!(!is_dreem_path(std::path::Path::new("/tmp/notes.txt")));
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
