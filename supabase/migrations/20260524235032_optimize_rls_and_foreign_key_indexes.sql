alter policy "teachers can manage their own profile"
on public.profiles
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

alter policy "teachers can manage their classrooms"
on public.classrooms
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

alter policy "teachers can manage their surveys"
on public.surveys
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

alter policy "teachers can manage questions in their surveys"
on public.questions
using (
  exists (
    select 1
    from public.surveys
    where surveys.id = questions.survey_id
      and surveys.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.surveys
    where surveys.id = questions.survey_id
      and surveys.owner_id = (select auth.uid())
  )
);

alter policy "teachers can read responses for their surveys"
on public.responses
using (
  exists (
    select 1
    from public.surveys
    where surveys.id = responses.survey_id
      and surveys.owner_id = (select auth.uid())
  )
);

alter policy "teachers can read answers for their surveys"
on public.answers
using (
  exists (
    select 1
    from public.surveys
    where surveys.id = answers.survey_id
      and surveys.owner_id = (select auth.uid())
  )
);

alter policy "teachers can manage analysis runs"
on public.analysis_runs
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

alter policy "teachers can manage chapters in their surveys"
on public.chapters
using (
  exists (
    select 1
    from public.surveys
    where surveys.id = chapters.survey_id
      and surveys.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.surveys
    where surveys.id = chapters.survey_id
      and surveys.owner_id = (select auth.uid())
  )
);

create index if not exists classrooms_owner_id_idx on public.classrooms(owner_id);
create index if not exists surveys_owner_id_idx on public.surveys(owner_id);
create index if not exists surveys_classroom_id_idx on public.surveys(classroom_id);
create index if not exists answers_survey_question_idx on public.answers(survey_id, question_id);
create index if not exists analysis_runs_owner_id_idx on public.analysis_runs(owner_id);
