import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getTasks, createTask, updateTask, deleteTask, type Task } from "@/lib/store";
import { Plus, Search, X, Trash2, CheckCircle2, Circle, Clock } from "lucide-react";

const STATUS_LABELS: Record<Task["status"], { label: string; icon: typeof Circle; color: string }> = {
  todo: { label: "To Do", icon: Circle, color: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-amber-500" },
  done: { label: "Done", icon: CheckCircle2, color: "text-green-500" },
};

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  high: "bg-destructive/10 text-destructive", medium: "bg-amber-100 text-amber-700", low: "bg-green-100 text-green-700",
};

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const refresh = useCallback(async () => {
    if (user) {
      const data = await getTasks(user.id);
      setTasks(data);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    let result = [...tasks];
    if (search) result = result.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
    if (filterStatus) result = result.filter((t) => t.status === filterStatus);
    return result.sort((a, b) => {
      const order = { todo: 0, in_progress: 1, done: 2 };
      return order[a.status] - order[b.status] || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [tasks, search, filterStatus]);

  const toggleStatus = async (task: Task) => {
    const next: Record<Task["status"], Task["status"]> = { todo: "in_progress", in_progress: "done", done: "todo" };
    await updateTask(task.id, { status: next[task.status] });
    refresh();
  };

  const statuses: Task["status"][] = ["todo", "in_progress", "done"];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">{tasks.filter((t) => t.status !== "done").length} active</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition shadow-glow text-sm">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilterStatus("")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${!filterStatus ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>All</button>
          {statuses.map((s) => (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterStatus === s ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {STATUS_LABELS[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((task) => {
            const S = STATUS_LABELS[task.status];
            return (
              <motion.div key={task.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="bg-card rounded-xl p-4 border border-border/50 shadow-sm hover:shadow-elegant transition flex items-center gap-4 cursor-pointer"
                onClick={() => { setEditing(task); setShowForm(true); }}
              >
                <button onClick={(e) => { e.stopPropagation(); toggleStatus(task); }} className={`${S.color} hover:scale-110 transition`}>
                  <S.icon className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                  {task.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                {task.dueDate && <span className="text-[10px] text-muted-foreground">{new Date(task.dueDate).toLocaleDateString()}</span>}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No tasks found</p>
        </div>
      )}

      <AnimatePresence>
        {showForm && <TaskFormModal task={editing} userId={user!.id} onClose={() => { setShowForm(false); refresh(); }} />}
      </AnimatePresence>
    </div>
  );
}

function TaskFormModal({ task, userId, onClose }: { task: Task | null; userId: string; onClose: () => void }) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState<Task["priority"]>(task?.priority || "medium");
  const [status, setStatus] = useState<Task["status"]>(task?.status || "todo");
  const [dueDate, setDueDate] = useState(task?.dueDate || "");
  const [tags, setTags] = useState(task?.tags.join(", ") || "");

  const save = async () => {
    const tagArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (task) await updateTask(task.id, { title, description, priority, status, dueDate: dueDate || undefined, tags: tagArr });
    else await createTask(userId, { title, description, priority, status, dueDate: dueDate || undefined, tags: tagArr });
    onClose();
  };

  const remove = async () => { if (task) { await deleteTask(task.id); onClose(); } };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-2xl p-6 w-full max-w-lg border border-border shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-foreground">{task ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <input type="text" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as Task["status"])}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="done">Done</option>
              </select>
            </div>
          </div>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input type="text" placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
        </div>
        <div className="flex items-center justify-between mt-6">
          {task ? <button onClick={remove} className="text-destructive text-sm flex items-center gap-1 hover:underline"><Trash2 className="w-3.5 h-3.5" /> Delete</button> : <div />}
          <button onClick={save} className="gradient-primary text-primary-foreground px-6 py-2 rounded-lg font-medium text-sm hover:opacity-90 transition">
            {task ? "Update" : "Create"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
