-- ============================================================================
-- 002_training_rls_and_rpcs.sql
-- Piping Academy (Trainning App) - RLS Policies, Storage Buckets & RPCs
--
-- Quy tắc bảo mật:
-- 1. Bật RLS trên tất cả bảng training_*.
-- 2. Không sửa hoặc xóa policy trên profiles hay bảng của app khác.
-- 3. Guest (anon) chỉ đọc được module có is_public = true và các lesson/quiz/question
--    thuộc module đó; KHÔNG đọc được training_quiz_answers hay training_documents nội bộ.
-- 4. Đáp án đúng (correct_index) chỉ trả về SAU KHI nộp bài qua RPC
--    training_grade_quiz(), hoặc qua training_get_quiz_for_edit() riêng cho lead/admin.
-- ============================================================================

-- Bật RLS trên tất cả bảng training_*
alter table public.training_modules enable row level security;
alter table public.training_lessons enable row level security;
alter table public.training_quizzes enable row level security;
alter table public.training_quiz_questions enable row level security;
alter table public.training_quiz_answers enable row level security;
alter table public.training_quiz_attempts enable row level security;
alter table public.training_lesson_progress enable row level security;
alter table public.training_documents enable row level security;

-- ============================================================================
-- 1. Policies cho training_modules
-- ============================================================================
drop policy if exists "training_modules_select_anon" on public.training_modules;
create policy "training_modules_select_anon"
  on public.training_modules for select
  to anon
  using (is_public = true);

drop policy if exists "training_modules_select_auth" on public.training_modules;
create policy "training_modules_select_auth"
  on public.training_modules for select
  to authenticated
  using (true);

drop policy if exists "training_modules_write_lead_admin" on public.training_modules;
create policy "training_modules_write_lead_admin"
  on public.training_modules for all
  to authenticated
  using (public.training_current_role() in ('lead', 'admin'))
  with check (public.training_current_role() in ('lead', 'admin'));

-- ============================================================================
-- 2. Policies cho training_lessons
-- ============================================================================
drop policy if exists "training_lessons_select_anon" on public.training_lessons;
create policy "training_lessons_select_anon"
  on public.training_lessons for select
  to anon
  using (
    exists (
      select 1
      from public.training_modules m
      where m.id = module_id and m.is_public = true
    )
  );

drop policy if exists "training_lessons_select_auth" on public.training_lessons;
create policy "training_lessons_select_auth"
  on public.training_lessons for select
  to authenticated
  using (true);

drop policy if exists "training_lessons_write_lead_admin" on public.training_lessons;
create policy "training_lessons_write_lead_admin"
  on public.training_lessons for all
  to authenticated
  using (public.training_current_role() in ('lead', 'admin'))
  with check (public.training_current_role() in ('lead', 'admin'));

-- ============================================================================
-- 3. Policies cho training_quizzes
-- ============================================================================
drop policy if exists "training_quizzes_select_anon" on public.training_quizzes;
create policy "training_quizzes_select_anon"
  on public.training_quizzes for select
  to anon
  using (
    exists (
      select 1
      from public.training_lessons l
      join public.training_modules m on m.id = l.module_id
      where l.id = lesson_id and m.is_public = true
    )
  );

drop policy if exists "training_quizzes_select_auth" on public.training_quizzes;
create policy "training_quizzes_select_auth"
  on public.training_quizzes for select
  to authenticated
  using (true);

drop policy if exists "training_quizzes_write_lead_admin" on public.training_quizzes;
create policy "training_quizzes_write_lead_admin"
  on public.training_quizzes for all
  to authenticated
  using (public.training_current_role() in ('lead', 'admin'))
  with check (public.training_current_role() in ('lead', 'admin'));

-- ============================================================================
-- 4. Policies cho training_quiz_questions (không chứa đáp án)
-- ============================================================================
drop policy if exists "training_quiz_questions_select_anon" on public.training_quiz_questions;
create policy "training_quiz_questions_select_anon"
  on public.training_quiz_questions for select
  to anon
  using (
    exists (
      select 1
      from public.training_quizzes q
      join public.training_lessons l on l.id = q.lesson_id
      join public.training_modules m on m.id = l.module_id
      where q.id = quiz_id and m.is_public = true
    )
  );

drop policy if exists "training_quiz_questions_select_auth" on public.training_quiz_questions;
create policy "training_quiz_questions_select_auth"
  on public.training_quiz_questions for select
  to authenticated
  using (true);

drop policy if exists "training_quiz_questions_write_lead_admin" on public.training_quiz_questions;
create policy "training_quiz_questions_write_lead_admin"
  on public.training_quiz_questions for all
  to authenticated
  using (public.training_current_role() in ('lead', 'admin'))
  with check (public.training_current_role() in ('lead', 'admin'));

-- ============================================================================
-- 5. Policies cho training_quiz_answers
-- TUYỆT ĐỐI KHÔNG tạo policy SELECT cho anon hoặc authenticated.
-- Chỉ cho phép lead/admin ghi qua INSERT/DELETE hoặc thông qua hàm RPC
-- security definer training_save_quiz_question / training_get_quiz_for_edit.
-- ============================================================================
drop policy if exists "training_quiz_answers_select_anon" on public.training_quiz_answers;
drop policy if exists "training_quiz_answers_select_auth" on public.training_quiz_answers;

drop policy if exists "training_quiz_answers_insert_lead_admin" on public.training_quiz_answers;
create policy "training_quiz_answers_insert_lead_admin"
  on public.training_quiz_answers for insert
  to authenticated
  with check (public.training_current_role() in ('lead', 'admin'));

drop policy if exists "training_quiz_answers_update_lead_admin" on public.training_quiz_answers;
create policy "training_quiz_answers_update_lead_admin"
  on public.training_quiz_answers for update
  to authenticated
  using (public.training_current_role() in ('lead', 'admin'))
  with check (public.training_current_role() in ('lead', 'admin'));

drop policy if exists "training_quiz_answers_delete_lead_admin" on public.training_quiz_answers;
create policy "training_quiz_answers_delete_lead_admin"
  on public.training_quiz_answers for delete
  to authenticated
  using (public.training_current_role() in ('lead', 'admin'));

-- ============================================================================
-- 6. Policies cho training_quiz_attempts
-- Engineer/Lead/Admin xem và ghi lịch sử của chính mình; Lead/Admin xem tất cả.
-- Guest (anon) không có quyền.
-- ============================================================================
drop policy if exists "training_quiz_attempts_select_auth" on public.training_quiz_attempts;
create policy "training_quiz_attempts_select_auth"
  on public.training_quiz_attempts for select
  to authenticated
  using (
    (
      user_id = auth.uid()
      and public.training_current_role() in ('engineer', 'lead', 'admin')
    )
    or public.training_current_role() in ('lead', 'admin')
  );

drop policy if exists "training_quiz_attempts_insert_auth" on public.training_quiz_attempts;
create policy "training_quiz_attempts_insert_auth"
  on public.training_quiz_attempts for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.training_current_role() in ('engineer', 'lead', 'admin')
  );

-- ============================================================================
-- 7. Policies cho training_lesson_progress
-- ============================================================================
drop policy if exists "training_lesson_progress_select_auth" on public.training_lesson_progress;
create policy "training_lesson_progress_select_auth"
  on public.training_lesson_progress for select
  to authenticated
  using (
    (
      user_id = auth.uid()
      and public.training_current_role() in ('engineer', 'lead', 'admin')
    )
    or public.training_current_role() in ('lead', 'admin')
  );

drop policy if exists "training_lesson_progress_insert_own" on public.training_lesson_progress;
create policy "training_lesson_progress_insert_own"
  on public.training_lesson_progress for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.training_current_role() in ('engineer', 'lead', 'admin')
  );

drop policy if exists "training_lesson_progress_delete_own" on public.training_lesson_progress;
create policy "training_lesson_progress_delete_own"
  on public.training_lesson_progress for delete
  to authenticated
  using (
    user_id = auth.uid()
    and public.training_current_role() in ('engineer', 'lead', 'admin')
  );

-- ============================================================================
-- 8. Policies cho training_documents
-- Thư viện tài liệu gốc ('training-documents') chỉ authenticated đọc được.
-- File tự biên soạn của module công khai ('training-public') cho phép anon xem
-- nếu gắn với bài học của module có is_public = true.
-- ============================================================================
drop policy if exists "training_documents_select_anon_public" on public.training_documents;
create policy "training_documents_select_anon_public"
  on public.training_documents for select
  to anon
  using (
    bucket_id = 'training-public'
    and lesson_id is not null
    and exists (
      select 1
      from public.training_lessons l
      join public.training_modules m on m.id = l.module_id
      where l.id = lesson_id and m.is_public = true
    )
  );

drop policy if exists "training_documents_select_auth" on public.training_documents;
create policy "training_documents_select_auth"
  on public.training_documents for select
  to authenticated
  using (true);

drop policy if exists "training_documents_write_lead_admin" on public.training_documents;
create policy "training_documents_write_lead_admin"
  on public.training_documents for all
  to authenticated
  using (public.training_current_role() in ('lead', 'admin'))
  with check (public.training_current_role() in ('lead', 'admin'));

-- ============================================================================
-- 9. Storage buckets & Storage RLS
-- - training-documents: PRIVATE (tài liệu gốc DSS/DNV/SOLAS/checklist nội bộ)
-- - training-public: PUBLIC READ (chỉ chứa file tự biên soạn cho Equipment Modeling)
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('training-documents', 'training-documents', false),
  ('training-public', 'training-public', true)
on conflict (id) do update
set public = excluded.public;

-- Bucket private: chỉ authenticated đọc; lead/admin upload/xóa
drop policy if exists "training_docs_bucket_select_auth" on storage.objects;
create policy "training_docs_bucket_select_auth"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'training-documents');

drop policy if exists "training_docs_bucket_insert_lead_admin" on storage.objects;
create policy "training_docs_bucket_insert_lead_admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'training-documents'
    and public.training_current_role() in ('lead', 'admin')
  );

drop policy if exists "training_docs_bucket_update_lead_admin" on storage.objects;
create policy "training_docs_bucket_update_lead_admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'training-documents'
    and public.training_current_role() in ('lead', 'admin')
  )
  with check (
    bucket_id = 'training-documents'
    and public.training_current_role() in ('lead', 'admin')
  );

drop policy if exists "training_docs_bucket_delete_lead_admin" on storage.objects;
create policy "training_docs_bucket_delete_lead_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'training-documents'
    and public.training_current_role() in ('lead', 'admin')
  );

-- Bucket public: mọi người đọc được; chỉ lead/admin upload/xóa
drop policy if exists "training_public_bucket_select_all" on storage.objects;
create policy "training_public_bucket_select_all"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'training-public');

drop policy if exists "training_public_bucket_insert_lead_admin" on storage.objects;
create policy "training_public_bucket_insert_lead_admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'training-public'
    and public.training_current_role() in ('lead', 'admin')
  );

drop policy if exists "training_public_bucket_update_lead_admin" on storage.objects;
create policy "training_public_bucket_update_lead_admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'training-public'
    and public.training_current_role() in ('lead', 'admin')
  )
  with check (
    bucket_id = 'training-public'
    and public.training_current_role() in ('lead', 'admin')
  );

drop policy if exists "training_public_bucket_delete_lead_admin" on storage.objects;
create policy "training_public_bucket_delete_lead_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'training-public'
    and public.training_current_role() in ('lead', 'admin')
  );

-- ============================================================================
-- 10. RPC Functions (SECURITY DEFINER)
-- ============================================================================

-- 10a. Chấm điểm quiz phía server và lưu kết quả nếu đã đăng nhập
create or replace function public.training_grade_quiz(
  p_quiz_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := public.training_current_role();
  v_quiz record;
  v_is_public boolean := false;
  v_total int := 0;
  v_correct int := 0;
  v_score int := 0;
  v_passed boolean := false;
  v_results jsonb := '[]'::jsonb;
  v_q record;
  v_selected int;
  v_is_right boolean;
begin
  if p_quiz_id is null then
    raise exception 'p_quiz_id is required' using errcode = '22023';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'p_answers must be a JSON array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_answers) > 100 then
    raise exception 'Too many answers (max 100)' using errcode = '22023';
  end if;

  select q.id, q.pass_score, m.is_public
  into v_quiz
  from public.training_quizzes q
  join public.training_lessons l on l.id = q.lesson_id
  join public.training_modules m on m.id = l.module_id
  where q.id = p_quiz_id;

  if not found then
    raise exception 'Quiz not found' using errcode = 'P0002';
  end if;

  v_is_public := coalesce(v_quiz.is_public, false);

  -- Guest (chưa đăng nhập) chỉ được chấm quiz thuộc module is_public = true
  if v_uid is null and not v_is_public then
    raise exception 'Authentication required to grade internal quiz' using errcode = '42501';
  end if;

  for v_q in
    select
      qq.id as question_id,
      qq.explanation,
      qa.correct_index
    from public.training_quiz_questions qq
    join public.training_quiz_answers qa on qa.question_id = qq.id
    where qq.quiz_id = p_quiz_id
    order by qq.sort_order asc, qq.id asc
  loop
    v_total := v_total + 1;

    select (elem->>'selected_index')::int
    into v_selected
    from jsonb_array_elements(p_answers) as elem
    where (elem->>'question_id')::uuid = v_q.question_id
    limit 1;

    v_is_right := (v_selected is not null and v_selected = v_q.correct_index);
    if v_is_right then
      v_correct := v_correct + 1;
    end if;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'question_id', v_q.question_id,
        'selected_index', v_selected,
        'is_correct', v_is_right,
        'correct_index', v_q.correct_index,
        'explanation', v_q.explanation
      )
    );
  end loop;

  if v_total > 0 then
    v_score := round((v_correct::numeric / v_total::numeric) * 100)::int;
  else
    v_score := 0;
  end if;

  v_passed := v_score >= coalesce(v_quiz.pass_score, 70);

  -- Chỉ lưu vào training_quiz_attempts nếu có auth.uid() và thuộc role hợp lệ
  if v_uid is not null and v_role in ('engineer', 'lead', 'admin') then
    insert into public.training_quiz_attempts (user_id, quiz_id, score, answers)
    values (v_uid, p_quiz_id, v_score, p_answers);
  end if;

  return jsonb_build_object(
    'quiz_id', p_quiz_id,
    'score', v_score,
    'pass_score', v_quiz.pass_score,
    'passed', v_passed,
    'total_questions', v_total,
    'correct_count', v_correct,
    'saved', (v_uid is not null and v_role in ('engineer', 'lead', 'admin')),
    'results', v_results
  );
end;
$$;

revoke all on function public.training_grade_quiz(uuid, jsonb) from public;
grant execute on function public.training_grade_quiz(uuid, jsonb) to anon, authenticated;

-- 10b. Lấy quiz kèm đáp án đúng cho màn hình Soạn nội dung (chỉ lead/admin)
create or replace function public.training_get_quiz_for_edit(p_quiz_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text := public.training_current_role();
  v_quiz record;
  v_questions jsonb := '[]'::jsonb;
begin
  if v_role not in ('lead', 'admin') then
    raise exception 'Permission denied: lead or admin required' using errcode = '42501';
  end if;

  select id, lesson_id, title, pass_score, created_at
  into v_quiz
  from public.training_quizzes
  where id = p_quiz_id;

  if not found then
    raise exception 'Quiz not found' using errcode = 'P0002';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', qq.id,
        'quiz_id', qq.quiz_id,
        'question', qq.question,
        'options', qq.options,
        'explanation', qq.explanation,
        'sort_order', qq.sort_order,
        'correct_index', qa.correct_index
      )
      order by qq.sort_order asc, qq.id asc
    ),
    '[]'::jsonb
  )
  into v_questions
  from public.training_quiz_questions qq
  left join public.training_quiz_answers qa on qa.question_id = qq.id
  where qq.quiz_id = p_quiz_id;

  return jsonb_build_object(
    'quiz', jsonb_build_object(
      'id', v_quiz.id,
      'lesson_id', v_quiz.lesson_id,
      'title', v_quiz.title,
      'pass_score', v_quiz.pass_score,
      'created_at', v_quiz.created_at
    ),
    'questions', v_questions
  );
end;
$$;

revoke all on function public.training_get_quiz_for_edit(uuid) from public;
grant execute on function public.training_get_quiz_for_edit(uuid) to authenticated;

-- 10c. Lưu (thêm/sửa) câu hỏi và đáp án đúng nguyên tử (atomic) cho lead/admin
-- Tránh lỗi RLS khi UPSERT vào training_quiz_answers vốn không có policy SELECT.
create or replace function public.training_save_quiz_question(
  p_question_id uuid,
  p_quiz_id uuid,
  p_question text,
  p_options jsonb,
  p_correct_index int,
  p_explanation text,
  p_sort_order int default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.training_current_role();
  v_id uuid := p_question_id;
  v_opt_len int;
begin
  if v_role not in ('lead', 'admin') then
    raise exception 'Permission denied: lead or admin required' using errcode = '42501';
  end if;

  if p_options is null or jsonb_typeof(p_options) <> 'array' then
    raise exception 'p_options must be a JSON array' using errcode = '22023';
  end if;

  v_opt_len := jsonb_array_length(p_options);
  if v_opt_len < 2 then
    raise exception 'At least 2 options are required' using errcode = '22023';
  end if;

  if p_correct_index is null or p_correct_index < 0 or p_correct_index >= v_opt_len then
    raise exception 'p_correct_index out of bounds' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.training_quiz_questions (quiz_id, question, options, explanation, sort_order)
    values (p_quiz_id, trim(p_question), p_options, coalesce(p_explanation, ''), coalesce(p_sort_order, 0))
    returning id into v_id;
  else
    update public.training_quiz_questions
    set
      question = trim(p_question),
      options = p_options,
      explanation = coalesce(p_explanation, ''),
      sort_order = coalesce(p_sort_order, 0)
    where id = v_id and quiz_id = p_quiz_id;

    if not found then
      raise exception 'Question not found' using errcode = 'P0002';
    end if;
  end if;

  insert into public.training_quiz_answers (question_id, correct_index)
  values (v_id, p_correct_index)
  on conflict (question_id) do update
  set correct_index = excluded.correct_index;

  return v_id;
end;
$$;

revoke all on function public.training_save_quiz_question(uuid, uuid, text, jsonb, int, text, int) from public;
grant execute on function public.training_save_quiz_question(uuid, uuid, text, jsonb, int, text, int) to authenticated;

-- 10d. Lấy danh sách học viên từ profiles cho Bảng tiến độ nhóm (chỉ lead/admin)
-- Không sửa policy của bảng profiles. Dùng to_jsonb để tương thích cả cột
-- display_name/position hiện có và full_name/role nếu tồn tại.
create or replace function public.training_list_learners()
returns table (
  id uuid,
  display_name text,
  email text,
  role text,
  employee_id text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text := public.training_current_role();
begin
  if v_role not in ('lead', 'admin') then
    raise exception 'Permission denied: lead or admin required' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(to_jsonb(p)->>'full_name'), ''),
      nullif(trim(to_jsonb(p)->>'name'), ''),
      p.email,
      'Engineer'
    )::text as display_name,
    coalesce(p.email, '')::text as email,
    (
      case
        when lower(trim(coalesce(to_jsonb(p)->>'role', ''))) in ('admin', 'lead', 'engineer', 'viewer')
          then lower(trim(to_jsonb(p)->>'role'))
        when lower(coalesce(p.position, '')) like '%admin%' then 'admin'
        when lower(coalesce(p.position, '')) like '%manager%'
          or lower(coalesce(p.position, '')) like '%lead%'
          or lower(coalesce(p.position, '')) like '%senior%'
          or lower(coalesce(p.position, '')) like '%chief%' then 'lead'
        when lower(coalesce(p.position, '')) like '%viewer%'
          or lower(coalesce(p.position, '')) like '%inspect%' then 'viewer'
        else 'engineer'
      end
    )::text as role,
    coalesce(p.employee_id, '')::text as employee_id
  from public.profiles p
  where coalesce(lower(to_jsonb(p)->>'app_access'), 'true') <> 'false'
  order by display_name asc;
end;
$$;

revoke all on function public.training_list_learners() from public;
grant execute on function public.training_list_learners() to authenticated;

notify pgrst, 'reload schema';
