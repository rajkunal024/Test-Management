import { FormEvent, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getErrorMessage, signupAdmin } from "../services/api";
import { useLogin } from "../hooks/useAuth";
import { Logo } from "../components/layout/Logo";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PasswordInput } from "../components/ui/PasswordInput";

const LoginIllustration = () => (
  <div className="relative h-[460px] w-[520px] max-w-full">
    <div className="absolute left-[120px] top-[210px] h-4 w-[470px] rounded-full bg-slate-500 dark:bg-slate-700" />
    <div className="absolute left-[150px] top-[224px] h-[150px] w-px bg-slate-500 dark:bg-slate-700" />
    <div className="absolute left-[396px] top-[224px] h-[150px] w-px bg-slate-500 dark:bg-slate-700" />
    <div className="absolute left-[84px] top-[224px] h-[150px] w-px bg-slate-500 dark:bg-slate-700" />
    <div className="absolute left-[512px] top-[224px] h-[150px] w-px bg-slate-500 dark:bg-slate-700" />
    <div className="absolute left-[212px] top-[58px] h-[284px] w-[64px] border-x border-slate-950 dark:border-slate-700" />
    <div className="absolute left-[194px] top-[38px] h-9 w-[100px] rounded-sm bg-blue-200 dark:bg-blue-950/40" />
    <div className="absolute left-[166px] top-[38px] h-1.5 w-[158px] rounded-full bg-blue-200 dark:bg-blue-950/40" />
    <div className="absolute left-[196px] top-[342px] h-24 w-[96px] border-x border-slate-950 dark:border-slate-700" />
    <div className="absolute left-[195px] top-[424px] h-6 w-[74px] rounded-sm bg-blue-200 dark:bg-blue-950/40" />
    <div className="absolute left-[167px] top-[450px] h-1.5 w-[104px] rounded-full bg-blue-200 dark:bg-blue-950/40" />
    <div className="absolute left-[115px] top-[155px] h-32 w-40 -skew-x-12 rounded bg-slate-200 dark:bg-slate-800" />
    <div className="absolute left-[222px] top-[112px] h-2.5 w-2.5 rounded-full bg-black dark:bg-white" />
    <div className="absolute left-[260px] top-[112px] h-2.5 w-2.5 rounded-full bg-black dark:bg-white" />
    <div className="absolute left-[240px] top-[150px] h-1.5 w-1.5 rounded-full bg-black dark:bg-white" />
    <div className="absolute left-[220px] top-[170px] h-8 w-28 rounded-b-full border-b border-slate-950 dark:border-slate-700" />
    <div className="absolute left-[282px] top-[185px] h-20 w-[92px] rounded-r-full border border-l-0 border-slate-950 dark:border-slate-700" />
    <div className="absolute left-[302px] top-[188px] h-6 w-14 rounded-full border border-slate-950 dark:border-slate-700 bg-[#f7faff] dark:bg-slate-900" />
    <div className="absolute left-[198px] top-[206px] h-16 w-16 rounded-l-full border border-r-0 border-slate-950 dark:border-slate-700" />
    <div className="absolute left-[210px] top-[252px] h-56 w-72 rounded-t-full border-t border-slate-950 dark:border-slate-700" />
    <div className="absolute left-[198px] top-[465px] h-4 w-72 border-t border-slate-950 dark:border-slate-700" />
    <div className="absolute left-[54px] top-[75px] h-5 w-5 before:absolute before:left-2 before:top-0 before:h-5 before:w-px before:bg-slate-600 dark:before:bg-slate-400 after:absolute after:left-0 after:top-2 after:h-px after:w-5 after:bg-slate-600 dark:after:bg-slate-400" />
    <div className="absolute right-[70px] top-[188px] h-4 w-4 rounded-full border border-slate-950 dark:border-slate-700" />
    <div className="absolute right-[8px] top-[260px] h-4 w-4 before:absolute before:left-2 before:top-0 before:h-4 before:w-px before:bg-slate-600 dark:before:bg-slate-400 after:absolute after:left-0 after:top-2 after:h-px after:w-4 after:bg-slate-600 dark:after:bg-slate-400" />
  </div>
);

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

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#f7faff] dark:bg-slate-950 lg:grid-cols-[48%_52%] transition-colors duration-200">
      <section className="hidden items-center justify-center lg:flex bg-slate-50/50 dark:bg-slate-950/20">
        <LoginIllustration />
      </section>
      <section className="flex items-center justify-center border-l-4 border-slate-500 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-colors duration-200">
        <form onSubmit={submit} className="flex min-h-[calc(100vh-48px)] w-full max-w-[720px] flex-col justify-center rounded-md border border-primary-300 dark:border-slate-800 px-6 py-10 md:px-[14%] bg-white dark:bg-slate-900 transition-colors duration-200">
          <div className="mb-12">
            <Logo />
          </div>
          <h1 className="mb-7 text-xl font-bold text-slate-700 dark:text-slate-200">
            {isSignUp ? "Admin Sign Up" : `Sign In as ${role}`}
          </h1>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
            {isSignUp
              ? "Fill in your details and enter the registration key to register a new admin account"
              : `Use your ${role.toLowerCase()} credentials to login`}
          </p>
          
          {isSignUp ? (
            <div className="space-y-6">
              <Input label="Full Name" placeholder="Enter Full Name" value={adminName} onChange={(event) => setAdminName(event.target.value)} />
              <Input label="User ID (Username)" placeholder="Enter User ID" value={userId} onChange={(event) => setUserId(event.target.value)} />
              <PasswordInput
                label="Password"
                placeholder="Enter Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <PasswordInput
                label="Admin Registration Key"
                placeholder="Enter signup key (roar)"
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <Input label="User ID" placeholder="Enter User ID" value={userId} onChange={(event) => setUserId(event.target.value)} />
              <PasswordInput
                label="Password"
                placeholder="Enter Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            {role === "Admin" && (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                  setSuccessMessage("");
                }}
                className="self-start text-sm font-medium text-[#6c7df7] dark:text-indigo-400 hover:underline"
              >
                {isSignUp ? "Already have an admin account? Login" : "Don't have an admin account? Sign Up"}
              </button>
            )}
            {!isSignUp && (
              <button type="button" className="self-start text-sm font-medium text-[#6c7df7] dark:text-indigo-400 hover:underline">
                Forgot password?
              </button>
            )}
          </div>

          {successMessage && <p className="mt-4 rounded-md bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-450">{successMessage}</p>}
          {error && <p className="mt-4 rounded-md bg-rose-50 dark:bg-rose-950/20 px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-450">{error}</p>}
          
          <Button className="mt-8 w-full" disabled={loginMutation.isPending || isSignUp && !adminName}>
            {isSignUp ? "Sign Up" : (loginMutation.isPending ? "Logging in..." : "Login")}
          </Button>
        </form>
      </section>
    </main>
  );
};

