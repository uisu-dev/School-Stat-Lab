export type SurveyPurpose =
  | "pre_post"
  | "two_group"
  | "multi_group"
  | "category_relationship"
  | "satisfaction"
  | "scale_reliability"
  | "relationship_prediction";

export type QuestionKind =
  | "single_choice"
  | "multi_choice"
  | "likert"
  | "number"
  | "short_text"
  | "long_text"
  | "matrix_likert";

export type AnalysisRole =
  | "group"
  | "pre_measure"
  | "post_measure"
  | "outcome"
  | "scale_item"
  | "predictor"
  | "category"
  | "note";

export type SurveyChapter = {
  id: string;
  title: string;
  description?: string;
};

export type SurveyQuestion = {
  id: string;
  chapterId?: string;
  prompt: string;
  kind: QuestionKind;
  required: boolean;
  options?: string[];
  scale?: {
    min: number;
    max: number;
    minLabel: string;
    maxLabel: string;
  };
  analysisRole?: AnalysisRole;
};

export type SurveyTemplate = {
  id: string;
  title: string;
  purpose: SurveyPurpose;
  description: string;
  privacyConsentRequired?: boolean;
  privacyText?: string;
  chapters?: SurveyChapter[];
  questions: SurveyQuestion[];
};

export type SurveyAnswerValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, number | null>
  | null;

export type SurveyResponse = {
  id: string;
  respondentKey: string;
  submittedAt: string;
  answers: Record<string, SurveyAnswerValue>;
};

export type AnalysisFinding = {
  method: string;
  title: string;
  summary: string;
  teacherExplanation: string;
  classroomExplanation: string;
  reportSentence: string;
  assumptions: string[];
  stats: Record<string, number | string>;
};
