import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Search, Trash2, Users, BookOpen, ClipboardList, GraduationCap, ShieldCheck, Settings, Calendar, ChevronDown } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout/AppShell";
import { DynamicLogo } from "../components/layout/DynamicLogo";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { deleteTest, getErrorMessage, getAdminUsers, getSubjects, getMyOrganization } from "../services/api";
import { useTests } from "../hooks/useTests";
import { Test } from "../types";
import { useAuthStore } from "../store/authStore";
import { StudentDashboard } from "./StudentDashboard";
import { TeacherDashboard } from "./TeacherDashboard";

const FEATURE_LABELS: Record<string, string> = {
  cameraMonitoring: "Camera Monitoring",
  microphoneMonitoring: "Microphone Monitoring",
  fullscreenMode: "Strict Fullscreen Mode",
  tabSwitchingDetection: "Tab Switching Detection",
  screenSharingDetection: "Screen Sharing Interception",
  copyPasteDisabled: "Disable Copy-Paste",
  rightClickDisabled: "Disable Right Click",
  developerToolsDetection: "Developer Tools Detection",
  multipleMonitorDetection: "Multiple Monitor Detection",
  faceDetection: "Face Detection",
  browserLock: "Browser Lock",
  autoSave: "Auto-Save Progress",
  screenRecordingDetection: "Screen Recording Detection",
  printDisabled: "Disable Printing",
};

const AdminDashboard = () => {
  const user = useAuthStore((state) => state.user);

  const { data: tests = [], isLoading, error } = useTests();
  const { data: orgData } = useQuery({
    queryKey: ["myOrganization"],
    queryFn: getMyOrganization,
    enabled: user?.role === "Admin",
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Test | null>(null);

  const [activeTab, setActiveTab] = useState<"tests" | "features">("tests");

  // Fetch admin users for stats
  const { data: adminUsers = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: getAdminUsers,
    enabled: user?.role === "Admin",
  });

  // Fetch subjects for stats
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: getSubjects,
    enabled: user?.role === "Admin",
  });

  const queryClient = useQueryClient();

  const [currentTime, setCurrentTime] = useState(new Date().getTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().getTime());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const getTestStatus = (test: Test): "draft" | "live" | "completed" | "upcoming" => {
    if (test.status === "draft") {
      return "draft";
    }
    const start = test.start_time ? new Date(test.start_time).getTime() : 0;
    const end = test.end_time ? new Date(test.end_time).getTime() : Infinity;

    if (start && currentTime < start) {
      return "upcoming";
    }
    if (currentTime > end) {
      return "completed";
    }
    return "live";
  };

  const isTestStarted = (test: Test): boolean => {
    if (getTestStatus(test) === "upcoming") {
      return false;
    }
    if (test.status === "live") {
      return true;
    }
    if (test.status === "scheduled" && test.start_time) {
      const start = new Date(test.start_time).getTime();
      return currentTime >= start;
    }
    return false;
  };

  const filteredTests = useMemo(() => {
    const filtered = tests.filter((test) => {
      const matchesName = test.name.toLowerCase().includes(search.toLowerCase());
      const statusVal = getTestStatus(test);
      const matchesStatus = status === "all" || statusVal === status;
      return matchesName && matchesStatus;
    });

    const getTestCreationTime = (test: typeof tests[0]) => {
      if (test.created_at) {
        return new Date(test.created_at).getTime();
      }
      if (test.id && test.id.startsWith("test-")) {
        const tsStr = test.id.substring(5);
        const ts = parseInt(tsStr, 10);
        if (!isNaN(ts)) return ts;
      }
      return 0;
    };

    return filtered.sort((a, b) => {
      const timeA = getTestCreationTime(a);
      const timeB = getTestCreationTime(b);
      return timeB - timeA;
    });
  }, [tests, search, status, currentTime]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTest(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
  });

  return (
    <AppShell>
      <PageWrapper>
        {/* ── ADMIN COMMAND CENTER HERO ── */}
        <div className="admin-hero mb-6 p-6 sm:p-8">
          {/* Extra cyan glow bottom-left */}
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-48 w-48 rounded-full" style={{background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)'}} />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex-1 min-w-0">
              {/* Top tag line */}
              <div className="mb-3 inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-[9px] sm:text-[10px] font-black uppercase tracking-[0.14em]" style={{background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc'}}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                PARIKSHYA · ADMIN CONTROL CENTER
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                {orgData?.name || user?.organizationName || "Organization"}<br />
                <span style={{background: 'linear-gradient(90deg, #a5b4fc, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}} className="text-xl sm:text-2xl font-black">Testing Platform Dashboard</span>
              </h1>
              <p className="mt-2.5 text-xs sm:text-sm leading-relaxed max-w-lg" style={{color: 'rgba(203,213,225,0.7)'}}>
                Supervise test configurations, manage student & faculty accounts, configure academic sessions, and monitor live proctoring activity.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <span className="inline-flex items-center gap-2 text-[10px] font-bold rounded-lg px-3 py-1.5" style={{background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8'}}>
                  <ShieldCheck className="h-3.5 w-3.5" style={{color: '#818cf8'}} />
                  {user?.name || 'Administrator'} · Platform Admin
                </span>
                <span className="inline-flex items-center gap-2 text-[10px] font-bold rounded-lg px-3 py-1.5" style={{background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8'}}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Engine v1.2.0 · Online
                </span>
              </div>
            </div>

            {/* Command icon box */}
            <div className="shrink-0 h-20 w-20 rounded-2xl flex flex-col items-center justify-center gap-1" style={{background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)'}}>
              <Settings className="h-8 w-8 animate-[spin_20s_linear_infinite]" style={{color: '#818cf8'}} />
              <span className="text-[8px] font-black uppercase tracking-widest" style={{color: '#6366f1'}}>ADMIN</span>
            </div>
          </div>
        </div>

        {/* ── COMMAND CENTER STATS ── */}
        <section className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Students', value: adminUsers.filter(u => u.role === 'Student').length, icon: Users, tag: 'Enrolled', accent: '#6366f1', glow: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.2)' },
            { label: 'Faculty', value: adminUsers.filter(u => u.role === 'Teacher').length, icon: GraduationCap, tag: 'Active', accent: '#10b981', glow: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.2)' },
            { label: 'Subjects', value: subjects.length, icon: BookOpen, tag: 'Curricula', accent: '#f59e0b', glow: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.2)' },
            { label: 'Tests', value: tests.length, icon: ClipboardList, tag: 'Configured', accent: '#8b5cf6', glow: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.2)' },
          ].map(({ label, value, icon: Icon, tag, accent, glow, border }) => (
            <article key={label} className="admin-stat-card p-4 sm:p-5 flex flex-col gap-3">
              <div className="card-accent-bar" style={{background: `linear-gradient(90deg, ${accent}, transparent)`}} />
              <div className="flex items-start justify-between gap-2">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{background: glow, border: `1px solid ${border}`}}>
                  <Icon className="h-5 w-5" style={{color: accent}} />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-full px-2 py-1" style={{background: glow, color: accent, border: `1px solid ${border}`}}>{tag}</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{color: accent}}>{label}</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight font-mono">{value}</h3>
              </div>
            </article>
          ))}
        </section>

        {/* ── ADMIN TAB BAR ── */}
        <div className="admin-tab-bar mb-6">
          <button type="button" onClick={() => setActiveTab("tests")} className={`admin-tab ${activeTab === 'tests' ? 'active' : ''}`}>
            <ClipboardList className="h-4 w-4" />
            Test Configurations
          </button>
          <button type="button" onClick={() => setActiveTab("features")} className={`admin-tab ${activeTab === 'features' ? 'active' : ''}`}>
            <ShieldCheck className="h-4 w-4" />
            Org Features
          </button>
        </div>

        {activeTab === "tests" && (
          <>
            {/* ── Test Configurations Section Header ── */}
            <div className="admin-section-card mb-3">
              <div className="admin-section-header">
                <div className="admin-section-icon">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">Test Configurations</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Create, schedule and monitor exam slots across all subjects.</p>
                </div>
                <Link to="/tests/create" className="shrink-0">
                  <button className="admin-btn-primary">
                    <Plus className="h-3.5 w-3.5" />
                    New Test
                  </button>
                </Link>
              </div>

              {/* Filter toolbar */}
              <div className="p-4 flex gap-3 flex-wrap items-center border-b border-[#e8ecff] dark:border-[rgba(99,102,241,0.12)]">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    className="admin-search"
                    placeholder="Search by test name..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <div className="relative shrink-0">
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="admin-select"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="live">Live</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Mobile / Card View */}
            <div className="space-y-3 mb-8 lg:hidden">
              {isLoading ? (
                <div className="admin-section-card p-10 text-center">
                  <Spinner /><span className="ml-2 text-sm text-slate-500">Loading tests...</span>
                </div>
              ) : error ? (
                <div className="p-6 rounded-2xl text-center text-rose-500 text-xs font-semibold" style={{background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)'}}>{getErrorMessage(error)}</div>
              ) : filteredTests.length === 0 ? (
                <div className="admin-section-card p-12 text-center text-slate-400 dark:text-slate-500 text-sm font-semibold">No tests found matching your criteria.</div>
              ) : (
                filteredTests.map((test) => {
                  const statusVal = getTestStatus(test);
                  const started = isTestStarted(test);
                  const statusAccent = { live: '#10b981', upcoming: '#f59e0b', completed: '#6366f1', draft: '#94a3b8' }[statusVal] || '#94a3b8';

                  return (
                    <article key={test.id} className="admin-section-card overflow-hidden">
                      {/* Accent bar */}
                      <div className="h-1 w-full" style={{background:`linear-gradient(90deg, ${statusAccent}, transparent)`}} />
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">{test.name}</h3>
                          <button type="button" onClick={() => setDeleteTarget(test)} disabled={started}
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition disabled:opacity-30 cursor-pointer shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-md" style={{background:'rgba(99,102,241,0.08)', color:'#6366f1', border:'1px solid rgba(99,102,241,0.15)'}}>
                            {Array.isArray(test.subject) ? test.subject.join(', ') : test.subject}
                          </span>
                          {statusVal === 'live' && <span className="admin-badge-live"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />LIVE</span>}
                          {statusVal === 'upcoming' && <span className="admin-badge-upcoming">UPCOMING</span>}
                          {statusVal === 'completed' && <span className="admin-badge-completed">DONE</span>}
                          {statusVal === 'draft' && <span className="admin-badge-draft">DRAFT</span>}
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            <Calendar className="h-3 w-3" />
                            {new Date(test.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#e8ecff] dark:border-[rgba(99,102,241,0.1)]">
                          <Link to={`/tests/${test.id}/preview`} className="w-full">
                            <button type="button" className="w-full py-2 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer">View</button>
                          </Link>
                          {started ? <button disabled className="w-full py-2 rounded-lg text-[10px] font-black text-slate-300 dark:text-slate-600 border border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed">Edit</button>
                            : <Link to={`/tests/${test.id}/edit`} className="w-full"><button type="button" className="w-full py-2 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer">Edit</button></Link>}
                          {started ? <button disabled className="w-full py-2 rounded-lg text-[10px] font-black text-slate-300 dark:text-slate-600 border border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed">Qs</button>
                            : <Link to={`/tests/${test.id}/questions`} className="w-full"><button type="button" className="w-full py-2 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer">Qs</button></Link>}
                          <Link to={`/tests/${test.id}/monitor`} className="w-full">
                            <button type="button" className="w-full py-2 rounded-lg text-[10px] font-black text-indigo-600 dark:text-indigo-400 border cursor-pointer transition" style={{background:'rgba(99,102,241,0.08)', borderColor:'rgba(99,102,241,0.2)'}}>Monitor</button>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <section className="hidden lg:block admin-section-card overflow-hidden mb-10">
              <table className="w-full min-w-[760px] text-left text-sm admin-table">
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td className="py-12 text-center text-slate-500" colSpan={5}><Spinner /><span className="ml-2">Loading...</span></td></tr>
                  ) : error ? (
                    <tr><td className="py-12 text-center text-rose-500 font-semibold" colSpan={5}>{getErrorMessage(error)}</td></tr>
                  ) : filteredTests.length === 0 ? (
                    <tr><td className="py-12 text-center text-slate-400 font-medium" colSpan={5}>No test configurations match your search criteria.</td></tr>
                  ) : (
                    filteredTests.map((test) => {
                      const statusVal = getTestStatus(test);
                      return (
                        <tr key={test.id}>
                          <td className="font-bold text-slate-800 dark:text-slate-100 text-sm">{test.name}</td>
                          <td>
                            <span className="text-[10px] font-bold rounded-md px-2.5 py-1" style={{background:'rgba(99,102,241,0.08)', color:'#6366f1', border:'1px solid rgba(99,102,241,0.15)'}}>
                              {Array.isArray(test.subject) ? test.subject.join(', ') : test.subject}
                            </span>
                          </td>
                          <td>
                            {statusVal === 'live' && <span className="admin-badge-live"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Live</span>}
                            {statusVal === 'upcoming' && <span className="admin-badge-upcoming">Upcoming</span>}
                            {statusVal === 'completed' && <span className="admin-badge-completed">Completed</span>}
                            {statusVal === 'draft' && <span className="admin-badge-draft">Draft</span>}
                          </td>
                          <td className="text-xs text-slate-500 dark:text-slate-400 font-medium">{new Date(test.created_at).toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'})}</td>
                          <td>
                            <div className="flex flex-wrap gap-1.5">
                              <Link to={`/tests/${test.id}/preview`}>
                                <button className="h-8 px-3 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">View</button>
                              </Link>
                              {isTestStarted(test) ? (
                                <button disabled className="h-8 px-3 rounded-lg text-xs font-bold text-slate-300 dark:text-slate-600 border border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed flex items-center gap-1"><Pencil className="h-3 w-3" />Edit</button>
                              ) : (
                                <Link to={`/tests/${test.id}/edit`}><button className="h-8 px-3 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"><Pencil className="h-3 w-3" />Edit</button></Link>
                              )}
                              {isTestStarted(test) ? (
                                <button disabled className="h-8 px-3 rounded-lg text-xs font-bold text-slate-300 dark:text-slate-600 border border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed">Questions</button>
                              ) : (
                                <Link to={`/tests/${test.id}/questions`}><button className="h-8 px-3 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">Questions</button></Link>
                              )}
                              <Link to={`/tests/${test.id}/monitor`}>
                                <button className="h-8 px-3 rounded-lg text-xs font-bold cursor-pointer transition" style={{color:'#6366f1', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)'}}>Monitor</button>
                              </Link>
                              {isTestStarted(test) ? (
                                <button disabled className="h-8 px-3 rounded-lg text-xs font-bold text-slate-300 opacity-50 cursor-not-allowed flex items-center gap-1"><Trash2 className="h-3 w-3" />Delete</button>
                              ) : (
                                <button onClick={() => setDeleteTarget(test)} className="h-8 px-3 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-1 transition cursor-pointer"><Trash2 className="h-3 w-3" />Delete</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}

        {/* Organization Features View */}
        {activeTab === "features" && (
          <div className="space-y-6 animate-fade-in text-slate-700 dark:text-slate-300">
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-indigo-500 animate-pulse" />
                Organization Settings & Security Policies
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                View your organization profile and active security features configured by the Parikshya Administrator.
              </p>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              {/* Profile Card */}
              <div className="lg:col-span-1 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-6 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-extrabold text-3xl shadow-md overflow-hidden shrink-0">
                  {orgData?.logo ? (
                    <DynamicLogo src={orgData.logo} alt={orgData.name || "Organization Logo"} className="w-full h-full object-contain p-2" />
                  ) : (
                    (orgData?.name || "O").slice(0, 2).toUpperCase()
                  )}
                </div>

                <div className="space-y-1 w-full">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white truncate">
                    {orgData?.name || "Loading..."}
                  </h3>
                  <span className="inline-block px-3 py-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-[#818CF8] text-xs font-mono font-bold uppercase border border-indigo-500/10">
                    ID: {orgData?.id || "N/A"}
                  </span>
                </div>

                <div className="w-full border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-3.5 text-left text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Organization Name
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{orgData?.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Contact Email
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{user?.email || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                      Status
                    </span>
                    <Badge tone="green" className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      Active
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Features Card */}
              <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                  Enforced Proctoring & Security Policy
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  The following proctoring rules and browser restrictions are active for all examinations in this workspace. These values are read-only and governed by platform security configurations.
                </p>

                <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2">
                  {orgData?.securityFeatures ? (
                    Object.entries(orgData.securityFeatures).map(([key, enabled]) => {
                      const label = FEATURE_LABELS[key] || key;
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${enabled
                              ? "bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/20 text-slate-700 dark:text-slate-300 font-bold"
                              : "bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/65 text-slate-400 dark:text-slate-500 opacity-70"
                            }`}
                        >
                          <span className="text-xs font-bold font-title">{label}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {enabled ? (
                              <Badge tone="green" className="px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                                Active
                              </Badge>
                            ) : (
                              <Badge tone="slate" className="px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-2 text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                      Loading security features...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Test Modal */}
        <Modal
          open={Boolean(deleteTarget)}
          title="Delete test"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">Delete {deleteTarget?.name}? This action cannot be undone.</p>
          {deleteMutation.error ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{getErrorMessage(deleteMutation.error)}</p> : null}
        </Modal>


      </PageWrapper>
    </AppShell>
  );
};

export const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-5 py-4 shadow-sm">
          <Spinner />
          <span className="text-sm font-bold">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  if (user.role === "Student") {
    return <StudentDashboard />;
  }

  if (user.role === "Teacher") {
    return <TeacherDashboard />;
  }

  return <AdminDashboard />;
};
