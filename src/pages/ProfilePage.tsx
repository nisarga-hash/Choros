import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, FileText, Save, Image as ImageIcon, Trash2 } from "lucide-react";

export default function ProfilePage() {
  const { user, update } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [gender, setGender] = useState<"male" | "female" | "other" | "unspecified">(user?.gender || "unspecified");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    await update({ name, bio, gender, avatar });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getAvatarUrl = () => {
    if (avatar) return avatar;
    const safeName = encodeURIComponent(name || "User");
    if (gender === "male") return `https://avatar.iran.liara.run/public/boy?username=${safeName}`;
    if (gender === "female") return `https://avatar.iran.liara.run/public/girl?username=${safeName}`;
    return `https://ui-avatars.com/api/?name=${safeName}&background=random`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-display font-bold text-foreground mb-6">Profile</h1>

      <div className="bg-card rounded-2xl p-8 border border-border/50 shadow-elegant">
        {/* Avatar */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-muted flex items-center justify-center border-4 border-background shadow-lg">
              <img src={getAvatarUrl()} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity rounded-2xl cursor-pointer"
            >
              <ImageIcon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">Upload</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </div>
          
          <div className="flex-1 text-center sm:text-left pt-2">
            <h2 className="text-xl font-semibold text-foreground">{name || "Your Name"}</h2>
            <p className="text-sm text-muted-foreground mb-2">{user?.email}</p>
            <p className="text-xs text-muted-foreground mb-3">Member since {new Date(user?.createdAt || "").toLocaleDateString()}</p>
            {avatar && (
              <button 
                onClick={() => setAvatar("")}
                className="text-xs text-destructive hover:underline flex items-center gap-1 justify-center sm:justify-start"
              >
                <Trash2 className="w-3 h-3" /> Remove custom photo
              </button>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
              <User className="w-4 h-4 text-primary" /> Display Name
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
              <User className="w-4 h-4 text-primary" /> Gender (for avatar generation)
            </label>
            <select value={gender} onChange={(e) => setGender(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
              <option value="unspecified">Unspecified / Use Default</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
              <Mail className="w-4 h-4 text-primary" /> Email
            </label>
            <input type="email" value={user?.email || ""} disabled
              className="w-full px-4 py-2.5 rounded-lg bg-muted/30 border border-border text-muted-foreground text-sm cursor-not-allowed" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
              <FileText className="w-4 h-4 text-primary" /> Bio
            </label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell us about yourself..."
              className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none" />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button onClick={handleSave} className="gradient-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition text-sm">
            <Save className="w-4 h-4" /> Save Changes
          </button>
          {saved && <span className="text-green-600 text-sm animate-fade-in">Saved!</span>}
        </div>
      </div>
    </motion.div>
  );
}
