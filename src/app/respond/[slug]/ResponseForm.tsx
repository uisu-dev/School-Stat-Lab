"use client";

import { demoSurvey } from "@/lib/demo-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { QuestionKind, SurveyAnswerValue, SurveyQuestion, SurveyTemplate } from "@/lib/types";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";

type FormState = Record<string, SurveyAnswerValue>;

type SurveyRow = {
  id: string;
  title: string;
  description: string | null;
  purpose: SurveyTemplate["purpose"];
};

type QuestionRow = {
  id: string;
  position: number;
  prompt: string;
  kind: QuestionKind;
  required: boolean;
  options: string[] | null;
  scale: SurveyQuestion["scale"] | null;
  analysis_role: SurveyQuestion["analysisRole"] | null;
};

export function ResponseForm({ slug }: { slug: string }) {
  const [survey, setSurvey] = useState<SurveyTemplate>(demoSurvey);
  const [answers, setAnswers] = useState<FormState>({});
  const [status, setStatus] = useState<"idle" | "loading" | "submitting" | "submitted">("loading");

  useEffect(() => {
    let mounted = true;

    async function loadSurvey() {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        setStatus("idle");
        return;
      }

      const { data: rawSurveyRow } = await supabase
        .from("surveys")
        .select("id,title,description,purpose")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      const surveyRow = rawSurveyRow as SurveyRow | null;
      if (!surveyRow) {
        setStatus("idle");
        return;
      }

      const { data: rawQuestionRows } = await supabase
        .from("questions")
        .select("id,position,prompt,kind,required,options,scale,analysis_role")
        .eq("survey_id", surveyRow.id)
        .order("position", { ascending: true });

      if (!mounted) return;

      const questionRows = rawQuestionRows as QuestionRow[] | null;
      setSurvey({
        id: surveyRow.id,
        title: surveyRow.title,
        purpose: surveyRow.purpose,
        description: surveyRow.description ?? "",
        questions: (questionRows ?? []).map((question) => ({
          id: question.id,
          prompt: question.prompt,
          kind: question.kind,
          required: question.required,
          options: question.options ?? undefined,
          scale: question.scale ?? undefined,
          analysisRole: question.analysis_role ?? undefined,
        })),
      });
      setStatus("idle");
    }

    loadSurvey();

    return () => {
      mounted = false;
    };
  }, [slug]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      const responseId = crypto.randomUUID();
      const { error: responseError } = await supabase.from("responses").insert({
        id: responseId,
        survey_id: survey.id,
        respondent_key: typeof answers.respondent_key === "string" ? answers.respondent_key : null,
      });

      if (!responseError) {
        const { error: answerError } = await supabase.from("answers").insert(
          survey.questions.map((question) => ({
            response_id: responseId,
            survey_id: survey.id,
            question_id: question.id,
            value: answers[question.id] ?? null,
          })),
        );

        if (answerError) {
          saveFallback(slug, answers, answerError.message);
        }
      } else {
        saveFallback(slug, answers, responseError.message);
      }
    } else {
      saveFallback(slug, answers);
    }

    setStatus("submitted");
  }

  if (status === "submitted") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center px-5 text-center">
        <CheckCircle2 className="mb-5 size-12 text-blue-500" aria-hidden />
        <h1 className="text-2xl font-bold text-slate-950">응답이 제출되었습니다</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          선생님 화면에서 응답이 통계 분석 자료로 정리됩니다.
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-[#f7f8fa] px-4 py-6 text-slate-950 sm:px-6">
      <form
        onSubmit={handleSubmit}
        className="mx-auto grid w-full max-w-2xl gap-5 rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8"
      >
        <div>
          <p className="text-xs font-bold uppercase text-blue-600">학생 응답</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{survey.title}</h1>
          {survey.description ? (
            <p className="mt-2 text-sm leading-6 text-slate-500">{survey.description}</p>
          ) : null}
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-800">익명 연결 코드</span>
          <input
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="예: 2401"
            onChange={(event) =>
              setAnswers((current) => ({ ...current, respondent_key: event.target.value }))
            }
          />
        </label>

        {status === "loading" ? (
          <div className="flex h-32 items-center justify-center text-sm text-slate-500">
            설문을 불러오는 중입니다
          </div>
        ) : (
          survey.questions.map((question, index) => (
            <fieldset key={question.id} className="grid gap-3 border-t border-slate-100 pt-5">
              <legend className="text-base font-bold text-slate-950">
                {index + 1}. {question.prompt}
                {question.required ? <span className="text-blue-500"> *</span> : null}
              </legend>

              {question.kind === "likert" && question.scale ? (
                <div className="grid grid-cols-5 gap-2">
                  {Array.from(
                    { length: question.scale.max - question.scale.min + 1 },
                    (_, optionIndex) => question.scale!.min + optionIndex,
                  ).map((value) => (
                    <label
                      key={value}
                      className="flex h-12 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-bold transition has-checked:border-blue-500 has-checked:bg-blue-50 has-checked:text-blue-700"
                    >
                      <input
                        className="sr-only"
                        required={question.required}
                        type="radio"
                        name={question.id}
                        value={value}
                        onChange={() =>
                          setAnswers((current) => ({ ...current, [question.id]: value }))
                        }
                      />
                      {value}
                    </label>
                  ))}
                </div>
              ) : null}

              {question.kind === "single_choice" && question.options ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {question.options.map((option) => (
                    <label
                      key={option}
                      className="flex min-h-12 cursor-pointer items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold transition has-checked:border-blue-500 has-checked:bg-blue-50 has-checked:text-blue-700"
                    >
                      <input
                        className="mr-2"
                        required={question.required}
                        type="radio"
                        name={question.id}
                        value={option}
                        onChange={() =>
                          setAnswers((current) => ({ ...current, [question.id]: option }))
                        }
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : null}

              {question.kind === "short_text" || question.kind === "number" ? (
                <input
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  required={question.required}
                  type={question.kind === "number" ? "number" : "text"}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]:
                        question.kind === "number" ? Number(event.target.value) : event.target.value,
                    }))
                  }
                />
              ) : null}

              {question.kind === "long_text" ? (
                <textarea
                  className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  required={question.required}
                  onChange={(event) =>
                    setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                  }
                />
              ) : null}
            </fieldset>
          ))
        )}

        <button
          className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={status === "submitting" || status === "loading"}
          type="submit"
        >
          {status === "submitting" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
          제출하기
        </button>
      </form>
    </main>
  );
}

function saveFallback(slug: string, answers: FormState, error?: string) {
  window.localStorage.setItem(
    `school-stat-lab:${slug}:${Date.now()}`,
    JSON.stringify({ answers, submittedAt: new Date().toISOString(), error }),
  );
}
