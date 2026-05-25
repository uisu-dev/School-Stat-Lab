create table public.chapters (
  survey_id uuid not null references public.surveys(id) on delete cascade,
  id text not null,
  position integer not null,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  primary key (survey_id, id)
);

alter table public.questions
add column chapter_id text;

alter table public.questions
add constraint questions_chapter_id_fkey
foreign key (survey_id, chapter_id)
references public.chapters(survey_id, id)
on delete cascade;

alter table public.responses
add column consented_at timestamptz,
add column consent_version text;

grant select, insert, update, delete on public.chapters to authenticated;
grant select, insert, update, delete on public.chapters to anon;
grant delete on public.surveys to anon;

alter table public.chapters enable row level security;

create policy "teachers can manage chapters in their surveys"
on public.chapters
for all
to authenticated
using (
  exists (
    select 1
    from public.surveys
    where surveys.id = chapters.survey_id
      and surveys.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.surveys
    where surveys.id = chapters.survey_id
      and surveys.owner_id = auth.uid()
  )
);

create policy "published survey chapters are readable for response pages"
on public.chapters
for select
to anon
using (
  exists (
    select 1
    from public.surveys
    where surveys.id = chapters.survey_id
      and surveys.status = 'published'
  )
);

create policy "anonymous editors can create chapters"
on public.chapters
for insert
to anon
with check (
  exists (
    select 1
    from public.surveys
    where surveys.id = chapters.survey_id
      and surveys.edit_token_hash is not null
      and surveys.edit_token_hash = public.current_edit_token_hash()
  )
);

create policy "anonymous editors can update chapters"
on public.chapters
for update
to anon
using (
  exists (
    select 1
    from public.surveys
    where surveys.id = chapters.survey_id
      and surveys.edit_token_hash is not null
      and surveys.edit_token_hash = public.current_edit_token_hash()
  )
)
with check (
  exists (
    select 1
    from public.surveys
    where surveys.id = chapters.survey_id
      and surveys.edit_token_hash is not null
      and surveys.edit_token_hash = public.current_edit_token_hash()
  )
);

create policy "anonymous editors can delete chapters"
on public.chapters
for delete
to anon
using (
  exists (
    select 1
    from public.surveys
    where surveys.id = chapters.survey_id
      and surveys.edit_token_hash is not null
      and surveys.edit_token_hash = public.current_edit_token_hash()
  )
);

create policy "anonymous editors can delete surveys"
on public.surveys
for delete
to anon
using (
  edit_token_hash is not null
  and edit_token_hash = public.current_edit_token_hash()
);

create index chapters_survey_id_idx on public.chapters(survey_id);
create index questions_chapter_id_idx on public.questions(survey_id, chapter_id);

delete from public.surveys
where id = '11111111-1111-4111-8111-111111111111'
   or settings ->> 'editor' = 'simple';
