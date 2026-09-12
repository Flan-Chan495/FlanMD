use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GitStatusResult {
    pub is_repo: bool,
    pub branch: String,
    pub modified_count: usize,
    pub modified_files: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GitActionResult {
    pub success: bool,
    pub message: String,
}

fn run_command_in(dir: &str, program: &str, args: &[&str]) -> Result<String, String> {
    let mut cmd = Command::new(program);
    cmd.current_dir(dir);
    cmd.args(args);
    #[cfg(windows)]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            if output.status.success() {
                Ok(stdout)
            } else {
                Err(if stderr.is_empty() { stdout } else { stderr })
            }
        }
        Err(e) => Err(format!("Failed to execute {}: {}", program, e)),
    }
}

#[tauri::command]
fn list_files_in_dir(dir_path: String) -> Result<Vec<FileEntry>, String> {
    let p = Path::new(&dir_path);
    if !p.exists() || !p.is_dir() {
        return Err(format!("Path {} does not exist or is not a directory", dir_path));
    }

    let mut entries = Vec::new();
    let read_res = fs::read_dir(p).map_err(|e| e.to_string())?;

    for item in read_res {
        if let Ok(entry) = item {
            let path = entry.path();
            let is_dir = path.is_dir();
            let name = entry.file_name().to_string_lossy().to_string();

            // Ignore hidden files / directories (like .git, .vscode, etc.)
            if name.starts_with('.') {
                continue;
            }

            let ext = path.extension().map(|s| s.to_string_lossy().to_string());
            // We include subdirectories or markdown / text files
            if is_dir || ext.as_deref() == Some("md") || ext.as_deref() == Some("markdown") || ext.as_deref() == Some("txt") {
                entries.push(FileEntry {
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_dir,
                    extension: ext,
                });
            }
        }
    }

    // Sort: directories first, then alphabetical by name
    entries.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });

    Ok(entries)
}

#[tauri::command]
fn read_text_file(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn save_text_file(file_path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&file_path).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }
    fs::write(&file_path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
fn delete_file(file_path: String) -> Result<(), String> {
    let p = Path::new(&file_path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| format!("Failed to delete folder: {}", e))
    } else {
        fs::remove_file(p).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[tauri::command]
fn git_get_status(dir_path: String) -> Result<GitStatusResult, String> {
    let is_repo_check = run_command_in(&dir_path, "git", &["rev-parse", "--is-inside-work-tree"]);
    if is_repo_check.is_err() {
        return Ok(GitStatusResult {
            is_repo: false,
            branch: String::new(),
            modified_count: 0,
            modified_files: Vec::new(),
        });
    }

    let branch = run_command_in(&dir_path, "git", &["branch", "--show-current"])
        .unwrap_or_else(|_| "main".to_string());

    let status_out = run_command_in(&dir_path, "git", &["status", "--porcelain"])
        .unwrap_or_default();

    let mut modified_files = Vec::new();
    for line in status_out.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            modified_files.push(trimmed.to_string());
        }
    }
    let modified_count = modified_files.len();

    Ok(GitStatusResult {
        is_repo: true,
        branch,
        modified_count,
        modified_files,
    })
}

#[tauri::command]
fn git_commit_and_push(dir_path: String, commit_msg: String) -> Result<GitActionResult, String> {
    // 1. git add .
    if let Err(e) = run_command_in(&dir_path, "git", &["add", "."]) {
        return Ok(GitActionResult {
            success: false,
            message: format!("Git add failed: {}", e),
        });
    }

    // 2. git commit -m
    let msg = if commit_msg.trim().is_empty() {
        "blog: update article".to_string()
    } else {
        commit_msg
    };

    let commit_res = run_command_in(&dir_path, "git", &["commit", "-m", &msg]);
    // It's possible there is nothing to commit
    let commit_info = match commit_res {
        Ok(out) => out,
        Err(err) => {
            if err.contains("nothing to commit") || err.contains("working tree clean") {
                "Nothing to commit, working tree clean.".to_string()
            } else {
                return Ok(GitActionResult {
                    success: false,
                    message: format!("Git commit failed: {}", err),
                });
            }
        }
    };

    // 3. git push
    match run_command_in(&dir_path, "git", &["push"]) {
        Ok(push_out) => Ok(GitActionResult {
            success: true,
            message: format!("Pushed successfully!\n{}\n{}", commit_info, push_out).trim().to_string(),
        }),
        Err(push_err) => Ok(GitActionResult {
            success: false,
            message: format!("Committed locally, but Push failed:\n{}", push_err),
        }),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_files_in_dir,
            read_text_file,
            save_text_file,
            delete_file,
            git_get_status,
            git_commit_and_push
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
