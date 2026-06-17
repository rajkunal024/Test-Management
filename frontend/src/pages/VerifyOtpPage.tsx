import { FormEvent, useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { verifyOtp, getErrorMessage } from "../services/api";
import { Logo } from "../components/layout/Logo";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ArrowLeft, Sparkles, KeyRound } from "lucide-react";

export const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!emailParam) {
      navigate("/forgot-password", { replace: true });
    } else {
      setEmail(emailParam);
    }
  }, [emailParam, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!otp.trim()) {
      setError("OTP code is required.");
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("OTP must be exactly 6 digits.");
      return;
    }

    setLoading(true);
    try {
      const response = await verifyOtp(email, otp.trim());
      setSuccess(response.message || "OTP verified! Loading reset terminal...");
      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp.trim())}`);
      }, 1500);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#fafbfc] dark:bg-[#07090f] lg:grid-cols-[46%_54%] transition-colors duration-300 relative overflow-hidden font-outfit">
      {/* Decorative Grid overlays */}
      <div className="absolute inset-0 grid-cyber opacity-20 pointer-events-none z-0" />

      {/* Left Column: Premium Intro Panel */}
      <section className="hidden lg:flex flex-col justify-between p-16 bg-[#05060f] border-r border-slate-200/10 relative transition-colors duration-300 overflow-hidden min-h-screen">
        <div className="absolute top-[15%] left-[-10%] w-[350px] h-[350px] rounded-full blur-[120px] bg-indigo-500/20 pointer-events-none opacity-30 z-0" />
        
        {/* Logo & Tagline */}
        <div className="relative z-10 flex items-center gap-3 self-start">
          <div className="flex items-center gap-1.5">
            <span className="relative h-7 w-8 flex-shrink-0">
              <span className="absolute left-0 top-1 h-4 w-4 rounded-sm border-2 border-indigo-400/80 bg-indigo-500/20" />
              <span className="absolute left-2 top-0 h-2 w-7 rounded-full border-t-2 border-slate-350" />
              <span className="absolute left-4 top-1 h-3 w-9 rounded-full border-t-2 border-slate-350" />
              <span className="absolute left-1.5 top-2.5 h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            <span className="text-2xl font-extrabold leading-none tracking-normal text-white font-outfit">Parikshya</span>
          </div>
          <span className="h-4 w-px bg-white/20" />
          <span className="text-[10px] font-black tracking-widest text-slate-500/80 uppercase font-mono mt-0.5">Verification terminal</span>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-start text-left my-auto max-w-md space-y-6">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-300">
            <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
            Verify Code
          </div>
          <h1 className="text-[38px] lg:text-[42px] font-extrabold tracking-tight text-white leading-[1.12] font-outfit">
            Check <br />
            your <span className="bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent filter drop-shadow-[0_0_15px_rgba(6,182,212,0.35)] font-extrabold">terminal.</span>
          </h1>
          <div className="w-12 h-1 rounded-full bg-indigo-500" />
          <p className="text-sm text-slate-400 font-jakarta leading-relaxed font-medium">
            Enter the 6-digit verification code printed in your server logs terminal window.
          </p>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0 h-48 overflow-hidden pointer-events-none z-10 opacity-75">
          <svg className="w-full h-full" viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,120 C240,180 480,60 720,120 C960,180 1200,60 1440,120 L1440,200 L0,200 Z" fill="url(#wave-gradient-Student)" className="animate-[pulse_5s_ease-in-out_infinite]" />
            <path d="M0,140 C360,60 720,180 1080,100 C1260,60 1350,140 1440,120" stroke="url(#line-gradient-Student)" strokeWidth="2" className="opacity-45" />
            <defs>
              <linearGradient id="wave-gradient-Student" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.22" />
              </linearGradient>
              <linearGradient id="line-gradient-Student" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.75" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </section>

      {/* Right Column: OTP Form */}
      <section className="flex items-center justify-center p-6 border-l-4 border-indigo-500 dark:border-indigo-650 transition-colors duration-300 relative z-10 min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[#fafbfc]/85 dark:bg-[#07090f]/90 pointer-events-none backdrop-blur-[1.5px]" />

        <form 
          onSubmit={handleSubmit}
          className="relative w-full max-w-[500px] flex flex-col justify-center bg-white/90 dark:bg-[#0c1322]/80 border border-indigo-100/60 dark:border-indigo-950/40 rounded-3xl p-8 md:p-12 shadow-xl hover:shadow-[0_0_35px_rgba(99,102,241,0.12)] transition-all duration-500 overflow-hidden backdrop-blur-md z-10"
        >
          <div className="absolute top-[-25%] right-[-15%] w-44 h-44 bg-indigo-500/[0.02] rounded-full blur-3xl pointer-events-none" />

          {/* Go Back Link */}
          <Link 
            to="/forgot-password" 
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold mb-8 group self-start transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Change Email
          </Link>

          {/* Header section */}
          <div className="mb-6 flex items-center justify-between">
            <Logo />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black tracking-wider uppercase text-indigo-600 bg-indigo-550/10 border-indigo-550/20 dark:text-indigo-400 dark:bg-indigo-500/10 dark:border-indigo-500/20 font-mono">
              <KeyRound className="h-3.5 w-3.5" />
              OTP Verification
            </span>
          </div>

          <h1 className="mb-2 text-2xl font-black text-slate-900 dark:text-white leading-tight font-outfit">
            Enter OTP
          </h1>
          <p className="mb-8 text-xs text-slate-500 dark:text-slate-400 font-medium">
            A secure 6-digit OTP code has been generated for <span className="font-extrabold text-slate-700 dark:text-slate-200 font-mono">{email}</span>. Please insert it below.
          </p>
          
          {/* Inputs Section */}
          <div className="space-y-4">
            <Input 
              label="Email Address" 
              type="email"
              value={email} 
              disabled
              className="bg-slate-50 dark:bg-slate-950/40 text-slate-450 border-slate-200 cursor-not-allowed"
            />
            <Input 
              label="OTP Verification Code" 
              type="text"
              placeholder="e.g. 123456" 
              maxLength={6}
              className="focus:border-indigo-500 focus:ring-indigo-100/50 focus:ring-3 text-center tracking-[0.5em] text-lg font-black" 
              value={otp} 
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} 
              disabled={loading}
            />
          </div>

          {/* Alert logs */}
          {success && (
            <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono animate-pulse">
              {success}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
              {error}
            </p>
          )}
          
          {/* Submit button */}
          <Button 
            type="submit"
            className="mt-8 w-full py-6 rounded-xl font-bold text-xs uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 focus:border-indigo-500 focus:ring-indigo-100/50 shadow-md shadow-indigo-500/10 transition-all duration-300 transform active:scale-98 text-white border-none" 
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify OTP Code"}
          </Button>

        </form>
      </section>
    </main>
  );
};
