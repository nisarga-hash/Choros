const API_URL = "http://localhost:8000/api";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  gender?: "male" | "female" | "other" | "unspecified";
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  color: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  tags: string[];
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  milestone: boolean;
  status: "planned" | "active" | "completed";
  color: string;
  createdAt: string;
}

const CURRENT_USER_KEY = "choros_current_user";

// --- AUTH ---
export async function signup(email: string, password: string, name: string): Promise<User | null> {
  try {
    const res = await fetch(`${API_URL}/signup`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, createdAt: new Date().toISOString() })
    });
    const data = await res.json();
    if (data.user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      return data.user;
    }
    return null;
  } catch { return null; }
}

export async function login(email: string, password: string): Promise<User | null> {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      return data.user;
    }
    return null;
  } catch { return null; }
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getCurrentUser(): User | null {
  const u = localStorage.getItem(CURRENT_USER_KEY);
  return u ? JSON.parse(u) : null;
}

export async function updateProfile(updates: Partial<User>): Promise<User | null> {
  const current = getCurrentUser();
  if (!current) return null;
  try {
    const res = await fetch(`${API_URL}/users/${current.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (data.user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      return data.user;
    }
    return null;
  } catch { return null; }
}

export async function deleteUser(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/users/${userId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      logout();
      return true;
    }
    return false;
  } catch { return false; }
}

// Signup with OTP
export async function signupRequestOtp(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/signup-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || "Failed to send OTP" };
  } catch (e) {
    return { success: false, error: "Network error" };
  }
}

export async function signupVerifyOtp(
  email: string,
  otp: string,
  password: string,
  name: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/verify-signup-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        otp,
        password,
        name,
        createdAt: new Date().toISOString()
      })
    });
    const data = await res.json();
    if (data.user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error || "Failed to create account" };
  } catch (e) {
    return { success: false, error: "Network error" };
  }
}

export async function requestOtp(email: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/request-otp`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose: "password_reset" })
    });
    const data = await res.json();
    return !!data.success;
  } catch { return false; }
}

export async function verifyOtp(email: string, otp: string, newPassword: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/verify-otp`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword })
    });
    const data = await res.json();
    return !!data.success;
  } catch { return false; }
}

// --- NOTES ---
export async function getNotes(userId: string): Promise<Note[]> {
  const res = await fetch(`${API_URL}/notes/${userId}`);
  const data = await res.json();
  return data.notes || [];
}

export async function createNote(userId: string, data: Partial<Note>): Promise<Note> {
  const res = await fetch(`${API_URL}/notes`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  });
  const json = await res.json();
  return json.note;
}

export async function updateNote(id: string, data: Partial<Note>): Promise<Note | null> {
  const res = await fetch(`${API_URL}/notes/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() })
  });
  const json = await res.json();
  return json.note;
}

export async function deleteNote(id: string): Promise<void> {
  await fetch(`${API_URL}/notes/${id}`, { method: "DELETE" });
}

// --- TASKS ---
export async function getTasks(userId: string): Promise<Task[]> {
  const res = await fetch(`${API_URL}/tasks/${userId}`);
  const data = await res.json();
  return data.tasks || [];
}

export async function createTask(userId: string, data: Partial<Task>): Promise<Task> {
  const res = await fetch(`${API_URL}/tasks`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  });
  const json = await res.json();
  return json.task;
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task | null> {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() })
  });
  const json = await res.json();
  return json.task;
}

export async function deleteTask(id: string): Promise<void> {
  await fetch(`${API_URL}/tasks/${id}`, { method: "DELETE" });
}

// --- PLANNER ---
export async function getPlannerItems(userId: string): Promise<PlannerItem[]> {
  const res = await fetch(`${API_URL}/planner/${userId}`);
  const data = await res.json();
  return data.items || [];
}

export async function createPlannerItem(userId: string, data: Partial<PlannerItem>): Promise<PlannerItem> {
  const res = await fetch(`${API_URL}/planner`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, userId, createdAt: new Date().toISOString() })
  });
  const json = await res.json();
  return json.item;
}

export async function updatePlannerItem(id: string, data: Partial<PlannerItem>): Promise<PlannerItem | null> {
  const res = await fetch(`${API_URL}/planner/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  return json.item;
}

export async function deletePlannerItem(id: string): Promise<void> {
  await fetch(`${API_URL}/planner/${id}`, { method: "DELETE" });
}

// --- SETTINGS ---
export interface AppSettings {
  theme: "light" | "dark";
  fontSize: "small" | "medium" | "large";
  showQuotes: boolean;
}

export function getSettings(): AppSettings {
  const s = localStorage.getItem("choros_settings");
  return s ? JSON.parse(s) : { theme: "light", fontSize: "medium", showQuotes: true };
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem("choros_settings", JSON.stringify(s));
}
