import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  LayoutDashboard, Building2, User, Settings, LogOut, Sun, Moon,
  Menu, X, Bell, ChevronRight, LifeBuoy
} from "lucide-react";

const nav = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Organizations", href: "/organizations", icon: Building2 },
  { name: "My profile", href: "/profile", icon: User },
  { name: "Platform settings", href: "/settings", icon: Settings },
];

export const AppLayout: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(
    (localStorage.getItem("theme") as "dark" | "light") || "light"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const logout = () => { clearAuth(); navigate("/login"); };
  const active = (href: string) =>
    href === "/dashboard" ? location.pathname === href : location.pathname.startsWith(href);

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="h-24 px-7 flex items-center">
        <Link to="/dashboard" className="brand-mark" onClick={() => setMenuOpen(false)}>
          <span className="brand-glyph" aria-hidden="true">
            <i className="brand-block" />
            <i className="brand-swoop brand-swoop-one" />
            <i className="brand-swoop brand-swoop-two" />
            <i className="brand-dot" />
          </span>
          <span><b>Parikshya</b><small>ADMIN CONSOLE</small></span>
        </Link>
        <button className="ml-auto lg:hidden icon-button" onClick={() => setMenuOpen(false)}><X size={18}/></button>
      </div>

      <nav className="px-4 pt-5 flex-1">
        <p className="nav-caption">Workspace</p>
        <div className="space-y-1">
          {nav.map(({ name, href, icon: Icon }) => (
            <Link key={href} to={href} onClick={() => setMenuOpen(false)}
              className={`nav-link ${active(href) ? "is-active" : ""}`}>
              <Icon size={18} strokeWidth={1.8}/><span>{name}</span>
              {active(href) && <ChevronRight size={15} className="ml-auto"/>}
            </Link>
          ))}
        </div>
      </nav>

      <div className="px-4 pb-5">
        <div className="support-card">
          <LifeBuoy size={18}/>
          <div><b>Need a hand?</b><span>View admin guide</span></div>
          <ChevronRight size={14} className="ml-auto"/>
        </div>
        <button onClick={logout} className="nav-link logout-link">
          <LogOut size={18}/><span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar hidden lg:block"><Sidebar/></aside>
      {menuOpen && (
        <div className="mobile-drawer lg:hidden" onClick={() => setMenuOpen(false)}>
          <aside onClick={e => e.stopPropagation()}><Sidebar/></aside>
        </div>
      )}

      <div className="main-column">
        <header className="topbar">
          <button className="icon-button lg:hidden" onClick={() => setMenuOpen(true)}><Menu size={20}/></button>
          <div className="topbar-context hidden sm:block">
            <span>Parikshya network</span><b>Platform administration</b>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18}/><i/></button>
            <button className="profile-chip" onClick={() => navigate("/profile")}>
              <span className="avatar">{user?.profilePicture ? <img src={user.profilePicture} alt=""/> : (user?.name?.[0] || "A")}</span>
              <span className="hidden sm:block"><b>{user?.name || "Admin user"}</b><small>Super administrator</small></span>
            </button>
          </div>
        </header>
        <main className="page-canvas"><Outlet/></main>
      </div>
    </div>
  );
};
