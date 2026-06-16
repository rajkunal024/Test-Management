import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  GraduationCap, 
  BookOpen, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Lock, 
  Eye, 
  Bell, 
  Zap, 
  Cpu, 
  Activity, 
  CheckCircle,
  HelpCircle,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Logo } from "../components/layout/Logo";
import { useTheme } from "../context/ThemeContext";

export const LandingPage = () => {
  const { toggleTheme, isDark } = useTheme();

  // Gaze Tracking Cursor Offset State
  const [cursorPos, setCursorPos] = useState({ x: 150, y: 110 });
  const simulatorRef = useRef<HTMLDivElement | null>(null);

  // Proctor Display Constants
  const enableFaceMesh = true;
  const enableGazeTracker = true;
  const isWebcamActive = true;

  // Accordion FAQs state
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  // Gaze Mouse Movement Tracker inside Simulator
  const handleMouseMove = (e: React.MouseEvent) => {
    if (simulatorRef.current) {
      const rect = simulatorRef.current.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);
      setCursorPos({ x, y });
    }
  };

  const faqs = [
    {
      q: "How does the AI tab-switch proctoring enforce integrity?",
      a: "Parikshya utilizes HTML5 Visibility APIs and window focus events. If a student minimizes the testing window, opens a new tab, or switches to a background application, the platform logs the exact timestamp and switch count. Continued violations automatically alert the proctor canvas and flag the exam copy for administrator review."
    },
    {
      q: "Can teachers author passage-based and multiple-choice questions?",
      a: "Yes. Parikshya provides a modular authoring interface. Teachers can create standard single-choice MCQs, multiple-choice questions (MSQs) with custom selection matrices, and passage-based comprehension panels with vertically stacked sub-questions. Dynamic media URLs and graphics are fully supported."
    },
    {
      q: "Does Parikshya support bulk question loading?",
      a: "Absolutely. Teachers can import complete, multi-subject question sheets using CSV templates. The parser automatically structures subject relations, creates missing topic nodes, maps difficulty parameters, and saves templates directly to the test draft pool."
    },
    {
      q: "Is the platform mobile-responsive and light/dark theme compatible?",
      a: "Yes. The frontend client utilizes responsive CSS layout frames optimized for desktop and mobile viewports. A distraction-free dark mode toggle is available globally, adjusting color palettes, layouts, and interactive overlays smoothly."
    }
  ];

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#263246] font-outfit flex flex-col selection:bg-indigo-500 selection:text-white dark:bg-[#07090f] dark:text-slate-150 transition-colors duration-300 relative overflow-hidden">
      
      {/* Decorative Matrix Grid & Blob Backgrounds */}
      <div className="absolute inset-0 grid-cyber opacity-80 pointer-events-none" />
      <div className="absolute top-[-15%] left-[-10%] w-[700px] h-[700px] bg-gradient-to-tr from-indigo-500/10 to-cyan-500/5 dark:from-indigo-950/15 dark:to-cyan-950/5 rounded-full blur-[140px] pointer-events-none animate-float -z-10" />
      <div className="absolute bottom-[10%] right-[-10%] w-[650px] h-[650px] bg-gradient-to-br from-purple-500/10 to-pink-500/5 dark:from-purple-950/15 dark:to-pink-950/5 rounded-full blur-[140px] pointer-events-none animate-float-reverse -z-10" />

      {/* Glassmorphic Cyber Header */}
      <header className="h-20 bg-white/60 backdrop-blur-xl border-b border-slate-200/50 dark:bg-[#090d16]/70 dark:border-slate-850/80 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-50 transition-all duration-300 shadow-sm">
        <div className="flex items-center gap-2">
          <Logo />
        </div>
        
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/60 bg-white hover:bg-slate-50 dark:border-slate-800/80 dark:bg-[#0f1524]/60 dark:hover:bg-[#151d30] dark:text-slate-300 text-slate-700 transition-all duration-300 focus:outline-none cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            id="theme-mode-toggle-landing"
          >
            {isDark ? (
              <Sun className="h-4.5 w-4.5 text-amber-500 animate-[spin_16s_linear_infinite]" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-slate-550" />
            )}
          </button>

          <nav className="hidden md:flex items-center gap-6 text-[11px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
            <Link to="/login/student" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Students</Link>
            <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-800" />
            <Link to="/login/teacher" className="hover:text-[#8b5cf6] dark:hover:text-[#a78bfa] transition-colors">Teachers</Link>
            <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-800" />
            <Link to="/login/admin" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-750 dark:hover:text-indigo-300 transition-colors">Admin Console</Link>
          </nav>

          <Link
            to="/login/student"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:opacity-90 text-white font-extrabold text-xs shadow-md shadow-indigo-500/10 transition-all active:scale-98"
          >
            Portal Entry
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Sections */}
      <main className="flex-1 flex flex-col items-center">

        {/* Cyberpunk Hero Grid Layout */}
        <section className="max-w-[1240px] w-full px-6 pt-16 lg:pt-24 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Massive Headline */}
          <div className="lg:col-span-6 flex flex-col items-start text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest animate-pulse shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Next-Gen Secure Assessment Console
            </div>

            <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.08] text-slate-900 dark:text-white font-outfit">
              SECURE ASSESSMENT <br />
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                SIMPLIFIED.
              </span>
            </h1>

            <p className="text-slate-500 dark:text-slate-400 font-jakarta leading-relaxed text-base font-medium max-w-xl">
              An advanced, robust, and beautiful examination platform. Build comprehensive topic banks, deliver instant proctoring alerts, lock student clipboards, and analyze detailed result metrics.
            </p>

            <div className="flex flex-wrap gap-4 w-full pt-4">
              <Link
                to="/login/student"
                className="px-6 py-3.5 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-900 font-extrabold text-sm hover:shadow-lg transition flex items-center gap-2"
              >
                Access Student Node
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
              <a
                href="#access-nodes"
                className="px-6 py-3.5 rounded-xl border border-slate-200 dark:border-slate-805 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md text-slate-700 dark:text-slate-205 font-extrabold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Portal Entrances
              </a>
            </div>

          </div>

          {/* Right Column: Live Interactive Proctor Simulator */}
          <div className="lg:col-span-6 w-full flex flex-col">
            <div 
              ref={simulatorRef}
              onMouseMove={handleMouseMove}
              className="bg-white dark:bg-[#0c1322] border border-slate-200/70 dark:border-slate-850/80 rounded-3xl p-5 md:p-6 shadow-xl hover:shadow-[0_0_35px_rgba(99,102,241,0.22)] dark:hover:shadow-[0_0_40px_rgba(99,102,241,0.14)] hover:border-indigo-400 dark:hover:border-indigo-500/40 transition-all duration-500 relative backdrop-blur-md select-none group"
            >
              {/* Header HUD */}
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-655 dark:text-slate-350">
                  <span className={`h-2 w-2 rounded-full ${isWebcamActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                  AI Proctor HUD (Cursor Gaze Active)
                </span>
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40 px-2 py-0.5 rounded font-mono">
                  LIVE STREAM
                </span>
              </div>

              {/* Viewport Screen */}
              <div className="aspect-video w-full bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none z-10" />
                <div className="absolute inset-0 bg-indigo-500/[0.02] dark:bg-indigo-500/[0.01] pointer-events-none grid-cyber" />
                
                {/* Sweep Laser */}
                <div className="absolute left-0 right-0 h-0.5 bg-indigo-500/50 dark:bg-indigo-400/50 shadow-[0_0_8px_#6366f1] animate-scanline pointer-events-none" />

                {isWebcamActive ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    
                    {/* Face Silhouette (SVG Vector) */}
                    <svg viewBox="0 0 100 100" className="h-44 w-44 text-slate-700 dark:text-slate-800 opacity-60">
                      <path fill="currentColor" d="M50 15c-15 0-25 10-25 25 0 8 3 15 8 20l3 15h28l3-15c5-5 8-12 8-20 0-15-10-25-25-25z" />
                      <circle cx="50" cy="88" r="6" fill="currentColor" />
                    </svg>

                    {/* Face Mesh Overlay Grid */}
                    {enableFaceMesh && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-65 pointer-events-none">
                        <svg viewBox="0 0 100 100" className="h-44 w-44 text-cyan-400 animate-pulse">
                          {/* Grid points */}
                          <line x1="38" y1="35" x2="62" y2="35" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="38" y1="35" x2="33" y2="45" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="62" y1="35" x2="67" y2="45" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="33" y1="45" x2="50" y2="55" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="67" y1="45" x2="50" y2="55" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="33" y1="45" x2="38" y2="60" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="67" y1="45" x2="62" y2="60" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="38" y1="60" x2="50" y2="55" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="62" y1="60" x2="50" y2="55" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="38" y1="60" x2="50" y2="70" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="62" y1="60" x2="50" y2="70" stroke="currentColor" strokeWidth="0.5" />
                          {/* Eye targets */}
                          <circle cx="42" cy="38" r="2.5" stroke="currentColor" strokeWidth="0.5" fill="none" />
                          <circle cx="58" cy="38" r="2.5" stroke="currentColor" strokeWidth="0.5" fill="none" />
                        </svg>
                      </div>
                    )}

                    {/* Gaze tracking lasers shooting from eyes to cursor */}
                    {enableGazeTracker && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                        {/* Calculate laser offsets relative to mock eye centers inside 16:9 box */}
                        <line 
                          x1="45%" 
                          y1="38%" 
                          x2={cursorPos.x} 
                          y2={cursorPos.y} 
                          stroke="#ef4444" 
                          strokeWidth="1.5" 
                          strokeDasharray="2 2"
                          className="opacity-75"
                        />
                        <line 
                          x1="55%" 
                          y1="38%" 
                          x2={cursorPos.x} 
                          y2={cursorPos.y} 
                          stroke="#ef4444" 
                          strokeWidth="1.5" 
                          strokeDasharray="2 2"
                          className="opacity-75"
                        />
                        <circle cx={cursorPos.x} cy={cursorPos.y} r="6" fill="none" stroke="#ef4444" strokeWidth="1.5" className="animate-ping" />
                        <circle cx={cursorPos.x} cy={cursorPos.y} r="2.5" fill="#ef4444" />
                      </svg>
                    )}
                    
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 font-mono text-[10px] space-y-2">
                    <Zap className="h-6 w-6 text-slate-600 animate-bounce" />
                    <span>[CAMERA STREAM SUSPENDED]</span>
                  </div>
                )}

                {/* Overlaid parameters details HUD */}
                <div className="absolute top-3 left-3 z-20 text-[9px] font-mono text-white/80 space-y-0.5">
                  <p>FEED: CONNECTED</p>
                  <p>MESH RATE: 60HZ</p>
                </div>
                <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 text-[9px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                  <CheckCircle className="h-3.5 w-3.5" />
                  GAZE STATE: SECURE
                </div>
              </div>

            </div>
          </div>

        </section>

        {/* Access Nodes Hub Section */}
        <section id="access-nodes" className="max-w-[1140px] w-full px-6 py-20">
          <div className="bg-gradient-to-br from-purple-50/60 via-rose-50/30 to-white dark:from-[#1b112c]/40 dark:via-[#090d16]/30 dark:to-[#120a1c]/20 border border-purple-100/80 dark:border-purple-900/50 rounded-3xl p-8 md:p-12 shadow-xl shadow-purple-500/[0.02] dark:shadow-none hover:border-purple-300 dark:hover:border-purple-800/80 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] dark:hover:shadow-[0_0_45px_rgba(168,85,247,0.08)] transition-all duration-500 relative overflow-hidden">
            {/* Subtle glow/mesh effects inside the card */}
            <div className="absolute top-[-30%] right-[-20%] w-[350px] h-[350px] bg-fuchsia-500/10 dark:bg-fuchsia-500/[0.04] rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-30%] left-[-20%] w-[350px] h-[350px] bg-pink-500/10 dark:bg-pink-500/[0.04] rounded-full blur-[80px] pointer-events-none" />

            <div className="text-center max-w-2xl mx-auto mb-16 space-y-2.5 relative z-10">
              <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 tracking-widest uppercase">PLATFORM NODES</span>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight font-outfit">
                Secure Gateway Entrances
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-jakarta leading-relaxed font-medium">
                Authenticate into your designated dashboard environment node below to access live portals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              
              {/* Student Pod */}
              <article className="group bg-white dark:bg-slate-900/30 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-850 p-8 shadow-sm hover:shadow-[0_0_30px_rgba(99,102,241,0.25)] dark:hover:shadow-[0_0_35px_rgba(99,102,241,0.15)] hover:border-indigo-550 dark:hover:border-indigo-400/80 hover:-translate-y-1 transition-all duration-300 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-bl-full -z-10 group-hover:scale-110 transition-all duration-300" />
                
                <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 transition-all">
                  <GraduationCap className="h-6.5 w-6.5" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-outfit">Student Portal</h3>
                <p className="text-[10px] font-bold text-indigo-550 dark:text-indigo-400 tracking-wider uppercase mt-1 mb-4">Exam attempt environment</p>
                
                <ul className="space-y-2.5 mb-8 text-xs font-semibold text-slate-500 dark:text-slate-400 font-jakarta leading-relaxed">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    Verify system status checklist
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    Secure anti-copy attempt module
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    Granular grade result scorecard
                  </li>
                </ul>

                <Link 
                  to="/login/student" 
                  className="mt-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-755 text-white font-extrabold text-xs shadow-md shadow-indigo-500/10 hover:shadow-lg transition-all"
                >
                  Launch Student Portal
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </article>

              {/* Teacher Pod */}
              <article className="group bg-white dark:bg-slate-900/30 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-850 p-8 shadow-sm hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] dark:hover:shadow-[0_0_35px_rgba(168,85,247,0.15)] hover:border-purple-550 dark:hover:border-purple-400/80 hover:-translate-y-1 transition-all duration-300 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/50 dark:bg-purple-950/10 rounded-bl-full -z-10 group-hover:scale-110 transition-all duration-300" />
                
                <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-955/40 border border-purple-100/50 dark:border-purple-900/40 flex items-center justify-center text-purple-650 dark:text-purple-400 mb-6 group-hover:scale-110 transition-all">
                  <BookOpen className="h-6 w-6" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-outfit">Teacher Portal</h3>
                <p className="text-[10px] font-bold text-purple-550 dark:text-purple-400 tracking-wider uppercase mt-1 mb-4">Authoring & Metrics</p>
                
                <ul className="space-y-2.5 mb-8 text-xs font-semibold text-slate-500 dark:text-slate-400 font-jakarta leading-relaxed">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    Define classwise question pools
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    CSV bulk question list imports
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    Comprehensive analytics & scores
                  </li>
                </ul>

                <Link 
                  to="/login/teacher" 
                  className="mt-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-755 text-white font-extrabold text-xs shadow-md shadow-purple-500/10 hover:shadow-lg transition-all"
                >
                  Launch Teacher Portal
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </article>

              {/* Admin Pod */}
              <article className="group bg-white dark:bg-slate-900/30 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-850 p-8 shadow-sm hover:shadow-[0_0_30px_rgba(100,116,139,0.2)] dark:hover:shadow-[0_0_35px_rgba(148,163,184,0.15)] hover:border-slate-650 dark:hover:border-slate-500 hover:-translate-y-1 transition-all duration-300 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50/50 dark:bg-slate-950/10 rounded-bl-full -z-10 group-hover:scale-110 transition-all duration-300" />
                
                <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center text-slate-705 dark:text-slate-300 mb-6 group-hover:scale-110 transition-all">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-outfit">Admin Panel</h3>
                <p className="text-[10px] font-bold text-slate-550 dark:text-slate-400 tracking-wider uppercase mt-1 mb-4">Management & Streams</p>
                
                <ul className="space-y-2.5 mb-8 text-xs font-semibold text-slate-500 dark:text-slate-400 font-jakarta leading-relaxed">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                    Register teachers & students
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                    Live webcam frame monitoring
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                    Manage scheduling timelines
                  </li>
                </ul>

                <Link 
                  to="/login/admin" 
                  className="mt-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all"
                >
                  Launch Admin Portal
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </article>

            </div>
          </div>
        </section>

        {/* Feature capabilities panels */}
        <section className="max-w-[1140px] w-full px-6 py-20">
          <div className="bg-gradient-to-br from-indigo-50/50 via-slate-50/30 to-white dark:from-[#0d1424]/40 dark:via-[#090d16]/30 dark:to-[#0f172a]/20 border border-indigo-100/80 dark:border-slate-800/80 rounded-3xl p-8 md:p-12 shadow-xl shadow-indigo-500/[0.02] dark:shadow-none hover:border-indigo-300 dark:hover:border-indigo-800/80 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)] dark:hover:shadow-[0_0_45px_rgba(99,102,241,0.08)] transition-all duration-500 relative overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Subtle glow/mesh effects inside the card */}
            <div className="absolute top-[-30%] left-[-20%] w-[350px] h-[350px] bg-indigo-500/10 dark:bg-indigo-500/[0.04] rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-30%] right-[-20%] w-[350px] h-[350px] bg-purple-500/10 dark:bg-purple-500/[0.04] rounded-full blur-[80px] pointer-events-none" />

            {/* Left side: Header info */}
            <div className="space-y-6 relative z-10">
              <span className="text-[10px] font-black text-indigo-550 dark:text-indigo-400 tracking-widest uppercase">CAPABILITIES</span>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight font-outfit">
                Intelligent Security Controls
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-jakarta font-medium">
                Parikshya is engineered to support deep diagnostic tracking and complete clipboard restriction, ensuring that every examination environment remains robust, responsive, and secure.
              </p>
              
              {/* Mini checks */}
              <div className="grid grid-cols-2 gap-4 pt-4 text-xs font-bold text-slate-705 dark:text-slate-350">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>Tab Switch Detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>Anti-Copy Clipboard Lock</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>Instant Toast Notification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-indigo-500 shrink-0" />
                  <span>Live Proctor Stream Feed</span>
                </div>
              </div>
            </div>

            {/* Right side: Modern Accordions list */}
            <div className="space-y-3.5 relative z-10 w-full">
              {faqs.map((item, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div 
                    key={idx}
                    className="bg-white dark:bg-[#0c1424]/40 border border-slate-200/60 dark:border-slate-850/70 rounded-xl p-4.5 transition-all duration-350 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.18)] dark:hover:shadow-[0_0_25px_rgba(99,102,241,0.12)]"
                  >
                    <button
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full flex justify-between items-center text-left text-sm font-extrabold text-slate-800 dark:text-slate-100 transition duration-150"
                    >
                      <span>{item.q}</span>
                      {isOpen ? (
                        <ChevronUp className="h-4.5 w-4.5 text-indigo-550 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4.5 w-4.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      )}
                    </button>
                    
                    {isOpen && (
                      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 font-medium font-jakarta leading-relaxed animate-[fadeIn_0.2s_ease-out]">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/85 bg-white dark:border-slate-850/85 dark:bg-[#080d16] py-10 text-center text-xs text-slate-450 dark:text-slate-500 font-extrabold uppercase tracking-widest transition-colors duration-200 relative z-10">
        © 2026 Parikshya Technologies. All rights reserved.
      </footer>
    </div>
  );
};
