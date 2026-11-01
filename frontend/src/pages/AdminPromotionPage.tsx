import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowRight, Award, CheckCircle2, GraduationCap,
  School, Sparkles, TrendingUp, XCircle
} from "lucide-react";
import {
  getAdminUsers, getClasses, getErrorMessage, getMyOrganization, getPrograms, getSessions, getSemesters,
  promoteCollegeStudentsApi, promoteSchoolStudentsApi
} from "../services/api";
import { AppShell } from "../components/layout/AppShell";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";

export const AdminPromotionPage: React.FC = () => {
  const { data: orgData } = useQuery({ queryKey: ["myOrganization"], queryFn: getMyOrganization });
  const isSchool = orgData?.orgType !== "College";
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: getClasses, enabled: isSchool });
  const { data: sessions = [] } = useQuery({ queryKey: ["sessions"], queryFn: getSessions });
  const { data: programs = [] } = useQuery({ queryKey: ["programs"], queryFn: getPrograms, enabled: !isSchool });
  const { data: semesters = [] } = useQuery({ queryKey: ["semesters"], queryFn: getSemesters, enabled: !isSchool });
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: getAdminUsers });

  const [schoolSrcSession, setSchoolSrcSession] = useState("");
  const [schoolTgtSession, setSchoolTgtSession] = useState("");
  const [schoolSrcClass, setSchoolSrcClass] = useState("");
  const [schoolTgtClass, setSchoolTgtClass] = useState("");
  const [schoolResult, setSchoolResult] = useState<any | null>(null);
  const [schoolError, setSchoolError] = useState("");

  const schoolPromotionMutation = useMutation({
    mutationFn: promoteSchoolStudentsApi,
    onSuccess: (res) => { setSchoolResult(res.data); setSchoolError(""); },
    onError: (err) => { setSchoolError(getErrorMessage(err)); setSchoolResult(null); }
  });

  const handleSchoolSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!schoolSrcSession || !schoolTgtSession || !schoolSrcClass || !schoolTgtClass) {
      setSchoolError("Select both source and destination details before continuing.");
      return;
    }
    if (schoolSrcSession === schoolTgtSession) {
      setSchoolError("Source and destination sessions must be different.");
      return;
    }
    if (schoolSrcClass === schoolTgtClass) {
      setSchoolError("Source and destination classes must be different.");
      return;
    }
    schoolPromotionMutation.mutate({
      sourceSession: schoolSrcSession, targetSession: schoolTgtSession,
      sourceClass: schoolSrcClass, targetClass: schoolTgtClass
    });
  };

  const [collProg, setCollProg] = useState("");
  const [collSem, setCollSem] = useState(1);
  const [collTgtSem, setCollTgtSem] = useState(2);
  const [collegeResult, setCollegeResult] = useState<any | null>(null);
  const [collegeError, setCollegeError] = useState("");

  const collegePromotionMutation = useMutation({
    mutationFn: promoteCollegeStudentsApi,
    onSuccess: (res) => { setCollegeResult(res); setCollegeError(""); },
    onError: (err) => { setCollegeError(getErrorMessage(err)); setCollegeResult(null); }
  });

  const handleCollegeSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!collProg || !collSem || !collTgtSem) {
      setCollegeError("Select a program, semester, and target semester.");
      return;
    }
    if (Number(collSem) === Number(collTgtSem)) {
      setCollegeError("Source and target semesters must be different.");
      return;
    }
    collegePromotionMutation.mutate({
      programId: collProg,
      currentSemester: Number(collSem),
      targetSemester: Number(collTgtSem)
    });
  };

  const semesterOptions = useMemo(() => {
    if (semesters.length > 0) {
      const parsed = semesters.map((s: any) => {
        const num = parseInt(s.name.replace(/\D/g, ""), 10) || 1;
        return { label: s.name, value: String(num), num };
      });
      parsed.sort((a, b) => a.num - b.num);
      return parsed;
    }
    return Array.from({ length: 10 }, (_, i) => ({ label: `Semester ${i + 1}`, value: String(i + 1), num: i + 1 }));
  }, [semesters]);

  const targetSemesterOptions = useMemo(() => {
    return [...semesterOptions, { label: "Alumni / Graduation", value: "11", num: 11 }];
  }, [semesterOptions]);

  const sessionOptions = [{ label: "Select session", value: "" }, ...sessions.map(item => ({ label: item.name, value: item.name }))];
  const classOptions = [{ label: "Select class", value: "" }, ...classes.map(item => ({ label: item.name, value: item.name }))];
  const affectedUsers = useMemo(() => users.filter(user => {
    if (user.role !== "Student") return false;
    return isSchool
      ? Boolean(schoolSrcSession && schoolSrcClass && user.session === schoolSrcSession && user.class === schoolSrcClass)
      : Boolean(collProg && collSem && user.program_id === collProg && Number(user.semester) === Number(collSem));
  }), [users, isSchool, schoolSrcSession, schoolSrcClass, collProg, collSem]);

  return (
    <AppShell>
      <PageWrapper>
        <div className="space-y-6">
          {/* ── ADMIN COMMAND CENTER HERO ── */}
          <div className="admin-hero p-6 sm:p-8">
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-48 w-48 rounded-full" style={{background:'radial-gradient(circle,rgba(6,182,212,0.12) 0%,transparent 70%)'}} />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex-1 min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-full px-3 py-1.5 border" style={{background:'rgba(99,102,241,0.12)',borderColor:'rgba(99,102,241,0.3)',color:'#a5b4fc'}}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  PARIKSHYA · ACADEMIC PROGRESSION
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  {orgData?.name || "Organization"}<br />
                  <span style={{background:'linear-gradient(90deg,#a5b4fc,#67e8f9)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}} className="text-xl sm:text-2xl font-black">Cohort Promotion Engine</span>
                </h1>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed max-w-lg" style={{color:'rgba(203,213,225,0.7)'}}>
                  Advance eligible students into their next academic destination — class, semester, or alumni — while preserving their full history.
                </p>
              </div>
              <div className="shrink-0 h-16 w-16 rounded-2xl flex flex-col items-center justify-center gap-1" style={{background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.25)'}}>
                {isSchool ? <School className="h-7 w-7" style={{color:'#818cf8'}} /> : <GraduationCap className="h-7 w-7" style={{color:'#818cf8'}} />}
                <span className="text-[8px] font-black uppercase tracking-widest" style={{color:'#6366f1'}}>{isSchool ? 'School' : 'College'}</span>
              </div>
            </div>
          </div>

          {isSchool ? (
            <form onSubmit={handleSchoolSubmit} className="promotion-workspace">
              <div className="promotion-runway">
                <section className="promotion-endpoint source">
                  <span className="promotion-step">01 · Source cohort</span>
                  <h2>Where students are now</h2>
                  <div className="promotion-fields">
                    <Select label="Current session" options={sessionOptions} value={schoolSrcSession} onChange={e => setSchoolSrcSession(e.target.value)} required/>
                    <Select label="Current class" options={classOptions} value={schoolSrcClass} onChange={e => setSchoolSrcClass(e.target.value)} required/>
                  </div>
                </section>

                <div className="promotion-direction"><ArrowRight/><span>Promote</span></div>

                <section className="promotion-endpoint destination">
                  <span className="promotion-step">02 · Destination</span>
                  <h2>Where students will move</h2>
                  <div className="promotion-fields">
                    <Select label="Next session" options={sessionOptions} value={schoolTgtSession} onChange={e => setSchoolTgtSession(e.target.value)} required/>
                    <Select label="Next class" options={classOptions} value={schoolTgtClass} onChange={e => setSchoolTgtClass(e.target.value)} required/>
                  </div>
                </section>
              </div>

              <AffectedUsers users={affectedUsers}/>

              {schoolError && <div className="promotion-alert error"><XCircle/><span>{schoolError}</span></div>}

              <div className="promotion-bottom-grid">
                <aside className="promotion-rules">
                  <div className="promotion-panel-title"><Award/><div><b>Eligibility rules</b><span>Applied automatically</span></div></div>
                  <ul>
                    <li><CheckCircle2/>Average score must be greater than 35%.</li>
                    <li><CheckCircle2/>A student can enter a target session only once.</li>
                    <li><CheckCircle2/>Ineligible students remain in their current class.</li>
                  </ul>
                </aside>

                <section className="promotion-confirm">
                  <div>
                    <span>Ready to process</span>
                    <p>This action updates every qualifying student in the selected cohort.</p>
                  </div>
                  <Button type="submit" disabled={schoolPromotionMutation.isPending}>
                    {schoolPromotionMutation.isPending ? "Processing cohort…" : "Confirm promotion"}
                  </Button>
                </section>
              </div>

              {schoolResult && (
                <section className="promotion-results">
                  <div className="promotion-results-header"><Sparkles/><div><b>Batch completed</b><span>Promotion outcome</span></div></div>
                  <div className="promotion-result-metrics">
                    <div className="success"><b>{schoolResult.promotedCount}</b><span>Promoted</span></div>
                    <div className="failed"><b>{schoolResult.failedToQualify?.length || 0}</b><span>Not qualified</span></div>
                    <div><b>{schoolResult.alreadyPromoted?.length || 0}</b><span>Already moved</span></div>
                  </div>
                  {schoolResult.promoted?.length > 0 && <div className="promotion-name-list"><b>Promoted students</b><p>{schoolResult.promoted.join(", ")}</p></div>}
                  {schoolResult.failedToQualify?.length > 0 && (
                    <div className="promotion-failed-list">
                      {schoolResult.failedToQualify.map((item: any, index: number) => <span key={index}>{item.name}<b>{item.score}%</b></span>)}
                    </div>
                  )}
                  {schoolResult.alreadyPromoted?.length > 0 && <div className="promotion-alert warning"><AlertTriangle/><span>Already in target session: {schoolResult.alreadyPromoted.join(", ")}</span></div>}
                </section>
              )}
            </form>
          ) : (
            <form onSubmit={handleCollegeSubmit} className="promotion-workspace">
              <div className="promotion-runway">
                <section className="promotion-endpoint source">
                  <span className="promotion-step">01 · Current cohort</span>
                  <h2>Program and semester</h2>
                  <div className="promotion-fields">
                    <Select label="Program" options={[{label:"Select program",value:""},...programs.map(item=>({label:item.name,value:item.id}))]} value={collProg} onChange={e=>setCollProg(e.target.value)} required/>
                    <Select label="Current semester" options={[{label:"Select semester",value:""},...semesterOptions]} value={String(collSem)} onChange={e=>setCollSem(Number(e.target.value))} required/>
                  </div>
                </section>
                <div className="promotion-direction"><ArrowRight/><span>Advance</span></div>
                <section className="promotion-endpoint destination">
                  <span className="promotion-step">02 · Destination</span>
                  <h2>Target semester</h2>
                  <div className="promotion-fields">
                    <Select label="Target semester" options={[{label:"Select target semester",value:""},...targetSemesterOptions]} value={String(collTgtSem)} onChange={e=>setCollTgtSem(Number(e.target.value))} required/>
                  </div>
                  <p className="promotion-destination-note">Students advance to the chosen target semester. Mapped semesters exceeding program limits automatically graduate students as Alumni.</p>
                </section>
              </div>
              <AffectedUsers users={affectedUsers}/>
              {collegeError && <div className="promotion-alert error"><XCircle/><span>{collegeError}</span></div>}
              <div className="promotion-bottom-grid">
                <aside className="promotion-rules">
                  <div className="promotion-panel-title"><Sparkles/><div><b>Progression behavior</b><span>Program-aware advancement</span></div></div>
                  <ul><li><CheckCircle2/>All students in the selected cohort advance.</li><li><CheckCircle2/>Program semester limits are respected.</li><li><CheckCircle2/>Completed cohorts become Alumni.</li></ul>
                </aside>
                <section className="promotion-confirm"><div><span>Ready to process</span><p>Advance the selected program cohort into its next stage.</p></div><Button type="submit" disabled={collegePromotionMutation.isPending}>{collegePromotionMutation.isPending?"Advancing cohort…":"Confirm advancement"}</Button></section>
              </div>
              {collegeResult && <section className="promotion-results"><div className="promotion-results-header"><TrendingUp/><div><b>Progression completed</b><span>{collegeResult.message}</span></div></div>{collegeResult.data?.promoted?.length>0&&<div className="promotion-name-list"><b>Advanced students</b><p>{collegeResult.data.promoted.join(", ")}</p></div>}</section>}
            </form>
          )}
        </div>
      </PageWrapper>
    </AppShell>
  );
};

const AffectedUsers = ({ users }: { users: Array<any> }) => (
  <section className="promotion-affected">
    <div className="promotion-affected-header">
      <div><span>Affected users</span><b>{users.length} students in this cohort</b></div>
      <small>{users.length ? "These accounts will be evaluated" : "Choose a complete source cohort"}</small>
    </div>
    {users.length > 0 ? (
      <div className="promotion-affected-list">
        {users.map(user => (
          <div className="promotion-affected-person" key={user.id || user.email}>
            <span className="promotion-affected-avatar">
              {user.profilePicture ? <img src={user.profilePicture} alt=""/> : (user.name || "S").charAt(0).toUpperCase()}
            </span>
            <div><b>{user.name}</b><small>{user.email}</small></div>
            <span>{user.class || (user.semester ? `Semester ${user.semester}` : "Student")}</span>
          </div>
        ))}
      </div>
    ) : (
      <div className="promotion-affected-empty">No students match the current source selection.</div>
    )}
  </section>
);
