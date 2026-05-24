# School Stat Lab

교사가 설문을 만들고 학생 응답을 모은 뒤 t검정, ANOVA, 카이제곱 검정 같은 기본 통계 분석과 쉬운 해석을 한 번에 확인하는 풀스택 MVP입니다.

## 현재 포함된 기능

- 분석 목적 기반 설문 설계 화면
- 학생 응답용 링크 화면: `/respond/lesson-confidence`
- 데모 응답 데이터 기반 자동 분석
- 기술통계, 빈도분석, 자료 품질/가정 점검
- Cronbach's alpha 기반 척도 신뢰도
- 상관분석과 단순회귀
- 대응표본 t검정, Welch 독립표본 t검정, 일원분산분석, Tukey-Kramer 사후비교, 카이제곱 독립성 검정
- 교사용 해석, 수업용 설명, 보고서 문장 템플릿
- Supabase SSR/browser client 설정
- Supabase migration: `GRANT`, RLS, 교사/익명 응답 정책 포함

## Getting Started

개발 서버를 실행합니다.

```powershell
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## Supabase 연결

`.env.example`을 참고해 `.env.local`을 만들고 값을 채웁니다.

```powershell
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

마이그레이션은 Supabase CLI로 적용합니다.

```powershell
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Supabase의 2026년 Data API 변경에 맞춰 migration 안에 명시적 `GRANT`가 들어 있습니다. 새 테이블은 RLS 정책뿐 아니라 역할별 권한 부여도 함께 검토해야 합니다.

## Deploy on Vercel

GitHub 저장소에 푸시한 뒤 Vercel에서 프로젝트를 import하고 아래 환경변수를 등록합니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
