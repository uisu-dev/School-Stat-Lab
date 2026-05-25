import type { QuestionKind, SurveyChapter, SurveyQuestion } from "@/lib/types";

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
  introduction: string;
  slug: string;
  editToken: string;
  privacyConsentRequired: boolean;
  privacyText: string;
  chapters: SurveyChapter[];
  questions: SurveyQuestion[];
  published: boolean;
};

export type SurveyRow = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  settings: {
    privacyConsentRequired?: boolean;
    privacyText?: string;
  } | null;
};

export type ChapterRow = {
  id: string;
  position: number;
  title: string;
  description: string | null;
};

export type QuestionRow = {
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

export const savedSurveyStorageKey = "ontong-stat:saved-surveys:v1";
export const draftSurveyStoragePrefix = "ontong-stat:draft:v1:";

const defaultPrivacyText =
  "설문 응답은 교육 활동 개선과 통계 분석 학습 목적으로만 활용되며, 개인정보는 필요한 범위에서 안전하게 처리됩니다.";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

export function createBlankChapter(position = 1): SurveyChapter {
  return {
    id: createId("chapter"),
    title: `${position}장`,
    description: "",
  };
}

export function createBlankQuestion(chapterId: string): SurveyQuestion {
  return {
    id: createId("q"),
    chapterId,
    prompt: "",
    kind: "single_choice",
    required: true,
    options: ["선택지 1", "선택지 2"],
    analysisRole: "category",
  };
}

export function createBlankSurvey(): EditableSurvey {
  const id = crypto.randomUUID();
  const chapter = createBlankChapter();

  return {
    id,
    title: "",
    introduction: "",
    slug: slugify("survey", id),
    editToken: createEditToken(),
    privacyConsentRequired: true,
    privacyText: defaultPrivacyText,
    chapters: [chapter],
    questions: [createBlankQuestion(chapter.id)],
    published: false,
  };
}

export function updateQuestionForKind(
  question: SurveyQuestion,
  kind: QuestionKind,
): SurveyQuestion {
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
        minLabel: "전혀 그렇지 않다",
        maxLabel: "매우 그렇다",
      },
      analysisRole: "outcome",
    };
  }

  if (kind === "matrix_likert") {
    return {
      ...question,
      kind,
      options: question.options?.length ? question.options : ["문항 1", "문항 2"],
      scale: question.scale ?? {
        min: 1,
        max: 5,
        minLabel: "전혀 그렇지 않다",
        maxLabel: "매우 그렇다",
      },
      analysisRole: "scale_item",
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
  return `ontong_${crypto.randomUUID()}_${crypto.randomUUID()}`;
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

export function removeDraft(id: string) {
  window.localStorage.removeItem(`${draftSurveyStoragePrefix}${id}`);
}

export function surveyFromRows(
  surveyRow: SurveyRow,
  chapterRows: ChapterRow[],
  questionRows: QuestionRow[],
  editToken: string,
): EditableSurvey {
  return {
    id: surveyRow.id,
    title: surveyRow.title,
    introduction: surveyRow.description ?? "",
    slug: surveyRow.slug,
    editToken,
    privacyConsentRequired: surveyRow.settings?.privacyConsentRequired ?? true,
    privacyText: surveyRow.settings?.privacyText ?? defaultPrivacyText,
    chapters: chapterRows
      .toSorted((a, b) => a.position - b.position)
      .map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? "",
      })),
    questions: questionRows
      .toSorted((a, b) => a.position - b.position)
      .map((row) => ({
        id: row.id,
        chapterId: row.chapter_id ?? undefined,
        prompt: row.prompt,
        kind: row.kind,
        required: row.required,
        options: row.options ?? undefined,
        scale: row.scale ?? undefined,
        analysisRole: row.analysis_role ?? undefined,
      })),
    published: true,
  };
}
