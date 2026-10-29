-- ============================================================
-- QII One Vault — مخطط القاعدة بيانات + سياسات RLS
-- شغّل هذا الملف كاملاً من: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1) الجدول: ملاحظات لكل مستخدم
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  body        text not null default '' check (char_length(body) <= 4000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- فهرس لتسريع استعلامات المستخدم الحالي
create index if not exists notes_user_id_idx on public.notes (user_id);

-- صلاحيات الدورين المستخدمين في الواجهة (anon للقراءة المجهولة، authenticated للمسجّلين)
grant usage on schema public to anon, authenticated;
grant all on table public.notes to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;

-- 2) تفعيل RLS — بدون هذه السطر لا يرى أي مستخدم أي صفوف (الافتراضي مغلق)
alter table public.notes enable row level security;

-- 3) سياسة العزل: كل مستخدم يرى ويعدّل صفوفه فقط
drop policy if exists "Users manage own notes" on public.notes;
create policy "Users manage own notes"
  on public.notes
  for all                      -- select + insert + update + delete
  using (auth.uid() = user_id)          -- من يقرأ/يحدّث/يحذف
  with check (auth.uid() = user_id);    -- ما يُدرج أو يُحدّث يجب أن يخصه

-- 4) تحديث updated_at تلقائياً
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- 5) منع أي مستخدم من تزوير user_id عند الإدخال (حماية إضافية مع with check)
-- ملاحظة: default auth.uid() يكفي، لكن هذا يضمن تطابق الصف مع الهوية دائماً.
-- (سياسة "with check" أعلاه هي الحاجز الفعلي.)

-- ============================================================
-- بعد التشغيل:
--   * من Dashboard → Authentication → Providers → Email:
--     أوقف "Confirm email" مؤقتاً للاختبار، أو استخدم زر
--     "Add user" لإنشاء مستخدمين تجريبيين يدوياً.
--   * ضع رابط المشروع والمفتاح العام (anon) في assets/js/config.js
-- ============================================================
