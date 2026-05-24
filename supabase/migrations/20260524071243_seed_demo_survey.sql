alter table public.surveys
alter column owner_id drop not null;

insert into public.surveys (
  id,
  owner_id,
  title,
  purpose,
  description,
  slug,
  status,
  is_anonymous,
  settings,
  published_at
)
values (
  '11111111-1111-4111-8111-111111111111',
  null,
  '탐구 수업 전후 자신감 및 학습 경험 설문',
  'pre_post',
  '사전/사후 변화, 학급별 차이, 범주형 응답, 척도 신뢰도, 상관 관계를 함께 확인하는 예시 설문입니다.',
  'lesson-confidence',
  'published',
  true,
  '{"demo": true}'::jsonb,
  now()
)
on conflict (id) do update
set title = excluded.title,
    purpose = excluded.purpose,
    description = excluded.description,
    slug = excluded.slug,
    status = excluded.status,
    is_anonymous = excluded.is_anonymous,
    settings = excluded.settings,
    published_at = coalesce(public.surveys.published_at, excluded.published_at);

insert into public.questions (
  survey_id,
  id,
  position,
  prompt,
  kind,
  required,
  options,
  scale,
  analysis_role
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'class_group',
    1,
    '참여 학급',
    'single_choice',
    true,
    '["1반", "2반", "3반"]'::jsonb,
    null,
    'group'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'pre_confidence',
    2,
    '수업 전, 자료를 해석하고 근거를 말할 자신감',
    'likert',
    true,
    '[]'::jsonb,
    '{"min": 1, "max": 5, "minLabel": "전혀 없음", "maxLabel": "매우 높음"}'::jsonb,
    'pre_measure'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'post_confidence',
    3,
    '수업 후, 자료를 해석하고 근거를 말할 자신감',
    'likert',
    true,
    '[]'::jsonb,
    '{"min": 1, "max": 5, "minLabel": "전혀 없음", "maxLabel": "매우 높음"}'::jsonb,
    'post_measure'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'evidence_use',
    4,
    '자료를 보고 근거를 찾아 말할 수 있었다',
    'likert',
    true,
    '[]'::jsonb,
    '{"min": 1, "max": 5, "minLabel": "전혀 아니다", "maxLabel": "매우 그렇다"}'::jsonb,
    'scale_item'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'collaboration_value',
    5,
    '모둠 활동이 내 생각을 정리하는 데 도움이 되었다',
    'likert',
    true,
    '[]'::jsonb,
    '{"min": 1, "max": 5, "minLabel": "전혀 아니다", "maxLabel": "매우 그렇다"}'::jsonb,
    'scale_item'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'inquiry_interest',
    6,
    '이번 수업 이후 탐구 활동에 더 흥미가 생겼다',
    'likert',
    true,
    '[]'::jsonb,
    '{"min": 1, "max": 5, "minLabel": "전혀 아니다", "maxLabel": "매우 그렇다"}'::jsonb,
    'scale_item'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'activity_type',
    7,
    '가장 도움이 된 활동',
    'single_choice',
    true,
    '["모둠 토의", "교사 설명", "실습", "개별 정리"]'::jsonb,
    null,
    'category'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'satisfaction',
    8,
    '이번 수업 전반에 대한 만족도',
    'likert',
    true,
    '[]'::jsonb,
    '{"min": 1, "max": 5, "minLabel": "낮음", "maxLabel": "높음"}'::jsonb,
    'outcome'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'reflection',
    9,
    '수업에서 기억에 남은 점',
    'short_text',
    false,
    '[]'::jsonb,
    null,
    'note'
  )
on conflict (survey_id, id) do update
set position = excluded.position,
    prompt = excluded.prompt,
    kind = excluded.kind,
    required = excluded.required,
    options = excluded.options,
    scale = excluded.scale,
    analysis_role = excluded.analysis_role;
