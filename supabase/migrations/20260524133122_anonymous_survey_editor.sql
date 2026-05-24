alter table public.surveys
add column if not exists edit_token_hash text;

create or replace function public.current_edit_token_hash()
returns text
language sql
stable
set search_path = public
as $$
  select case
    when nullif(current_setting('request.headers', true), '') is null then null
    when nullif(current_setting('request.headers', true)::jsonb ->> 'x-survey-edit-token', '') is null then null
    else encode(
      extensions.digest(
        current_setting('request.headers', true)::jsonb ->> 'x-survey-edit-token',
        'sha256'
      ),
      'hex'
    )
  end
$$;

grant execute on function public.current_edit_token_hash() to anon, authenticated;

grant select, insert, update on public.surveys to anon;
grant select, insert, update, delete on public.questions to anon;

create policy "anonymous editors can create surveys"
on public.surveys
for insert
to anon
with check (
  owner_id is null
  and edit_token_hash is not null
  and edit_token_hash = public.current_edit_token_hash()
);

create policy "anonymous editors can read their surveys"
on public.surveys
for select
to anon
using (
  edit_token_hash is not null
  and edit_token_hash = public.current_edit_token_hash()
);

create policy "anonymous editors can update their surveys"
on public.surveys
for update
to anon
using (
  edit_token_hash is not null
  and edit_token_hash = public.current_edit_token_hash()
)
with check (
  owner_id is null
  and edit_token_hash is not null
  and edit_token_hash = public.current_edit_token_hash()
);

create policy "anonymous editors can create questions"
on public.questions
for insert
to anon
with check (
  exists (
    select 1
    from public.surveys
    where surveys.id = questions.survey_id
      and surveys.edit_token_hash is not null
      and surveys.edit_token_hash = public.current_edit_token_hash()
  )
);

create policy "anonymous editors can update questions"
on public.questions
for update
to anon
using (
  exists (
    select 1
    from public.surveys
    where surveys.id = questions.survey_id
      and surveys.edit_token_hash is not null
      and surveys.edit_token_hash = public.current_edit_token_hash()
  )
)
with check (
  exists (
    select 1
    from public.surveys
    where surveys.id = questions.survey_id
      and surveys.edit_token_hash is not null
      and surveys.edit_token_hash = public.current_edit_token_hash()
  )
);

create policy "anonymous editors can delete questions"
on public.questions
for delete
to anon
using (
  exists (
    select 1
    from public.surveys
    where surveys.id = questions.survey_id
      and surveys.edit_token_hash is not null
      and surveys.edit_token_hash = public.current_edit_token_hash()
  )
);
