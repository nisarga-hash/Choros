import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { getCurrentUser, login as storeLogin, signup as storeSignup, logout as storeLogout, updateProfile, type User } from "@/lib/store";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  update: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // We initialize synchronously from localStorage cache in store.ts
  const [user, setUser] = useState<User | null>(getCurrentUser);

  const login = useCallback(async (email: string, password: string) => {
    const u = await storeLogin(email, password);
    if (u) { setUser(u); return true; }
    return false;
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const u = await storeSignup(email, password, name);
    if (u) { setUser(u); return true; }
    return false;
  }, []);

  const logout = useCallback(() => { storeLogout(); setUser(null); }, []);

  const update = useCallback(async (data: Partial<User>) => {
    const u = await updateProfile(data);
    if (u) setUser(u);
  }, []);

  return <AuthContext.Provider value={{ user, login, signup, logout, update }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
