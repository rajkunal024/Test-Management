import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { changePassword } from "../../services/api";
import { PasswordInput } from "../ui/PasswordInput";
import { Button } from "../ui/Button";
import { ShieldAlert, KeyRound } from "lucide-react";

export const ProtectedRoute = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const location = useLocation();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Intercept if user requires a first-time password update
  if (user?.requiresPasswordChange) {
    const handleForcePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSuccess("");

      if (!oldPassword || !newPassword || !confirmPassword) {
        setError("All fields are required.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match.");
        return;
      }
      if (newPassword.length < 4) {
        setError("New password must be at least 4 characters long.");
        return;
      }
      if (newPassword === "abc123") {
        setError("New password cannot be the default password.");
        return;
      }

      setLoading(true);
      try {
        const response = await changePassword({ oldPassword, newPassword });
        if (response.success) {
          setSuccess("Password updated successfully! Unlocking portal...");
          
          // Sync state with local store to set requiresPasswordChange = false
          const updatedUser = { ...user, requiresPasswordChange: false };
          setAuth({ token, user: updatedUser });
        } else {
          setError(response.message || "Failed to update password.");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Error updating password.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-slate-100 p-4">
        {/* Glow backdrop bubbles */}
        <div className="absolute top-[20%] left-[10%] h-[350px] w-[350px] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[20%] right-[10%] h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/80 backdrop-blur-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />
          
          <div className="flex flex-col items-center text-center mb-6 relative z-10">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4 animate-pulse">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">
              Security Activation Required
            </h1>
            <p className="mt-2 text-xs text-slate-400 font-semibold leading-relaxed">
              Hello, <span className="text-indigo-400 font-bold">{user.name}</span>. You are logged in with a default password. Please update your password to unlock the portal features.
            </p>
          </div>

          <form onSubmit={handleForcePasswordChange} className="space-y-4 relative z-10">
            <PasswordInput
              label="Default Password (abc123)"
              placeholder="Enter current default password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
            <PasswordInput
              label="New Secure Password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordInput
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 text-xs font-semibold text-rose-400">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs font-semibold text-emerald-400 animate-pulse">
                {success}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                "Activating Account..."
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Save & Unlock Portal
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
