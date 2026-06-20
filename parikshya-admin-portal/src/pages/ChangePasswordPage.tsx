import React, { useState } from "react";
import { KeyRound, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";
import api from "../services/api";

export const ChangePasswordPage: React.FC = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation checks
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    // Password strength check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError(
        "New password must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, and one number."
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/change-password", {
        oldPassword,
        newPassword,
        confirmPassword,
      });

      if (response.data.success) {
        setSuccess(response.data.message || "Password updated successfully!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(response.data.message || "Failed to update password.");
      }
    } catch (err: any) {
      console.error("Password change error:", err);
      setError(
        err.response?.data?.message || "An error occurred while changing password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in text-slate-700 dark:text-slate-350">
      {/* Page Header */}
      <div>
        <h1 className="font-title font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-[#4B52DC] dark:text-[#818cf8]" />
          Change Password
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
          Update the security credentials for your Parikshya Admin account.
        </p>
      </div>

      {/* Main Card */}
      <div className="p-6 md:p-8 bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-3xl shadow-md space-y-6 backdrop-blur-md relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-indigo-500/5 blur-xl pointer-events-none" />

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/20 border border-red-900/40 text-red-200 text-xs flex items-start gap-3 shadow-md">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-200 text-xs flex items-start gap-3 shadow-md">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Old Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-500" /> Current Password
            </label>
            <div className="relative">
              <input
                type={showOldPassword ? "text" : "password"}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password*"
                className="w-full pr-12 pl-4 py-3 rounded-2xl bg-[#090d16]/30 dark:bg-[#090d16]/30 border border-slate-200 dark:border-white/5 focus:border-[#4B52DC]/80 focus:ring-1 focus:ring-[#4B52DC]/20 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-300 text-xs font-semibold"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-500" /> New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password*"
                className="w-full pr-12 pl-4 py-3 rounded-2xl bg-[#090d16]/30 dark:bg-[#090d16]/30 border border-slate-200 dark:border-white/5 focus:border-[#4B52DC]/80 focus:ring-1 focus:ring-[#4B52DC]/20 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-300 text-xs font-semibold"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Re-enter New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password*"
                className="w-full pr-12 pl-4 py-3 rounded-2xl bg-[#090d16]/30 dark:bg-[#090d16]/30 border border-slate-200 dark:border-white/5 focus:border-[#4B52DC]/80 focus:ring-1 focus:ring-[#4B52DC]/20 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-300 text-xs font-semibold"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#3B82F6] via-[#4B52DC] to-[#A855F7] hover:brightness-110 text-white font-extrabold rounded-full shadow-lg shadow-indigo-650/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-6 text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-white" />
                <span>Save Credentials</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
