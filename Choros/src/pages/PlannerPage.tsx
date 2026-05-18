import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getPlannerItems, createPlannerItem, updatePlannerItem, deletePlannerItem, type PlannerItem } from "@/lib/store";
import { Plus, X, Trash2, Milestone, Calendar } from "lucide-react";

const STATUS_COLORS: Record<PlannerItem["status"], string> = {
  planned: "border-l-muted-foreground", active: "border-l-primary", completed: "border-l-green-500",
};

export default function PlannerPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PlannerItem | null>(null);

  const refresh = useCallback(async () => {
    if (user) {
      const data = await getPlannerItems(user.id);
      setItems(data);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const grouped = useMemo(() => {
    const groups: Record<string, PlannerItem[]> = { planned: [], active: [], completed: [] };
    items.forEach((i) => groups[i.status]?.push(i));
    return groups;
  }, [items]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Planner</h1>
          <p className="text-muted-foreground text-sm mt-1">Roadmap & milestones</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition shadow-glow text-sm">
          <Plus className="w-4 h-4" /> New Item
        </button>
      </div>

      {/* Timeline */}
      <div className="grid md:grid-cols-3 gap-6">
        {(["planned", "active", "completed"] as const).map((status) => (
          <div key={status}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status === "planned" ? "bg-muted-foreground" : status === "active" ? "bg-primary" : "bg-green-500"}`} />
              {status} ({grouped[status].length})
            </h3>
            <div className="space-y-3">
              <AnimatePresence>
                {grouped[status].map((item) => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`bg-card rounded-xl p-4 border border-border/50 border-l-4 ${STATUS_COLORS[item.status]} shadow-sm hover:shadow-elegant transition cursor-pointer`}
                    onClick={() => { setEditing(item); setShowForm(true); }}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {item.milestone && <Milestone className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                      <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                    </div>
                    {item.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.startDate).toLocaleDateString()}
                      {item.endDate && <> → {new Date(item.endDate).toLocaleDateString()}</>}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No planner items yet</p>
        </div>
      )}

      <AnimatePresence>
        {showForm && <PlannerFormModal item={editing} userId={user!.id} onClose={() => { setShowForm(false); refresh(); }} />}
      </AnimatePresence>
    </div>
  );
}

function PlannerFormModal({ item, userId, onClose }: { item: PlannerItem | null; userId: string; onClose: () => void }) {
  const [title, setTitle] = useState(item?.title || "");
  const [description, setDescription] = useState(item?.description || "");
  const [startDate, setStartDate] = useState(item?.startDate?.split("T")[0] || new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(item?.endDate?.split("T")[0] || "");
  const [status, setStatus] = useState<PlannerItem["status"]>(item?.status || "planned");
  const [milestone, setMilestone] = useState(item?.milestone || false);

  const save = async () => {
    if (item) await updatePlannerItem(item.id, { title, description, startDate, endDate: endDate || undefined, status, milestone });
    else await createPlannerItem(userId, { title, description, startDate, endDate: endDate || undefined, status, milestone });
    onClose();
  };

  const remove = async () => { if (item) { await deletePlannerItem(item.id); onClose(); } };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-2xl p-6 w-full max-w-lg border border-border shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-foreground">{item ? "Edit Item" : "New Planner Item"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as PlannerItem["status"])}
              className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={milestone} onChange={(e) => setMilestone(e.target.checked)} className="accent-primary" />
            <span className="text-muted-foreground">Mark as milestone</span>
          </label>
        </div>
        <div className="flex items-center justify-between mt-6">
          {item ? <button onClick={remove} className="text-destructive text-sm flex items-center gap-1 hover:underline"><Trash2 className="w-3.5 h-3.5" /> Delete</button> : <div />}
          <button onClick={save} className="gradient-primary text-primary-foreground px-6 py-2 rounded-lg font-medium text-sm hover:opacity-90 transition">
            {item ? "Update" : "Create"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
