import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, User, ArrowRight, Sparkles, Eye, EyeOff, ShieldCheck, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { signupRequestOtp, signupVerifyOtp } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 60;

export default function AuthPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_COUNTDOWN);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(countdownRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const otp = otpDigits.join("");

  const maskEmail = (e: string) => {
    const [local, domain] = e.split("@");
    if (!domain) return e;
    return `${local[0]}***@${domain}`;
  };

  // Validation helpers
  const validateEmail = (email: string): { valid: boolean; message: string } => {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!pattern.test(email)) {
      return { valid: false, message: "Invalid email format" };
    }
    return { valid: true, message: "" };
  };

  const validatePassword = (pwd: string): { valid: boolean; message: string } => {
    if (pwd.length < 8) {
      return { valid: false, message: "Password must be at least 8 characters" };
    }
    if (!/[a-z]/.test(pwd)) {
      return { valid: false, message: "Password must contain at least one lowercase letter" };
    }
    if (!/[A-Z]/.test(pwd)) {
      return { valid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (!/\d/.test(pwd)) {
      return { valid: false, message: "Password must contain at least one number" };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return { valid: false, message: "Password must contain at least one special character" };
    }
    return { valid: true, message: "" };
  };

  const validateUsername = (username: string): { valid: boolean; message: string } => {
    if (!username.trim()) {
      return { valid: false, message: "Username is required" };
    }
    if (username.length < 3 || username.length > 20) {
      return { valid: false, message: "Username must be 3-20 characters" };
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(username)) {
      return { valid: false, message: "Username can only contain letters, numbers, underscores, and hyphens" };
    }
    return { valid: true, message: "" };
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.message);
      return;
    }

    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    
    if (!success) {
      setError("Invalid email or password");
    }
  };

  const handleSignupStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate all fields
    const usernameValidation = validateUsername(name);
    if (!usernameValidation.valid) {
      setError(usernameValidation.message);
      return;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.message);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      return;
    }

    // Request OTP
    setLoading(true);
    const result = await signupRequestOtp(email);
    setLoading(false);

    if (result.success) {
      setSignupStep(2);
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      startCountdown();
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${email}`,
      });
    } else {
      setError(result.error || "Failed to send OTP. Please try again.");
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError("");
    const result = await signupRequestOtp(email);
    setResending(false);
    if (result.success) {
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      startCountdown();
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
      toast({ title: "OTP Resent", description: `New code sent to ${email}` });
    } else {
      setError(result.error || "Failed to resend OTP");
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otp.length < OTP_LENGTH) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setLoading(true);
    const result = await signupVerifyOtp(email, otp, password, name);

    if (result.success) {
      toast({
        title: "Account Created!",
        description: "Welcome to Choros. Redirecting to dashboard...",
      });
      // Update AuthContext state so AppRoutes re-renders and navigates to dashboard
      await login(email, password);
    } else {
      setLoading(false);
      setError(result.error || "Invalid OTP or failed to create account");
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (otpDigits[index]) {
        const next = [...otpDigits];
        next[index] = "";
        setOtpDigits(next);
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((c, i) => { next[i] = c; });
    setOtpDigits(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[focusIdx]?.focus();
  };

  const handleSwitchMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setError("");
    setEmail("");
    setPassword("");
    setName("");
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    setSignupStep(1);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
          </motion.div>
          <h1 className="text-4xl font-display font-bold text-primary-foreground">Choros</h1>
          <p className="text-primary-foreground/60 mt-1">Your AI-powered productivity companion</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-elegant p-8 border border-border/50">
          {/* Tab buttons - only show in normal mode, not during signup OTP */}
          {!(!isLogin && signupStep === 2) && (
            <div className="flex mb-6 bg-muted rounded-lg p-1">
              {["Login", "Sign Up"].map((label, i) => (
                <button
                  key={label}
                  onClick={() => handleSwitchMode(i === 0)}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                    (i === 0 ? isLogin : !isLogin) ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* LOGIN FORM */}
            {isLogin && (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLoginSubmit}
                className="space-y-4"
              >
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-3 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {error && <p className="text-destructive text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition shadow-glow disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </motion.form>
            )}

            {/* SIGNUP FORM - STEP 1 */}
            {!isLogin && signupStep === 1 && (
              <motion.form
                key="signup-step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSignupStart}
                className="space-y-4"
              >
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Full name (3-20 characters)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password (min 8 chars, uppercase, lowercase, number, special char)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-3 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {error && <p className="text-destructive text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition shadow-glow disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </motion.form>
            )}

            {/* SIGNUP FORM - STEP 2: OTP VERIFICATION */}
            {!isLogin && signupStep === 2 && (
              <motion.form
                key="signup-step2"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleOtpSubmit}
                className="space-y-6"
              >
                {/* Header */}
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="relative w-16 h-16 mx-auto mb-4"
                  >
                    <div className="absolute inset-0 rounded-full gradient-primary opacity-20 blur-md" />
                    <div className="relative w-16 h-16 rounded-full gradient-primary flex items-center justify-center shadow-glow">
                      <ShieldCheck className="w-8 h-8 text-primary-foreground" />
                    </div>
                  </motion.div>
                  <h3 className="text-xl font-bold text-foreground">Verify Your Email</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    We sent a 6-digit code to<br />
                    <span className="font-semibold text-primary">{maskEmail(email)}</span>
                  </p>
                </div>

                {/* OTP Digit Boxes */}
                <div className="flex items-center justify-center gap-2.5" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <input
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`w-11 h-14 rounded-xl border-2 bg-muted/60 text-center text-xl font-bold font-mono text-foreground
                          transition-all duration-200 outline-none select-none caret-transparent
                          ${
                            digit
                              ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] bg-primary/5 text-primary"
                              : "border-border hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                          }`
                        }
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                      <p className="text-destructive text-sm">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || otp.length < OTP_LENGTH}
                  className="w-full py-3.5 rounded-xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                  ) : (
                    <><ShieldCheck className="w-4 h-4" /> Create Account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                {/* Resend + Back row */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => { setSignupStep(1); if (countdownRef.current) clearInterval(countdownRef.current); setCountdown(0); setOtpDigits(Array(OTP_LENGTH).fill("")); }}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || resending}
                    className="flex items-center gap-1.5 text-sm font-medium transition
                      disabled:opacity-40 disabled:cursor-not-allowed
                      text-primary hover:text-primary/80"
                  >
                    {resending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
