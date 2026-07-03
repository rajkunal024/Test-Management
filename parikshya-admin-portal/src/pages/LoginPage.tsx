import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Moon, ShieldCheck, Sun } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import api from "../services/api";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(
    (localStorage.getItem("theme") as "dark" | "light") || "light"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (token) {
      const from = (location.state as any)?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [token, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.data.success && response.data.data.token) {
        setAuth(response.data.data.token, rememberMe);
        navigate((location.state as any)?.from?.pathname || "/dashboard", { replace: true });
      } else {
        setError(response.data.message || "Login failed. Please check your credentials.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "We could not reach the authentication server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-story-top">
          <div className="brand-mark login-brand">
            <span className="brand-glyph" aria-hidden="true">
              <i className="brand-block"/><i className="brand-swoop brand-swoop-one"/>
              <i className="brand-swoop brand-swoop-two"/><i className="brand-dot"/>
            </span>
            <span><b>Parikshya</b><small>ADMIN CONSOLE</small></span>
          </div>
          <span className="secure-label"><ShieldCheck size={15}/> Secured workspace</span>
        </div>

        <div className="login-story-copy">
          <span className="eyebrow">Platform administration</span>
          <h1>Make every assessment count.</h1>
          <p>Manage institutions, protect exam integrity, and keep your entire assessment network moving from one calm workspace.</p>
          <div className="login-benefits">
            <span><Check size={15}/> Organization-wide oversight</span>
            <span><Check size={15}/> Real-time security controls</span>
            <span><Check size={15}/> Actionable platform insights</span>
          </div>
        </div>

        <div className="login-story-footer">
          <span>Parikshya Operations</span><span>•</span><span>Secure by design</span>
        </div>
      </section>

      <section className="login-form-side">
        <button className="login-theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
          {theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}
        </button>

        <div className="login-card">
          <div className="login-mobile-brand brand-mark">
            <span className="brand-glyph" aria-hidden="true">
              <i className="brand-block"/><i className="brand-swoop brand-swoop-one"/>
              <i className="brand-swoop brand-swoop-two"/><i className="brand-dot"/>
            </span>
            <span><b>Parikshya</b><small>ADMIN CONSOLE</small></span>
          </div>

          <div className="login-heading">
            <span className="login-lock"><LockKeyhole size={20}/></span>
            <h2>Welcome back</h2>
            <p>Sign in with your administrator credentials.</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <label>
              <span>Email address</span>
              <input type="email" required autoComplete="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="Enter Your email"/>
            </label>
            <label>
              <span>Password</span>
              <div className="password-field">
                <input type={showPassword ? "text" : "password"} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Show password">
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </label>

            <div className="login-options">
              <label className="remember-control">
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}/>
                <span>Keep me signed in</span>
              </label>
              <button type="button" className="text-action" onClick={() => navigate("/forgot-password")}>Forgot password?</button>
            </div>

            <button type="submit" className="login-submit" disabled={isLoading}>
              <span>{isLoading ? "Signing in…" : "Sign in to console"}</span>
              {!isLoading && <ArrowRight size={18}/>}
            </button>
          </form>
          <p className="login-help">Having trouble? Contact your platform owner.</p>
        </div>
      </section>
    </main>
  );
};
