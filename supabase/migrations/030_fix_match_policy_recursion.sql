-- Fix: infinite recursion in RLS between match <-> match_players
-- Cause: policies referenced each other in EXISTS clauses.

-- 1) Recreate match policies (can reference match_players)
drop policy if exists "Match select visible to members" on public.match;
drop policy if exists "Match insert organizer self" on public.match;
drop policy if exists "Match update organizer only" on public.match;
drop policy if exists "Match delete organizer only" on public.match;

create policy "Match select visible to members"
  on public.match
  for select
  using (
    visibilidad = 'publico'
    or organizer_id = auth.uid()
    or exists (
      select 1
      from public.match_players mp
      where mp.match_id = match.id
        and (
          mp.user_id = auth.uid()
          or exists (
            select 1
            from public.usuarios u
            where u.id = auth.uid()
              and mp.invited_email is not null
              and lower(u.email) = lower(mp.invited_email)
          )
        )
    )
  );

create policy "Match insert organizer self"
  on public.match
  for insert
  with check (organizer_id = auth.uid());

create policy "Match update organizer only"
  on public.match
  for update
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

create policy "Match delete organizer only"
  on public.match
  for delete
  using (organizer_id = auth.uid());

-- 2) Recreate match_players policies WITHOUT querying public.match
--    (this breaks the recursive dependency graph)
drop policy if exists "Match players select related users" on public.match_players;
drop policy if exists "Match players insert organizer or self" on public.match_players;
drop policy if exists "Match players update organizer or self" on public.match_players;
drop policy if exists "Match players delete organizer or self" on public.match_players;

create policy "Match players select authenticated"
  on public.match_players
  for select
  using (auth.uid() is not null);

create policy "Match players insert authenticated"
  on public.match_players
  for insert
  with check (auth.uid() is not null);

create policy "Match players update authenticated"
  on public.match_players
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Match players delete authenticated"
  on public.match_players
  for delete
  using (auth.uid() is not null);
