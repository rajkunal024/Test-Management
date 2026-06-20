import React, { useEffect, useState } from "react";
import api from "../services/api";
import {
  Building2,
  Users,
  GraduationCap,
  Briefcase,
  Layers,
  FileText,
  Activity,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";

interface StatsData {
  totalOrganizations: number;
  totalStudents: number;
  totalTeachers: number;
  totalOrganizationAdmins: number;
  totalTestsConducted: number;
  totalActiveUsers: number;
}

interface AnalyticsData {
  activeOrganizations: number;
  userDistribution: { role: string; count: number }[];
  featureUsage: { feature: string; count: number }[];
  organizationGrowth: { month: string; count: number }[];
  monthlyTestCount: { month: string; count: number }[];
}

const FEATURE_NAMES: Record<string, string> = {
  cameraMonitoring: "Camera Monitoring",
  microphoneMonitoring: "Microphone Monitoring",
  fullscreenMode: "Fullscreen Mode",
  tabSwitchingDetection: "Tab Switching",
  screenSharingDetection: "Screen Interception",
  copyPasteDisabled: "Block Copy Paste",
  rightClickDisabled: "Block Right Click",
  developerToolsDetection: "DevTools Detection",
  multipleMonitorDetection: "Multi-Monitor Detection",
  faceDetection: "AI Face Detection",
  browserLock: "Browser Lock",
  autoSave: "Auto Save",
  screenRecordingDetection: "Screen Recording Block",
  printDisabled: "Block Printing",
};

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const [statsRes, analyticsRes] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/analytics"),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (err: any) {
      console.error("Dashboard fetching error:", err);
      setError("Unable to retrieve dashboard metrics. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <div className="absolute w-6 h-6 border-4 border-purple-500/20 border-b-purple-500 rounded-full animate-spin animate-duration-1000"></div>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-wide uppercase animate-pulse">
          Aggregating platform metrics...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 flex items-center gap-3.5 max-w-2xl mx-auto shadow-lg shadow-red-500/5">
        <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
        <div>
          <p className="text-sm font-bold">Data Fetching Failed</p>
          <p className="text-xs opacity-90 mt-0.5">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 px-4 py-1.5 bg-red-650 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const totalOrgs = stats?.totalOrganizations || 1;

  const statCards = [
    {
      title: "Organizations",
      value: stats?.totalOrganizations || 0,
      label: `Active: ${analytics?.activeOrganizations || 0}`,
      icon: Building2,
      badgeColor: "bg-[#EEF2F6] dark:bg-indigo-950/40 text-[#4B52DC] dark:text-[#818CF8]",
      iconBg: "bg-indigo-50 dark:bg-indigo-950/20 text-[#4B52DC]",
    },
    {
      title: "Active Users",
      value: stats?.totalActiveUsers || 0,
      label: "Live Sessions",
      icon: Activity,
      badgeColor: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500",
    },
    {
      title: "Total Students",
      value: stats?.totalStudents || 0,
      label: "Enrolled",
      icon: GraduationCap,
      badgeColor: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-50 dark:bg-blue-950/20 text-blue-500",
    },
    {
      title: "Total Teachers",
      value: stats?.totalTeachers || 0,
      label: "Instructors",
      icon: Briefcase,
      badgeColor: "bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-600 dark:text-fuchsia-400",
      iconBg: "bg-fuchsia-50 dark:bg-fuchsia-950/20 text-fuchsia-500",
    },
    {
      title: "Org Admins",
      value: stats?.totalOrganizationAdmins || 0,
      label: "Managers",
      icon: Layers,
      badgeColor: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-50 dark:bg-amber-950/20 text-amber-500",
    },
    {
      title: "Tests Taken",
      value: stats?.totalTestsConducted || 0,
      label: "Submissions",
      icon: FileText,
      badgeColor: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-50 dark:bg-rose-950/20 text-rose-500",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in text-slate-900 dark:text-[#E2E8F0] relative z-10">
      {/* Title & Reload Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-title font-black text-2xl md:text-3xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Parikshya Admin Dashboard</span>
            <CheckCircle2 className="w-5 h-5 text-[#4B52DC] fill-[#4B52DC]/10 shrink-0" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
            Unified platform-wide analytics, metrics, and security boundary controls.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4.5 py-2 rounded-full bg-white dark:bg-[#0B0E14] border border-slate-200/60 dark:border-[#161B26] text-slate-700 dark:text-slate-250 text-xs font-bold shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer shrink-0 whitespace-nowrap"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* 6-Column Responsive Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white/80 dark:bg-[#0B0E14]/80 border border-slate-100 dark:border-[#161B26] shadow-sm hover:shadow-md dark:hover:shadow-black/20 hover:border-slate-250 dark:hover:border-slate-800 transition-all duration-300 flex flex-col justify-between h-36 backdrop-blur-md relative overflow-hidden group"
            >
              {/* Internal Card subtle glow */}
              <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/5 to-purple-500/5 blur-xl group-hover:scale-125 transition-all duration-500" />

              <div className="flex items-center justify-between text-slate-400 z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-450 dark:text-slate-500 truncate max-w-[80%]">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl shrink-0 ${card.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5 mt-3 z-10">
                <div className="text-3xl font-black font-title text-slate-950 dark:text-white tracking-tight leading-none">
                  {card.value.toLocaleString()}
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider text-center truncate w-max max-w-full border-none ${card.badgeColor}`}>
                  {card.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Analytics Split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-2">
        {/* User Distribution - 2 Cols */}
        <div className="p-6 bg-white/80 dark:bg-[#0B0E14]/80 border border-slate-100 dark:border-[#161B26] rounded-2xl shadow-md lg:col-span-2 space-y-6 backdrop-blur-md relative overflow-hidden">
          <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-[#121824]/60">
            <Users className="w-5 h-5 text-[#4B52DC]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Platform User Distribution
            </h3>
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-[-10px] font-semibold">
            Breakdown of users by role across the platform.
          </p>

          <div className="space-y-5 z-10 relative">
            {analytics?.userDistribution.map((item) => {
              const totalUsers = stats ? stats.totalStudents + stats.totalTeachers + stats.totalOrganizationAdmins : 1;
              const percentage = Math.round((item.count / (totalUsers || 1)) * 100);

              return (
                <div key={item.role} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-650 dark:text-slate-400">{item.role}</span>
                    <span className="text-slate-900 dark:text-white font-mono">{item.count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-[#151A26] rounded-full overflow-hidden border border-slate-200/20 dark:border-none">
                    <div
                      className="h-full bg-[#4B52DC] rounded-full transition-all duration-1000 shadow-md shadow-indigo-500/20"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Group silhouette vector illustration on bottom-left */}
          <div className="absolute bottom-0 left-4 w-32 h-20 opacity-40 dark:opacity-20 pointer-events-none z-0">
            <svg viewBox="0 0 120 80" className="w-full h-full text-[#4B52DC] fill-current">
              {/* Concentric rings */}
              <circle cx="10" cy="80" r="25" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2,2" opacity="0.4" />
              <circle cx="10" cy="80" r="45" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2,2" opacity="0.3" />
              <circle cx="10" cy="80" r="65" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2,2" opacity="0.2" />
              <circle cx="10" cy="80" r="85" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2,2" opacity="0.1" />
              {/* silhouette 1 */}
              <circle cx="30" cy="55" r="9" />
              <path d="M14 75 C14 66, 46 66, 46 75 Z" />
              {/* silhouette 2 */}
              <circle cx="60" cy="45" r="11" />
              <path d="M40 75 C40 62, 80 62, 80 75 Z" />
              {/* silhouette 3 */}
              <circle cx="90" cy="55" r="9" />
              <path d="M74 75 C74 66, 106 66, 106 75 Z" />
            </svg>
          </div>
        </div>

        {/* Security Feature Adoption - 3 Cols */}
        <div className="p-6 bg-white/80 dark:bg-[#0B0E14]/80 border border-slate-100 dark:border-[#161B26] rounded-2xl shadow-md lg:col-span-3 space-y-6 backdrop-blur-md relative overflow-hidden">
          <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-purple-500/5 blur-2xl pointer-events-none" />

          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-[#121824]/60">
            <ShieldCheck className="w-5 h-5 text-purple-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Security Feature Adoption
            </h3>
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-[-10px] font-semibold">
            Adoption status of key security features across organizations.
          </p>

          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 custom-scrollbar z-10 relative">
            {analytics?.featureUsage && analytics.featureUsage.length > 0 ? (
              analytics.featureUsage.map((item) => {
                const percentage = Math.round((item.count / totalOrgs) * 100);
                const readableName = FEATURE_NAMES[item.feature] || item.feature;

                return (
                  <div key={item.feature} className="space-y-1.5 group">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-650 dark:text-slate-400 group-hover:text-[#4B52DC] dark:group-hover:text-indigo-400 transition-colors">
                        {readableName}
                      </span>
                      <span className="text-slate-900 dark:text-white font-mono">
                        {percentage}% <span className="text-slate-400 text-[10px] font-normal">({item.count}/{totalOrgs} orgs)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-[#151A26] rounded-full overflow-hidden border border-slate-200/20 dark:border-none">
                      <div
                        className="h-full bg-[#4B52DC] rounded-full transition-all duration-700 shadow-md shadow-indigo-500/10"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-450 text-xs font-semibold">
                No feature adoption metrics recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform Overview Banner */}
      <div className="bg-white/80 dark:bg-[#0B0E14]/80 border border-slate-100 dark:border-[#161B26] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md">
        <div className="flex items-center gap-3.5 flex-1 min-w-[200px]">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-[#4B52DC] rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">Platform Overview</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Real-time system overview and insights at a glance.</p>
          </div>
        </div>

        <div className="hidden md:block w-[1px] h-8 bg-slate-200/50 dark:bg-[#161B26]/50" />

        <div className="flex items-center gap-3.5 flex-1 min-w-[200px]">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">Secure</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Enterprise-grade security across all modules.</p>
          </div>
        </div>

        <div className="hidden md:block w-[1px] h-8 bg-slate-200/50 dark:bg-[#161B26]/50" />

        <div className="flex items-center gap-3.5 flex-1 min-w-[200px]">
          <div className="p-2.5 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-500 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">Real-time</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Live metrics and instant system updates.</p>
          </div>
        </div>

        <div className="hidden md:block w-[1px] h-8 bg-slate-200/50 dark:bg-[#161B26]/50" />

        <div className="flex items-center gap-3.5 flex-1 min-w-[200px]">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">Scalable</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Built to support growth and multiple organizations.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
