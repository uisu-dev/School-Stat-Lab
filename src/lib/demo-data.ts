import type { SurveyResponse, SurveyTemplate } from "@/lib/types";

export const demoSurvey: SurveyTemplate = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "탐구 수업 전후 자신감 및 학습 경험 설문",
  purpose: "pre_post",
  description:
    "사전/사후 변화, 학급별 차이, 범주형 응답, 척도 신뢰도, 상관 관계를 함께 확인하는 예시 설문입니다.",
  questions: [
    {
      id: "class_group",
      prompt: "참여 학급",
      kind: "single_choice",
      required: true,
      options: ["1반", "2반", "3반"],
      analysisRole: "group",
    },
    {
      id: "pre_confidence",
      prompt: "수업 전, 자료를 해석하고 근거를 말할 자신감",
      kind: "likert",
      required: true,
      scale: { min: 1, max: 5, minLabel: "전혀 없음", maxLabel: "매우 높음" },
      analysisRole: "pre_measure",
    },
    {
      id: "post_confidence",
      prompt: "수업 후, 자료를 해석하고 근거를 말할 자신감",
      kind: "likert",
      required: true,
      scale: { min: 1, max: 5, minLabel: "전혀 없음", maxLabel: "매우 높음" },
      analysisRole: "post_measure",
    },
    {
      id: "evidence_use",
      prompt: "자료를 보고 근거를 찾아 말할 수 있었다",
      kind: "likert",
      required: true,
      scale: { min: 1, max: 5, minLabel: "전혀 아니다", maxLabel: "매우 그렇다" },
      analysisRole: "scale_item",
    },
    {
      id: "collaboration_value",
      prompt: "모둠 활동이 내 생각을 정리하는 데 도움이 되었다",
      kind: "likert",
      required: true,
      scale: { min: 1, max: 5, minLabel: "전혀 아니다", maxLabel: "매우 그렇다" },
      analysisRole: "scale_item",
    },
    {
      id: "inquiry_interest",
      prompt: "이번 수업 이후 탐구 활동에 더 흥미가 생겼다",
      kind: "likert",
      required: true,
      scale: { min: 1, max: 5, minLabel: "전혀 아니다", maxLabel: "매우 그렇다" },
      analysisRole: "scale_item",
    },
    {
      id: "activity_type",
      prompt: "가장 도움이 된 활동",
      kind: "single_choice",
      required: true,
      options: ["모둠 토의", "교사 설명", "실습", "개별 정리"],
      analysisRole: "category",
    },
    {
      id: "satisfaction",
      prompt: "이번 수업 전반에 대한 만족도",
      kind: "likert",
      required: true,
      scale: { min: 1, max: 5, minLabel: "낮음", maxLabel: "높음" },
      analysisRole: "outcome",
    },
    {
      id: "reflection",
      prompt: "수업에서 기억에 남은 점",
      kind: "short_text",
      required: false,
      analysisRole: "note",
    },
  ],
};

const classes = ["1반", "2반", "3반"];
const activities = ["모둠 토의", "교사 설명", "실습", "개별 정리"];
const notes = [
  "친구 의견을 듣고 근거를 고르는 과정이 도움이 됐다.",
  "그래프를 직접 읽어보니 생각보다 이해가 잘 됐다.",
  "처음에는 어려웠지만 예시를 보고 감을 잡았다.",
  "모둠별 발표를 보면서 다른 해석을 비교할 수 있었다.",
];

export const scaleItemIds = ["evidence_use", "collaboration_value", "inquiry_interest"];
export const scaleItemLabels = ["근거 사용", "협력 도움", "탐구 흥미"];

export const demoResponses: SurveyResponse[] = Array.from({ length: 42 }, (_, index) => {
  const classGroup = classes[index % classes.length];
  const pre = clampLikert(2 + ((index * 7) % 3) + (index % 11 === 0 ? -1 : 0));
  const improvement = classGroup === "1반" ? 1.3 : classGroup === "2반" ? 0.9 : 0.55;
  const post = clampLikert(Math.round(pre + improvement + ((index % 4) - 1) * 0.25));
  const learningBase = clampLikert(post + (classGroup === "1반" ? 0.35 : 0) - (index % 9 === 0 ? 1 : 0));
  const evidenceUse = clampLikert(learningBase + (index % 5 === 0 ? -1 : 0));
  const collaborationValue = clampLikert(learningBase + (index % 6 === 0 ? 1 : 0));
  const inquiryInterest = clampLikert(learningBase + (index % 7 === 0 ? -1 : 0));
  const satisfaction = clampLikert(
    Math.round((post + evidenceUse + collaborationValue + inquiryInterest) / 4) -
      (index % 10 === 0 ? 1 : 0),
  );

  return {
    id: `response-${index + 1}`,
    respondentKey: `student-${String(index + 1).padStart(2, "0")}`,
    submittedAt: new Date(Date.UTC(2026, 4, 20, 1, index)).toISOString(),
    answers: {
      class_group: classGroup,
      pre_confidence: pre,
      post_confidence: post,
      evidence_use: evidenceUse,
      collaboration_value: collaborationValue,
      inquiry_interest: inquiryInterest,
      activity_type: activities[(index + (post > 3 ? 2 : 0)) % activities.length],
      satisfaction,
      reflection: notes[index % notes.length],
    },
  };
});

function clampLikert(value: number) {
  return Math.max(1, Math.min(5, value));
}
