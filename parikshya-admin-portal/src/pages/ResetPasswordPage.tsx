import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Shield, KeyRound, Lock, Eye, EyeOff, AlertCircle, Check, X } from "lucide-react";
import api from "../services/api";

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const otp = searchParams.get("otp") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!email || !otp) {
      navigate("/forgot-password", { replace: true });
    }
  }, [email, otp, navigate]);

  // Client-side password rules validation
  const rules = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    match: newPassword !== "" && newPassword === confirmPassword,
  };

  const isPasswordValid = rules.length && rules.uppercase && rules.lowercase && rules.number;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (!isPasswordValid) {
      setError("Please satisfy all password security criteria.");
      return;
    }

    if (!rules.match) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/auth/reset-password", {
        email,
        otp,
        newPassword
      });

      if (response.data.success) {
        setSuccess(response.data.message || "Password reset successful! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(response.data.message || "Failed to reset password.");
      }
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(
        err.response?.data?.message || "An error occurred during password reset."
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

      <div className="w-full max-w-[420px] bg-slate-950/40 border border-white/10 backdrop-blur-2xl rounded-[32px] p-8 md:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative z-10 animate-fade-in hover:border-white/15 transition-all duration-500 font-body">
        
        {/* Shield Icon Container */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] mb-4 relative">
            <Shield className="w-7 h-7 text-[#4B52DC] filter drop-shadow-[0_0_8px_rgba(75,82,220,0.5)]" />
          </div>
          <h1 className="font-title font-black text-2xl text-white tracking-tight text-center">New Password</h1>
          <p className="text-slate-400 text-[10px] mt-1 font-extrabold tracking-widest uppercase text-center leading-normal">
            Reset password for <span className="text-indigo-400 font-bold font-mono break-all">{email}</span>
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
          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 block">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password*"
                className="w-full pr-12 pl-4 py-3 rounded-2xl bg-[#090d16]/30 border border-white/5 focus:border-[#4B52DC]/80 focus:ring-1 focus:ring-[#4B52DC]/20 text-white placeholder-slate-550 outline-none transition-all duration-300 text-xs font-semibold"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-350 transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 block">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password*"
                className="w-full pr-12 pl-4 py-3 rounded-2xl bg-[#090d16]/30 border border-white/5 focus:border-[#4B52DC]/80 focus:ring-1 focus:ring-[#4B52DC]/20 text-white placeholder-slate-550 outline-none transition-all duration-300 text-xs font-semibold"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-350 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Pass Criteria Info Boxes */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Security Requirements</h4>
            <div className="grid grid-cols-1 gap-y-1.5 text-[11px]">
              <div className={`flex items-center gap-1.5 ${rules.length ? "text-emerald-400" : "text-slate-500"}`}>
                {rules.length ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${rules.uppercase ? "text-emerald-400" : "text-slate-500"}`}>
                {rules.uppercase ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                <span>One uppercase letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${rules.lowercase ? "text-emerald-400" : "text-slate-500"}`}>
                {rules.lowercase ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                <span>One lowercase letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${rules.number ? "text-emerald-400" : "text-slate-500"}`}>
                {rules.number ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                <span>One number</span>
              </div>
              <div className={`flex items-center gap-1.5 border-t border-white/5 pt-1.5 ${rules.match ? "text-emerald-400" : "text-slate-500"}`}>
                {rules.match ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                <span>Passwords match</span>
              </div>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !isPasswordValid || !rules.match}
            className="w-full py-4 bg-gradient-to-r from-[#3B82F6] via-[#4B52DC] to-[#A855F7] hover:brightness-110 text-white font-extrabold rounded-full shadow-lg shadow-indigo-650/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-4 text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Resetting...</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
