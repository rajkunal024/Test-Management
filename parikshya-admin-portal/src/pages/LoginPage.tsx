import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import api from "../services/api";
import { Shield, Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      const from = (location.state as any)?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [token, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.data.success && response.data.data.token) {
        setAuth(response.data.data.token, rememberMe);
        const from = (location.state as any)?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });
      } else {
        setError(response.data.message || "Login failed. Please check your credentials.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.message ||
          "Could not connect to the authentication server. Please ensure the backend is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#03050C] text-slate-100 font-body relative overflow-hidden">
      {/* Deep Space Glowing Blobs */}
      <div className="absolute top-[20%] left-[-10%] w-[60vw] h-[60vw] max-w-[700px] rounded-full bg-indigo-900/10 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[65vw] h-[65vw] max-w-[800px] rounded-full bg-blue-950/20 blur-[150px] pointer-events-none z-0" />
      
      {/* Sweeping Orbit Line 1 (Mockup curves) */}
      <div className="absolute -top-[10%] -left-[10%] w-[90vw] h-[90vw] max-w-[1100px] rounded-full border-l-[3px] border-t-[3px] border-indigo-500/15 rotate-[15deg] pointer-events-none z-0 shadow-[0_0_80px_rgba(99,102,241,0.15)]" />
      {/* Sweeping Orbit Line 2 */}
      <div className="absolute -top-[5%] -left-[5%] w-[80vw] h-[80vw] max-w-[950px] rounded-full border-l-[1.5px] border-t-[1.5px] border-blue-500/10 rotate-[25deg] pointer-events-none z-0 shadow-[0_0_60px_rgba(59,130,246,0.1)]" />
      {/* Sweeping Orbit Line 3 */}
      <div className="absolute bottom-[-30%] right-[-20%] w-[70vw] h-[70vw] max-w-[850px] rounded-full border-r-[2px] border-b-[2px] border-purple-500/10 -rotate-[45deg] pointer-events-none z-0 shadow-[0_0_50px_rgba(168,85,247,0.1)]" />

      {/* Additional overlay grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0e17_1px,transparent_1px),linear-gradient(to_bottom,#0c0e17_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-30" />

      <div className="w-full max-w-[420px] bg-slate-950/40 border border-white/10 backdrop-blur-2xl rounded-[32px] p-8 md:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative z-10 animate-fade-in hover:border-white/15 transition-all duration-500">
        {/* Shield Icon Container */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] mb-5 relative group">
            <Shield className="w-7 h-7 text-[#4B52DC] filter drop-shadow-[0_0_8px_rgba(75,82,220,0.5)]" />
          </div>
          <h1 className="font-title font-black text-2xl text-white tracking-tight text-center">Parikshya Admin</h1>
          <p className="text-slate-400 text-[10px] mt-1 font-extrabold tracking-widest uppercase">Workspace Management</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/20 border border-red-900/40 text-red-200 text-xs flex items-start gap-3 shadow-md shadow-red-950/10">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div className="space-y-1">
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Parikshya Admin Email*"
                className="w-full pr-12 pl-5 py-4 rounded-2xl bg-[#090d16]/30 border border-white/5 focus:border-[#4B52DC]/80 focus:ring-1 focus:ring-[#4B52DC]/20 text-white placeholder-slate-500 outline-none transition-all duration-300 text-xs font-semibold shadow-inner"
              />
              <span className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-500 pointer-events-none">
                <Mail className="w-5 h-5 text-slate-450" />
              </span>
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password*"
                className="w-full pr-12 pl-5 py-4 rounded-2xl bg-[#090d16]/30 border border-white/5 focus:border-[#4B52DC]/80 focus:ring-1 focus:ring-[#4B52DC]/20 text-white placeholder-slate-500 outline-none transition-all duration-300 text-xs font-semibold shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5 text-slate-450" /> : <Eye className="w-5 h-5 text-slate-450" />}
              </button>
            </div>
          </div>

          {/* Remember Session / Forgot password row */}
          <div className="flex justify-between items-center text-xs px-1">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4.5 h-4.5 rounded-md border-white/10 bg-[#090d16]/50 text-[#4B52DC] focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer"
              />
              <span className="text-slate-300 group-hover:text-slate-200 transition-colors font-bold">Remember Session</span>
            </label>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-[#4B52DC] hover:text-indigo-400 font-bold transition-colors cursor-pointer text-xs"
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-[#3B82F6] via-[#4B52DC] to-[#A855F7] hover:brightness-110 text-white font-extrabold rounded-full shadow-lg shadow-indigo-650/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-4 text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Authorizing Portal...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-white" />
                <span>Secure Authorize</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
