"use client";

import { buildDemoFindings } from "@/lib/analysis";
import { demoResponses, demoSurvey } from "@/lib/demo-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  createBlankQuestion,
  createEditToken,
  createEditableSurvey,
  loadDraft,
  loadSummaries,
  saveDraft,
  saveSummaries,
  sha256,
  slugify,
  surveyFromRows,
  updateQuestionForKind,
  type EditableSurvey,
  type QuestionRow,
  type SavedSurveySummary,
  type SurveyRow,
} from "@/lib/survey-persistence";
import type { AnalysisFinding, QuestionKind, SurveyQuestion } from "@/lib/types";
import {
  BarChart3,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Plus,
  Save,
  Sigma,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const questionKindOptions: Array<{ value: QuestionKind; label: string }> = [
  { value: "likert", label: "5점 척도" },
  { value: "single_choice", label: "객관식" },
  { value: "short_text", label: "단답형" },
  { value: "long_text", label: "서술형" },
  { value: "number", label: "숫자" },
];

export default function Home() {
  const findings = useMemo(() => buildDemoFindings(demoResponses), []);
  const [survey, setSurvey] = useState<EditableSurvey>(() => createEditableSurvey(demoSurvey));
  const [savedSurveys, setSavedSurveys] = useState<SavedSurveySummary[]>([]);
  const [selectedFinding, setSelectedFinding] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("저장 준비 완료");

  const responseUrl = `/respond/${survey.slug}`;
  const currentFinding = findings[selectedFinding];

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setSavedSurveys(loadSummaries());
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function updateSurveyTitle(title: string) {
    setSurvey((current) => ({
      ...current,
      title,
      slug: slugify(title, current.id),
    }));
    setSaveState("idle");
  }

  function updateQuestion(id: string, patch: Partial<SurveyQuestion>) {
    setSurvey((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    }));
    setSaveState("idle");
  }

  function changeQuestionKind(id: string, kind: QuestionKind) {
    setSurvey((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === id ? updateQuestionForKind(question, kind) : question,
      ),
    }));
    setSaveState("idle");
  }

  function addQuestion() {
    setSurvey((current) => ({
      ...current,
      questions: [...current.questions, createBlankQuestion(current.questions.length + 1)],
    }));
    setSaveState("idle");
  }

  function removeQuestion(id: string) {
    setSurvey((current) => ({
      ...current,
      questions:
        current.questions.length === 1
          ? current.questions
          : current.questions.filter((question) => question.id !== id),
    }));
    setSaveState("idle");
  }

  function createNewSurvey() {
    const id = crypto.randomUUID();
    const title = "새 설문지";
    setSurvey({
      id,
      title,
      description: "",
      slug: slugify(title, id),
      editToken: createEditToken(),
      questions: [createBlankQuestion(1)],
    });
    setSaveState("idle");
    setSaveMessage("새 설문지를 작성 중입니다");
  }

  async function loadSavedSurvey(summary: SavedSurveySummary) {
    const localDraft = loadDraft(summary.id);
    if (localDraft) {
      setSurvey(localDraft);
      setSaveState("saved");
      setSaveMessage("저장된 설문지를 불러왔습니다");
    }

    const supabase = getSupabaseBrowserClient(summary.editToken);
    if (!supabase) return;

    const { data: rawSurveyRow } = await supabase
      .from("surveys")
      .select("id,title,description,slug")
      .eq("id", summary.id)
      .single();

    const { data: rawQuestionRows } = await supabase
      .from("questions")
      .select("id,position,prompt,kind,required,options,scale,analysis_role")
      .eq("survey_id", summary.id)
      .order("position", { ascending: true });

    const surveyRow = rawSurveyRow as SurveyRow | null;
    const questionRows = rawQuestionRows as QuestionRow[] | null;
    if (surveyRow && questionRows) {
      const loaded = surveyFromRows(surveyRow, questionRows, summary.editToken);
      setSurvey(loaded);
      saveDraft(loaded);
    }
  }

  async function saveSurvey() {
    setSaveState("saving");
    setSaveMessage("저장 중입니다");

    const normalized: EditableSurvey = {
      ...survey,
      title: survey.title.trim() || "제목 없는 설문지",
      description: survey.description.trim(),
      slug: survey.slug || slugify(survey.title, survey.id),
      editToken: survey.editToken || createEditToken(),
      questions: survey.questions.map((question, index) => ({
        ...question,
        id: question.id || `q_${index + 1}`,
        prompt: question.prompt.trim() || `질문 ${index + 1}`,
      })),
    };
    const supabase = getSupabaseBrowserClient(normalized.editToken);

    try {
      if (supabase) {
        const editTokenHash = await sha256(normalized.editToken);
        const { error: surveyError } = await supabase.from("surveys").upsert(
          {
            id: normalized.id,
            owner_id: null,
            title: normalized.title,
            purpose: "satisfaction",
            description: normalized.description,
            slug: normalized.slug,
            status: "published",
            is_anonymous: true,
            settings: { editor: "simple", updatedAt: new Date().toISOString() },
            edit_token_hash: editTokenHash,
            published_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

        if (surveyError) throw surveyError;

        const { error: deleteError } = await supabase
          .from("questions")
          .delete()
          .eq("survey_id", normalized.id);

        if (deleteError) throw deleteError;

        const { error: questionError } = await supabase.from("questions").insert(
          normalized.questions.map((question, index) => ({
            survey_id: normalized.id,
            id: question.id,
            position: index + 1,
            prompt: question.prompt,
            kind: question.kind,
            required: question.required,
            options: question.options ?? [],
            scale: question.scale ?? null,
            analysis_role: question.analysisRole ?? null,
          })),
        );

        if (questionError) throw questionError;
      }

      saveDraft(normalized);
      const summary: SavedSurveySummary = {
        id: normalized.id,
        title: normalized.title,
        slug: normalized.slug,
        editToken: normalized.editToken,
        updatedAt: new Date().toISOString(),
        questionCount: normalized.questions.length,
      };
      const nextSummaries = [
        summary,
        ...savedSurveys.filter((item) => item.id !== normalized.id),
      ].slice(0, 12);

      setSurvey(normalized);
      setSavedSurveys(nextSummaries);
      saveSummaries(nextSummaries);
      setSaveState("saved");
      setSaveMessage("저장되었습니다");
    } catch (error) {
      console.error(error);
      saveDraft(normalized);
      setSaveState("error");
      setSaveMessage("브라우저에는 저장됐지만 Supabase 저장을 확인하지 못했습니다");
    }
  }

  return (
    <main className="min-h-dvh bg-[#f7f8fa] text-slate-950">
      <div className="mx-auto grid min-h-dvh max-w-[1480px] gap-6 px-4 py-5 lg:grid-cols-[240px_1fr] lg:px-6">
        <aside className="hidden rounded-[28px] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] lg:block">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Sigma className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-base font-bold">School Stat Lab</p>
              <p className="text-xs text-slate-500">설문과 통계 분석</p>
            </div>
          </div>

          <nav className="mt-8 grid gap-2">
            {[
              ["설문 만들기", FileText],
              ["응답 링크", Link2],
              ["자동 분석", BarChart3],
            ].map(([label, Icon]) => (
              <button
                className="flex h-11 items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                key={label as string}
                type="button"
              >
                <Icon className="size-4 text-slate-400" aria-hidden />
                {label as string}
              </button>
            ))}
          </nav>
        </aside>

        <section className="grid content-start gap-6">
          <header className="flex flex-col gap-4 rounded-[28px] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-blue-600">Survey Builder</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">설문지를 만들고 저장하세요</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                onClick={createNewSurvey}
                type="button"
              >
                <Plus className="size-4" aria-hidden />
                새 설문
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
                disabled={saveState === "saving"}
                onClick={saveSurvey}
                type="button"
              >
                {saveState === "saving" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-4" aria-hidden />
                )}
                저장
              </button>
              <a
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                href={responseUrl}
              >
                <ExternalLink className="size-4" aria-hidden />
                응답 화면
              </a>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_420px]">
            <section className="grid gap-6">
              <div className="rounded-[28px] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-7">
                <div className="grid gap-5">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-500">설문 제목</span>
                    <input
                      className="h-14 rounded-3xl border border-transparent bg-slate-50 px-5 text-xl font-black outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      value={survey.title}
                      onChange={(event) => updateSurveyTitle(event.target.value)}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-500">설명</span>
                    <textarea
                      className="min-h-24 rounded-3xl border border-transparent bg-slate-50 px-5 py-4 text-sm leading-6 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      value={survey.description}
                      onChange={(event) => {
                        setSurvey((current) => ({ ...current, description: event.target.value }));
                        setSaveState("idle");
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-4">
                {survey.questions.map((question, index) => (
                  <QuestionEditor
                    index={index}
                    key={question.id}
                    onChange={updateQuestion}
                    onKindChange={changeQuestionKind}
                    onRemove={removeQuestion}
                    question={question}
                  />
                ))}
              </div>

              <button
                className="flex h-14 items-center justify-center gap-2 rounded-[24px] border border-dashed border-slate-300 bg-white text-sm font-bold text-slate-700 transition hover:border-blue-400 hover:text-blue-600"
                onClick={addQuestion}
                type="button"
              >
                <Plus className="size-4" aria-hidden />
                질문 추가
              </button>
            </section>

            <aside className="grid content-start gap-5">
              <div className="grid grid-cols-3 gap-3">
                <Metric label="응답" value={`${demoResponses.length}명`} />
                <Metric label="질문" value={`${survey.questions.length}개`} />
                <Metric label="분석" value={`${findings.length}종`} />
              </div>

              <div className="rounded-[28px] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black">저장된 설문</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{saveMessage}</p>
                  </div>
                  {saveState === "saved" ? <Check className="size-5 text-blue-600" aria-hidden /> : null}
                </div>

                <div className="mt-4 grid gap-2">
                  {savedSurveys.length === 0 ? (
                    <div className="rounded-3xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                      아직 저장된 설문이 없습니다.
                    </div>
                  ) : (
                    savedSurveys.map((item) => (
                      <button
                        className="flex items-center justify-between gap-3 rounded-3xl bg-slate-50 p-4 text-left transition hover:bg-blue-50"
                        key={item.id}
                        onClick={() => loadSavedSurvey(item)}
                        type="button"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black">{item.title}</span>
                          <span className="mt-1 block text-xs font-semibold text-slate-400">
                            {item.questionCount}개 질문
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                <h2 className="text-lg font-black">응답 링크</h2>
                <div className="mt-4 flex items-center gap-2 rounded-3xl bg-slate-50 p-3">
                  <code className="min-w-0 flex-1 truncate px-2 text-xs font-bold text-slate-600">
                    {responseUrl}
                  </code>
                  <button
                    className="flex size-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm transition hover:text-blue-600"
                    onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${responseUrl}`)}
                    title="링크 복사"
                    type="button"
                  >
                    <Copy className="size-4" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                <h2 className="text-lg font-black">자동 분석</h2>
                <div className="mt-4 grid gap-2">
                  {findings.slice(0, 6).map((finding, index) => (
                    <button
                      className={`rounded-3xl p-4 text-left transition ${
                        selectedFinding === index
                          ? "bg-slate-950 text-white"
                          : "bg-slate-50 text-slate-950 hover:bg-blue-50"
                      }`}
                      key={finding.method}
                      onClick={() => setSelectedFinding(index)}
                      type="button"
                    >
                      <span className="block text-sm font-black">{finding.title}</span>
                      <span
                        className={`mt-1 block text-xs font-semibold ${
                          selectedFinding === index ? "text-slate-300" : "text-slate-400"
                        }`}
                      >
                        {finding.method}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <FindingCard finding={currentFinding} />
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function QuestionEditor({
  index,
  onChange,
  onKindChange,
  onRemove,
  question,
}: {
  index: number;
  onChange: (id: string, patch: Partial<SurveyQuestion>) => void;
  onKindChange: (id: string, kind: QuestionKind) => void;
  onRemove: (id: string) => void;
  question: SurveyQuestion;
}) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-blue-600">
          {index + 1}
        </span>
        <button
          className="flex size-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          onClick={() => onRemove(question.id)}
          title="질문 삭제"
          type="button"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        <input
          className="h-13 rounded-3xl border border-transparent bg-slate-50 px-5 text-base font-bold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          value={question.prompt}
          onChange={(event) => onChange(question.id, { prompt: event.target.value })}
        />

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <select
            className="h-12 rounded-3xl border border-transparent bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            value={question.kind}
            onChange={(event) => onKindChange(question.id, event.target.value as QuestionKind)}
          >
            {questionKindOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="flex h-12 items-center gap-2 rounded-3xl bg-slate-50 px-4 text-sm font-bold text-slate-600">
            <input
              checked={question.required}
              onChange={(event) => onChange(question.id, { required: event.target.checked })}
              type="checkbox"
            />
            필수
          </label>
        </div>

        {question.kind === "single_choice" ? (
          <textarea
            className="min-h-24 rounded-3xl border border-transparent bg-slate-50 px-5 py-4 text-sm leading-6 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            value={(question.options ?? []).join("\n")}
            onChange={(event) =>
              onChange(question.id, {
                options: event.target.value
                  .split("\n")
                  .map((option) => option.trim())
                  .filter(Boolean),
              })
            }
          />
        ) : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function FindingCard({ finding }: { finding: AnalysisFinding }) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <h2 className="text-lg font-black">{finding.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{finding.summary}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {Object.entries(finding.stats)
          .slice(0, 6)
          .map(([label, value]) => (
            <div className="rounded-2xl bg-slate-50 p-3" key={label}>
              <p className="text-[11px] font-bold text-slate-400">{label}</p>
              <p className="mt-1 text-sm font-black">{value}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
