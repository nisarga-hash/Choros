import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSettings, saveSettings, type AppSettings, deleteUser } from "@/lib/store";
import { Settings, Type, Quote, Save, Lock, Trash2, AlertTriangle, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

// ─── Delete Confirmation Modal ───────────────────────────────────────────────
function DeleteModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const confirmed = typed === "DELETE";

  const handleDelete = async () => {
    if (!confirmed) return;
    setDeleting(true);
    setError("");
    try {
      await onConfirm();
    } catch {
      setError("Failed to delete account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget && !deleting) onCancel(); }}
      >
        {/* Panel */}
        <motion.div
          key="panel"
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 24 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-full max-w-md bg-card border border-destructive/30 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Red accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-red-500 via-rose-500 to-pink-500" />

          <div className="p-7">
            {/* Icon + close */}
            <div className="flex items-start justify-between mb-5">
              <div className="relative">
                {/* Pulse ring */}
                <motion.div
                  animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-destructive/30"
                />
                <div className="relative w-12 h-12 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
              </div>
              {!deleting && (
                <button
                  onClick={onCancel}
                  className="text-muted-foreground hover:text-foreground transition rounded-lg p-1 hover:bg-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Heading */}
            <h2 className="text-xl font-bold text-foreground mb-1">Delete your account?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              This will <span className="text-destructive font-semibold">permanently</span> delete your account
              and all associated data — notes, tasks, and plans.{" "}
              <span className="font-semibold text-foreground">This action cannot be undone.</span>
            </p>

            {/* What will be deleted list */}
            <div className="bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3 mb-5 space-y-1.5">
              {["All your notes", "All your tasks", "All your planner items", "Your account & profile"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            {/* Type-to-confirm */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Type <span className="text-destructive font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={deleting}
                placeholder="DELETE"
                className={`w-full px-4 py-2.5 rounded-lg border bg-muted/50 text-foreground font-mono text-sm
                  focus:outline-none transition-all placeholder:text-muted-foreground/40
                  ${confirmed
                    ? "border-destructive focus:ring-2 focus:ring-destructive/20"
                    : "border-border focus:ring-2 focus:ring-primary/20"
                  }`}
              />
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-destructive text-sm mb-4"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium
                  hover:bg-muted transition disabled:opacity-50"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleDelete}
                disabled={!confirmed || deleting}
                whileTap={confirmed && !deleting ? { scale: 0.97 } : {}}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all
                  ${confirmed && !deleting
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/25"
                    : "bg-destructive/30 text-destructive-foreground/50 cursor-not-allowed"
                  }`}
              >
                {deleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete Account</>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [saved, setSaved] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSave = () => {
    saveSettings(settings);
    document.documentElement.classList.remove("font-small", "font-medium", "font-large");
    document.documentElement.classList.add(`font-${settings.fontSize}`);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteConfirmed = async () => {
    if (!user) return;
    const success = await deleteUser(user.id);
    if (success) {
      logout();
    } else {
      throw new Error("Delete failed");
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-foreground mb-6">Settings</h1>

        {/* Preferences */}
        <div className="bg-card rounded-2xl p-8 border border-border/50 shadow-elegant space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <Settings className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-semibold">Preferences</h2>
              <p className="text-xs text-muted-foreground">Customize your Choros experience</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Type className="w-4 h-4 text-primary" /> Font Size
            </label>
            <div className="flex gap-2">
              {["small", "medium", "large"].map((size) => (
                <button
                  key={size}
                  onClick={() => setSettings((s) => ({ ...s, fontSize: size as AppSettings["fontSize"] }))}
                  className={`px-4 py-2 rounded-lg capitalize transition ${
                    settings.fontSize === size ? "gradient-primary text-white" : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Quote className="w-4 h-4 text-primary" /> Motivational Quotes
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showQuotes}
                onChange={(e) => setSettings((s) => ({ ...s, showQuotes: e.target.checked }))}
              />
              <span className="text-sm text-muted-foreground">Show daily quote on dashboard</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="gradient-primary text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition"
            >
              <Save className="w-4 h-4" /> Save Settings
            </button>
            <AnimatePresence>
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-green-500 font-medium"
                >
                  ✓ Saved!
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Security */}
        <div className="bg-card rounded-2xl p-8 mt-6 border border-border/50">
          <h2 className="font-semibold mb-4 text-foreground flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" /> Security
          </h2>
          <Link to="/change-password">
            <button className="px-4 py-2 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition text-sm">
              Change Password
            </button>
          </Link>
        </div>

        {/* Danger Zone */}
        <div className="bg-card rounded-2xl p-8 mt-6 border border-destructive/20">
          <h2 className="font-semibold mb-2 text-destructive flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Danger Zone
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive font-medium
              hover:bg-destructive hover:text-destructive-foreground transition-all text-sm flex items-center gap-2 group"
          >
            <Trash2 className="w-4 h-4 group-hover:animate-bounce" />
            Delete Account
          </button>
        </div>
      </motion.div>

      {/* Custom Delete Modal */}
      {showDeleteModal && (
        <DeleteModal
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirmed}
        />
      )}
    </>
  );
}