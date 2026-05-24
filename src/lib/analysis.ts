import { demoSurvey, scaleItemIds, scaleItemLabels } from "@/lib/demo-data";
import {
  chiSquareIndependence,
  cronbachAlpha,
  descriptiveStats,
  distributionDiagnostics,
  formatPValue,
  frequencyTable,
  oneWayAnova,
  pairedTTest,
  pearsonCorrelation,
  round,
  simpleLinearRegression,
  tukeyKramerPostHoc,
  welchTTest,
} from "@/lib/statistics";
import type { AnalysisFinding, SurveyResponse } from "@/lib/types";

export function buildDemoFindings(responses: SurveyResponse[]): AnalysisFinding[] {
  const pre = numericAnswers(responses, "pre_confidence");
  const post = numericAnswers(responses, "post_confidence");
  const postDescription = descriptiveStats(post);
  const postDiagnostics = distributionDiagnostics(post);
  const activityFrequency = frequencyTable(categoricalAnswers(responses, "activity_type"));
  const reliability = cronbachAlpha(scaleItemLabels, scaleRows(responses, scaleItemIds));
  const scaleOutcome = pairedScaleOutcome(responses, scaleItemIds, "satisfaction");
  const correlation = pearsonCorrelation(scaleOutcome.scores, scaleOutcome.outcomes);
  const regression = simpleLinearRegression(scaleOutcome.scores, scaleOutcome.outcomes);
  const satisfactionByClass = groupNumericAnswers(responses, "class_group", "satisfaction");
  const classOne = satisfactionByClass["1반"] ?? [];
  const classTwo = satisfactionByClass["2반"] ?? [];
  const paired = pairedTTest(pre, post);
  const independent = welchTTest(classOne, classTwo);
  const anova = oneWayAnova(satisfactionByClass);
  const tukeyComparisons = tukeyKramerPostHoc(satisfactionByClass);
  const strongestTukeyComparison = tukeyComparisons[0];
  const chi = chiSquareIndependence(buildActivityByClassTable(responses));
  const missing = missingSummary(responses);
  const topActivity = activityFrequency[0];

  return [
    {
      method: "descriptive_statistics",
      title: "기술통계와 분포 요약",
      summary: `사후 자신감 평균은 ${round(postDescription.mean)}점, 중앙값은 ${round(
        postDescription.median,
      )}점입니다.`,
      teacherExplanation:
        "검정에 들어가기 전에는 평균, 중앙값, 표준편차, 사분위수, 이상치를 먼저 봐야 합니다. 기술통계는 '데이터가 어떤 모양인지'를 보여주는 출발점입니다.",
      classroomExplanation:
        "평균은 전체적인 수준, 중앙값은 가운데 학생의 수준, 표준편차는 학생들 사이의 차이가 얼마나 큰지 알려줍니다.",
      reportSentence: `사후 자신감 점수의 평균은 ${round(
        postDescription.mean,
      )}(SD = ${round(postDescription.standardDeviation)})였으며, 중앙값은 ${round(
        postDescription.median,
      )}이었다.`,
      assumptions: [
        "평균만 보지 말고 중앙값과 사분위수도 함께 확인하세요.",
        "이상치가 있으면 그래프와 원자료를 확인한 뒤 제외 여부를 판단해야 합니다.",
      ],
      stats: {
        N: postDescription.count,
        평균: round(postDescription.mean),
        중앙값: round(postDescription.median),
        표준편차: round(postDescription.standardDeviation),
        최솟값: postDescription.min,
        Q1: round(postDescription.q1),
        Q3: round(postDescription.q3),
        최댓값: postDescription.max,
        "95% CI": `${round(postDescription.ci95[0])} ~ ${round(postDescription.ci95[1])}`,
        이상치: postDiagnostics.outlierCount,
      },
    },
    {
      method: "data_quality_assumptions",
      title: "자료 품질과 가정 점검",
      summary: `결측 응답은 ${missing.missingCells}개이고, 사후 자신감 왜도는 ${round(
        postDiagnostics.skewness,
      )}입니다.`,
      teacherExplanation:
        "자동 검정 전에는 결측, 표본 수, 분포의 치우침, 이상치, 카이제곱 기대빈도 같은 조건을 확인해야 합니다. 조건이 약하면 결과 문장도 더 조심스럽게 써야 합니다.",
      classroomExplanation:
        "통계 결과를 믿기 전에 데이터가 너무 적거나 한쪽으로 몰려 있지 않은지 확인하는 단계입니다.",
      reportSentence: `분석 전 자료 점검 결과, 결측 응답은 ${missing.missingCells}개였고 사후 자신감 점수의 왜도는 ${round(
        postDiagnostics.skewness,
      )}, 첨도는 ${round(postDiagnostics.kurtosis)}였다.`,
      assumptions: [
        missing.missingCells > 0
          ? "결측이 있는 문항은 원인을 확인하고, 분석별 제외 기준을 명확히 기록하세요."
          : "현재 데모 자료에는 결측 응답이 없습니다.",
        Math.abs(postDiagnostics.skewness) > 1
          ? "분포가 한쪽으로 치우쳐 있어 평균 기반 검정을 보수적으로 해석하세요."
          : "사후 자신감 분포는 심하게 치우친 편은 아닙니다.",
        chi.lowExpectedCellCount > 0
          ? "카이제곱 검정의 기대빈도 5 미만 칸이 있어 범주를 합치는 방안을 검토하세요."
          : "카이제곱 검정의 기대빈도 조건은 대체로 양호합니다.",
      ],
      stats: {
        "응답 수": responses.length,
        "문항 수": demoSurvey.questions.length,
        "결측 칸": missing.missingCells,
        "결측률": `${round(missing.missingRate * 100, 1)}%`,
        왜도: round(postDiagnostics.skewness),
        첨도: round(postDiagnostics.kurtosis),
        "이상치 수": postDiagnostics.outlierCount,
        "기대빈도 5 미만": chi.lowExpectedCellCount,
      },
    },
    {
      method: "frequency_analysis",
      title: "선호 활동 빈도분석",
      summary: `가장 많이 선택된 활동은 ${topActivity.label}(${round(topActivity.percent, 1)}%)입니다.`,
      teacherExplanation:
        "선택형 문항은 평균보다 빈도와 비율이 핵심입니다. 어떤 선택지가 많이 나왔는지, 특정 집단에서 비율이 달라지는지 확인합니다.",
      classroomExplanation:
        "몇 명이 어떤 답을 골랐는지 세고, 전체 중 몇 퍼센트인지 보는 가장 기본적인 분석입니다.",
      reportSentence: `선호 활동 빈도분석 결과, '${topActivity.label}'이 ${topActivity.count}명(${round(
        topActivity.percent,
        1,
      )}%)으로 가장 많이 선택되었다.`,
      assumptions: [
        "복수 선택 문항은 비율의 기준이 응답자 수인지 선택 수인지 구분해야 합니다.",
        "빈도가 너무 작은 선택지는 해석을 조심하거나 유사 범주와 묶을 수 있습니다.",
      ],
      stats: Object.fromEntries(
        activityFrequency.map((row) => [row.label, `${row.count}명 (${round(row.percent, 1)}%)`]),
      ),
    },
    {
      method: "scale_reliability",
      title: "학습 경험 척도 신뢰도",
      summary: `3개 문항의 Cronbach's alpha는 ${round(reliability.alpha)}입니다.`,
      teacherExplanation:
        "여러 문항을 합쳐 하나의 점수로 쓰려면 문항들이 비슷한 개념을 안정적으로 측정하는지 확인해야 합니다. Cronbach's alpha는 그 일관성을 보여줍니다.",
      classroomExplanation:
        "비슷한 내용을 묻는 여러 질문이 서로 잘 맞는지 확인하는 방법입니다.",
      reportSentence: `학습 경험 척도 ${reliability.itemCount}개 문항의 내적 일관성은 Cronbach's alpha = ${round(
        reliability.alpha,
      )}로 나타났다.`,
      assumptions: [
        reliability.alpha >= 0.7
          ? "척도 문항을 평균 또는 합산 점수로 묶어 사용할 수 있는 수준입니다."
          : "신뢰도가 낮으므로 문항 의미가 같은지 검토하고, 문항 삭제 또는 재구성을 고려하세요.",
        "역채점 문항이 있다면 신뢰도 계산 전에 반드시 방향을 맞춰야 합니다.",
      ],
      stats: {
        alpha: round(reliability.alpha),
        "문항 수": reliability.itemCount,
        "분석 응답 수": reliability.responseCount,
        "근거 사용 평균": round(reliability.itemMeans["근거 사용"] ?? 0),
        "협력 도움 평균": round(reliability.itemMeans["협력 도움"] ?? 0),
        "탐구 흥미 평균": round(reliability.itemMeans["탐구 흥미"] ?? 0),
      },
    },
    {
      method: "correlation_regression",
      title: "학습 경험과 만족도 관계",
      summary: `학습 경험 척도와 만족도의 상관은 r = ${round(correlation.r)}, p ${formatPValue(
        correlation.p,
      )}입니다.`,
      teacherExplanation:
        "두 숫자형 변수의 관련성을 볼 때 상관분석을 사용합니다. 예측 문장까지 필요하면 단순회귀로 '학습 경험 점수가 1점 오를 때 만족도가 얼마나 달라지는지'를 볼 수 있습니다.",
      classroomExplanation:
        "한 점수가 높아질수록 다른 점수도 함께 높아지는지 확인하는 방법입니다.",
      reportSentence: `학습 경험 척도 점수와 만족도는 r = ${round(
        correlation.r,
      )}, p ${formatPValue(correlation.p)}의 상관을 보였으며, 단순회귀의 설명력은 R² = ${round(
        regression.rSquared,
      )}였다.`,
      assumptions: [
        "상관은 인과관계를 뜻하지 않습니다. 만족도가 높아서 자신감이 오른 것인지, 반대인지 단정할 수 없습니다.",
        "두 변수의 관계가 직선에 가까운지 산점도로 확인하는 것이 좋습니다.",
      ],
      stats: {
        r: round(correlation.r),
        p: correlation.p < 0.001 ? "< .001" : correlation.p.toFixed(3),
        "R²": round(regression.rSquared),
        기울기: round(regression.slope),
        절편: round(regression.intercept),
      },
    },
    {
      method: "paired_t_test",
      title: "수업 전후 자신감 변화",
      summary: `사후 평균이 사전보다 ${round(paired.meanDifference)}점 높고, p ${formatPValue(
        paired.p,
      )}입니다.`,
      teacherExplanation:
        "같은 학생이 수업 전과 후에 모두 응답했으므로 대응표본 t검정을 사용했습니다. p값이 .05보다 작으면 관찰된 변화가 우연만으로 보기 어렵다고 해석할 수 있습니다.",
      classroomExplanation:
        "같은 사람의 전후 점수를 비교해 수업 뒤에 점수가 얼마나 달라졌는지 보는 방법입니다.",
      reportSentence: `대응표본 t검정 결과, 수업 후 자신감은 수업 전보다 유의하게 높았다(t(${round(
        paired.df,
        0,
      )}) = ${round(paired.t)}, p ${formatPValue(paired.p)}, dz = ${round(paired.effectSize)}).`,
      assumptions: [
        "전후 응답이 같은 학생끼리 정확히 짝지어져야 합니다.",
        "차이점수의 분포가 심하게 치우치지 않았는지 확인하세요.",
      ],
      stats: {
        "사전 평균": round(meanSafe(pre)),
        "사후 평균": round(meanSafe(post)),
        "평균 차이": round(paired.meanDifference),
        t: round(paired.t),
        df: round(paired.df, 0),
        p: paired.p < 0.001 ? "< .001" : paired.p.toFixed(3),
        "효과크기 dz": round(paired.effectSize),
      },
    },
    {
      method: "independent_t_test",
      title: "1반과 2반의 만족도 비교",
      summary: `두 학급 평균 차이는 ${round(independent.meanDifference)}점이고, p ${formatPValue(
        independent.p,
      )}입니다.`,
      teacherExplanation:
        "서로 다른 두 집단의 평균을 비교하므로 Welch 독립표본 t검정을 사용했습니다. 두 학급의 분산이 완전히 같다고 가정하지 않는 방식입니다.",
      classroomExplanation:
        "두 반의 평균이 실제로 다른지, 아니면 표본에서 우연히 그렇게 보였는지 살펴보는 방법입니다.",
      reportSentence: `Welch 독립표본 t검정 결과, 1반과 2반의 만족도 차이는 t(${round(
        independent.df,
      )}) = ${round(independent.t)}, p ${formatPValue(independent.p)}로 나타났다.`,
      assumptions: [
        "각 학생의 응답은 서로 독립이어야 합니다.",
        "집단별 표본 수가 너무 작으면 평균 차이 해석을 보수적으로 해야 합니다.",
      ],
      stats: {
        "1반 평균": round(meanSafe(classOne)),
        "2반 평균": round(meanSafe(classTwo)),
        "평균 차이": round(independent.meanDifference),
        t: round(independent.t),
        df: round(independent.df),
        p: independent.p < 0.001 ? "< .001" : independent.p.toFixed(3),
        "효과크기 d": round(independent.effectSize),
      },
    },
    {
      method: "one_way_anova",
      title: "학급별 만족도 차이",
      summary: `세 학급 이상 평균을 비교한 결과 F = ${round(anova.f)}, p ${formatPValue(
        anova.p,
      )}입니다.`,
      teacherExplanation:
        "비교할 집단이 3개 이상이므로 일원분산분석을 사용했습니다. 유의하면 어떤 학급끼리 다른지 사후 비교를 추가해야 합니다.",
      classroomExplanation:
        "여러 반의 평균을 한 번에 비교해 적어도 한 반이 다른지 살펴보는 방법입니다.",
      reportSentence: `일원분산분석 결과, 학급에 따른 만족도 차이는 F(${anova.dfBetween}, ${anova.dfWithin}) = ${round(
        anova.f,
      )}, p ${formatPValue(anova.p)}, eta² = ${round(anova.etaSquared)}로 나타났다.`,
      assumptions: [
        "집단별 응답은 서로 독립이어야 합니다.",
        "유의한 결과가 나오면 사후 비교를 통해 어느 집단 차이인지 확인하세요.",
      ],
      stats: {
        "1반 평균": round(anova.groupMeans["1반"] ?? 0),
        "2반 평균": round(anova.groupMeans["2반"] ?? 0),
        "3반 평균": round(anova.groupMeans["3반"] ?? 0),
        F: round(anova.f),
        "df 사이": anova.dfBetween,
        "df 안": anova.dfWithin,
        p: anova.p < 0.001 ? "< .001" : anova.p.toFixed(3),
        "eta²": round(anova.etaSquared),
        "사후비교": anova.p < 0.05 ? "Tukey-Kramer 확인" : "필수 아님",
      },
    },
    {
      method: "tukey_kramer_posthoc",
      title: "Tukey-Kramer 사후비교",
      summary: strongestTukeyComparison
        ? `${strongestTukeyComparison.groupA}과 ${strongestTukeyComparison.groupB}의 평균 차이가 가장 크며, p ${formatPValue(
            strongestTukeyComparison.p,
          )}입니다.`
        : "비교 가능한 집단이 부족해 사후비교를 계산하지 않았습니다.",
      teacherExplanation:
        "ANOVA가 '적어도 한 집단은 다르다'는 것만 알려주기 때문에, 어느 집단끼리 다른지는 사후비교로 확인해야 합니다. 반별 응답 수가 달라질 수 있어 Tukey-Kramer 방식을 사용했습니다.",
      classroomExplanation:
        "여러 반 중 정확히 어떤 반끼리 차이가 나는지 한 쌍씩 비교하는 단계입니다.",
      reportSentence: strongestTukeyComparison
        ? `Tukey-Kramer 사후비교 결과, ${formatTukeySignificantPairs(tukeyComparisons)}`
        : "Tukey-Kramer 사후비교는 비교 가능한 집단 수가 부족하여 실시하지 않았다.",
      assumptions: [
        "ANOVA 결과가 유의할 때 사후비교 해석의 필요성이 커집니다.",
        "집단별 분산이 크게 다르면 Games-Howell 같은 더 보수적인 사후검정을 검토할 수 있습니다.",
        "여러 쌍을 동시에 비교하므로 개별 t검정을 반복하는 것보다 사후비교 절차를 쓰는 것이 안전합니다.",
      ],
      stats: tukeyComparisonStats(tukeyComparisons),
    },
    {
      method: "chi_square_independence",
      title: "학급과 선호 활동의 관련성",
      summary: `카이제곱 검정 결과 χ² = ${round(chi.chiSquare)}, p ${formatPValue(chi.p)}입니다.`,
      teacherExplanation:
        "학급과 선호 활동처럼 범주형 변수 두 개의 관련성을 볼 때 카이제곱 독립성 검정을 사용합니다.",
      classroomExplanation:
        "반에 따라 좋아한 활동의 비율이 달랐는지 확인하는 방법입니다.",
      reportSentence: `카이제곱 독립성 검정 결과, 학급과 선호 활동 사이의 관련성은 χ²(${chi.df}) = ${round(
        chi.chiSquare,
      )}, p ${formatPValue(chi.p)}, Cramer's V = ${round(chi.cramersV)}로 나타났다.`,
      assumptions: [
        chi.lowExpectedCellCount > 0
          ? "기대빈도 5 미만인 칸이 있어 결과를 보수적으로 해석하세요."
          : "각 칸의 기대빈도 조건은 대체로 충족됩니다.",
        "각 응답자는 하나의 범주에만 포함되어야 합니다.",
      ],
      stats: {
        "χ²": round(chi.chiSquare),
        df: chi.df,
        p: chi.p < 0.001 ? "< .001" : chi.p.toFixed(3),
        "Cramer's V": round(chi.cramersV),
        "기대빈도 5 미만 칸": chi.lowExpectedCellCount,
      },
    },
  ];
}

export function numericAnswers(responses: SurveyResponse[], questionId: string) {
  return responses
    .map((response) => response.answers[questionId])
    .filter((value): value is number => typeof value === "number");
}

export function categoricalAnswers(responses: SurveyResponse[], questionId: string) {
  return responses
    .map((response) => response.answers[questionId])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

export function groupNumericAnswers(
  responses: SurveyResponse[],
  groupQuestionId: string,
  numericQuestionId: string,
) {
  return responses.reduce<Record<string, number[]>>((groups, response) => {
    const group = response.answers[groupQuestionId];
    const value = response.answers[numericQuestionId];

    if (typeof group === "string" && typeof value === "number") {
      groups[group] = [...(groups[group] ?? []), value];
    }

    return groups;
  }, {});
}

function scaleRows(responses: SurveyResponse[], questionIds: string[]) {
  return responses.map((response) =>
    questionIds
      .map((questionId) => response.answers[questionId])
      .filter((value): value is number => typeof value === "number"),
  );
}

function buildActivityByClassTable(responses: SurveyResponse[]) {
  const classLabels = ["1반", "2반", "3반"];
  const activityLabels = ["모둠 토의", "교사 설명", "실습", "개별 정리"];

  return classLabels.map((classLabel) =>
    activityLabels.map(
      (activityLabel) =>
        responses.filter(
          (response) =>
            response.answers.class_group === classLabel &&
            response.answers.activity_type === activityLabel,
        ).length,
    ),
  );
}

function pairedScaleOutcome(
  responses: SurveyResponse[],
  scaleQuestionIds: string[],
  outcomeQuestionId: string,
) {
  return responses.reduce<{ scores: number[]; outcomes: number[] }>(
    (pairs, response) => {
      const row = scaleQuestionIds
        .map((questionId) => response.answers[questionId])
        .filter((value): value is number => typeof value === "number");
      const outcome = response.answers[outcomeQuestionId];

      if (row.length === scaleQuestionIds.length && typeof outcome === "number") {
        pairs.scores.push(meanSafe(row));
        pairs.outcomes.push(outcome);
      }

      return pairs;
    },
    { scores: [], outcomes: [] },
  );
}

function tukeyComparisonStats(comparisons: ReturnType<typeof tukeyKramerPostHoc>) {
  if (comparisons.length === 0) {
    return {
      결과: "비교 가능한 집단 부족",
    };
  }

  return Object.fromEntries(
    comparisons.map((comparison) => [
      `${comparison.groupA} - ${comparison.groupB}`,
      `차이 ${round(comparison.meanDifference)}, p ${
        comparison.p < 0.001 ? "< .001" : comparison.p.toFixed(3)
      }${comparison.significant ? " *" : ""}`,
    ]),
  );
}

function formatTukeySignificantPairs(comparisons: ReturnType<typeof tukeyKramerPostHoc>) {
  const significantPairs = comparisons.filter((comparison) => comparison.significant);

  if (significantPairs.length === 0) {
    return "유의한 집단 간 차이는 확인되지 않았다.";
  }

  return `${significantPairs
    .map(
      (comparison) =>
        `${comparison.groupA}과 ${comparison.groupB}의 차이(p ${formatPValue(comparison.p)})`,
    )
    .join(", ")}가 유의하게 나타났다.`;
}

function missingSummary(responses: SurveyResponse[]) {
  const questionIds = demoSurvey.questions.map((question) => question.id);
  const totalCells = responses.length * questionIds.length;
  const missingCells = responses.reduce(
    (sum, response) =>
      sum +
      questionIds.filter((questionId) => {
        const value = response.answers[questionId];
        return value === null || value === undefined || value === "";
      }).length,
    0,
  );

  return {
    missingCells,
    missingRate: totalCells === 0 ? 0 : missingCells / totalCells,
  };
}

function meanSafe(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
