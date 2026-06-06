import { Link } from "react-router-dom";
import { 
  GraduationCap, 
  BookOpen, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Bell, 
  BarChart3, 
  Eye,
  FileQuestion,
  Lock,
  Sun,
  Moon
} from "lucide-react";
import { Logo } from "../components/layout/Logo";
import { useTheme } from "../context/ThemeContext";

export const LandingPage = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col selection:bg-indigo-500 selection:text-white dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Decorative colored blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-200/40 dark:bg-indigo-950/20 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-purple-200/30 dark:bg-purple-950/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="h-20 bg-white/70 backdrop-blur-md border-b border-slate-200/80 dark:bg-slate-900/70 dark:border-slate-800/80 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <Logo />
        </div>
        <div className="flex items-center gap-4">
          {/* Light/Dark Mode Toggle Switch */}
          <button
            onClick={toggleTheme}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 text-slate-700 transition-all duration-300 focus:outline-none cursor-pointer mr-2 shadow-sm"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            id="theme-mode-toggle-landing"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-amber-500 animate-[spin_10s_linear_infinite]" />
            ) : (
              <Moon className="h-5 w-5 text-slate-650" />
            )}
          </button>

          <Link 
            to="/login/student" 
            className="text-xs font-bold text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition duration-155"
          >
            Student Portal
          </Link>
          <span className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <Link 
            to="/login/teacher" 
            className="text-xs font-bold text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition duration-155"
          >
            Teacher Portal
          </Link>
          <span className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <Link 
            to="/login/admin" 
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition duration-155"
          >
            Admin Portal
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center">
        
        {/* Hero Section */}
        <section className="max-w-[1140px] px-6 text-center pt-16 pb-12 sm:pt-24 sm:pb-16 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold uppercase tracking-wider mb-6 animate-pulse">
            <Sparkles className="h-3 w-3" />
            Empowering Modern Classrooms
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight max-w-4xl">
            Streamlined Assessments & <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Real-Time Proctoring
            </span>
          </h1>
          
          <p className="mt-6 text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
            Parikshya simplifies exam generation, secures student attempts with intelligent tab-switch detection, and compiles detailed scorecards.
          </p>
        </section>

        {/* Roles Section */}
        <section className="max-w-[1140px] w-full px-6 pb-20">
          <h2 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 tracking-widest uppercase text-center mb-10">
            Select Your Portal to Sign In
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Student Card */}
            <article className="group bg-white dark:bg-slate-900/40 dark:backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-8 shadow-sm hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500/50 dark:hover:shadow-indigo-950/20 transition-all duration-300 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-950/20 rounded-bl-full -z-10 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/40 transition-colors" />
              <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Student Portal</h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Exams & Scorecards</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                Attempt live classroom tests, inspect questions copy, review detailed grades, and get instant test alerts.
              </p>
              <Link 
                to="/login/student" 
                className="mt-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
              >
                Sign in as Student
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>

            {/* Teacher Card */}
            <article className="group bg-white dark:bg-slate-900/40 dark:backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-8 shadow-sm hover:shadow-xl hover:border-purple-400 dark:hover:border-purple-500/50 dark:hover:shadow-purple-950/20 transition-all duration-300 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 dark:bg-purple-950/20 rounded-bl-full -z-10 group-hover:bg-purple-100 dark:group-hover:bg-purple-950/40 transition-colors" />
              <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Teacher Portal</h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Question Pools & Filters</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                Manage questions list, classify by class, subject or difficulty, import questions via CSV, and review results.
              </p>
              <Link 
                to="/login/teacher" 
                className="mt-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
              >
                Sign in as Teacher
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>

            {/* Admin Card */}
            <article className="group bg-white dark:bg-slate-900/40 dark:backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-8 shadow-sm hover:shadow-xl hover:border-slate-800 dark:hover:border-slate-700 dark:hover:shadow-slate-950/20 transition-all duration-300 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-slate-950/20 rounded-bl-full -z-10 group-hover:bg-slate-100 dark:group-hover:bg-slate-900/40 transition-colors" />
              <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-slate-700 dark:text-slate-300 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Administrator Portal</h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Management & Proctoring</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                Register students and teachers, configure live testing windows, track tab switches, and declaration of results.
              </p>
              <Link 
                to="/login/admin" 
                className="mt-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
              >
                Sign in as Admin
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>

          </div>
        </section>

        {/* Features Grid */}
        <section className="bg-slate-900 dark:bg-slate-950/80 border-t border-slate-800/20 dark:border-slate-800/80 text-white w-full py-20 flex justify-center transition-colors duration-200">
          <div className="max-w-[1140px] w-full px-6">
            <h2 className="text-xs font-extrabold text-indigo-400 tracking-widest uppercase text-center mb-2">
              Features
            </h2>
            <h3 className="text-3xl font-extrabold text-center text-white mb-16">
              Equipped with Complete Proctoring Control
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              
              <div className="flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100 mb-2">Tab Switch Detection</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Flags and counts student tab switches, minimizing, or window unfocus, highlighting incidents for administrators.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100 mb-2">Anti-Copy Clipboard Lock</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Copy, paste, cut, and browser context menus are strictly locked within the testing console to ensure integrity.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100 mb-2">Realtime Alerts</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Instantly notifies students when tests go live or results are declared, with direct transition to attempts.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100 mb-2">Submissions Monitoring</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Live dashboards reveal average scores, high scores, time spent, and student answer copies in real time.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <FileQuestion className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100 mb-2">Dynamic Question Filtering</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Curate topic and question pools cleanly using grade, classwise, subject, and difficulty classification.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100 mb-2">Structured Seeding</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Automated startup integrity migrations assign subjects and encrypt password payloads for secure access.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider transition-colors duration-200">
        © 2026 Parikshya. All rights reserved.
      </footer>
    </div>
  );
};

