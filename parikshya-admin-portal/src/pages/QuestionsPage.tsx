import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  Search,
  Eye,
  AlertCircle,
  X,
  Building2,
  User,
  GraduationCap,
  Sparkles,
  HelpCircle,
  Check,
  ChevronLeft,
  ChevronsUpDown,
} from "lucide-react";

interface Question {
  id: string;
  question: string;
  type: string;
  option1?: string;
  option2?: string;
  option3?: string;
  option4?: string;
  correct_option?: string;
  difficulty: string;
  class: string;
  created_by: string; // teacher display name
  teacherId: string;  // teacher unique userId
  organization_id: string;
  organizationName: string;
  image_url?: string;
}

export const QuestionsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const teacherIdParam = searchParams.get("teacherId") || "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");

  // Selected Question for Preview Modal
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!teacherIdParam) {
        setError("Invalid Access Path. Questions catalog must be accessed via a specific teacher's profile.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await api.get("/questions");
        if (response.data.success) {
          // Filter to only show questions authored by this specific teacher
          const allQuestions: Question[] = response.data.data;
          const filtered = allQuestions.filter(q => q.teacherId === teacherIdParam);
          setQuestions(filtered);
        } else {
          setError(response.data.message || "Failed to load questions.");
        }
      } catch (err: any) {
        console.error("Error fetching questions:", err);
        setError("Unable to retrieve teacher questions repository.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [teacherIdParam]);

  // Find info about the teacher from the matching questions
  const sampleQuestion = questions[0];
  const teacherName = sampleQuestion ? sampleQuestion.created_by : "Teacher Profile";
  const orgName = sampleQuestion ? sampleQuestion.organizationName : "";

  // Filtered dataset (by query and difficulty)
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.class.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDifficulty =
      selectedDifficulty === "All" ||
      (selectedDifficulty.toLowerCase() === "difficult"
        ? q.difficulty.toLowerCase() === "hard" || q.difficulty.toLowerCase() === "difficult"
        : q.difficulty.toLowerCase() === selectedDifficulty.toLowerCase());

    return matchesSearch && matchesDifficulty;
  });

  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "easy":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "hard":
      case "difficult":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
  };

  const getAvatarBgColor = (nameStr: string) => {
    const colors = [
      "bg-blue-500", "bg-purple-500", "bg-indigo-500", "bg-emerald-500", 
      "bg-teal-500", "bg-pink-500", "bg-rose-500", "bg-amber-500"
    ];
    let sum = 0;
    for (let i = 0; i < nameStr.length; i++) {
      sum += nameStr.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  return (
    <div className="space-y-6 animate-fade-in relative text-slate-700 dark:text-slate-350">
      {/* Back Button and Breadcrumb */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#161B26] hover:bg-slate-100 dark:hover:bg-[#121824] text-slate-600 dark:text-slate-400 hover:text-[#4B52DC] dark:hover:text-white transition-all text-xs font-bold cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Organization Directory</span>
        </button>
      </div>

      {/* Header Profile card */}
      {!error && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-2xl shadow-sm backdrop-blur-md">
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center shadow-md bg-slate-900">
            {sampleQuestion?.image_url && false ? ( // Fallback to initials avatar for safety
              <img src="" alt={teacherName} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full ${getAvatarBgColor(teacherName)} flex items-center justify-center text-white text-xl font-extrabold`}>
                {teacherName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-title font-extrabold text-xl text-slate-900 dark:text-white leading-tight">
              Questions by {teacherName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5 text-xs text-slate-500 dark:text-slate-450 font-semibold">
              {orgName && (
                <div className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tenant: <strong>{orgName}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>Teacher ID: <strong className="font-mono tracking-wider">{teacherIdParam}</strong></span>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-[#4B52DC] dark:text-[#818CF8] text-[9px] font-bold uppercase tracking-wider border border-indigo-500/10">
                Teacher question vault
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Total Authored</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{questions.length}</div>
          </div>
        </div>
      )}

      {/* Filters bar */}
      {!error && (
        <div className="p-5 bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-2xl flex flex-col md:flex-row items-center gap-4 shadow-sm backdrop-blur-md">
          {/* Search */}
          <div className="relative w-full md:flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by question content or target class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1422] border border-slate-350 dark:border-[#1C2434] text-slate-900 dark:text-white placeholder-slate-500 focus:border-[#4B52DC] focus:ring-1 focus:ring-[#4B52DC]/20 outline-none transition-all text-xs font-semibold"
            />
          </div>

          {/* Difficulty filter */}
          <div className="relative flex flex-col justify-center min-w-[200px] w-full md:w-auto">
            <label className="absolute -top-2 left-3 px-1.5 bg-white dark:bg-[#0B0E14] text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest z-10">
              Filter Difficulty
            </label>
            <div className="relative">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1422] border border-[#4B52DC]/75 dark:border-[#4B52DC]/60 hover:border-[#4B52DC] focus:border-[#4B52DC] focus:ring-1 focus:ring-[#4B52DC]/20 outline-none appearance-none transition-all text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="All">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="difficult">Difficult</option>
              </select>
              <ChevronsUpDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B52DC] pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Main Datagrid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] space-y-4">
          <div className="w-10 h-10 border-3 border-[#4B52DC] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
            Accessing question catalog...
          </p>
        </div>
      ) : error ? (
        <div className="p-16 text-center rounded-2xl bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] shadow-sm flex flex-col items-center justify-center space-y-4 backdrop-blur-md">
          <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold max-w-md leading-relaxed">{error}</p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] shadow-sm flex flex-col items-center justify-center space-y-4 backdrop-blur-md">
          <HelpCircle className="w-8 h-8 text-slate-400 dark:text-slate-650" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No questions discovered matching these options.</p>
          {(searchTerm || selectedDifficulty !== "All") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedDifficulty("All");
              }}
              className="text-xs font-bold text-[#4B52DC] dark:text-[#818CF8] hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-2xl overflow-hidden shadow-md backdrop-blur-md">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#161B26] text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest bg-slate-50/50 dark:bg-[#0f1422]/30">
                  <th className="px-6 py-4.5 w-[50%]">Question Detail</th>
                  <th className="px-6 py-4.5 text-center">Class</th>
                  <th className="px-6 py-4.5 text-center">Difficulty</th>
                  <th className="px-6 py-4.5 text-center">Correct Option</th>
                  <th className="px-6 py-4.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-[#161B26]/60">
                {filteredQuestions.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-slate-100/40 dark:hover:bg-[#121824]/40 transition-colors text-xs text-slate-700 dark:text-slate-350 font-medium"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white line-clamp-2 leading-relaxed" title={q.question}>
                        {q.question}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono tracking-wider">
                        ID: {q.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-slate-300">
                      {q.class}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest border ${getDifficultyColor(q.difficulty)}`}>
                        {q.difficulty.toLowerCase() === "hard" || q.difficulty.toLowerCase() === "difficult" ? "difficult" : q.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-extrabold text-[#4B52DC] dark:text-[#818CF8] text-[13px]">
                      {q.correct_option?.toUpperCase() || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setPreviewQuestion(q)}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-[#161B26] hover:bg-slate-100 dark:hover:bg-[#151A26] text-slate-500 dark:text-slate-400 hover:text-[#4B52DC] dark:hover:text-white transition-colors cursor-pointer"
                          title="View Question Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Question Details Preview Drawer/Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0B0E14] border border-slate-200/60 dark:border-[#161B26] rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 hover:border-indigo-500/20 transition-colors duration-300">
            {/* Close */}
            <button
              onClick={() => setPreviewQuestion(null)}
              className="absolute top-6 right-6 p-1.5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#121824] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#4B52DC] dark:text-[#818cf8] uppercase tracking-widest font-mono">
                Question Reference dossier
              </span>
              <h3 className="font-title font-extrabold text-lg text-slate-900 dark:text-white leading-tight pr-8">
                Question Details (ID: {previewQuestion.id})
              </h3>
            </div>

            {/* Body */}
            <div className="space-y-5">
              {/* Question text box */}
              <div className="p-5 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/60 dark:border-[#161B26] rounded-2xl">
                <div className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#4B52DC]" />
                  Question Stem
                </div>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                  {previewQuestion.question}
                </p>

                {previewQuestion.image_url && (
                  <div className="mt-4 rounded-xl border border-slate-200 dark:border-[#1a2333] overflow-hidden max-h-[220px] flex items-center justify-center bg-black/5">
                    <img
                      src={previewQuestion.image_url}
                      alt="Question supporting visual"
                      className="max-h-[220px] object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Options list */}
              <div className="space-y-3">
                <div className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest">
                  Options Catalog
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "option1", label: "A" },
                    { key: "option2", label: "B" },
                    { key: "option3", label: "C" },
                    { key: "option4", label: "D" },
                  ].map(({ key, label }) => {
                    const text = (previewQuestion as any)[key];
                    const isCorrect = previewQuestion.correct_option?.toLowerCase() === key;
                    if (!text) return null;
                    return (
                      <div
                        key={key}
                        className={`p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                          isCorrect
                            ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-900 dark:text-emerald-300"
                            : "bg-slate-50 dark:bg-[#070A10]/50 border-slate-200/70 dark:border-[#161B26]/80 text-slate-700 dark:text-slate-350"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCorrect
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200/80 dark:bg-[#121824] text-slate-650 dark:text-slate-400"
                          }`}
                        >
                          {label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold break-words leading-relaxed pt-0.5">
                            {text}
                          </p>
                        </div>
                        {isCorrect && (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Attributes info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/60 dark:border-[#161B26] rounded-xl space-y-0.5">
                  <span className="text-[8px] font-bold text-slate-500 dark:text-slate-550 uppercase tracking-widest block">Class Level</span>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                    {previewQuestion.class}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/60 dark:border-[#161B26] rounded-xl space-y-0.5">
                  <span className="text-[8px] font-bold text-slate-500 dark:text-slate-550 uppercase tracking-widest block">Difficulty</span>
                  <div className="pt-0.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border ${getDifficultyColor(previewQuestion.difficulty)}`}>
                      {previewQuestion.difficulty.toLowerCase() === "hard" || previewQuestion.difficulty.toLowerCase() === "difficult" ? "difficult" : previewQuestion.difficulty}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/60 dark:border-[#161B26] rounded-xl space-y-0.5 min-w-0">
                  <span className="text-[8px] font-bold text-slate-500 dark:text-slate-550 uppercase tracking-widest block">Tenant</span>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={previewQuestion.organizationName}>
                    {previewQuestion.organizationName}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/60 dark:border-[#161B26] rounded-xl space-y-0.5 min-w-0">
                  <span className="text-[8px] font-bold text-slate-500 dark:text-slate-550 uppercase tracking-widest block">Creator</span>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={`${previewQuestion.created_by} (${previewQuestion.teacherId})`}>
                    {previewQuestion.created_by}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-[#161B26]/60">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-250 dark:bg-[#121824] dark:hover:bg-[#151A26] text-slate-700 dark:text-slate-350 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
