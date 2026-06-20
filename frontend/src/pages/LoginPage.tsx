import { FormEvent, useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getErrorMessage, signupAdmin } from "../services/api";
import { useLogin } from "../hooks/useAuth";
import { Logo } from "../components/layout/Logo";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PasswordInput } from "../components/ui/PasswordInput";
import { 
  GraduationCap, 
  BookOpen, 
  ShieldCheck, 
  ArrowLeft,
  Sparkles
} from "lucide-react";

import teacherIllus from "../assets/teacher_illus.png";
import adminIllus from "../assets/admin_illus.png";

export const LoginPage = () => {
  const { role: urlRole } = useParams<{ role?: string }>();
  const navigate = useNavigate();
  const loginMutation = useLogin();

  const getMappedRole = (r?: string): "Admin" | "Teacher" | "Student" | null => {
    if (!r) return null;
    const lower = r.toLowerCase();
    if (lower === "admin") return "Admin";
    if (lower === "teacher") return "Teacher";
    if (lower === "student") return "Student";
    return null;
  };

  const initialRole = getMappedRole(urlRole);

  useEffect(() => {
    if (!initialRole) {
      navigate("/", { replace: true });
    }
  }, [initialRole, navigate]);

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Admin" | "Teacher" | "Student">(initialRole || "Student");
  const [error, setError] = useState("");

  useEffect(() => {
    const mapped = getMappedRole(urlRole);
    if (mapped) {
      setRole(mapped);
    }
  }, [urlRole]);

  // Admin Signup states
  const [isSignUp, setIsSignUp] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (isSignUp) {
      if (!userId.trim() || !password.trim() || !adminName.trim() || !adminKey.trim()) {
        setError("All fields are required.");
        return;
      }
      try {
        await signupAdmin({ userId, password, name: adminName, signupKey: adminKey });
        setSuccessMessage("Admin registered successfully! You can now log in.");
        setIsSignUp(false);
        setAdminName("");
        setAdminKey("");
      } catch (err) {
        setError(getErrorMessage(err));
      }
    } else {
      if (!userId.trim() || !password.trim()) {
        setError("User ID and password are required.");
        return;
      }
      try {
        await loginMutation.mutateAsync({ userId, password, role });
        navigate("/dashboard");
      } catch (err) {
        setError(getErrorMessage(err));
      }
    }
  };

  // ----------------------------------------------------
  // LAYOUT 1: Student Login (Centered Glassmorphism)
  // ----------------------------------------------------
  if (role === "Student") {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-950 p-6 font-outfit overflow-hidden">
        {/* Floating background glowing circles */}
        <div className="absolute top-[10%] left-[20%] w-72 h-72 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[10%] right-[20%] w-80 h-80 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-pulse" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 grid-cyber opacity-15 pointer-events-none" />

        <div className="relative w-full max-w-[460px] z-10">
          <form 
            onSubmit={submit}
            className="w-full bg-white/10 dark:bg-slate-900/30 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl transition-all duration-300 hover:shadow-indigo-500/10 text-white"
          >
            {/* Back to Home Link */}
            <Link 
              to="/" 
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold mb-6 group transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              Back to Home
            </Link>

            {/* Avatar Welcome graphic */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 text-3xl shadow-lg border-2 border-white/20 mb-3">
                🎓
              </div>
              <Logo />
              <span className="text-[10px] font-black tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-0.5 mt-2 uppercase font-mono">
                Student Portal
              </span>
            </div>

            <h1 className="mb-6 text-xl font-black text-center text-white font-outfit">
              Secure Assessment Node
            </h1>

            {/* Inputs */}
            <div className="space-y-4">
              <Input 
                label="Student User ID" 
                placeholder="Enter Student ID" 
                className="bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-cyan-500/20 focus:ring-3" 
                value={userId} 
                onChange={(event) => setUserId(event.target.value)} 
              />
              <PasswordInput
                label="Secret Password"
                placeholder="Enter Password"
                className="bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-cyan-500/20 focus:ring-3"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {/* Links */}
            <div className="mt-4 flex justify-between items-center text-xs">
              <Link 
                to="/forgot-password?role=student"
                className="text-cyan-400 hover:underline font-bold transition-colors cursor-pointer"
              >
                Forgot password?
              </Link>
            </div>

            {/* Alert logs */}
            {error && (
              <p className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-bold text-rose-400 font-mono text-center">
                {error}
              </p>
            )}

            {/* Submit button */}
            <Button 
              className="mt-6 w-full py-6 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-indigo-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-white border-none shadow-lg shadow-indigo-500/20"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Connecting Node..." : "Authenticate entrance"}
            </Button>
          </form>
        </div>
      </main>
    );
  }

  // ----------------------------------------------------
  // LAYOUT 2: Teacher Login (Details Left, Form on Right)
  // ----------------------------------------------------
  if (role === "Teacher") {
    return (
      <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[46%_54%] bg-slate-50 dark:bg-[#07040d] font-outfit relative overflow-hidden">
        {/* Left Column: Purple Info Panel */}
        <section className="hidden lg:flex flex-col justify-between p-16 bg-[#07040d] border-r border-slate-200/10 relative transition-colors duration-300 overflow-hidden min-h-screen">
          <div className="absolute top-[15%] right-[-10%] w-[350px] h-[350px] rounded-full blur-[120px] bg-purple-500/20 pointer-events-none opacity-30 z-0" />
          
          <div className="relative z-10 flex items-center gap-3 self-start">
            <span className="text-2xl font-extrabold leading-none tracking-normal text-white font-outfit">Parikshya</span>
            <span className="h-4 w-px bg-white/20" />
            <span className="text-[10px] font-black tracking-widest text-slate-500/80 uppercase font-mono mt-0.5">Authoring Centre</span>
          </div>

          <div className="relative z-10 flex flex-col items-start text-left my-auto max-w-md space-y-6">
            <h1 className="text-[38px] lg:text-[42px] font-extrabold tracking-tight text-white leading-[1.12] font-outfit">
              Build tests <br />
              that <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent filter drop-shadow-[0_0_15px_rgba(168,85,247,0.35)] font-extrabold">measure capability.</span>
            </h1>
            <div className="w-12 h-1 rounded-full bg-purple-500" />
            <p className="text-sm text-slate-400 font-jakarta leading-relaxed font-medium">
              Structure passages, define scoring criteria, and analyze student performances dynamically.
            </p>
          </div>

          <div className="absolute bottom-[-10%] right-[-10%] w-[320px] h-[320px] opacity-20 pointer-events-none z-10 select-none">
            <img src={teacherIllus} alt="" className="w-full h-full object-contain animate-pulse" />
          </div>
        </section>

        {/* Right Column: Form Panel */}
        <section className="flex items-center justify-center p-8 border-l border-slate-100 dark:border-slate-800/30 relative z-10 min-h-screen">
          <form 
            onSubmit={submit}
            className="w-full max-w-[440px] flex flex-col justify-center bg-white dark:bg-[#0f0b18] border border-slate-200/60 dark:border-purple-950/20 rounded-3xl p-8 md:p-10 shadow-xl hover:shadow-purple-500/5 transition-all duration-300"
          >
            {/* Go Back Link */}
            <Link 
              to="/" 
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold mb-6 group self-start transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              Back to Home
            </Link>

            {/* Header section */}
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black tracking-wider uppercase text-purple-600 bg-purple-550/10 border-purple-550/20 dark:text-purple-400 dark:bg-purple-500/10 dark:border-purple-500/20 font-mono">
                <BookOpen className="h-3.5 w-3.5" />
                Teacher Node
              </span>
            </div>

            <h1 className="mb-2 text-2xl font-black text-slate-800 dark:text-white leading-tight font-outfit">
              Authoring Center
            </h1>
            <p className="mb-6 text-xs text-slate-400 dark:text-slate-500 font-medium">
              Verify credentials to register question pools, class profiles, and view performance indexes.
            </p>

            {/* Inputs */}
            <div className="space-y-4">
              <Input 
                label="Teacher User ID" 
                placeholder="Enter Username or Email" 
                className="focus:border-purple-500 focus:ring-purple-100/50 focus:ring-3 focus:ring-purple-500/10" 
                value={userId} 
                onChange={(event) => setUserId(event.target.value)} 
              />
              <PasswordInput
                label="Password"
                placeholder="Enter Password"
                className="focus:border-purple-500 focus:ring-purple-100/50 focus:ring-3 focus:ring-purple-500/10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {/* Links */}
            <div className="mt-4 flex justify-between items-center text-xs">
              <Link 
                to="/forgot-password?role=teacher"
                className="text-purple-600 dark:text-purple-400 hover:underline font-bold transition-colors cursor-pointer"
              >
                Forgot password?
              </Link>
            </div>

            {/* Alert logs */}
            {error && (
              <p className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                {error}
              </p>
            )}

            {/* Submit button */}
            <Button 
              className="mt-6 w-full py-6 rounded-xl font-bold text-xs uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white border-none shadow-md shadow-purple-500/10 transition-all duration-300 transform active:scale-98"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Connecting..." : "Verify & Authorize"}
            </Button>
          </form>
        </section>
      </main>
    );
  }

  // ----------------------------------------------------
  // LAYOUT 3: Admin Login (Retro Monospace Terminal Console)
  // ----------------------------------------------------
  if (role === "Admin") {
    return (
      <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[46%_54%] bg-slate-55 dark:bg-[#05060f] font-outfit relative overflow-hidden">
        {/* Left Column: Amber Info Panel */}
        <section className="hidden lg:flex flex-col justify-between p-16 bg-[#05060f] border-r border-slate-200/10 relative transition-colors duration-300 overflow-hidden min-h-screen">
          <div className="absolute top-[15%] right-[-10%] w-[350px] h-[350px] rounded-full blur-[120px] bg-amber-500/20 pointer-events-none opacity-30 z-0" />
          
          <div className="relative z-10 flex items-center gap-3 self-start">
            <span className="text-2xl font-extrabold leading-none tracking-normal text-white font-outfit">Parikshya</span>
            <span className="h-4 w-px bg-white/20" />
            <span className="text-[10px] font-black tracking-widest text-slate-550/80 uppercase font-mono mt-0.5">Mainframe Portal</span>
          </div>

          <div className="relative z-10 flex flex-col items-start text-left my-auto max-w-md space-y-6">
            <h1 className="text-[38px] lg:text-[42px] font-extrabold tracking-tight text-white leading-[1.12] font-outfit">
              Configure nodes <br />
              that <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent filter drop-shadow-[0_0_15px_rgba(245,158,11,0.35)] font-extrabold font-outfit">power the engine.</span>
            </h1>
            <div className="w-12 h-1 rounded-full bg-amber-500" />
            <p className="text-sm text-slate-400 font-jakarta leading-relaxed font-medium">
              Register portal credentials, trace active server sockets, and configure global endpoints.
            </p>
          </div>

          <div className="absolute bottom-[-10%] right-[-10%] w-[320px] h-[320px] opacity-20 pointer-events-none z-10 select-none">
            <img src={adminIllus} alt="" className="w-full h-full object-contain animate-pulse" />
          </div>
        </section>

        {/* Right Column: Form Panel */}
        <section className="flex items-center justify-center p-8 border-l border-slate-100 dark:border-slate-800/30 relative z-10 min-h-screen">
          <form 
            onSubmit={submit}
            className="w-full max-w-[440px] flex flex-col justify-center bg-white dark:bg-[#0c1322] border border-slate-200/60 dark:border-amber-950/20 rounded-3xl p-8 md:p-10 shadow-xl hover:shadow-amber-500/5 transition-all duration-300 text-slate-800 dark:text-white"
          >
            {/* Go Back Link */}
            <Link 
              to="/" 
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold mb-6 group self-start transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              Back to Home
            </Link>

            {/* Header section */}
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black tracking-wider uppercase text-amber-600 bg-amber-550/10 border-amber-550/20 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20 font-mono">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Console
              </span>
            </div>

            <h1 className="mb-2 text-2xl font-black text-slate-800 dark:text-white leading-tight font-outfit">
              Console Entrance
            </h1>
            <p className="mb-6 text-xs text-slate-400 dark:text-slate-500 font-medium">
              Verify credentials to configure security nodes, trace active socket logs, and manage assessment configurations.
            </p>

            {/* Inputs */}
            {isSignUp ? (
              <div className="space-y-4">
                <Input 
                  label="FULL NAME" 
                  placeholder="Enter name" 
                  className="focus:border-amber-500 focus:ring-amber-100/50 focus:ring-3 focus:ring-amber-500/10" 
                  value={adminName} 
                  onChange={(event) => setAdminName(event.target.value)} 
                />
                <Input 
                  label="ADMIN USER ID" 
                  placeholder="Enter username" 
                  className="focus:border-amber-500 focus:ring-amber-100/50 focus:ring-3 focus:ring-amber-500/10" 
                  value={userId} 
                  onChange={(event) => setUserId(event.target.value)} 
                />
                <PasswordInput
                  label="PASSWORD"
                  placeholder="Enter password"
                  className="focus:border-amber-500 focus:ring-amber-100/50 focus:ring-3 focus:ring-amber-500/10"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Input
                  label="ORGANIZATION TENANT CODE"
                  placeholder="Enter Tenant Code (e.g. ABC)"
                  className="focus:border-amber-500 focus:ring-amber-100/50 focus:ring-3 focus:ring-amber-500/10"
                  value={adminKey}
                  onChange={(event) => setAdminKey(event.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <Input 
                  label="ADMIN USER ID" 
                  placeholder="Enter Username" 
                  className="focus:border-amber-500 focus:ring-amber-100/50 focus:ring-3 focus:ring-amber-500/10" 
                  value={userId} 
                  onChange={(event) => setUserId(event.target.value)} 
                />
                <PasswordInput
                  label="PASSWORD"
                  placeholder="Enter Password"
                  className="focus:border-amber-500 focus:ring-amber-100/50 focus:ring-3 focus:ring-amber-500/10"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            )}

            {/* Links */}
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                  setSuccessMessage("");
                }}
                className="self-start text-xs font-bold text-amber-500 hover:underline transition-colors cursor-pointer text-left"
              >
                {isSignUp ? "Already registered? Login" : "Initialize new admin account"}
              </button>
              
              {!isSignUp && (
                <Link 
                  to="/forgot-password?role=admin"
                  className="self-start text-xs font-bold text-amber-500 hover:underline transition-colors cursor-pointer text-left"
                >
                  Forgot password?
                </Link>
              )}
            </div>

            {/* Alert logs */}
            {successMessage && (
              <p className="mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {successMessage}
              </p>
            )}
            {error && (
              <p className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 font-mono font-mono">
                {error}
              </p>
            )}

            {/* Submit button */}
            <Button 
              className="mt-6 w-full py-6 rounded-xl font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white border-none shadow-md shadow-amber-500/10 transition-all duration-300 transform active:scale-98"
              disabled={loginMutation.isPending || (isSignUp && !adminName)}
            >
              {isSignUp ? "Register Mainframe" : (loginMutation.isPending ? "Connecting..." : "Verify & Authenticate")}
            </Button>
          </form>
        </section>
      </main>
    );
  }

  return null;
};
