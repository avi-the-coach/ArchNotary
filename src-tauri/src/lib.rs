use std::fs;
use std::path::PathBuf;
use tauri::Manager;

// ── Helpers ─────────────────────────────────────────────────────

/// Returns the ArchNotary app data directory:
/// %APPDATA%\archnotary  (Windows)
/// ~/Library/Application Support/archnotary  (macOS)
fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())
}

/// Ensures a directory exists; creates it (recursively) if needed.
fn ensure_dir(path: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|e| e.to_string())
}

// ── Tauri Commands ───────────────────────────────────────────────

/// Read a text file relative to the app data dir.
/// Returns empty string if file does not exist.
#[tauri::command]
fn read_file(app: tauri::AppHandle, rel_path: String) -> Result<String, String> {
    let path = app_data_dir(&app)?.join(&rel_path);
    if !path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Write (overwrite) a text file relative to the app data dir.
/// Parent directories are created automatically.
#[tauri::command]
fn write_file(app: tauri::AppHandle, rel_path: String, content: String) -> Result<(), String> {
    let path = app_data_dir(&app)?.join(&rel_path);
    if let Some(parent) = path.parent() {
        ensure_dir(&parent.to_path_buf())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

/// Append a line to a file (creates file + dirs if needed).
#[tauri::command]
fn append_file(app: tauri::AppHandle, rel_path: String, line: String) -> Result<(), String> {
    let path = app_data_dir(&app)?.join(&rel_path);
    if let Some(parent) = path.parent() {
        ensure_dir(&parent.to_path_buf())?;
    }
    use std::io::Write;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    writeln!(file, "{}", line).map_err(|e| e.to_string())
}

/// List immediate subdirectories of sessions/ (each is a session folder).
/// Returns vec of folder names sorted descending (newest first by name).
#[tauri::command]
fn list_sessions(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let sessions_dir = app_data_dir(&app)?.join("sessions");
    if !sessions_dir.exists() {
        return Ok(vec![]);
    }
    let mut entries: Vec<String> = fs::read_dir(&sessions_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            if entry.path().is_dir() {
                entry.file_name().into_string().ok()
            } else {
                None
            }
        })
        .collect();
    entries.sort_by(|a, b| b.cmp(a)); // newest first
    Ok(entries)
}

/// Ensure the app data directory structure is initialized.
/// Creates: sessions/ and config.json (if missing).
#[tauri::command]
fn init_storage(app: tauri::AppHandle) -> Result<(), String> {
    let base = app_data_dir(&app)?;
    ensure_dir(&base.join("sessions"))?;

    let config_path = base.join("config.json");
    if !config_path.exists() {
        let default_config = serde_json::json!({
            "providers": [],
            "agents": [],
            "templates": {}
        });
        fs::write(&config_path, serde_json::to_string_pretty(&default_config).unwrap())
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Check whether the `claude` CLI is available in PATH.
/// Used to detect Claude Code SDK availability.
#[tauri::command]
fn check_claude_sdk() -> bool {
    let cmd = if cfg!(windows) { "where" } else { "which" };
    std::process::Command::new(cmd)
        .arg("claude")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Read Anthropic API key from environment.
/// Claude Code sets X_ANTHROPIC_API_KEY; some users set ANTHROPIC_API_KEY.
/// Returns the first one found, or None.
#[tauri::command]
fn get_env_anthropic_key() -> Option<String> {
    std::env::var("X_ANTHROPIC_API_KEY").ok()
        .or_else(|| std::env::var("ANTHROPIC_API_KEY").ok())
}

/// Read API keys for all known providers from environment.
/// Returns a JSON object with provider ids as keys and api keys as values.
/// Used to auto-populate provider keys when running from Claude Code terminal.
#[tauri::command]
fn get_env_api_keys() -> std::collections::HashMap<String, String> {
    let mut keys = std::collections::HashMap::new();

    // Anthropic — Claude Code sets X_ANTHROPIC_API_KEY
    if let Some(k) = std::env::var("X_ANTHROPIC_API_KEY").ok()
        .or_else(|| std::env::var("ANTHROPIC_API_KEY").ok()) {
        keys.insert("anthropic".to_string(), k.clone());
        keys.insert("claude-sdk".to_string(), k);
    }

    if let Some(k) = std::env::var("OPENAI_API_KEY").ok() {
        keys.insert("openai".to_string(), k);
    }

    if let Some(k) = std::env::var("GEMINI_API_KEY").ok() {
        keys.insert("google".to_string(), k);
    }

    keys
}

#[tauri::command]
fn open_sound_settings() {
    let _ = std::process::Command::new("control")
        .arg("mmsys.cpl,,1")
        .spawn();
}

// ── App entry ───────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            append_file,
            list_sessions,
            init_storage,
            check_claude_sdk,
            get_env_anthropic_key,
            get_env_api_keys,
            open_sound_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
