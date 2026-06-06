use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn get_data_dir(app_handle: &AppHandle, company_id: Option<&str>) -> Result<PathBuf, String> {
    let mut path = app_handle.path().app_local_data_dir().map_err(|e| e.to_string())?;
    if let Some(cid) = company_id {
        if !cid.is_empty() {
            path.push("companies");
            path.push(cid);
        }
    }
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(path)
}

pub fn save_json(app_handle: &AppHandle, company_id: Option<&str>, filename: &str, content: &str) -> Result<(), String> {
    let mut path = get_data_dir(app_handle, company_id)?;
    path.push(filename);
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_json(app_handle: &AppHandle, company_id: Option<&str>, filename: &str) -> Result<String, String> {
    let mut path = get_data_dir(app_handle, company_id)?;
    path.push(filename);
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        // Return empty array to default when file doesn't exist
        Ok("[]".to_string())
    }
}
