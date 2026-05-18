use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct User {
    pub id: i32,
    pub name: String,
    pub email: String,
    pub bio: String,
    pub member_since: String,
}

#[derive(Serialize, Deserialize)]
pub struct Note {
    pub id: i32,
    pub user_id: i32,
    pub title: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct Task {
    pub id: i32,
    pub user_id: i32,
    pub title: String,
    pub status: String,
    pub locked: i32,
}

#[derive(Serialize, Deserialize)]
pub struct Plan {
    pub id: i32,
    pub user_id: i32,
    pub title: String,
    pub status: String,
}

#[derive(Serialize, Deserialize)]
pub struct Settings {
    pub id: i32,
    pub user_id: i32,
    pub font_size: String,
    pub daily_quotes: i32,
}