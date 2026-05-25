drop policy "published surveys or editors are readable" on public.surveys;

create policy "published surveys are readable for response pages"
on public.surveys
for select
to anon
using (status = 'published');

create policy "anonymous editors can read their surveys"
on public.surveys
for select
to anon
using (
  edit_token_hash is not null
  and edit_token_hash = public.current_edit_token_hash()
);
