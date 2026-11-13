-- ============================================================================
-- 004_training_rls_tests.sql
-- Script kiểm thử RLS cho Piping Academy (Trainning App)
--
-- Cách chạy:
--   Chạy toàn bộ script trong Supabase SQL Editor.
--   Script được bọc trong BEGIN ... ROLLBACK nên KHÔNG để lại dữ liệu rác.
--   Trước khi chạy, đảm bảo đã chạy 001, 002, 003 và có ít nhất 1 user thật
--   cho các role Engineer / Lead / Admin trong bảng public.profiles.
-- ============================================================================

begin;

do $$
declare
  v_eng_id uuid;
  v_lead_id uuid;
  v_admin_id uuid;
  v_count int;
  v_res jsonb;
  v_public_quiz_id uuid := '30000000-0000-4000-8000-000000000201';
  v_internal_quiz_id uuid := '30000000-0000-4000-8000-000000000101';
  v_public_lesson_id uuid := '20000000-0000-4000-8000-000000000201';
  v_internal_lesson_id uuid := '20000000-0000-4000-8000-000000000101';
begin
  -- Lấy đại diện user từ profiles theo position / role
  select id into v_eng_id
  from public.profiles
  where lower(coalesce(position, '')) = 'engineer'
  limit 1;

  select id into v_lead_id
  from public.profiles
  where lower(coalesce(position, '')) in ('manager', 'senior', 'lead')
  limit 1;

  select id into v_admin_id
  from public.profiles
  where lower(coalesce(position, '')) like '%admin%'
  limit 1;

  -- ==========================================================================
  -- TEST 1: GUEST (anon - chưa đăng nhập)
  -- ==========================================================================
  set local role anon;
  perform set_config('request.jwt.claims', '{}', true);

  -- 1.1 Chỉ thấy module is_public = true (Equipment Modeling)
  select count(*) into v_count from public.training_modules;
  if v_count <> 1 then
    raise exception 'FAIL [anon]: expected 1 public module, got %', v_count;
  end if;

  -- 1.2 Không thấy tài liệu nội bộ trong bucket training-documents
  select count(*) into v_count from public.training_documents where bucket_id = 'training-documents';
  if v_count <> 0 then
    raise exception 'FAIL [anon]: anon must not read training-documents metadata';
  end if;

  -- 1.3 Không được đọc training_quiz_answers (phải báo lỗi permission/RLS hoặc 0 dòng)
  begin
    select count(*) into v_count from public.training_quiz_answers;
    if v_count > 0 then
      raise exception 'FAIL [anon]: anon read % rows from training_quiz_answers!', v_count;
    end if;
  exception when insufficient_privilege then
    null; -- Expected
  end;

  -- 1.4 Chấm quiz public qua RPC: được chấm, saved phải = false
  select public.training_grade_quiz(
    v_public_quiz_id,
    '[{"question_id":"40000000-0000-4000-8000-000000000211","selected_index":1}]'::jsonb
  ) into v_res;
  if (v_res->>'saved')::boolean <> false then
    raise exception 'FAIL [anon]: guest attempt must not be saved, got %', v_res;
  end if;

  -- 1.5 Chấm quiz internal khi là anon: BẮT BUỘC lỗi 42501
  begin
    perform public.training_grade_quiz(v_internal_quiz_id, '[]'::jsonb);
    raise exception 'FAIL [anon]: anon should not be able to grade internal quiz';
  exception when insufficient_privilege then
    null; -- Expected
  end;

  -- 1.6 Không được sửa module
  begin
    insert into public.training_modules (title) values ('Hacker Module');
    raise exception 'FAIL [anon]: anon must not insert training_modules';
  exception when insufficient_privilege then
    null; -- Expected
  end;

  raise notice 'PASS TEST 1: Guest (anon) checks succeeded.';

  -- ==========================================================================
  -- TEST 2: ENGINEER
  -- ==========================================================================
  if v_eng_id is not null then
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', v_eng_id::text, 'role', 'authenticated')::text, true);

    -- 2.1 Thấy đủ 5 module
    select count(*) into v_count from public.training_modules;
    if v_count < 5 then
      raise exception 'FAIL [engineer]: expected >= 5 modules, got %', v_count;
    end if;

    -- 2.2 KHÔNG đọc được training_quiz_answers trực tiếp
    select count(*) into v_count from public.training_quiz_answers;
    if v_count <> 0 then
      raise exception 'FAIL [engineer]: engineer must not read training_quiz_answers directly (got %)', v_count;
    end if;

    -- 2.3 KHÔNG gọi được training_get_quiz_for_edit hay training_list_learners
    begin
      perform public.training_get_quiz_for_edit(v_public_quiz_id);
      raise exception 'FAIL [engineer]: engineer must not access training_get_quiz_for_edit';
    exception when insufficient_privilege then
      null;
    end;

    begin
      perform * from public.training_list_learners();
      raise exception 'FAIL [engineer]: engineer must not access training_list_learners';
    exception when insufficient_privilege then
      null;
    end;

    -- 2.4 Đánh dấu hoàn thành bài học & nộp quiz được lưu vào DB
    insert into public.training_lesson_progress (user_id, lesson_id)
    values (v_eng_id, v_internal_lesson_id)
    on conflict do nothing;

    select public.training_grade_quiz(
      v_internal_quiz_id,
      '[{"question_id":"40000000-0000-4000-8000-000000000111","selected_index":0}]'::jsonb
    ) into v_res;
    if (v_res->>'saved')::boolean <> true then
      raise exception 'FAIL [engineer]: engineer quiz attempt must be saved';
    end if;

    -- 2.5 KHÔNG thể tạo module mới
    begin
      insert into public.training_modules (title) values ('Unauthorized Module');
      raise exception 'FAIL [engineer]: engineer must not insert training_modules';
    exception when insufficient_privilege then
      null;
    end;

    raise notice 'PASS TEST 2: Engineer checks succeeded (user %).', v_eng_id;
  else
    raise notice 'SKIP TEST 2: No Engineer profile found in public.profiles.';
  end if;

  -- ==========================================================================
  -- TEST 3: LEAD / ADMIN
  -- ==========================================================================
  if coalesce(v_lead_id, v_admin_id) is not null then
    set local role authenticated;
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', coalesce(v_lead_id, v_admin_id)::text, 'role', 'authenticated')::text,
      true
    );

    -- 3.1 Đọc được danh sách học viên qua RPC
    select count(*) into v_count from public.training_list_learners();
    if v_count = 0 then
      raise exception 'FAIL [lead/admin]: training_list_learners returned 0 rows';
    end if;

    -- 3.2 Đọc được đáp án khi soạn quiz qua RPC
    select public.training_get_quiz_for_edit(v_public_quiz_id) into v_res;
    if jsonb_array_length(v_res->'questions') = 0 then
      raise exception 'FAIL [lead/admin]: training_get_quiz_for_edit returned empty questions';
    end if;

    -- 3.3 Thấy được tiến độ của Engineer vừa ghi trong transaction
    if v_eng_id is not null then
      select count(*) into v_count
      from public.training_lesson_progress
      where user_id = v_eng_id and lesson_id = v_internal_lesson_id;
      if v_count <> 1 then
        raise exception 'FAIL [lead/admin]: cannot read learner progress';
      end if;
    end if;

    -- 3.4 Có quyền tạo module mới
    insert into public.training_modules (title, description, sort_order, is_public)
    values ('Test Module Temp', 'Temp', 99, false);

    raise notice 'PASS TEST 3: Lead/Admin checks succeeded (user %).', coalesce(v_lead_id, v_admin_id);
  else
    raise notice 'SKIP TEST 3: No Lead/Admin profile found in public.profiles.';
  end if;
end $$;

rollback;
