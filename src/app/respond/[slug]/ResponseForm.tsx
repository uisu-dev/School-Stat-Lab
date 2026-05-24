"use client";

import { demoSurvey } from "@/lib/demo-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { SurveyAnswerValue } from "@/lib/types";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useState } from "react";

type FormState = Record<string, SurveyAnswerValue>;

export function ResponseForm({ slug }: { slug: string }) {
  const [answers, setAnswers] = useState<FormState>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    const supabase = getSupabaseBrowserClient();

    if (supabase) {
      const { data: response } = await supabase
        .from("responses")
        .insert({
          survey_id: demoSurvey.id,
          respondent_key: typeof answers.respondent_key === "string" ? answers.respondent_key : null,
        })
        .select("id")
        .single();

      if (response) {
        await supabase.from("answers").insert(
          demoSurvey.questions.map((question) => ({
            response_id: response.id,
            survey_id: demoSurvey.id,
            question_id: question.id,
            value: answers[question.id] ?? null,
          })),
        );
      }
    } else {
      window.localStorage.setItem(
        `school-stat-lab:${slug}:${Date.now()}`,
        JSON.stringify({ answers, submittedAt: new Date().toISOString() }),
      );
    }

    setStatus("submitted");
  }

  if (status === "submitted") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center px-5 text-center">
        <CheckCircle2 className="mb-5 size-12 text-emerald-500" aria-hidden />
        <h1 className="text-2xl font-semibold text-slate-950">응답이 제출되었습니다</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          선생님 화면에서 응답이 통계 분석 자료로 자동 정리됩니다.
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-[#f6f7f9] px-4 py-6 text-slate-950 sm:px-6">
      <form
        onSubmit={handleSubmit}
        className="mx-auto grid w-full max-w-2xl gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div>
          <p className="text-xs font-semibold uppercase text-teal-700">학생 응답</p>
          <h1 className="mt-2 text-2xl font-semibold">{demoSurvey.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{demoSurvey.description}</p>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">익명 연결 코드</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            placeholder="예: 2401"
            onChange={(event) =>
              setAnswers((current) => ({ ...current, respondent_key: event.target.value }))
            }
          />
          <span className="text-xs text-slate-500">
            사전/사후 비교가 필요한 설문에서만 사용합니다. 이름 대신 선생님이 안내한 코드를 입력하세요.
          </span>
        </label>

        {demoSurvey.questions.map((question) => (
          <fieldset key={question.id} className="grid gap-3 border-t border-slate-100 pt-4">
            <legend className="text-sm font-medium text-slate-900">
              {question.prompt}
              {question.required ? <span className="text-rose-500"> *</span> : null}
            </legend>

            {question.kind === "likert" && question.scale ? (
              <div className="grid grid-cols-5 gap-2">
                {Array.from(
                  { length: question.scale.max - question.scale.min + 1 },
                  (_, index) => question.scale!.min + index,
                ).map((value) => (
                  <label
                    key={value}
                    className="flex h-12 cursor-pointer items-center justify-center rounded-md border border-slate-200 text-sm font-medium transition has-checked:border-teal-600 has-checked:bg-teal-50"
                  >
                    <input
                      className="sr-only"
                      required={question.required}
                      type="radio"
                      name={question.id}
                      value={value}
                      onChange={() => setAnswers((current) => ({ ...current, [question.id]: value }))}
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
                    className="flex h-11 cursor-pointer items-center rounded-md border border-slate-200 px-3 text-sm transition has-checked:border-teal-600 has-checked:bg-teal-50"
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

            {question.kind === "short_text" ? (
              <input
                className="h-11 rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                required={question.required}
                onChange={(event) =>
                  setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                }
              />
            ) : null}
          </fieldset>
        ))}

        <button
          className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={status === "submitting"}
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
