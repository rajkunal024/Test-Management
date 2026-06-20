import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Shield, KeyRound, ArrowLeft, AlertCircle } from "lucide-react";
import api from "../services/api";

export const VerifyOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!emailParam) {
      navigate("/forgot-password", { replace: true });
    }
  }, [emailParam, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!otp.trim()) {
      setError("Verification code is required.");
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("OTP must be exactly 6 digits.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/auth/verify-otp", {
        email: emailParam,
        otp: otp.trim()
      });

      if (response.data.success) {
        setSuccess(response.data.message || "OTP verified! Preparing reset terminal...");
        setTimeout(() => {
          navigate(
            `/reset-password?email=${encodeURIComponent(emailParam)}&otp=${encodeURIComponent(otp.trim())}`
          );
        }, 1500);
      } else {
        setError(response.data.message || "Failed to verify code.");
      }
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setError(
        err.response?.data?.message || "Invalid or expired verification code."
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

      {/* Sweeping Orbit Lines */}
      <div className="absolute -top-[10%] -left-[10%] w-[90vw] h-[90vw] max-w-[1100px] rounded-full border-l-[3px] border-t-[3px] border-indigo-500/15 rotate-[15deg] pointer-events-none z-0 shadow-[0_0_80px_rgba(99,102,241,0.15)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0e17_1px,transparent_1px),linear-gradient(to_bottom,#0c0e17_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-30" />

      <div className="w-full max-w-[420px] bg-slate-950/40 border border-white/10 backdrop-blur-2xl rounded-[32px] p-8 md:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative z-10 animate-fade-in hover:border-white/15 transition-all duration-500">
        
        {/* Back Link */}
        <Link 
          to="/forgot-password" 
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold mb-6 group transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
          Change Email
        </Link>

        {/* Shield Icon Container */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] mb-4 relative">
            <Shield className="w-7 h-7 text-[#4B52DC] filter drop-shadow-[0_0_8px_rgba(75,82,220,0.5)]" />
          </div>
          <h1 className="font-title font-black text-2xl text-white tracking-tight text-center">Enter OTP</h1>
          <p className="text-slate-400 text-[10px] mt-1 font-extrabold tracking-widest uppercase text-center leading-normal">
            A verification code was sent to <span className="text-indigo-400 font-bold font-mono break-all">{emailParam}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/20 border border-red-900/40 text-red-200 text-xs flex items-start gap-3 shadow-md">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-200 text-xs flex items-start gap-3 shadow-md">
            <AlertCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* OTP Code */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 mb-1.5 block">
              6-Digit Verification Code
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 123456"
                className="w-full py-4 rounded-2xl bg-[#090d16]/30 border border-white/5 focus:border-[#4B52DC]/80 focus:ring-1 focus:ring-[#4B52DC]/20 text-white placeholder-slate-550 outline-none transition-all duration-300 font-extrabold text-center tracking-[0.5em] text-lg shadow-inner"
              />
              <span className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-500 pointer-events-none">
                <KeyRound className="w-5 h-5" />
              </span>
            </div>
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
                <span>Verifying OTP...</span>
              </>
            ) : (
              <span>Verify Code</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
