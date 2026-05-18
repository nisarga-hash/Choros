import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getNotes, createNote, updateNote, deleteNote, type Note } from "@/lib/store";
import { Plus, Search, X, Pin, Trash2, Edit3, Tag, Zap, Globe, Loader2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["default", "rose", "amber", "emerald", "sky", "violet"];
const COLOR_MAP: Record<string, string> = {
  default: "bg-card", rose: "bg-rose-50 border-rose-200", amber: "bg-amber-50 border-amber-200",
  emerald: "bg-emerald-50 border-emerald-200", sky: "bg-sky-50 border-sky-200", violet: "bg-violet-50 border-violet-200",
};

export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [editing, setEditing] = useState<Note | null>(null);
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(async () => {
    if (user) {
      const data = await getNotes(user.id);
      setNotes(data);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const allTags = useMemo(() => [...new Set(notes.flatMap((n) => n.tags))], [notes]);

  const filtered = useMemo(() => {
    let result = [...notes];
    if (search) result = result.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()));
    if (filterTag) result = result.filter((n) => n.tags.includes(filterTag));
    return result.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, search, filterTag]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Notes</h1>
          <p className="text-muted-foreground text-sm mt-1">{notes.length} notes</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition shadow-glow text-sm">
          <Plus className="w-4 h-4" /> New Note
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-2 items-center flex-wrap">
            <Tag className="w-4 h-4 text-muted-foreground" />
            {allTags.map((tag) => (
              <button key={tag} onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  filterTag === tag ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>{tag}</button>
            ))}
          </div>
        )}
      </div>

      {/* Notes Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((note) => (
            <motion.div key={note.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`rounded-xl p-5 border border-border/50 shadow-sm hover:shadow-elegant transition cursor-pointer ${COLOR_MAP[note.color] || COLOR_MAP.default}`}
              onClick={() => { setEditing(note); setShowForm(true); }}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-foreground text-sm truncate flex-1">{note.title}</h3>
                {note.pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
              </div>
              <p className="text-muted-foreground text-xs line-clamp-3 mb-3">{note.content || "Empty note"}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {note.tags.slice(0, 2).map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full font-medium">{t}</span>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(note.updatedAt).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <StickyNoteIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No notes found</p>
        </div>
      )}

      {/* Note Form Modal */}
      <AnimatePresence>
        {showForm && <NoteFormModal note={editing} userId={user!.id} onClose={() => { setShowForm(false); refresh(); }} />}
      </AnimatePresence>
    </div>
  );
}

function StickyNoteIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/></svg>;
}

function NoteFormModal({ note, userId, onClose }: { note: Note | null; userId: string; onClose: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [tags, setTags] = useState(note?.tags.join(", ") || "");
  const [color, setColor] = useState(note?.color || "default");
  const [pinned, setPinned] = useState(note?.pinned || false);
  const [selectedLanguage, setSelectedLanguage] = useState("es");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [summaryData, setSummaryData] = useState<{ summary: string; wordCount: number; classification: string } | null>(null);
  const [undoContent, setUndoContent] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const LANGUAGES: { [key: string]: string } = {
    en: "English",
    hi: "Hindi",
    kn: "Kannada",
    ta: "Tamil",
    te: "Telugu",
    ml: "Malayalam",
    bn: "Bengali",
    pa: "Punjabi",
    or: "Odia",
    ur: "Urdu",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ja: "Japanese",
    zh: "Chinese",
    ko: "Korean",
    ru: "Russian",
    ar: "Arabic",
  };

  const handleSummarize = async () => {
    if (!content.trim()) {
      toast({ title: "Empty content", description: "Nothing to summarize", variant: "destructive" });
      return;
    }

    setIsSummarizing(true);
    try {
      const response = await fetch("http://localhost:8000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) throw new Error("Summarization failed");
      
      const data = await response.json();
      
      const wordsCount = content.trim().split(/\s+/).length;
      let classification = "short";
      if (wordsCount > 200) classification = "long";
      else if (wordsCount > 50) classification = "medium";
      
      setSummaryData({
        summary: data.summary,
        wordCount: wordsCount,
        classification,
      });
      toast({ title: "Summarized", description: "Note has been summarized successfully" });
    } catch (error) {
      console.error("Summarize error:", error);
      toast({ title: "Error", description: "Failed to summarize note. Make sure Python backend is running on port 8000", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

  const formatSummaryBullets = (text: string) => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return (
      <ul className="space-y-3 mt-4 text-left">
        {sentences.map((sentence, i) => {
          if (!sentence.trim()) return null;
          const words = sentence.trim().split(" ");
          const formattedWords = words.map((word, j) => {
            const cleanWord = word.replace(/[^\w]/g, "");
            const isImportant = cleanWord.length > 6 || (j > 0 && /^[A-Z]/.test(cleanWord));
            return isImportant ? <strong key={j} className="text-foreground font-bold">{word} </strong> : <span key={j}>{word} </span>;
          });
          return (
            <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
              <span className="text-amber-500 mt-0.5 text-[10px]">✦</span>
              <span>{formattedWords}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  const handleTranslate = async () => {
    if (!content.trim()) {
      toast({ title: "Empty content", description: "Nothing to translate", variant: "destructive" });
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch("http://localhost:8000/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content, 
          target_lang: LANGUAGES[selectedLanguage] || selectedLanguage 
        }),
      });
      
      if (!response.ok) throw new Error("Translation failed");
      
      const data = await response.json();
      setContent(data.translated);
      toast({ title: "Translated", description: `Note translated to ${LANGUAGES[selectedLanguage] || selectedLanguage}` });
    } catch (error) {
      console.error("Translate error:", error);
      toast({ title: "Error", description: "Failed to translate note. Make sure Python backend is running on port 8000", variant: "destructive" });
    } finally {
      setIsTranslating(false);
    }
  };

  const save = async () => {
    const tagArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (note) {
      await updateNote(note.id, { title, content, tags: tagArr, color, pinned });
    } else {
      await createNote(userId, { title, content, tags: tagArr, color, pinned });
    }
    onClose();
  };

  const remove = async () => { 
    if (note) { 
      await deleteNote(note.id); 
      onClose(); 
    } 
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-2xl p-6 w-full max-w-lg border border-border shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-foreground">{note ? "Edit Note" : "New Note"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          <textarea placeholder="Write your note..." value={content} onChange={(e) => setContent(e.target.value)} rows={5}
            className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none" />
          
          {/* Summarize & Translate Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleSummarize}
              disabled={isSummarizing || !isOnline}
              title={!isOnline ? "Need internet connection to access this feature" : undefined}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition disabled:opacity-50 text-xs font-medium border border-amber-500/30 disabled:cursor-not-allowed"
            >
              {isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Summarize
            </button>
            
            {undoContent && (
              <button
                onClick={() => {
                  setContent(undoContent);
                  setUndoContent(null);
                  toast({ title: "Restored", description: "Original content restored" });
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition text-xs font-medium border border-border"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Undo Summary
              </button>
            )}
            
            <div className="flex gap-1 items-center">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-2.5 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {Object.entries(LANGUAGES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
              <button
                onClick={handleTranslate}
                disabled={isTranslating || !isOnline}
                title={!isOnline ? "Need internet connection to access this feature" : undefined}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition disabled:opacity-50 text-xs font-medium border border-blue-500/30 disabled:cursor-not-allowed"
              >
                {isTranslating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                Translate
              </button>
            </div>
          </div>

          <input type="text" placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Color:</span>
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border-2 transition ${color === c ? "border-primary scale-110" : "border-border"} ${
                c === "default" ? "bg-card" : c === "rose" ? "bg-rose-200" : c === "amber" ? "bg-amber-200" : c === "emerald" ? "bg-emerald-200" : c === "sky" ? "bg-sky-200" : "bg-violet-200"
              }`} />
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-primary" />
            <span className="text-muted-foreground">Pin to top</span>
          </label>
        </div>
        <div className="flex items-center justify-between mt-6">
          {note ? (
            <button onClick={remove} className="text-destructive text-sm flex items-center gap-1 hover:underline"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
          ) : <div />}
          <button onClick={save} className="gradient-primary text-primary-foreground px-6 py-2 rounded-lg font-medium text-sm hover:opacity-90 transition">
            {note ? "Update" : "Create"}
          </button>
        </div>
        
        <AnimatePresence>
          {summaryData && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 rounded-2xl">
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-card rounded-2xl p-5 w-full max-w-sm border border-border shadow-xl relative max-h-[75vh] flex flex-col">
                <button onClick={() => setSummaryData(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1 bg-muted/50 rounded-full">
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-1.5 bg-amber-500/10 rounded-full text-amber-500">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground">AI Summary</h3>
                </div>
                <div className="flex gap-1.5 mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground border border-border/50">
                    Original: {summaryData.wordCount} words
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    summaryData.classification === 'long' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                    summaryData.classification === 'medium' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  }`}>
                    {summaryData.classification.charAt(0).toUpperCase() + summaryData.classification.slice(1)} Length
                  </span>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 -mx-1 px-1">
                  {formatSummaryBullets(summaryData.summary)}
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                  <button onClick={() => setSummaryData(null)} className="flex-1 px-3 py-2 rounded-lg bg-muted/50 text-foreground font-medium text-xs hover:bg-muted transition">
                    Discard
                  </button>
                  <button onClick={() => {
                    setUndoContent(content);
                    setContent(summaryData.summary);
                    setSummaryData(null);
                  }} className="flex-1 bg-amber-500/10 text-amber-600 border border-amber-500/30 px-3 py-2 rounded-lg font-medium text-xs hover:bg-amber-500/20 transition">
                    Replace Content
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
