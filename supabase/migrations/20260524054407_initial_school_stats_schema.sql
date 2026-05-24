create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  school_name text,
  role text not null default 'teacher' check (role in ('teacher', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  grade text,
  subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  classroom_id uuid references public.classrooms(id) on delete set null,
  title text not null,
  purpose text not null check (
    purpose in (
      'pre_post',
      'two_group',
      'multi_group',
      'category_relationship',
      'satisfaction',
      'scale_reliability',
      'relationship_prediction'
    )
  ),
  description text,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  is_anonymous boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.questions (
  survey_id uuid not null references public.surveys(id) on delete cascade,
  id text not null,
  position integer not null,
  prompt text not null,
  kind text not null check (
    kind in (
      'single_choice',
      'multi_choice',
      'likert',
      'number',
      'short_text',
      'long_text',
      'matrix_likert'
    )
  ),
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  scale jsonb,
  analysis_role text check (
    analysis_role in (
      'group',
      'pre_measure',
      'post_measure',
      'outcome',
      'scale_item',
      'predictor',
      'category',
      'note'
    )
  ),
  created_at timestamptz not null default now(),
  primary key (survey_id, id)
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  respondent_key text,
  submitted_at timestamptz not null default now()
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  survey_id uuid not null,
  question_id text not null,
  value jsonb,
  created_at timestamptz not null default now(),
  unique (response_id, question_id),
  foreign key (survey_id, question_id) references public.questions(survey_id, id) on delete cascade
);

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  method text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.classrooms to authenticated;
grant select, insert, update, delete on public.surveys to authenticated;
grant select, insert, update, delete on public.questions to authenticated;
grant select on public.responses to authenticated;
grant select on public.answers to authenticated;
grant select, insert, update, delete on public.analysis_runs to authenticated;

grant select on public.surveys to anon;
grant select on public.questions to anon;
grant insert on public.responses to anon;
grant insert on public.answers to anon;

alter table public.profiles enable row level security;
alter table public.classrooms enable row level security;
alter table public.surveys enable row level security;
alter table public.questions enable row level security;
alter table public.responses enable row level security;
alter table public.answers enable row level security;
alter table public.analysis_runs enable row level security;

create policy "teachers can manage their own profile"
on public.profiles
for all
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "teachers can manage their classrooms"
on public.classrooms
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "teachers can manage their surveys"
on public.surveys
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "published surveys are readable for response pages"
on public.surveys
for select
to anon
using (status = 'published');

create policy "teachers can manage questions in their surveys"
on public.questions
for all
to authenticated
using (
  exists (
    select 1
    from public.surveys
    where surveys.id = questions.survey_id
      and surveys.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.surveys
    where surveys.id = questions.survey_id
      and surveys.owner_id = auth.uid()
  )
);

create policy "published survey questions are readable for response pages"
on public.questions
for select
to anon
using (
  exists (
    select 1
    from public.surveys
    where surveys.id = questions.survey_id
      and surveys.status = 'published'
  )
);

create policy "teachers can read responses for their surveys"
on public.responses
for select
to authenticated
using (
  exists (
    select 1
    from public.surveys
    where surveys.id = responses.survey_id
      and surveys.owner_id = auth.uid()
  )
);

create policy "anyone can submit responses to published surveys"
on public.responses
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.surveys
    where surveys.id = responses.survey_id
      and surveys.status = 'published'
  )
);

create policy "teachers can read answers for their surveys"
on public.answers
for select
to authenticated
using (
  exists (
    select 1
    from public.surveys
    where surveys.id = answers.survey_id
      and surveys.owner_id = auth.uid()
  )
);

create policy "anyone can submit answers to published surveys"
on public.answers
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.surveys
    where surveys.id = answers.survey_id
      and surveys.status = 'published'
  )
);

create policy "teachers can manage analysis runs"
on public.analysis_runs
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create index responses_survey_id_idx on public.responses(survey_id);
create index answers_survey_id_idx on public.answers(survey_id);
create index answers_response_id_idx on public.answers(response_id);
create index analysis_runs_survey_id_idx on public.analysis_runs(survey_id);
