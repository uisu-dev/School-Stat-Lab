"use client";

import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  QuestionKind,
  SurveyAnswerValue,
  SurveyChapter,
  SurveyQuestion,
  SurveyTemplate,
} from "@/lib/types";
import { AlertCircle, CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

type FormState = Record<string, SurveyAnswerValue>;

type SurveyRow = {
  id: string;
  title: string;
  description: string | null;
  purpose: SurveyTemplate["purpose"];
  settings: {
    privacyConsentRequired?: boolean;
    privacyText?: string;
  } | null;
};

type ChapterRow = {
  id: string;
  position: number;
  title: string;
  description: string | null;
};

type QuestionRow = {
  id: string;
  chapter_id: string | null;
  position: number;
  prompt: string;
  kind: QuestionKind;
  required: boolean;
  options: string[] | null;
  scale: SurveyQuestion["scale"] | null;
  analysis_role: SurveyQuestion["analysisRole"] | null;
};

export function ResponseForm({ slug }: { slug: string }) {
  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [answers, setAnswers] = useState<FormState>({});
  const [consented, setConsented] = useState(false);
  const [status, setStatus] = useState<
    "loading" | "idle" | "submitting" | "submitted" | "missing" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSurvey() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (mounted) {
          setStatus("error");
          setErrorMessage("설문 서버에 연결할 수 없습니다.");
        }
        return;
      }

      const { data: rawSurveyRow, error: surveyError } = await supabase
        .from("surveys")
        .select("id,title,description,purpose,settings")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (!mounted) return;
      if (surveyError || !rawSurveyRow) {
        setStatus("missing");
        return;
      }

      const surveyRow = rawSurveyRow as SurveyRow;
      const [{ data: rawChapterRows }, { data: rawQuestionRows, error: questionsError }] =
        await Promise.all([
          supabase
            .from("chapters")
            .select("id,position,title,description")
            .eq("survey_id", surveyRow.id)
            .order("position", { ascending: true }),
          supabase
            .from("questions")
            .select("id,chapter_id,position,prompt,kind,required,options,scale,analysis_role")
            .eq("survey_id", surveyRow.id)
            .order("position", { ascending: true }),
        ]);

      if (!mounted) return;
      if (questionsError) {
        setStatus("error");
        setErrorMessage("질문을 불러오지 못했습니다.");
        return;
      }

      setSurvey({
        id: surveyRow.id,
        title: surveyRow.title,
        purpose: surveyRow.purpose,
        description: surveyRow.description ?? "",
        privacyConsentRequired: surveyRow.settings?.privacyConsentRequired ?? true,
        privacyText: surveyRow.settings?.privacyText ?? "",
        chapters: ((rawChapterRows ?? []) as ChapterRow[]).map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          description: chapter.description ?? "",
        })),
        questions: ((rawQuestionRows ?? []) as QuestionRow[]).map((question) => ({
          id: question.id,
          chapterId: question.chapter_id ?? undefined,
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
    if (!survey) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus("error");
      setErrorMessage("응답을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setStatus("submitting");
    const responseId = crypto.randomUUID();
    const { error: responseError } = await supabase.from("responses").insert({
      id: responseId,
      survey_id: survey.id,
      respondent_key: typeof answers.respondent_key === "string" ? answers.respondent_key : null,
      consented_at: consented ? new Date().toISOString() : null,
      consent_version: survey.privacyConsentRequired ? "v1" : null,
    });

    if (responseError) {
      setStatus("error");
      setErrorMessage("응답을 저장하지 못했습니다. 다시 제출해 주세요.");
      return;
    }

    const { error: answersError } = await supabase.from("answers").insert(
      survey.questions.map((question) => ({
        response_id: responseId,
        survey_id: survey.id,
        question_id: question.id,
        value: answers[question.id] ?? null,
      })),
    );

    if (answersError) {
      setStatus("error");
      setErrorMessage("답변 저장 중 오류가 발생했습니다. 담당 선생님께 알려 주세요.");
      return;
    }

    setStatus("submitted");
  }

  if (status === "loading") {
    return <StatusPage icon={<Loader2 className="size-9 animate-spin text-[#3182f6]" />} text="설문을 불러오는 중입니다." />;
  }

  if (status === "missing") {
    return <StatusPage icon={<AlertCircle className="size-10 text-slate-400" />} text="게시된 설문을 찾을 수 없습니다." />;
  }

  if (status === "submitted") {
    return (
      <StatusPage
        icon={<CheckCircle2 className="size-12 text-[#3182f6]" />}
        text="응답이 제출되었습니다."
        secondary="참여해 주셔서 감사합니다."
      />
    );
  }

  if (!survey) {
    return (
      <StatusPage
        icon={<AlertCircle className="size-10 text-red-500" />}
        text={errorMessage || "설문을 표시할 수 없습니다."}
      />
    );
  }

  const chapters = survey.chapters?.length
    ? survey.chapters
    : [{ id: "questions", title: "질문" } satisfies SurveyChapter];
  const questionsForChapter = (chapterId: string) =>
    survey.questions.filter(
      (question) =>
        question.chapterId === chapterId ||
        (chapterId === "questions" && question.chapterId === undefined),
    );

  return (
    <main className="min-h-dvh bg-[#f5f7fa] px-4 py-5 text-slate-950 sm:px-6">
      <form className="mx-auto grid w-full max-w-3xl gap-4" onSubmit={handleSubmit}>
        <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
          <Image
            alt="온(ON)통계"
            className="mb-5 h-14 w-auto object-contain"
            height={352}
            src="/ontong-logo.png"
            width={780}
          />
          <h1 className="text-2xl font-bold">{survey.title}</h1>
          {survey.description ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {survey.description}
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-[#3182f6]" aria-hidden />
            <h2 className="text-base font-bold">개인정보 수집 및 이용 동의</h2>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
            {survey.privacyText || "설문 응답 처리에 동의합니다."}
          </p>
          <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-lg bg-slate-50 p-4 text-sm font-semibold">
            <input
              checked={consented}
              className="size-4 accent-[#3182f6]"
              onChange={(event) => setConsented(event.target.checked)}
              required={survey.privacyConsentRequired}
              type="checkbox"
            />
            동의합니다{survey.privacyConsentRequired ? " (필수)" : ""}
          </label>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
          <label className="grid gap-2">
            <span className="text-sm font-semibold">연결 코드</span>
            <input
              className="input"
              onChange={(event) =>
                setAnswers((current) => ({ ...current, respondent_key: event.target.value }))
              }
              placeholder="예: 2401"
            />
          </label>
        </section>

        {chapters.map((chapter) => (
          <section className="rounded-lg border border-slate-200 bg-white" key={chapter.id}>
            <header className="border-b border-slate-100 p-5 sm:p-7">
              <h2 className="text-lg font-bold">{chapter.title}</h2>
              {chapter.description ? (
                <p className="mt-2 text-sm text-slate-500">{chapter.description}</p>
              ) : null}
            </header>
            <div className="divide-y divide-slate-100 px-5 sm:px-7">
              {questionsForChapter(chapter.id).map((question, index) => (
                <QuestionField
                  answers={answers}
                  index={index}
                  key={question.id}
                  onAnswer={(value) =>
                    setAnswers((current) => ({ ...current, [question.id]: value }))
                  }
                  question={question}
                />
              ))}
            </div>
          </section>
        ))}

        {status === "error" ? (
          <p className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700">{errorMessage}</p>
        ) : null}
        <button
          className="mt-2 inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-[#3182f6] px-4 text-sm font-bold text-white transition hover:bg-[#1b64da] disabled:opacity-60"
          disabled={status === "submitting"}
          type="submit"
        >
          {status === "submitting" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
          응답 제출
        </button>
      </form>
    </main>
  );
}

function QuestionField({
  answers,
  index,
  onAnswer,
  question,
}: {
  answers: FormState;
  index: number;
  onAnswer: (value: SurveyAnswerValue) => void;
  question: SurveyQuestion;
}) {
  const values =
    question.scale &&
    Array.from(
      { length: question.scale.max - question.scale.min + 1 },
      (_, position) => question.scale!.min + position,
    );

  return (
    <fieldset className="grid gap-4 border-0 py-6">
      <legend className="text-base font-semibold">
        {index + 1}. {question.prompt}
        {question.required ? <span className="text-[#3182f6]"> *</span> : null}
      </legend>

      {question.kind === "single_choice" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {(question.options ?? []).map((option) => (
            <RadioOption
              checked={answers[question.id] === option}
              key={option}
              name={question.id}
              onChange={() => onAnswer(option)}
              required={question.required}
              value={option}
            />
          ))}
        </div>
      ) : null}

      {question.kind === "likert" && question.scale && values ? (
        <>
          <div className="flex justify-between text-xs font-medium text-slate-500">
            <span>{question.scale.minLabel}</span>
            <span>{question.scale.maxLabel}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {values.map((value) => (
              <RadioOption
                checked={answers[question.id] === value}
                key={value}
                name={question.id}
                onChange={() => onAnswer(value)}
                required={question.required}
                value={value}
              />
            ))}
          </div>
        </>
      ) : null}

      {question.kind === "matrix_likert" && question.scale && values ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] table-fixed border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="w-[42%] text-left font-medium">
                  {question.scale.minLabel} / {question.scale.maxLabel}
                </th>
                {values.map((value) => (
                  <th className="font-medium" key={value}>
                    {value}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(question.options ?? []).map((row) => {
                const matrixValue = answers[question.id];
                const selected =
                  typeof matrixValue === "object" && matrixValue !== null && !Array.isArray(matrixValue)
                    ? matrixValue[row]
                    : null;
                return (
                  <tr className="bg-slate-50" key={row}>
                    <th className="rounded-l-lg px-3 py-3 text-left font-medium">{row}</th>
                    {values.map((value, optionIndex) => (
                      <td className={optionIndex === values.length - 1 ? "rounded-r-lg" : ""} key={value}>
                        <label className="flex cursor-pointer items-center justify-center p-3">
                          <input
                            checked={selected === value}
                            className="size-4 accent-[#3182f6]"
                            name={`${question.id}_${row}`}
                            onChange={() =>
                              onAnswer({
                                ...(typeof matrixValue === "object" &&
                                matrixValue !== null &&
                                !Array.isArray(matrixValue)
                                  ? matrixValue
                                  : {}),
                                [row]: value,
                              })
                            }
                            required={question.required}
                            type="radio"
                            value={value}
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {question.kind === "number" ? (
        <input
          className="input"
          onChange={(event) => onAnswer(event.target.value === "" ? null : Number(event.target.value))}
          required={question.required}
          type="number"
        />
      ) : null}

      {question.kind === "long_text" || question.kind === "short_text" ? (
        <textarea
          className="input min-h-28 resize-y py-3"
          onChange={(event) => onAnswer(event.target.value)}
          required={question.required}
        />
      ) : null}
    </fieldset>
  );
}

function RadioOption({
  checked,
  name,
  onChange,
  required,
  value,
}: {
  checked: boolean;
  name: string;
  onChange: () => void;
  required: boolean;
  value: string | number;
}) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-semibold transition ${
        checked
          ? "border-[#3182f6] bg-blue-50 text-[#1763cd]"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      <input
        checked={checked}
        className="sr-only"
        name={name}
        onChange={onChange}
        required={required}
        type="radio"
        value={value}
      />
      {value}
    </label>
  );
}

function StatusPage({
  icon,
  secondary,
  text,
}: {
  icon: React.ReactNode;
  secondary?: string;
  text: string;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f5f7fa] px-5 text-center">
      <div className="grid max-w-sm justify-items-center gap-4 rounded-lg border border-slate-200 bg-white p-10">
        {icon}
        <h1 className="text-xl font-bold">{text}</h1>
        {secondary ? <p className="text-sm text-slate-500">{secondary}</p> : null}
      </div>
    </main>
  );
}
