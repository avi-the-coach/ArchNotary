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

#[tauri::command]
fn get_default_recording_device() -> String {
    let script = r#"Add-Type -TypeDefinition @"
using System;using System.Runtime.InteropServices;
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceEnumerator{void d0();[PreserveSig]int GetDefaultAudioEndpoint(int f,int r,out IMMDevice d);}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDevice{void d0();void d1();[PreserveSig]int GetId([MarshalAs(UnmanagedType.LPWStr)]out string id);}
[Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"),ClassInterface(ClassInterfaceType.None),ComImport]
public class MMDevEnum{}
"@ -EA SilentlyContinue
$e=(New-Object MMDevEnum)-as[IMMDeviceEnumerator];$d=$null;$e.GetDefaultAudioEndpoint(1,1,[ref]$d)|Out-Null;$id=$null;$d.GetId([ref]$id)|Out-Null;$id"#;

    let out = std::process::Command::new("powershell")
        .args(["-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-Command", script])
        .output()
        .unwrap_or_else(|_| std::process::Output {
            status: std::process::ExitStatus::default(),
            stdout: vec![],
            stderr: vec![],
        });
    String::from_utf8_lossy(&out.stdout).trim().to_string()
}

#[tauri::command]
fn set_default_recording_device(device_id: String) -> bool {
    if device_id.is_empty() {
        return false;
    }
    let script = r#"Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
[Guid("f8679f50-850a-41cf-9c72-430f290290c8"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IPolicyConfig{void d0();void d1();void d2();void d3();void d4();void d5();void d6();void d7();void d8();void d9();[PreserveSig]int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)]string id,int r);}
[Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9"),ClassInterface(ClassInterfaceType.None),ComImport]
public class PC{}
"@ -EA SilentlyContinue
$p=(New-Object PC)-as[IPolicyConfig];$p.SetDefaultEndpoint($env:AUD_DEV,0)|Out-Null;$p.SetDefaultEndpoint($env:AUD_DEV,1)|Out-Null;$p.SetDefaultEndpoint($env:AUD_DEV,2)|Out-Null"#;

    std::process::Command::new("powershell")
        .env("AUD_DEV", &device_id)
        .args(["-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-Command", script])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
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
            get_default_recording_device,
            set_default_recording_device,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
