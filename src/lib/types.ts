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

export type SurveyQuestion = {
  id: string;
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
  questions: SurveyQuestion[];
};

export type SurveyAnswerValue = string | number | string[] | null;

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
