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
  FileText,
  PieChart,
  Terminal,
  Activity,
  CheckCircle,
  Cpu
} from "lucide-react";

import studentBg from "../assets/student_login_bg.png";
import teacherBg from "../assets/teacher_login_bg.png";
import adminBg from "../assets/admin_login_bg.png";

import studentIllus from "../assets/student_illus.png";
import teacherIllus from "../assets/teacher_illus.png";
import adminIllus from "../assets/admin_illus.png";

// Glowing Parikshya Logo Component (Dark mode adapted)
const ParikshyaLogo = ({ accentClass }: { accentClass: string }) => (
  <div className="flex items-center gap-1.5">
    <span className="relative h-7 w-8 flex-shrink-0">
      <span className={`absolute left-0 top-1 h-4 w-4 rounded-sm border-2 ${
        accentClass === "text-cyan-400" 
          ? "border-cyan-400/80 bg-cyan-500/20" 
          : accentClass === "text-purple-400" 
          ? "border-purple-400/80 bg-purple-500/20" 
          : "border-amber-400/80 bg-amber-500/20"
      }`} />
      <span className="absolute left-2 top-0 h-2 w-7 rounded-full border-t-2 border-slate-350" />
      <span className="absolute left-4 top-1 h-3 w-9 rounded-full border-t-2 border-slate-350" />
      <span className="absolute left-1.5 top-2.5 h-1.5 w-1.5 rounded-full bg-white" />
    </span>
    <span className="text-2xl font-extrabold leading-none tracking-normal text-white font-outfit">Parikshya</span>
  </div>
);

const roleConfig = {
  Student: {
    badgeText: "STUDENT PORTAL",
    badgeIcon: <GraduationCap className="h-3.5 w-3.5" />,
    headline: "SECURE TESTING NODE",
    description: "Enter your secure credentials to verify browser constraints, visibility hooks, and access your proctored assessment environment.",
    leftPanelBg: "bg-[#05060f]",
    borderLeftClass: "border-l-4 border-indigo-500 dark:border-indigo-650",
    rightPanelBg: "bg-[#fafbfc] dark:bg-[#07090f]",
    cardGlow: "hover:shadow-[0_0_35px_rgba(99,102,241,0.12)] dark:hover:shadow-[0_0_40px_rgba(99,102,241,0.08)]",
    cardBorder: "border-indigo-100/60 dark:border-indigo-950/40",
    buttonClass: "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 focus:border-indigo-500 focus:ring-indigo-100/50 shadow-md shadow-indigo-500/10",
    inputClass: "focus:border-indigo-500 focus:ring-indigo-100/50 focus:ring-3",
    badgeColor: "text-indigo-600 bg-indigo-550/10 border-indigo-550/20 dark:text-indigo-400 dark:bg-indigo-500/10 dark:border-indigo-500/20",
    accentText: "text-cyan-400",
    illustration: studentIllus,
    bgImage: studentBg,
    leftDescription: "Access top courses, hands-on projects and industry-recognized certificates.",
    leftHeading: (
      <span>
        Learn skills <br />
        that <span className="bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent filter drop-shadow-[0_0_15px_rgba(6,182,212,0.35)] font-extrabold">
          shape tomorrow.
        </span>
      </span>
    ),
    lineColor: "bg-indigo-500"
  },
  Teacher: {
    badgeText: "TEACHER NODE",
    badgeIcon: <BookOpen className="h-3.5 w-3.5" />,
    headline: "AUTHORING CENTRE",
    description: "Enter credentials to access assessment design tables, register class profiles, parse CSV question sheets, and analyze performance reports.",
    leftPanelBg: "bg-[#07040d]",
    borderLeftClass: "border-l-4 border-purple-500 dark:border-purple-650",
    rightPanelBg: "bg-[#fdfaff] dark:bg-[#08070d]",
    cardGlow: "hover:shadow-[0_0_35px_rgba(168,85,247,0.12)] dark:hover:shadow-[0_0_40px_rgba(168,85,247,0.08)]",
    cardBorder: "border-purple-100/60 dark:border-purple-950/40",
    buttonClass: "bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 focus:border-purple-500 focus:ring-purple-100/50 shadow-md shadow-purple-500/10",
    inputClass: "focus:border-purple-500 focus:ring-purple-100/50 focus:ring-3",
    badgeColor: "text-purple-600 bg-purple-550/10 border-purple-550/20 dark:text-purple-400 dark:bg-purple-500/10 dark:border-purple-500/20",
    accentText: "text-purple-400",
    illustration: teacherIllus,
    bgImage: teacherBg,
    leftDescription: "Structure passages, define scoring criteria, and analyze student performances dynamically.",
    leftHeading: (
      <span>
        Build tests <br />
        that <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent filter drop-shadow-[0_0_15px_rgba(168,85,247,0.35)] font-extrabold">
          measure capability.
        </span>
      </span>
    ),
    lineColor: "bg-purple-500"
  },
  Admin: {
    badgeText: "ADMIN CONSOLE",
    badgeIcon: <ShieldCheck className="h-3.5 w-3.5" />,
    headline: "MAINFRAME TERMINAL",
    description: "Secure system administration terminal. Register portal users, check server activity socket metrics, and configure proctoring limits.",
    leftPanelBg: "bg-[#060608]",
    borderLeftClass: "border-l-4 border-slate-700 dark:border-slate-800",
    rightPanelBg: "bg-[#f8fafc] dark:bg-[#06080d]",
    cardGlow: "hover:shadow-[0_0_35px_rgba(148,163,184,0.12)] dark:hover:shadow-[0_0_40px_rgba(148,163,184,0.08)]",
    cardBorder: "border-slate-250/60 dark:border-slate-850",
    buttonClass: "bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 focus:ring-slate-500 focus:border-slate-500 focus:ring-slate-100/50 shadow-md shadow-slate-500/10",
    inputClass: "focus:border-slate-550 focus:ring-slate-100/50 focus:ring-3",
    badgeColor: "text-slate-600 bg-slate-550/10 border-slate-550/20 dark:text-slate-355 dark:bg-slate-800/80 dark:border-slate-700",
    accentText: "text-amber-400",
    illustration: adminIllus,
    bgImage: adminBg,
    leftDescription: "Register portal credentials, trace active server sockets, and configure global endpoints.",
    leftHeading: (
      <span>
        Configure nodes <br />
        that <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent filter drop-shadow-[0_0_15px_rgba(245,158,11,0.35)] font-extrabold">
          power the engine.
        </span>
      </span>
    ),
    lineColor: "bg-amber-500"
  }
};

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

  const config = roleConfig[role];

  return (
    <main className={`grid min-h-screen grid-cols-1 ${config.rightPanelBg} lg:grid-cols-[46%_54%] transition-colors duration-300 relative overflow-hidden font-outfit`}>
      
      {/* Decorative Grid overlays */}
      <div className="absolute inset-0 grid-cyber opacity-20 pointer-events-none z-0" />

      {/* Left Column: SkillSphere-style Premium Panel */}
      <section className={`hidden lg:flex flex-col justify-between p-16 ${config.leftPanelBg} border-r border-slate-200/10 relative transition-colors duration-300 overflow-hidden min-h-screen`}>
        
        {/* Dynamic Glow circle based on role */}
        <div className={`absolute top-[15%] left-[-10%] w-[350px] h-[350px] rounded-full blur-[120px] pointer-events-none opacity-30 z-0 transition-colors duration-300 ${
          role === "Student" 
            ? "bg-cyan-500/20" 
            : role === "Teacher"
            ? "bg-purple-500/20"
            : "bg-amber-500/20"
        }`} />

        {/* Top: Header Logo & Tagline */}
        <div className="relative z-10 flex items-center gap-3 self-start">
          <ParikshyaLogo accentClass={config.accentText} />
          <span className="h-4 w-px bg-white/20" />
          <span className="text-[10px] font-black tracking-widest text-slate-500/80 uppercase font-mono mt-0.5">Secure. Assess. Achieve.</span>
        </div>

        {/* Middle: Content */}
        <div className="relative z-10 flex flex-col items-start text-left my-auto max-w-md space-y-6">
          <h1 className="text-[38px] lg:text-[42px] font-extrabold tracking-tight text-white leading-[1.12] font-outfit">
            {config.leftHeading}
          </h1>
          
          {/* Accent Line */}
          <div className={`w-12 h-1 rounded-full ${config.lineColor}`} />
          
          <p className="text-sm text-slate-400 font-jakarta leading-relaxed font-medium">
            {config.leftDescription}
          </p>
        </div>

        {/* Bottom: Animated neon wave SVG */}
        <div className="absolute bottom-0 left-0 right-0 h-48 overflow-hidden pointer-events-none z-10 opacity-75">
          <svg className="w-full h-full" viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M0,120 C240,180 480,60 720,120 C960,180 1200,60 1440,120 L1440,200 L0,200 Z" 
              fill={`url(#wave-gradient-${role})`} 
              className="animate-[pulse_5s_ease-in-out_infinite]"
            />
            <path 
              d="M0,140 C360,60 720,180 1080,100 C1260,60 1350,140 1440,120" 
              stroke={`url(#line-gradient-${role})`} 
              strokeWidth="2" 
              className="opacity-45"
            />
            <path 
              d="M0,160 C300,90 600,190 900,120 C1200,50 1350,160 1440,140" 
              stroke={`url(#line-gradient-${role})`} 
              strokeWidth="2.5" 
              className="opacity-60"
            />
            <defs>
              <linearGradient id={`wave-gradient-Student`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.22" />
              </linearGradient>
              <linearGradient id={`wave-gradient-Teacher`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.22" />
              </linearGradient>
              <linearGradient id={`wave-gradient-Admin`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#ea580c" stopOpacity="0.22" />
              </linearGradient>
              
              <linearGradient id={`line-gradient-Student`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.75" />
              </linearGradient>
              <linearGradient id={`line-gradient-Teacher`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.75" />
              </linearGradient>
              <linearGradient id={`line-gradient-Admin`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#ea580c" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.75" />
              </linearGradient>
            </defs>
          </svg>
        </div>

      </section>

      {/* Right Column: Dynamic Form Wrapper */}
      <section className={`flex items-center justify-center p-6 ${config.borderLeftClass} transition-colors duration-300 relative z-10 min-h-screen overflow-hidden`}>
        
        {/* Dynamic background picture specific for every user */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 dark:opacity-20 pointer-events-none transition-all duration-700 mix-blend-luminosity dark:mix-blend-normal animate-pulse"
          style={{ backgroundImage: `url(${config.bgImage})` }}
        />
        
        {/* Sleek overlay gradient blending picture to theme */}
        <div className="absolute inset-0 bg-[#fafbfc]/85 dark:bg-[#07090f]/90 pointer-events-none backdrop-blur-[1.5px]" />

        <form 
          onSubmit={submit} 
          className={`relative w-full max-w-[500px] flex flex-col justify-center bg-white/90 dark:bg-[#0c1322]/80 border ${config.cardBorder} rounded-3xl p-8 md:p-12 shadow-xl ${config.cardGlow} transition-all duration-500 overflow-hidden backdrop-blur-md z-10`}
        >
          {/* Subtle inside card glow */}
          <div className="absolute top-[-25%] right-[-15%] w-44 h-44 bg-indigo-500/[0.02] rounded-full blur-3xl pointer-events-none" />

          {/* Go Back to Home Link */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold mb-8 group self-start transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>

          {/* Header section */}
          <div className="mb-6 flex items-center justify-between">
            <Logo />
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black tracking-wider uppercase ${config.badgeColor} transition-colors font-mono`}>
              {config.badgeIcon}
              {config.badgeText}
            </span>
          </div>

          <h1 className="mb-8 text-2xl font-black text-slate-900 dark:text-white leading-tight font-outfit">
            {isSignUp ? "Admin Registration" : "Portal Entrance"}
          </h1>
          
          {/* Inputs Section */}
          {isSignUp ? (
            <div className="space-y-4">
              <Input 
                label="Full Name" 
                placeholder="Enter Full Name" 
                className={config.inputClass} 
                value={adminName} 
                onChange={(event) => setAdminName(event.target.value)} 
              />
              <Input 
                label="User ID (Username)" 
                placeholder="Enter User ID" 
                className={config.inputClass} 
                value={userId} 
                onChange={(event) => setUserId(event.target.value)} 
              />
              <PasswordInput
                label="Password"
                placeholder="Enter Password"
                className={config.inputClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <PasswordInput
                label="Admin Registration Key"
                placeholder="Enter registration key"
                className={config.inputClass}
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Input 
                label="User ID" 
                placeholder="Enter User ID" 
                className={config.inputClass} 
                value={userId} 
                onChange={(event) => setUserId(event.target.value)} 
              />
              <PasswordInput
                label="Password"
                placeholder="Enter Password"
                className={config.inputClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          )}

          {/* Links Section */}
          <div className="mt-5 flex flex-col gap-2">
            {role === "Admin" && (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                  setSuccessMessage("");
                }}
                className={`self-start text-xs font-bold ${config.accentText} hover:underline transition-colors cursor-pointer`}
              >
                {isSignUp ? "Already registered? Login" : "Initialize new admin account"}
              </button>
            )}
            {!isSignUp && (
              <Link 
                to="/forgot-password"
                className={`self-start text-xs font-bold ${config.accentText} hover:underline transition-colors cursor-pointer`}
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
            <p className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
              {error}
            </p>
          )}
          
          {/* Submit button */}
          <Button 
            className={`mt-8 w-full py-6 rounded-xl font-bold text-xs uppercase tracking-wider ${config.buttonClass} transition-all duration-300 transform active:scale-98`} 
            disabled={loginMutation.isPending || (isSignUp && !adminName)}
          >
            {isSignUp ? "Register Admin" : (loginMutation.isPending ? "Connecting..." : "Verify & Authenticate")}
          </Button>

        </form>
      </section>
    </main>
  );
};
