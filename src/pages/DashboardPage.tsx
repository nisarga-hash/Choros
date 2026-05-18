import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getNotes, getTasks, getPlannerItems, type Note, type Task, type PlannerItem } from "@/lib/store";
import { getDailyQuote } from "@/lib/quotes";
import { StickyNote, CheckSquare, Map, TrendingUp, Quote } from "lucide-react";
import { Link } from "react-router-dom";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const { user } = useAuth();
  const quote = useMemo(getDailyQuote, []);

  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [planner, setPlanner] = useState<PlannerItem[]>([]);

  useEffect(() => {
    if (user) {
      getNotes(user.id).then(setNotes);
      getTasks(user.id).then(setTasks);
      getPlannerItems(user.id).then(setPlanner);
    }
  }, [user]);

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const activeTasks = tasks.filter((t) => t.status === "in_progress").length;

  const stats = [
    { label: "Notes", value: notes.length, icon: StickyNote, to: "/notes", color: "bg-primary/10 text-primary" },
    { label: "Tasks", value: tasks.length, icon: CheckSquare, to: "/tasks", color: "bg-accent/10 text-accent" },
    { label: "Completed", value: doneTasks, icon: TrendingUp, to: "/tasks", color: "bg-green-100 text-green-600" },
    { label: "Plans", value: planner.length, icon: Map, to: "/planner", color: "bg-amber-100 text-amber-600" },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-5xl mx-auto">
      {/* Header */}
      <motion.div variants={item} className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">
          {greeting}, <span className="text-gradient">{user?.name?.split(" ")[0]}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Here's your productivity overview</p>
      </motion.div>

      {/* Quote */}
      <motion.div variants={item} className="mb-8 gradient-card rounded-2xl p-6 border border-border/50 shadow-elegant">
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Quote className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-foreground font-medium italic">"{quote.text}"</p>
            <p className="text-muted-foreground text-sm mt-1">— {quote.author}</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} to={s.to}>
            <div className="bg-card rounded-xl p-5 border border-border/50 shadow-sm hover:shadow-elegant transition-shadow cursor-pointer">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </Link>
        ))}
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={item} className="grid md:grid-cols-2 gap-6">
        {/* Recent Notes */}
        <div className="bg-card rounded-xl p-6 border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-foreground">Recent Notes</h2>
            <Link to="/notes" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {notes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No notes yet. Start writing!</p>
          ) : (
            <div className="space-y-3">
              {notes.slice(-3).reverse().map((n) => (
                <div key={n.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition">
                  <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.content || "Empty note"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Tasks */}
        <div className="bg-card rounded-xl p-6 border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-foreground">Active Tasks</h2>
            <Link to="/tasks" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {activeTasks === 0 && tasks.filter((t) => t.status === "todo").length === 0 ? (
            <p className="text-muted-foreground text-sm">No active tasks. Create one!</p>
          ) : (
            <div className="space-y-3">
              {tasks.filter((t) => t.status !== "done").slice(0, 3).map((t) => (
                <div key={t.id} className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    t.priority === "high" ? "bg-destructive" : t.priority === "medium" ? "bg-amber-500" : "bg-green-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t.status.replace("_", " ")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
