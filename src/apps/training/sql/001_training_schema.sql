-- ============================================================================
-- 001_training_schema.sql
-- Piping Academy (Trainning App) - Core Schema & Role Helper
--
-- Lưu ý:
-- - Chỉ THÊM bảng và hàm mới với tiền tố training_ trong schema public.
-- - KHÔNG sửa hoặc xóa bảng/cột/policy của các app khác.
-- - Liên kết người dùng qua public.profiles(id) (= auth.users.id).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Hàm xác định vai trò hiện tại của người dùng dựa trên public.profiles.
-- Sử dụng SECURITY DEFINER + STABLE + search_path = public để mọi RLS policy
-- gọi hàm này không gặp lỗi đệ quy trên bảng profiles.
--
-- Trả về: 'admin' | 'lead' | 'engineer' | 'viewer' | null (nếu chưa đăng nhập)
-- Hỗ trợ cả cột role (nếu có) và cột position chuẩn của platform
-- ('Admin', 'Manager', 'Senior', 'Engineer', 'Viewer').
-- ----------------------------------------------------------------------------
create or replace function public.training_current_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row jsonb;
  v_role text;
  v_pos text;
  v_access text;
begin
  if v_uid is null then
    return null;
  end if;

  select to_jsonb(p)
  into v_row
  from public.profiles p
  where p.id = v_uid
  limit 1;

  if v_row is null then
    return null;
  end if;

  -- Nếu tài khoản đã bị tắt app_access thì không cấp quyền
  v_access := lower(coalesce(v_row->>'app_access', 'true'));
  if v_access = 'false' then
    return null;
  end if;

  -- Ưu tiên cột role nếu tồn tại và hợp lệ
  v_role := lower(trim(coalesce(v_row->>'role', '')));
  if v_role in ('admin', 'lead', 'engineer', 'viewer') then
    return v_role;
  end if;

  -- Map từ cột position hiện hữu của platform
  v_pos := lower(trim(coalesce(v_row->>'position', '')));
  if v_pos like '%admin%' then
    return 'admin';
  elsif v_pos like '%manager%' or v_pos like '%lead%' or v_pos like '%senior%' or v_pos like '%chief%' then
    return 'lead';
  elsif v_pos like '%viewer%' or v_pos like '%inspect%' then
    return 'viewer';
  end if;

  return 'engineer';
end;
$$;

revoke all on function public.training_current_role() from public;
grant execute on function public.training_current_role() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1. training_modules: Nhóm học phần đào tạo Piping Engineer
-- is_public = true cho phép người dùng chưa đăng nhập (Guest/anon) xem.
-- ----------------------------------------------------------------------------
create table if not exists public.training_modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  sort_order int not null default 0,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists training_modules_sort_idx
  on public.training_modules (sort_order, created_at);

-- ----------------------------------------------------------------------------
-- 2. training_lessons: Bài học thuộc từng module
-- Chỉ cho phép link video/slide dùng giao thức https:// (hoặc null/rỗng).
-- ----------------------------------------------------------------------------
create table if not exists public.training_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.training_modules (id) on delete cascade,
  title text not null,
  content_md text not null default '',
  video_url text,
  slides_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint training_lessons_video_https_chk
    check (video_url is null or video_url = '' or video_url ~* '^https://'),
  constraint training_lessons_slides_https_chk
    check (slides_url is null or slides_url = '' or slides_url ~* '^https://')
);

create index if not exists training_lessons_module_sort_idx
  on public.training_lessons (module_id, sort_order, created_at);

-- ----------------------------------------------------------------------------
-- 3. training_quizzes: Bài kiểm tra gắn với một bài học
-- ----------------------------------------------------------------------------
create table if not exists public.training_quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.training_lessons (id) on delete cascade,
  title text not null,
  pass_score int not null default 70 check (pass_score between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists training_quizzes_lesson_idx
  on public.training_quizzes (lesson_id);

-- ----------------------------------------------------------------------------
-- 4. training_quiz_questions: Câu hỏi trắc nghiệm (KHÔNG chứa đáp án đúng)
-- options là mảng JSON gồm tối thiểu 2 lựa chọn dạng chuỗi.
-- ----------------------------------------------------------------------------
create table if not exists public.training_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.training_quizzes (id) on delete cascade,
  question text not null,
  options jsonb not null,
  explanation text not null default '',
  sort_order int not null default 0,
  constraint training_quiz_questions_options_chk
    check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2)
);

create index if not exists training_quiz_questions_quiz_sort_idx
  on public.training_quiz_questions (quiz_id, sort_order);

-- ----------------------------------------------------------------------------
-- 5. training_quiz_answers: Bảng tách riêng chứa đáp án đúng (bảo mật tuyệt đối)
-- Không cấp policy SELECT cho anon hay authenticated; chỉ truy cập qua RPC
-- SECURITY DEFINER (training_grade_quiz & training_get_quiz_for_edit).
-- ----------------------------------------------------------------------------
create table if not exists public.training_quiz_answers (
  question_id uuid primary key references public.training_quiz_questions (id) on delete cascade,
  correct_index int not null check (correct_index >= 0)
);

-- ----------------------------------------------------------------------------
-- 6. training_quiz_attempts: Lịch sử làm bài quiz của học viên đã đăng nhập
-- ----------------------------------------------------------------------------
create table if not exists public.training_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quiz_id uuid not null references public.training_quizzes (id) on delete cascade,
  score int not null check (score between 0 and 100),
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists training_quiz_attempts_user_quiz_idx
  on public.training_quiz_attempts (user_id, quiz_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 7. training_lesson_progress: Đánh dấu hoàn thành bài học của từng học viên
-- ----------------------------------------------------------------------------
create table if not exists public.training_lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.training_lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists training_lesson_progress_lesson_idx
  on public.training_lesson_progress (lesson_id);

-- ----------------------------------------------------------------------------
-- 8. training_documents: Thư viện tài liệu gốc & tài liệu đính kèm bài học
-- - Tài liệu nội bộ nằm ở bucket private: 'training-documents' (chỉ authenticated)
-- - Tài liệu tự biên soạn cho module công khai nằm ở bucket: 'training-public'
-- ----------------------------------------------------------------------------
create table if not exists public.training_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  storage_path text not null,
  bucket_id text not null default 'training-documents'
    check (bucket_id in ('training-documents', 'training-public')),
  lesson_id uuid references public.training_lessons (id) on delete set null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists training_documents_lesson_idx
  on public.training_documents (lesson_id);

notify pgrst, 'reload schema';
