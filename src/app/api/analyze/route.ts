import { buildDemoFindings } from "@/lib/analysis";
import { demoResponses } from "@/lib/demo-data";
import type { SurveyResponse } from "@/lib/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    responses?: SurveyResponse[];
  };

  return NextResponse.json({
    findings: buildDemoFindings(body.responses?.length ? body.responses : demoResponses),
  });
}
