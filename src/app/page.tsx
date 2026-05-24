"use client";

import { buildDemoFindings, groupNumericAnswers, numericAnswers } from "@/lib/analysis";
import { demoResponses, demoSurvey } from "@/lib/demo-data";
import type { AnalysisFinding, SurveyPurpose } from "@/lib/types";
import {
  BarChart3,
  BookOpenCheck,
  Check,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  FlaskConical,
  GitBranch,
  GraduationCap,
  Link2,
  Plus,
  QrCode,
  Send,
  Settings2,
  ShieldCheck,
  Sigma,
  Sparkles,
  Superscript,
  Table2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

const purposeOptions: Array<{
  id: SurveyPurpose;
  label: string;
  helper: string;
}> = [
  {
    id: "pre_post",
    label: "수업 전후 변화",
    helper: "대응표본 t검정",
  },
  {
    id: "two_group",
    label: "두 집단 비교",
    helper: "독립표본 t검정",
  },
  {
    id: "multi_group",
    label: "세 집단 이상",
    helper: "ANOVA",
  },
  {
    id: "category_relationship",
    label: "범주 관계",
    helper: "카이제곱 검정",
  },
  {
    id: "satisfaction",
    label: "만족도 요약",
    helper: "기술통계",
  },
  {
    id: "scale_reliability",
    label: "척도 신뢰도",
    helper: "Cronbach alpha",
  },
  {
    id: "relationship_prediction",
    label: "관계와 예측",
    helper: "상관/회귀",
  },
];

const questionKindLabels = {
  single_choice: "단일 선택",
  multi_choice: "복수 선택",
  likert: "리커트",
  number: "숫자",
  short_text: "단답형",
  long_text: "서술형",
  matrix_likert: "행렬 척도",
};

const analysisRoleLabels = {
  group: "집단 구분",
  pre_measure: "사전 측정",
  post_measure: "사후 측정",
  outcome: "결과 변수",
  scale_item: "척도 문항",
  predictor: "예측 변수",
  category: "범주 변수",
  note: "서술 응답",
};

export default function Home() {
  const [selectedPurpose, setSelectedPurpose] = useState<SurveyPurpose>("pre_post");
  const [selectedFinding, setSelectedFinding] = useState(0);
  const findings = useMemo(() => buildDemoFindings(demoResponses), []);
  const currentFinding = findings[selectedFinding];
  const preValues = numericAnswers(demoResponses, "pre_confidence");
  const postValues = numericAnswers(demoResponses, "post_confidence");
  const satisfactionByClass = groupNumericAnswers(demoResponses, "class_group", "satisfaction");
  const responseUrl = "/respond/lesson-confidence";

  return (
    <main className="min-h-dvh bg-[#f4f6f8] text-slate-950">
      <div className="grid min-h-dvh lg:grid-cols-[248px_1fr]">
        <aside className="border-b border-slate-200 bg-white px-4 py-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Sigma className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold">School Stat Lab</p>
              <p className="text-xs text-slate-500">교사용 통계 설문 도구</p>
            </div>
          </div>

          <nav className="mt-6 grid gap-1 text-sm">
            {[
              ["설문 설계", ClipboardList],
              ["응답 수집", Send],
              ["자동 분석", BarChart3],
              ["수업 설명", GraduationCap],
              ["보고서", FileText],
            ].map(([label, Icon]) => (
              <button
                className="flex h-10 items-center gap-3 rounded-md px-3 text-left font-medium text-slate-700 transition hover:bg-slate-100"
                key={label as string}
                type="button"
              >
                <Icon className="size-4 text-slate-500" aria-hidden />
                {label as string}
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <ShieldCheck className="size-4" aria-hidden />
              익명 우선 설계
            </div>
            <p className="mt-2 text-xs leading-5 text-emerald-800">
              학생 이름 대신 연결 코드로 사전/사후 응답을 묶고, 개인정보 수집을 기본적으로 줄입니다.
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase text-teal-700">MVP Workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                설문 제작부터 통계 해석까지 한 화면에서
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium transition hover:bg-slate-50"
                type="button"
              >
                <GitBranch className="size-4" aria-hidden />
                GitHub 준비
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium transition hover:bg-slate-50"
                type="button"
              >
                <Download className="size-4" aria-hidden />
                보고서 내보내기
              </button>
              <a
                className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                href={responseUrl}
              >
                <ExternalLink className="size-4" aria-hidden />
                학생 화면 열기
              </a>
            </div>
          </header>

          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:px-8">
            <section className="grid gap-5">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                      <Sparkles className="size-4" aria-hidden />
                      분석 목적 기반 설문 생성
                    </div>
                    <h2 className="mt-2 text-xl font-semibold">{demoSurvey.title}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      선생님이 목적만 고르면 필요한 문항 역할과 분석 방법이 같이 설계됩니다.
                    </p>
                  </div>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800"
                    type="button"
                  >
                    <Plus className="size-4" aria-hidden />
                    문항 추가
                  </button>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {purposeOptions.map((option) => (
                    <button
                      className={`rounded-lg border p-3 text-left transition ${
                        selectedPurpose === option.id
                          ? "border-teal-600 bg-teal-50 text-teal-950"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      key={option.id}
                      onClick={() => setSelectedPurpose(option.id)}
                      type="button"
                    >
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">{option.helper}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">문항 구조</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      각 문항은 응답 형식과 분석 역할을 함께 가집니다.
                    </p>
                  </div>
                  <Settings2 className="size-5 text-slate-400" aria-hidden />
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full min-w-[680px] border-collapse text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">문항</th>
                        <th className="px-4 py-3">형식</th>
                        <th className="px-4 py-3">분석 역할</th>
                        <th className="px-4 py-3">필수</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {demoSurvey.questions.map((question) => (
                        <tr key={question.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{question.prompt}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {questionKindLabels[question.kind]}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                              {question.analysisRole
                                ? analysisRoleLabels[question.analysisRole]
                                : "없음"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {question.required ? (
                              <Check className="size-4 text-teal-700" aria-label="필수" />
                            ) : (
                              <span className="text-slate-400">선택</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Link2 className="size-4 text-teal-700" aria-hidden />
                    <h2 className="text-lg font-semibold">응답 링크</h2>
                  </div>
                  <div className="mt-4 flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <code className="min-w-0 flex-1 truncate text-sm text-slate-700">
                      {responseUrl}
                    </code>
                    <button
                      className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 bg-white transition hover:bg-slate-100"
                      title="링크 복사"
                      type="button"
                    >
                      <Link2 className="size-4" aria-hidden />
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    링크를 배포하면 학생 응답 화면으로 이동합니다. Supabase 환경변수가 있으면 DB에 저장되고,
                    없으면 브라우저 로컬에 임시 저장됩니다.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <QrCode className="size-4 text-teal-700" aria-hidden />
                    <h2 className="text-lg font-semibold">QR 배포</h2>
                  </div>
                  <div className="mt-4 grid grid-cols-[104px_1fr] gap-4">
                    <div className="grid size-[104px] grid-cols-5 gap-1 rounded-md border border-slate-200 bg-white p-2">
                      {Array.from({ length: 25 }, (_, index) => (
                        <span
                          className={`rounded-[2px] ${
                            [0, 1, 2, 5, 10, 12, 14, 18, 20, 21, 22, 24].includes(index)
                              ? "bg-slate-950"
                              : "bg-slate-200"
                          }`}
                          key={index}
                        />
                      ))}
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      실제 배포 단계에서는 링크 기반 QR 이미지를 생성해 학급 화면에 바로 띄우도록 연결합니다.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid content-start gap-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric icon={Users} label="응답 수" value={`${demoResponses.length}명`} />
                <Metric icon={Table2} label="문항 수" value={`${demoSurvey.questions.length}개`} />
                <Metric icon={Superscript} label="추천 분석" value={`${findings.length}종`} />
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">자동 분석 결과</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      응답 구조를 바탕으로 가능한 검정을 추천하고 해석합니다.
                    </p>
                  </div>
                  <FlaskConical className="size-5 text-slate-400" aria-hidden />
                </div>

                <div className="mt-4 grid gap-2">
                  {findings.map((finding, index) => (
                    <button
                      className={`rounded-lg border p-3 text-left transition ${
                        selectedFinding === index
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      }`}
                      key={finding.method}
                      onClick={() => setSelectedFinding(index)}
                      type="button"
                    >
                      <span className="block text-sm font-semibold">{finding.title}</span>
                      <span
                        className={`mt-1 block text-xs ${
                          selectedFinding === index ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {finding.method}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <FindingDetails finding={currentFinding} />

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-teal-700" aria-hidden />
                  <h2 className="text-lg font-semibold">빠른 시각화</h2>
                </div>

                <div className="mt-5 grid gap-5">
                  <MiniBar label="사전 자신감" value={average(preValues)} max={5} />
                  <MiniBar label="사후 자신감" value={average(postValues)} max={5} />
                  {Object.entries(satisfactionByClass).map(([label, values]) => (
                    <MiniBar key={label} label={`${label} 만족도`} value={average(values)} max={5} />
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                  <BookOpenCheck className="size-4" aria-hidden />
                  수업용 설명 모드
                </div>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  {currentFinding.classroomExplanation}
                </p>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <Icon className="size-4 text-teal-700" aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function FindingDetails({ finding }: { finding: AnalysisFinding }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{finding.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">{finding.summary}</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Object.entries(finding.stats).map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-base font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4">
        <section>
          <h3 className="text-sm font-semibold text-slate-900">교사용 해석</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{finding.teacherExplanation}</p>
        </section>
        <section>
          <h3 className="text-sm font-semibold text-slate-900">보고서 문장</h3>
          <p className="mt-1 rounded-md bg-slate-950 p-3 font-mono text-xs leading-5 text-white">
            {finding.reportSentence}
          </p>
        </section>
        <section>
          <h3 className="text-sm font-semibold text-slate-900">주의 사항</h3>
          <ul className="mt-2 grid gap-2">
            {finding.assumptions.map((assumption) => (
              <li className="flex gap-2 text-sm leading-5 text-slate-600" key={assumption}>
                <span className="mt-1 size-1.5 rounded-full bg-teal-600" />
                {assumption}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-mono text-slate-500">{value.toFixed(2)}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100">
        <div className="h-3 rounded-full bg-teal-600" style={{ width }} />
      </div>
    </div>
  );
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
