import type { QuestionKind, SurveyQuestion, SurveyTemplate } from "@/lib/types";

export type SavedSurveySummary = {
  id: string;
  title: string;
  slug: string;
  editToken: string;
  updatedAt: string;
  questionCount: number;
};

export type EditableSurvey = {
  id: string;
  title: string;
  description: string;
  slug: string;
  editToken: string;
  questions: SurveyQuestion[];
};

export type SurveyRow = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
};

export type QuestionRow = {
  id: string;
  position: number;
  prompt: string;
  kind: QuestionKind;
  required: boolean;
  options: string[] | null;
  scale: SurveyQuestion["scale"] | null;
  analysis_role: SurveyQuestion["analysisRole"] | null;
};

export const savedSurveyStorageKey = "school-stat-lab:saved-surveys";
export const draftSurveyStoragePrefix = "school-stat-lab:draft:";

export function createEditableSurvey(template: SurveyTemplate): EditableSurvey {
  const id = crypto.randomUUID();
  return {
    id,
    title: template.title,
    description: template.description,
    slug: slugify(template.title, id),
    editToken: createEditToken(),
    questions: template.questions.map((question) => ({ ...question })),
  };
}

export function createBlankQuestion(position: number): SurveyQuestion {
  return {
    id: `q_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`,
    prompt: "새 질문",
    kind: "likert",
    required: true,
    scale: {
      min: 1,
      max: 5,
      minLabel: "전혀 아니다",
      maxLabel: "매우 그렇다",
    },
    analysisRole: position === 1 ? "outcome" : "note",
  };
}

export function updateQuestionForKind(question: SurveyQuestion, kind: QuestionKind): SurveyQuestion {
  if (kind === "single_choice") {
    return {
      ...question,
      kind,
      options: question.options?.length ? question.options : ["선택지 1", "선택지 2"],
      scale: undefined,
      analysisRole: "category",
    };
  }

  if (kind === "likert") {
    return {
      ...question,
      kind,
      options: undefined,
      scale: question.scale ?? {
        min: 1,
        max: 5,
        minLabel: "전혀 아니다",
        maxLabel: "매우 그렇다",
      },
      analysisRole: "outcome",
    };
  }

  return {
    ...question,
    kind,
    options: undefined,
    scale: undefined,
    analysisRole: kind === "number" ? "outcome" : "note",
  };
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function createEditToken() {
  return `sst_${crypto.randomUUID()}_${crypto.randomUUID()}`;
}

export function slugify(title: string, id: string) {
  const cleaned = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${cleaned || "survey"}-${id.slice(0, 8)}`;
}

export function saveSummaries(summaries: SavedSurveySummary[]) {
  window.localStorage.setItem(savedSurveyStorageKey, JSON.stringify(summaries));
}

export function loadSummaries(): SavedSurveySummary[] {
  const raw = window.localStorage.getItem(savedSurveyStorageKey);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as SavedSurveySummary[];
  } catch {
    return [];
  }
}

export function saveDraft(survey: EditableSurvey) {
  window.localStorage.setItem(`${draftSurveyStoragePrefix}${survey.id}`, JSON.stringify(survey));
}

export function loadDraft(id: string): EditableSurvey | null {
  const raw = window.localStorage.getItem(`${draftSurveyStoragePrefix}${id}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as EditableSurvey;
  } catch {
    return null;
  }
}

export function surveyFromRows(
  surveyRow: SurveyRow,
  questionRows: QuestionRow[],
  editToken: string,
): EditableSurvey {
  return {
    id: surveyRow.id,
    title: surveyRow.title,
    description: surveyRow.description ?? "",
    slug: surveyRow.slug,
    editToken,
    questions: questionRows
      .toSorted((a, b) => a.position - b.position)
      .map((row) => ({
        id: row.id,
        prompt: row.prompt,
        kind: row.kind,
        required: row.required,
        options: row.options ?? undefined,
        scale: row.scale ?? undefined,
        analysisRole: row.analysis_role ?? undefined,
      })),
  };
}
