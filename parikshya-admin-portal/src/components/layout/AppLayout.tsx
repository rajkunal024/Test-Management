import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  LayoutDashboard,
  Building2,
  User,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Shield,
  ChevronDown,
  Bell,
  FileText
} from "lucide-react";

export const AppLayout: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(
    (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const navigationItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Organizations", href: "/organizations", icon: Building2 },
    { name: "Profile", href: "/profile", icon: User },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-[#f4f6fa] text-slate-900 dark:bg-[#06080c] dark:text-[#E2E8F0] font-body transition-colors duration-300 relative overflow-hidden">
      {/* Soft Background Ambient Glow Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-indigo-500/10 dark:bg-indigo-950/15 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[-10%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full bg-purple-500/8 dark:bg-purple-950/10 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[20%] w-[45vw] h-[45vw] max-w-[500px] max-h-[500px] rounded-full bg-blue-500/8 dark:bg-blue-950/10 blur-[100px] pointer-events-none z-0" />

      {/* Sweeping Orbit Lines for Dashboard background */}
      <div className="absolute top-[-10%] right-[-20%] w-[80vw] h-[80vw] max-w-[1000px] rounded-full border-r-[1.5px] border-t-[1.5px] border-indigo-500/10 dark:border-indigo-500/5 rotate-[45deg] pointer-events-none z-0 shadow-[0_0_80px_rgba(99,102,241,0.02)]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[70vw] h-[70vw] max-w-[900px] rounded-full border-l-[1.5px] border-b-[1.5px] border-purple-500/10 dark:border-purple-500/5 -rotate-[45deg] pointer-events-none z-0" />

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white/40 dark:bg-[#0B0E14]/40 border-r border-slate-200/30 dark:border-[#161B26]/30 backdrop-blur-xl z-30 transition-all duration-300">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-200/30 dark:border-[#161B26]/30">
          <Link to="/dashboard" className="flex items-center gap-2 text-blue-600 dark:text-blue-500 hover:opacity-85 transition">
            <span className="relative h-7 w-8 shrink-0">
              <span className="absolute left-0 top-1 h-4 w-4 rounded-sm border-2 border-blue-600 bg-blue-500" />
              <span className="absolute left-2 top-0 h-2 w-7 rounded-full border-t-2 border-slate-950 dark:border-slate-100" />
              <span className="absolute left-4 top-1 h-3 w-9 rounded-full border-t-2 border-slate-950 dark:border-slate-100" />
              <span className="absolute left-1.5 top-2.5 h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            <span className="font-title font-extrabold text-3xl leading-none tracking-normal text-blue-600 dark:text-blue-400">
              Parikshya
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                  active
                    ? "bg-gradient-to-r from-[#4B52DC] to-[#7C3AED] text-white shadow-lg shadow-indigo-650/15"
                    : "text-slate-500 dark:text-[#8e92a8] hover:bg-slate-100/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200/30 dark:border-[#161B26]/30">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-red-650 dark:text-red-400 bg-red-50/60 hover:bg-red-100/60 dark:bg-red-950/10 dark:hover:bg-red-950/20 border border-red-100/50 dark:border-red-900/20 transition-all duration-150 shadow-sm"
          >
            <LogOut className="w-4.5 h-4.5" />
            LogoUT
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <aside
            className="w-64 max-w-xs h-full bg-white/90 dark:bg-[#0B0E14]/90 flex flex-col z-50 relative border-r border-slate-200/30 dark:border-[#161B26]/30 animate-slide-in backdrop-blur-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200/30 dark:border-[#161B26]/30">
              <div className="flex items-center gap-3">
                <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 text-blue-600 dark:text-blue-500 hover:opacity-85 transition">
                  <span className="relative h-7 w-8 shrink-0">
                    <span className="absolute left-0 top-1 h-4 w-4 rounded-sm border-2 border-blue-600 bg-blue-500" />
                    <span className="absolute left-2 top-0 h-2 w-7 rounded-full border-t-2 border-slate-950 dark:border-slate-100" />
                    <span className="absolute left-4 top-1 h-3 w-9 rounded-full border-t-2 border-slate-950 dark:border-slate-100" />
                    <span className="absolute left-1.5 top-2.5 h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  <span className="font-title font-extrabold text-3xl leading-none tracking-normal text-blue-600 dark:text-blue-400">Parikshya</span>
                </Link>
              </div>
              <button
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-white/65 dark:hover:bg-white/5"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-r from-[#4B52DC] to-[#7C3AED] text-white shadow-md shadow-indigo-650/10"
                        : "text-slate-500 dark:text-[#8e92a8] hover:bg-slate-100/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200/30 dark:border-[#161B26]/30">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-red-650 dark:text-red-400 bg-red-50/60 hover:bg-red-100/60 dark:bg-red-950/10 dark:hover:bg-red-950/20 border border-red-100/50 dark:border-red-900/20 transition-all duration-150 shadow-sm"
              >
                <LogOut className="w-4.5 h-4.5" />
                LogoUT
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-screen relative z-10">
        {/* Header */}
        <header className="h-16 bg-transparent flex items-center justify-between px-6 lg:px-8 sticky top-0 z-20 backdrop-blur-sm">
          <button
            className="lg:hidden p-2 rounded-xl text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#121824] transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:block">
            <h2 className="text-[10px] font-extrabold tracking-widest text-[#4B52DC] dark:text-[#818cf8] uppercase">
              Parikshya Admin Control Workspace
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full bg-white dark:bg-[#0B0E14] border border-slate-200/60 dark:border-[#161B26] shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-[#4B52DC] dark:hover:text-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5 text-[#4B52DC]" />}
            </button>

            {/* Notification Bell */}
            <button
              className="w-10 h-10 rounded-full bg-white dark:bg-[#0B0E14] border border-slate-200/60 dark:border-[#161B26] shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-[#4B52DC] dark:hover:text-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
            </button>

            {/* Profile Info Display Pill */}
            <div
              onClick={() => navigate("/change-password")}
              className="bg-white dark:bg-[#0B0E14] border border-slate-200/60 dark:border-[#161B26] shadow-sm pl-2.5 pr-4 py-1.5 rounded-full flex items-center gap-3 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-[#4B52DC] font-extrabold text-white text-xs shadow-inner">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="PA" className="w-full h-full object-cover" />
                ) : (
                  <span>PA</span>
                )}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {user?.name || "Parikshya Admin User"}
                </p>
                <p className="text-[9px] text-[#6b7280] dark:text-slate-500 font-semibold font-mono mt-0.5 tracking-wide leading-none">
                  {user?.email || "admin@parikshya.com"}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in animate-duration-300 relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
