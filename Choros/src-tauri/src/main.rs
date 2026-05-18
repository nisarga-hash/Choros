use chrono;
use serde_json::json;

mod db;
mod models;

// === User Commands ===
#[tauri::command]
fn signup(name: String, email: String, password: String) -> Result<models::User, String> {
  Ok(models::User {
    id: 1,
    name,
    email,
    bio: String::new(),
    member_since: chrono::Local::now().to_string(),
  })
}

#[tauri::command]
fn login(email: String, password: String) -> Result<models::User, String> {
  Ok(models::User {
    id: 1,
    name: "User".to_string(),
    email,
    bio: String::new(),
    member_since: chrono::Local::now().to_string(),
  })
}

// === Note Commands ===
#[tauri::command]
fn add_note(title: String, content: String) -> Result<models::Note, String> {
  Ok(models::Note {
    id: 1,
    user_id: 1,
    title,
    content,
    created_at: chrono::Local::now().to_string(),
  })
}

#[tauri::command]
fn get_notes(user_id: i32) -> Result<Vec<models::Note>, String> {
  Ok(vec![])
}

#[tauri::command]
fn summarize_note(content: String) -> Result<String, String> {
  // Simple summarization: Extract first 2-3 sentences or up to 200 chars
  if content.is_empty() {
    return Ok(String::new());
  }

  let sentences: Vec<&str> = content.split('.').map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
  let summary = sentences.iter().take(3).map(|s| format!("{}.", s)).collect::<Vec<_>>().join(" ");
  
  if summary.len() > 200 {
    Ok(format!("{}...", &summary[..197]))
  } else {
    Ok(summary)
  }
}

#[tauri::command]
fn translate_note(content: String, target_lang: String) -> Result<String, String> {
  // For now, return a placeholder
  // In production, integrate with translation API (Google Translate, DeepL, etc.)
  Ok(format!("[Translated to {}]: {}", target_lang, content))
}

// Legacy function for compatibility
#[tauri::command]
fn translate_note_to_english(content: String) -> Result<String, String> {
  translate_note(content, "English".to_string())
}

// === Task Commands ===
#[tauri::command]
fn add_task(title: String) -> Result<models::Task, String> {
  Ok(models::Task {
    id: 1,
    user_id: 1,
    title,
    status: "todo".to_string(),
    locked: 0,
  })
}

#[tauri::command]
fn get_tasks(user_id: i32) -> Result<Vec<models::Task>, String> {
  Ok(vec![])
}

#[tauri::command]
fn update_task_status(id: i32, status: String) -> Result<models::Task, String> {
  Ok(models::Task {
    id,
    user_id: 1,
    title: String::new(),
    status,
    locked: 0,
  })
}

// === Planner Commands ===
#[tauri::command]
fn add_plan(title: String) -> Result<models::Plan, String> {
  Ok(models::Plan {
    id: 1,
    user_id: 1,
    title,
    status: "planned".to_string(),
  })
}

#[tauri::command]
fn get_plans(user_id: i32) -> Result<Vec<models::Plan>, String> {
  Ok(vec![])
}

fn main() {
 db::init_db();

 tauri::Builder::default()
 .invoke_handler(tauri::generate_handler![
   signup, login,
   add_note, get_notes, summarize_note, translate_note, translate_note_to_english,
   add_task, get_tasks, update_task_status,
   add_plan, get_plans
 ])
 .run(tauri::generate_context!())
 .expect("error");
}