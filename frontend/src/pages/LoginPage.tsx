import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "../services/api";
import { useLogin } from "../hooks/useAuth";
import { Logo } from "../components/layout/Logo";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

const LoginIllustration = () => (
  <div className="relative h-[460px] w-[520px] max-w-full">
    <div className="absolute left-[120px] top-[210px] h-4 w-[470px] rounded-full bg-slate-500" />
    <div className="absolute left-[150px] top-[224px] h-[150px] w-px bg-slate-500" />
    <div className="absolute left-[396px] top-[224px] h-[150px] w-px bg-slate-500" />
    <div className="absolute left-[84px] top-[224px] h-[150px] w-px bg-slate-500" />
    <div className="absolute left-[512px] top-[224px] h-[150px] w-px bg-slate-500" />
    <div className="absolute left-[212px] top-[58px] h-[284px] w-[64px] border-x border-slate-950" />
    <div className="absolute left-[194px] top-[38px] h-9 w-[100px] rounded-sm bg-blue-200" />
    <div className="absolute left-[166px] top-[38px] h-1.5 w-[158px] rounded-full bg-blue-200" />
    <div className="absolute left-[196px] top-[342px] h-24 w-[96px] border-x border-slate-950" />
    <div className="absolute left-[195px] top-[424px] h-6 w-[74px] rounded-sm bg-blue-200" />
    <div className="absolute left-[167px] top-[450px] h-1.5 w-[104px] rounded-full bg-blue-200" />
    <div className="absolute left-[115px] top-[155px] h-32 w-40 -skew-x-12 rounded bg-slate-200" />
    <div className="absolute left-[222px] top-[112px] h-2.5 w-2.5 rounded-full bg-black" />
    <div className="absolute left-[260px] top-[112px] h-2.5 w-2.5 rounded-full bg-black" />
    <div className="absolute left-[240px] top-[150px] h-1.5 w-1.5 rounded-full bg-black" />
    <div className="absolute left-[220px] top-[170px] h-8 w-28 rounded-b-full border-b border-slate-950" />
    <div className="absolute left-[282px] top-[185px] h-20 w-[92px] rounded-r-full border border-l-0 border-slate-950" />
    <div className="absolute left-[302px] top-[188px] h-6 w-14 rounded-full border border-slate-950 bg-[#f7faff]" />
    <div className="absolute left-[198px] top-[206px] h-16 w-16 rounded-l-full border border-r-0 border-slate-950" />
    <div className="absolute left-[210px] top-[252px] h-56 w-72 rounded-t-full border-t border-slate-950" />
    <div className="absolute left-[198px] top-[465px] h-4 w-72 border-t border-slate-950" />
    <div className="absolute left-[54px] top-[75px] h-5 w-5 before:absolute before:left-2 before:top-0 before:h-5 before:w-px before:bg-slate-600 after:absolute after:left-0 after:top-2 after:h-px after:w-5 after:bg-slate-600" />
    <div className="absolute right-[70px] top-[188px] h-4 w-4 rounded-full border border-slate-950" />
    <div className="absolute right-[8px] top-[260px] h-4 w-4 before:absolute before:left-2 before:top-0 before:h-4 before:w-px before:bg-slate-600 after:absolute after:left-0 after:top-2 after:h-px after:w-4 after:bg-slate-600" />
  </div>
);

export const LoginPage = () => {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!userId.trim() || !password.trim()) {
      setError("User ID and password are required.");
      return;
    }
    try {
      await loginMutation.mutateAsync({ userId, password });
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#f7faff] lg:grid-cols-[48%_52%]">
      <section className="hidden items-center justify-center lg:flex">
        <LoginIllustration />
      </section>
      <section className="flex items-center justify-center border-l-4 border-slate-500 bg-white p-6">
        <form onSubmit={submit} className="flex min-h-[calc(100vh-48px)] w-full max-w-[720px] flex-col justify-center rounded-md border border-primary-300 px-6 py-10 md:px-[14%]">
          <div className="mb-12">
            <Logo />
          </div>
          <h1 className="mb-7 text-xl font-bold text-slate-700">Login</h1>
          <p className="mb-9 text-sm text-slate-600">Use your company provided Login credentials</p>
          <div className="space-y-6">
            <Input label="User ID" placeholder="Enter User ID" value={userId} onChange={(event) => setUserId(event.target.value)} />
            <Input
              label="Password"
              placeholder="Enter Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <button type="button" className="mt-6 self-start text-sm font-medium text-primary-600">
            Forgot password?
          </button>
          {error ? <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p> : null}
          <Button className="mt-8 w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Logging in..." : "Login"}
          </Button>
        </form>
      </section>
    </main>
  );
};
