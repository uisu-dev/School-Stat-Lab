"use client";

import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  createBlankChapter,
  createBlankQuestion,
  createBlankSurvey,
  loadSummaries,
  removeDraft,
  saveDraft,
  saveSummaries,
  sha256,
  slugify,
  surveyFromRows,
  updateQuestionForKind,
  type ChapterRow,
  type EditableSurvey,
  type QuestionRow,
  type SavedSurveySummary,
  type SurveyRow,
} from "@/lib/survey-persistence";
import type { QuestionKind, SurveyChapter, SurveyQuestion } from "@/lib/types";
import {
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  FilePlus2,
  Layers3,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

const questionKindOptions: Array<{ value: QuestionKind; label: string }> = [
  { value: "single_choice", label: "객관식" },
  { value: "likert", label: "척도형" },
  { value: "matrix_likert", label: "그리드 척도" },
  { value: "long_text", label: "서술형" },
  { value: "number", label: "숫자형" },
];

export default function Home() {
  const [survey, setSurvey] = useState<EditableSurvey>(() => createBlankSurvey());
  const [savedSurveys, setSavedSurveys] = useState<SavedSurveySummary[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("새 설문을 작성하고 저장해 주세요.");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setSavedSurveys(loadSummaries());
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const responseUrl = `/respond/${survey.slug}`;
  const linkEnabled = survey.published;

  function editSurvey(patch: Partial<EditableSurvey>) {
    setSurvey((current) => ({ ...current, ...patch }));
    setSaveState("idle");
  }

  function updateTitle(title: string) {
    setSurvey((current) => ({
      ...current,
      title,
      slug: current.published ? current.slug : slugify(title, current.id),
    }));
    setSaveState("idle");
  }

  function updateChapter(id: string, patch: Partial<SurveyChapter>) {
    setSurvey((current) => ({
      ...current,
      chapters: current.chapters.map((chapter) =>
        chapter.id === id ? { ...chapter, ...patch } : chapter,
      ),
    }));
    setSaveState("idle");
  }

  function addChapter() {
    setSurvey((current) => {
      const chapter = createBlankChapter(current.chapters.length + 1);
      return {
        ...current,
        chapters: [...current.chapters, chapter],
        questions: [...current.questions, createBlankQuestion(chapter.id)],
      };
    });
    setSaveState("idle");
  }

  function removeChapter(id: string) {
    setSurvey((current) => {
      if (current.chapters.length === 1) return current;
      return {
        ...current,
        chapters: current.chapters.filter((chapter) => chapter.id !== id),
        questions: current.questions.filter((question) => question.chapterId !== id),
      };
    });
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

  function addQuestion(chapterId: string) {
    setSurvey((current) => ({
      ...current,
      questions: [...current.questions, createBlankQuestion(chapterId)],
    }));
    setSaveState("idle");
  }

  function removeQuestion(id: string) {
    setSurvey((current) => {
      const question = current.questions.find((item) => item.id === id);
      if (!question) return current;
      const inChapter = current.questions.filter((item) => item.chapterId === question.chapterId);
      return inChapter.length === 1
        ? current
        : { ...current, questions: current.questions.filter((item) => item.id !== id) };
    });
    setSaveState("idle");
  }

  function createNewSurvey() {
    setSurvey(createBlankSurvey());
    setSaveState("idle");
    setSaveMessage("새 설문을 작성하고 저장해 주세요.");
  }

  async function loadSavedSurvey(summary: SavedSurveySummary) {
    const supabase = getSupabaseBrowserClient(summary.editToken);
    if (!supabase) {
      setSaveState("error");
      setSaveMessage("Supabase 연결 정보를 확인해 주세요.");
      return;
    }

    const [
      { data: rawSurveyRow, error: surveyError },
      { data: rawChapterRows },
      { data: rawQuestionRows },
    ] = await Promise.all([
      supabase
        .from("surveys")
        .select("id,title,description,slug,settings")
        .eq("id", summary.id)
        .single(),
      supabase
        .from("chapters")
        .select("id,position,title,description")
        .eq("survey_id", summary.id)
        .order("position", { ascending: true }),
      supabase
        .from("questions")
        .select("id,chapter_id,position,prompt,kind,required,options,scale,analysis_role")
        .eq("survey_id", summary.id)
        .order("position", { ascending: true }),
    ]);

    if (surveyError || !rawSurveyRow) {
      setSaveState("error");
      setSaveMessage("저장된 설문을 불러오지 못했습니다.");
      return;
    }

    const loaded = surveyFromRows(
      rawSurveyRow as SurveyRow,
      (rawChapterRows ?? []) as ChapterRow[],
      (rawQuestionRows ?? []) as QuestionRow[],
      summary.editToken,
    );
    setSurvey(loaded);
    saveDraft(loaded);
    setSaveState("saved");
    setSaveMessage("저장된 설문을 불러왔습니다.");
  }

  async function saveSurvey() {
    const supabase = getSupabaseBrowserClient(survey.editToken);
    if (!supabase) {
      setSaveState("error");
      setSaveMessage("Supabase 연결 정보가 없어 저장할 수 없습니다.");
      return;
    }

    setSaveState("saving");
    setSaveMessage("설문을 저장하는 중입니다.");

    const normalized: EditableSurvey = {
      ...survey,
      title: survey.title.trim() || "제목 없는 설문",
      introduction: survey.introduction.trim(),
      slug: survey.published ? survey.slug : slugify(survey.title, survey.id),
      chapters: survey.chapters.map((chapter, index) => ({
        ...chapter,
        title: chapter.title.trim() || `${index + 1}장`,
        description: chapter.description?.trim() ?? "",
      })),
      questions: survey.questions.map((question, index) => ({
        ...question,
        prompt: question.prompt.trim() || `질문 ${index + 1}`,
      })),
    };

    try {
      const editTokenHash = await sha256(normalized.editToken);
      const { error: surveyError } = await supabase.from("surveys").upsert(
        {
          id: normalized.id,
          owner_id: null,
          title: normalized.title,
          purpose: "satisfaction",
          description: normalized.introduction,
          slug: normalized.slug,
          status: "draft",
          is_anonymous: true,
          settings: {
            editor: "chapters",
            privacyConsentRequired: normalized.privacyConsentRequired,
            privacyText: normalized.privacyText.trim(),
            updatedAt: new Date().toISOString(),
          },
          edit_token_hash: editTokenHash,
          published_at: null,
        },
        { onConflict: "id" },
      );
      if (surveyError) throw surveyError;

      const { error: deleteQuestionsError } = await supabase
        .from("questions")
        .delete()
        .eq("survey_id", normalized.id);
      if (deleteQuestionsError) throw deleteQuestionsError;

      const { error: deleteChaptersError } = await supabase
        .from("chapters")
        .delete()
        .eq("survey_id", normalized.id);
      if (deleteChaptersError) throw deleteChaptersError;

      const { error: chaptersError } = await supabase.from("chapters").insert(
        normalized.chapters.map((chapter, index) => ({
          survey_id: normalized.id,
          id: chapter.id,
          position: index + 1,
          title: chapter.title,
          description: chapter.description ?? "",
        })),
      );
      if (chaptersError) throw chaptersError;

      const { error: questionsError } = await supabase.from("questions").insert(
        normalized.questions.map((question, index) => ({
          survey_id: normalized.id,
          id: question.id,
          chapter_id: question.chapterId ?? normalized.chapters[0]?.id,
          position: index + 1,
          prompt: question.prompt,
          kind: question.kind,
          required: question.required,
          options: question.options ?? [],
          scale: question.scale ?? null,
          analysis_role: question.analysisRole ?? null,
        })),
      );
      if (questionsError) throw questionsError;

      const { error: publishError } = await supabase
        .from("surveys")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", normalized.id);
      if (publishError) throw publishError;

      const published = { ...normalized, published: true };
      const summary: SavedSurveySummary = {
        id: published.id,
        title: published.title,
        slug: published.slug,
        editToken: published.editToken,
        updatedAt: new Date().toISOString(),
        questionCount: published.questions.length,
      };
      const nextSummaries = [summary, ...savedSurveys.filter((item) => item.id !== summary.id)].slice(
        0,
        20,
      );

      setSurvey(published);
      setSavedSurveys(nextSummaries);
      saveDraft(published);
      saveSummaries(nextSummaries);
      setSaveState("saved");
      setSaveMessage("저장되었습니다. 응답 링크를 사용할 수 있습니다.");
    } catch (error) {
      console.error(error);
      setSaveState("error");
      const reason =
        typeof error === "object" && error && "message" in error
          ? String(error.message)
          : "연결 상태와 데이터베이스 설정을 확인해 주세요.";
      setSaveMessage(`저장하지 못했습니다. ${reason}`);
    }
  }

  async function deleteSavedSurvey(summary: SavedSurveySummary) {
    const supabase = getSupabaseBrowserClient(summary.editToken);
    if (!supabase) return;

    const { error } = await supabase.from("surveys").delete().eq("id", summary.id);
    if (error) {
      setSaveState("error");
      setSaveMessage("설문을 삭제하지 못했습니다.");
      return;
    }

    const nextSummaries = savedSurveys.filter((item) => item.id !== summary.id);
    setSavedSurveys(nextSummaries);
    saveSummaries(nextSummaries);
    removeDraft(summary.id);
    if (survey.id === summary.id) createNewSurvey();
    setSaveMessage("설문을 삭제했습니다.");
  }

  return (
    <main className="min-h-dvh bg-[#f5f7fa] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Image
            alt="온(ON)통계"
            className="h-16 w-auto object-contain sm:h-[72px]"
            height={352}
            priority
            src="/ontong-logo.png"
            width={780}
          />
          <button
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={createNewSurvey}
            type="button"
          >
            <FilePlus2 className="size-4" aria-hidden />
            새 설문
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1360px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,820px)_360px] lg:px-6">
        <section className="grid content-start gap-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h1 className="text-xl font-bold">설문지 작성</h1>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#3182f6] px-5 text-sm font-semibold text-white transition hover:bg-[#1b64da] disabled:opacity-60"
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
            </div>

            <div className="grid gap-5">
              <Field label="설문 제목">
                <input
                  className="input text-lg font-semibold"
                  onChange={(event) => updateTitle(event.target.value)}
                  placeholder="설문 제목을 입력하세요"
                  value={survey.title}
                />
              </Field>
              <Field label="설문 소개">
                <textarea
                  className="input min-h-28 resize-y py-3"
                  onChange={(event) => editSurvey({ introduction: event.target.value })}
                  placeholder="학생에게 보여줄 설문 안내를 입력하세요"
                  value={survey.introduction}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-[#3182f6]" aria-hidden />
                <h2 className="text-base font-bold">개인정보 동의</h2>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input
                  checked={survey.privacyConsentRequired}
                  className="size-4 accent-[#3182f6]"
                  onChange={(event) => editSurvey({ privacyConsentRequired: event.target.checked })}
                  type="checkbox"
                />
                동의 필수
              </label>
            </div>
            <textarea
              className="input mt-4 min-h-24 resize-y py-3"
              onChange={(event) => editSurvey({ privacyText: event.target.value })}
              value={survey.privacyText}
            />
          </section>

          {survey.chapters.map((chapter, chapterIndex) => (
            <ChapterEditor
              chapter={chapter}
              chapterIndex={chapterIndex}
              key={chapter.id}
              onAddQuestion={addQuestion}
              onChapterChange={updateChapter}
              onKindChange={changeQuestionKind}
              onQuestionChange={updateQuestion}
              onRemoveChapter={removeChapter}
              onRemoveQuestion={removeQuestion}
              questions={survey.questions.filter((question) => question.chapterId === chapter.id)}
              removable={survey.chapters.length > 1}
            />
          ))}

          <button
            className="flex h-14 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:border-[#3182f6] hover:text-[#3182f6]"
            onClick={addChapter}
            type="button"
          >
            <Layers3 className="size-4" aria-hidden />
            챕터 추가
          </button>
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold">응답 링크</h2>
            <p
              className={`mt-2 text-sm font-medium ${
                saveState === "error" ? "text-red-600" : "text-slate-500"
              }`}
            >
              {saveMessage}
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-2">
              <code className="min-w-0 flex-1 truncate px-2 text-xs text-slate-600">
                {linkEnabled ? responseUrl : "저장 후 링크가 생성됩니다"}
              </code>
              <button
                aria-label="응답 링크 복사"
                className="flex size-10 items-center justify-center rounded-lg bg-white text-slate-600 disabled:text-slate-300"
                disabled={!linkEnabled}
                onClick={() =>
                  navigator.clipboard?.writeText(`${window.location.origin}${responseUrl}`)
                }
                type="button"
              >
                <Copy className="size-4" aria-hidden />
              </button>
            </div>
            {linkEnabled ? (
              <a
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
                href={responseUrl}
                target="_blank"
              >
                <ExternalLink className="size-4" aria-hidden />
                응답 화면 열기
              </a>
            ) : null}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-5 text-[#3182f6]" aria-hidden />
              <h2 className="text-base font-bold">저장된 설문</h2>
            </div>
            <div className="mt-4 grid gap-2">
              {savedSurveys.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  저장된 설문이 없습니다.
                </p>
              ) : (
                savedSurveys.map((item) => (
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2" key={item.id}>
                    <button
                      className="min-w-0 flex-1 p-2 text-left"
                      onClick={() => loadSavedSurvey(item)}
                      type="button"
                    >
                      <span className="block truncate text-sm font-semibold">{item.title}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        문항 {item.questionCount}개
                      </span>
                    </button>
                    <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
                    <button
                      aria-label={`${item.title} 삭제`}
                      className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-red-500"
                      onClick={() => deleteSavedSurvey(item)}
                      type="button"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ChapterEditor({
  chapter,
  chapterIndex,
  onAddQuestion,
  onChapterChange,
  onKindChange,
  onQuestionChange,
  onRemoveChapter,
  onRemoveQuestion,
  questions,
  removable,
}: {
  chapter: SurveyChapter;
  chapterIndex: number;
  onAddQuestion: (chapterId: string) => void;
  onChapterChange: (id: string, patch: Partial<SurveyChapter>) => void;
  onKindChange: (id: string, kind: QuestionKind) => void;
  onQuestionChange: (id: string, patch: Partial<SurveyQuestion>) => void;
  onRemoveChapter: (id: string) => void;
  onRemoveQuestion: (id: string) => void;
  questions: SurveyQuestion[];
  removable: boolean;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="flex items-start gap-3 border-b border-slate-100 p-5 sm:p-6">
        <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#3182f6]">
          {chapterIndex + 1}
        </span>
        <div className="grid min-w-0 flex-1 gap-2">
          <input
            className="border-0 bg-transparent text-base font-bold outline-none"
            onChange={(event) => onChapterChange(chapter.id, { title: event.target.value })}
            placeholder="챕터 제목"
            value={chapter.title}
          />
          <input
            className="border-0 bg-transparent text-sm text-slate-500 outline-none"
            onChange={(event) => onChapterChange(chapter.id, { description: event.target.value })}
            placeholder="챕터 안내 (선택)"
            value={chapter.description ?? ""}
          />
        </div>
        <button
          aria-label="챕터 삭제"
          className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:hidden"
          disabled={!removable}
          onClick={() => onRemoveChapter(chapter.id)}
          type="button"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </header>

      <div className="divide-y divide-slate-100">
        {questions.map((question, index) => (
          <QuestionEditor
            index={index}
            key={question.id}
            onChange={onQuestionChange}
            onKindChange={onKindChange}
            onRemove={onRemoveQuestion}
            question={question}
          />
        ))}
      </div>

      <button
        className="m-4 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-[#3182f6] hover:text-[#3182f6] sm:m-5"
        onClick={() => onAddQuestion(chapter.id)}
        type="button"
      >
        <Plus className="size-4" aria-hidden />
        질문 추가
      </button>
    </section>
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
  const hasScale = question.kind === "likert" || question.kind === "matrix_likert";

  return (
    <article className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-3 text-sm font-semibold text-slate-400">{index + 1}.</span>
        <div className="grid min-w-0 flex-1 gap-4">
          <input
            className="input"
            onChange={(event) => onChange(question.id, { prompt: event.target.value })}
            placeholder="질문을 입력하세요"
            value={question.prompt}
          />
          <div className="flex flex-wrap gap-3">
            <select
              aria-label="질문 형식"
              className="input h-11 w-40"
              onChange={(event) => onKindChange(question.id, event.target.value as QuestionKind)}
              value={question.kind}
            >
              {questionKindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label className="flex h-11 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm font-medium text-slate-600">
              <input
                checked={question.required}
                className="accent-[#3182f6]"
                onChange={(event) => onChange(question.id, { required: event.target.checked })}
                type="checkbox"
              />
              필수 응답
            </label>
          </div>
          {question.kind === "single_choice" || question.kind === "matrix_likert" ? (
            <Field
              label={
                question.kind === "matrix_likert"
                  ? "행 문항 (한 줄에 하나)"
                  : "선택지 (한 줄에 하나)"
              }
            >
              <textarea
                className="input min-h-24 resize-y py-3"
                onChange={(event) =>
                  onChange(question.id, {
                    options: event.target.value
                      .split("\n")
                      .map((option) => option.trim())
                      .filter(Boolean),
                  })
                }
                value={(question.options ?? []).join("\n")}
              />
            </Field>
          ) : null}
          {hasScale && question.scale ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`${question.scale.min}점 의미`}>
                <input
                  className="input h-11"
                  onChange={(event) =>
                    onChange(question.id, {
                      scale: { ...question.scale!, minLabel: event.target.value },
                    })
                  }
                  value={question.scale.minLabel}
                />
              </Field>
              <Field label={`${question.scale.max}점 의미`}>
                <input
                  className="input h-11"
                  onChange={(event) =>
                    onChange(question.id, {
                      scale: { ...question.scale!, maxLabel: event.target.value },
                    })
                  }
                  value={question.scale.maxLabel}
                />
              </Field>
            </div>
          ) : null}
        </div>
        <button
          aria-label="질문 삭제"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          onClick={() => onRemove(question.id)}
          type="button"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </article>
  );
}
