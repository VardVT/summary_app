-- ============================================================================
-- 003_training_seed.sql
-- Piping Academy (Trainning App) - Seed 5 Module, bài học & quiz mẫu
--
-- Cấu trúc 5 module:
--   1. Kiến thức nền (Nội bộ)
--   2. AVEVA 3D (Công khai - tự biên soạn chung về Equipment, Pipe, Layout)
--   3. AVEVA 2D (Nội bộ - Spooler/ISO, Marine Drafting)
--   4. AVEVA khác (Nội bộ - Hole management, Report)
--   5. On job training (Nội bộ - Thực hành trên Hull 997, 1004, 999, 1000)
--
-- Lưu ý bảo mật:
-- - Module công khai "AVEVA 3D" (is_public = true) chỉ chứa nội dung tự biên
--   soạn về thao tác phần mềm AVEVA Marine chung, TUYỆT ĐỐI KHÔNG chứa tài
--   liệu DSS, DNV, SOLAS hay dữ liệu Hull nội bộ của xưởng.
-- - Dùng UUID cố định + ON CONFLICT DO UPDATE để cập nhật lại cấu trúc an toàn.
-- ============================================================================

-- 1. Seed 5 Module
insert into public.training_modules (id, title, description, sort_order, is_public)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Kiến thức nền',
    'Cấu trúc thư mục, DSS 28, DSS 12, DSS 00, tiêu chuẩn CAD, pipe standard, guideline, checklist, DNV rules và SOLAS.',
    1,
    false
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'AVEVA 3D',
    'Module công khai (Public): hướng dẫn tự biên soạn về modeling equipment, pipe và 3D layout trong AVEVA Marine.',
    2,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'AVEVA 2D',
    'Sử dụng Spooler xuất bản vẽ ISO kèm attribute chuẩn và Marine Drafting để hoàn thiện bản vẽ 2D layout, chi tiết ISO, sketch.',
    3,
    false
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'AVEVA khác',
    'Hole management (workflow, tạo & request cut-out) và Report (MTO, DB listing, Outfitting Report tool, search & custom tool).',
    4,
    false
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'On job training',
    'Thực hành triển khai thực tế trên các dự án tàu Hull 997, 1004, 999, 1000 theo quy trình và checklist của phòng Piping.',
    5,
    false
  )
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_public = excluded.is_public;

-- 2. Seed bài học cho từng Module
insert into public.training_lessons (id, module_id, title, content_md, video_url, slides_url, sort_order)
values
  -- Module 1: Kiến thức nền (internal)
  (
    '20000000-0000-4000-8000-000000000101',
    '10000000-0000-4000-8000-000000000001',
    'Cấu trúc thư mục & bộ tiêu chuẩn DSS (DSS 28, DSS 12, DSS 00)',
    E'## Mục tiêu bài học\nNắm được cây thư mục làm việc chuẩn của phòng Piping và cách tra cứu bộ tài liệu tiêu chuẩn xưởng.\n\n### Nội dung trọng tâm\n- **Cấu trúc thư mục dự án (VPP3 / Server)**: vị trí lưu bản vẽ 2D, ISO, MTO, file check và quy ước đặt tên theo Hull/Block.\n- **DSS 28 (Standard SFI)**: hệ thống mã hóa nhóm thiết bị và hệ thống đường ống tàu (nhóm 7xx - Ship Systems / Piping).\n- **DSS 12 (Yard Technological)**: yêu cầu công nghệ chế tạo, lắp đặt ống và gia công tại xưởng.\n- **DSS 00 (EN Handbook)**: sổ tay kỹ thuật nền tảng dành cho kỹ sư mới.\n\n> Lưu ý: Tải các tài liệu gốc tại mục **Thư viện tài liệu** (yêu cầu đăng nhập tài khoản nội bộ).',
    null,
    null,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000102',
    '10000000-0000-4000-8000-000000000001',
    'Tiêu chuẩn CAD, Pipe standard, Guideline & Checklist',
    E'## Mục tiêu bài học\nÁp dụng đồng bộ quy chuẩn bản vẽ CAD, tiêu chuẩn đường ống và danh mục tự kiểm tra trước khi phát hành.\n\n### Nội dung cần nắm\n- **Tiêu chuẩn CAD**: layer, line type, text height, khung tên và quy cách trình bày bản vẽ.\n- **Pipe standard & Pipe guideline**: lựa chọn spec, khoảng hở lắp đặt, khoảng cách giá đỡ (pipe support) và bán kính uốn.\n- **Pipe checklist**: danh mục tự kiểm tra (QA/QC) bắt buộc trước khi gửi Lead/Senior review.',
    null,
    null,
    2
  ),
  (
    '20000000-0000-4000-8000-000000000103',
    '10000000-0000-4000-8000-000000000001',
    'Quy phạm DNV rules & Công ước SOLAS',
    E'## Mục tiêu bài học\nHiểu cách áp dụng quy phạm đăng kiểm DNV và công ước SOLAS vào thiết kế hệ thống ống tàu thủy và offshore.\n\n### Các điểm kiểm tra bắt buộc\n1. **DNV Rules, Guideline & Class Notation**: phân biệt cấp đường ống (Class I, II, III), áp suất/nhiệt độ thiết kế và yêu cầu thử áp lực.\n2. **Ống xuyên vách & van thân tàu**: quy định cho vách kín nước, shell valves, ống thông hơi/đo sâu két.\n3. **SOLAS (An toàn sinh mạng trên biển)**:\n   - Hệ thống cứu hỏa (Fire main, CO2/Water mist).\n   - Che chắn đường ống nhiên liệu gần bề mặt nóng trong buồng máy (double-walled piping / shielding).\n   - Ngăn cháy lan qua vách chống cháy cấp A/B.',
    null,
    null,
    3
  ),

  -- Module 2: AVEVA 3D (PUBLIC - tự biên soạn chung, không tài liệu nội bộ)
  (
    '20000000-0000-4000-8000-000000000201',
    '10000000-0000-4000-8000-000000000002',
    'Modeling Equipment: Tạo, chỉnh sửa & kiểm tra Attribute',
    E'## Giới thiệu\nTrong môi trường 3D AVEVA Marine (Outfitting / Equipment), mỗi thiết bị chính (`EQUI`) được tổ chức dưới `ZONE` theo cấu trúc phân cấp rõ ràng để phục vụ đấu nối ống và kiểm tra không gian.\n\n### Cấu trúc phân cấp cơ bản\n- `ZONE` → `EQUI` (Equipment) → `SUBE` (Sub-Equipment) / Primitives (`CYLINDER`, `BOX`, `NOZZLE`...)\n\n### Thao tác chính\n1. **Tạo & quản lý Sub-Equipment (`SUBE`)**: tách thân bơm, động cơ, đế bệ, tủ điều khiển để dễ ẩn/hiện và kiểm soát kích thước bao.\n2. **Đặt `NOZZLE`**: xác định tọa độ tâm bích, trục Z hướng ra ngoài ống và gán đúng `CATREF` theo DN/PN.\n3. **Kiểm tra kích thước & Attribute quan trọng**:\n\n| Attribute | Ý nghĩa | Lưu ý |\n|---|---|---|\n| `NAME` | Tên định danh duy nhất | Không trùng lặp trong Database |\n| `DESC` | Mô tả thiết bị | Phục vụ hiển thị báo cáo |\n| `POS` / `ORI` | Vị trí & hướng xoay | Khớp Vendor Drawing |\n| `CATREF` (Nozzle) | Tham chiếu mặt bích | Khớp chuẩn nối với Pipe Branch |',
    null,
    null,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000202',
    '10000000-0000-4000-8000-000000000002',
    'Pipe Modeling: Pipe - Branch, Clash Check & Attribute',
    E'## Quy trình dựng mô hình Pipe & Branch\n1. Tạo đối tượng `PIPE` trong `ZONE` phù hợp và gán `PSPEC` (Pipe Specification).\n2. Tạo `BRAN` (Branch), thiết lập `HREF` (Head Reference) và `TREF` (Tail Reference) nối tới Nozzle hoặc Tee.\n3. Kiểm tra thứ tự thành phần (`FLAN`, `GASK`, `ELBO`, `VALV`, `TEE`, `REDU`) từ Head → Tail và chạy **Clash Check** (Hard Clash / Touch / Clearance).\n\n### Attribute quan trọng cần kiểm tra\n- `PSPEC` / `ISPEC` / `TSPEC`: Spec ống, bọc cách nhiệt (Insulation), gia nhiệt (Tracing).\n- `BORE`, `HCONN` / `TCONN`, `TEMP`, `PRESS`: Đường kính danh nghĩa, kiểu kết nối, nhiệt độ và áp suất.',
    null,
    null,
    2
  ),
  (
    '20000000-0000-4000-8000-000000000203',
    '10000000-0000-4000-8000-000000000002',
    '3D Layout: Bố trí không gian & phối hợp hệ thống ống',
    E'## Nguyên tắc bố trí 3D Layout\n- Tổ chức hành lang ống (pipe rack / pipe corridor) song song theo tầng cao độ rõ ràng, ưu tiên ống đường kính lớn và ống có độ dốc (`Slope`).\n- Dành sẵn **Maintenance / Withdrawal Volume** cho thiết bị (rút ruột sinh hàn, mở cửa tủ điện, thay thế van).\n- Đảm bảo khoảng hở thao tác tay quay van, tháo bu-lông mặt bích và không chắn lối đi lại / cầu thang thoát hiểm.\n- Phối hợp tránh va chạm sớm với kết cấu (Hull), máng cáp (Electrical) và đường ống gió (HVAC).',
    null,
    null,
    3
  ),

  -- Module 3: AVEVA 2D (internal)
  (
    '20000000-0000-4000-8000-000000000301',
    '10000000-0000-4000-8000-000000000003',
    'Spooler / ISO: Chia Spool, xuất ISO & Attribute quan trọng',
    E'## Quy trình làm việc với Spooler\n- Chia Spool hợp lý theo năng lực gia công workshop, giới hạn kích thước khung mạ kẽm/vận chuyển và vị trí mối hàn công trường (`Field Weld`).\n- Kiểm tra các Attribute bắt buộc trước khi xuất ISO: `SPREF`, `SHOP` flag, `SPOOL` name, góc xoay nhánh và hướng dòng chảy.\n- Đối chiếu bảng vật tư (MTO) và Cut List trên bản vẽ ISO với mô hình 3D.',
    null,
    null,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000302',
    '10000000-0000-4000-8000-000000000003',
    'Marine Drafting: Chi tiết ISO, bản vẽ 2D Layout & Sketch',
    E'## Hoàn thiện bản vẽ trong Marine Drafting\n1. **Chi tiết ISO**: sắp xếp kích thước không chồng chéo, ghi chú mối hàn, hướng dốc (`Slope`), độ mở góc bích và chú thích kỹ thuật.\n2. **Bản vẽ 2D Layout**: tạo view mặt bằng/mặt cắt khu vực buồng máy hoặc boong, gắn tag tên thiết bị, Line No. và lỗ xuyên vách.\n3. **Sketch chế tạo**: trích xuất chi tiết các cụm ống phức tạp hoặc giá đỡ đặc biệt phục vụ lắp đặt.',
    null,
    null,
    2
  ),

  -- Module 4: AVEVA khác (internal)
  (
    '20000000-0000-4000-8000-000000000401',
    '10000000-0000-4000-8000-000000000004',
    'Hole Management: Chức năng, Workflow, Tạo & Request Cut-out',
    E'## Quản lý lỗ khoét kết cấu (Hole Management)\n1. Phát hiện vị trí ống xuyên qua tôn/vách/boong (`Penetration`).\n2. Piping tạo **Hole Request** kèm kích thước, khoảng hở lớp bọc (`Insulation allowance`) và kiểu gia cường.\n3. Bộ phận Hull/Structure thẩm định và phê duyệt (`Approve`) hoặc phản hồi điều chỉnh.\n4. Khóa kích thước lỗ khoét để xuất bản vẽ cắt tôn và lắp đặt ống.',
    null,
    null,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000402',
    '10000000-0000-4000-8000-000000000004',
    'Report: MTO, DB Listing, Outfitting Report, Search & Custom Tool',
    E'## Công cụ báo cáo & truy vấn dữ liệu 3D\n- **MTO (Material Take-Off)**: tổng hợp khối lượng ống, co, tê, van, mặt bích, bu-lông, gioăng theo System/Block.\n- **DB Listing**: xuất dữ liệu thuộc tính thô phục vụ kiểm tra chéo.\n- **Outfitting Report Tool**: dùng template chuẩn của xưởng (Line List, Penetration List, Valve List).\n- **Search Tool & Custom Tool**: lọc phần tử thiếu attribute, sai spec hoặc chưa nối đầu/cuối trước khi phát hành.',
    null,
    null,
    2
  ),

  -- Module 5: On job training (internal - thực hành trên Hull 997, 1004, 999, 1000)
  (
    '20000000-0000-4000-8000-000000000501',
    '10000000-0000-4000-8000-000000000005',
    'On Job Training · Dự án Hull 997',
    E'## Thực hành trên Hull 997\n### Nhiệm vụ thực hành\n1. Truy cập cấu trúc thư mục dự án **Hull 997** theo chuẩn VPP3 và nắm phạm vi hệ thống được phân công.\n2. Kiểm tra mô hình Equipment (`EQUI`/`SUBE`/`NOZZLE`) đối chiếu Vendor Drawing của Hull 997.\n3. Thực hành dựng Pipe/Branch cho tuyến ống phụ trợ, chạy Clash Check và điền đầy đủ attribute theo Pipe Checklist.',
    null,
    null,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000502',
    '10000000-0000-4000-8000-000000000005',
    'On Job Training · Dự án Hull 1004',
    E'## Thực hành trên Hull 1004\n### Nhiệm vụ thực hành\n1. Rà soát 3D Layout khu vực được giao trên **Hull 1004**, kiểm tra khoảng hở bảo trì và đường ống xuyên vách theo DSS 12 & DNV.\n2. Tạo Hole Request đúng workflow cho các điểm xuyên tôn/vách trên mô hình.\n3. Chia spool bằng Spooler và tự rà lỗi trước khi gửi Lead kiểm tra.',
    null,
    null,
    2
  ),
  (
    '20000000-0000-4000-8000-000000000503',
    '10000000-0000-4000-8000-000000000005',
    'On Job Training · Dự án Hull 999',
    E'## Thực hành trên Hull 999\n### Nhiệm vụ thực hành\n1. Xuất bản vẽ ISO & chỉnh sửa chi tiết 2D trong Marine Drafting cho phân đoạn trên **Hull 999**.\n2. Sử dụng Search Tool / DB Listing để phát hiện phần tử thiếu `PSPEC`, `SHOP` hoặc lỗi kết nối.\n3. Xuất báo cáo MTO đối chiếu số lượng vật tư giữa bản vẽ 2D và mô hình 3D.',
    null,
    null,
    3
  ),
  (
    '20000000-0000-4000-8000-000000000504',
    '10000000-0000-4000-8000-000000000005',
    'On Job Training · Dự án Hull 1000',
    E'## Thực hành trên Hull 1000\n### Nhiệm vụ tổng hợp cuối khóa\n1. Đảm nhận trọn vẹn quy trình từ kiểm tra Equipment, 3D Pipe/Layout, Hole Management đến xuất 2D Drawing & MTO trên **Hull 1000**.\n2. Hoàn thành 100% hạng mục trong **Pipe Checklist** theo chuẩn CAD, DSS 28, DSS 00 và quy phạm DNV/SOLAS.\n3. Trình bày kết quả và bảo vệ bản vẽ với Lead/Senior để đánh giá đạt yêu cầu OJT.',
    null,
    null,
    4
  )
on conflict (id) do update
set
  module_id = excluded.module_id,
  title = excluded.title,
  content_md = excluded.content_md,
  sort_order = excluded.sort_order;

-- 3. Seed Quiz mẫu (cho bài AVEVA 3D - public, và Kiến thức nền - internal)
insert into public.training_quizzes (id, lesson_id, title, pass_score)
values
  (
    '30000000-0000-4000-8000-000000000201',
    '20000000-0000-4000-8000-000000000201',
    'Quiz: Modeling Equipment trong AVEVA 3D',
    70
  ),
  (
    '30000000-0000-4000-8000-000000000202',
    '20000000-0000-4000-8000-000000000202',
    'Quiz: Pipe Modeling & Clash Check',
    70
  ),
  (
    '30000000-0000-4000-8000-000000000101',
    '20000000-0000-4000-8000-000000000101',
    'Quiz: Kiến thức nền & Bộ tiêu chuẩn DSS',
    70
  )
on conflict (id) do update
set
  lesson_id = excluded.lesson_id,
  title = excluded.title,
  pass_score = excluded.pass_score;

-- 4. Seed Câu hỏi (training_quiz_questions)
insert into public.training_quiz_questions (id, quiz_id, question, options, explanation, sort_order)
values
  -- Public Quiz 201 (AVEVA 3D - Equipment)
  (
    '40000000-0000-4000-8000-000000000211',
    '30000000-0000-4000-8000-000000000201',
    'Trong cấu trúc phân cấp AVEVA Marine Equipment, thứ tự cha - con nào sau đây là đúng?',
    '["EQUI -> ZONE -> SUBE", "ZONE -> EQUI -> SUBE -> Primitives / NOZZLE", "PIPE -> EQUI -> NOZZLE", "SUBE -> EQUI -> ZONE"]'::jsonb,
    'Thiết bị (EQUI) nằm trực tiếp dưới ZONE; bên trong EQUI chứa các Sub-Equipment (SUBE), khối hình học cơ bản (Primitives) và NOZZLE.',
    1
  ),
  (
    '40000000-0000-4000-8000-000000000212',
    '30000000-0000-4000-8000-000000000201',
    'Khi đặt NOZZLE trên thiết bị để Branch ống đấu nối, trục nào của NOZZLE cần hướng ra phía ngoài đường ống?',
    '["Trục X", "Trục Y", "Trục Z (P1 Leave direction)", "Không quan trọng hướng trục"]'::jsonb,
    'Trong AVEVA Marine, hướng trục Z của Nozzle là hướng rời khỏi thiết bị để Head/Tail của Branch bám và đi ống tiếp.',
    2
  ),
  -- Public Quiz 202 (AVEVA 3D - Pipe & Clash Check)
  (
    '40000000-0000-4000-8000-000000000221',
    '30000000-0000-4000-8000-000000000202',
    'Mục đích chính của việc dựng khối Volume mềm (Maintenance/Withdrawal Volume) quanh thiết bị là gì?',
    '["Để tăng dung lượng file mô hình", "Để Clash Check phát hiện sớm nếu đường ống chắn lối tháo lắp bảo trì", "Để tự động sinh mặt bích", "Để thay thế bản vẽ 2D Layout"]'::jsonb,
    'Volume không gian bảo trì giúp đảm bảo ống không đi cắt ngang vùng rút ruột sinh hàn, mở cửa tủ hoặc tháo bơm.',
    1
  ),
  (
    '40000000-0000-4000-8000-000000000222',
    '30000000-0000-4000-8000-000000000202',
    'Attribute nào trên PIPE/BRAN xác định tiêu chuẩn đường ống (Pipe Specification)?',
    '["BORE", "PSPEC", "DESC", "ORI"]'::jsonb,
    'PSPEC gán trực tiếp bộ tiêu chuẩn vật tư đường ống (Pipe Specification) để chọn đúng co, tê, van, mặt bích và ống.',
    2
  ),
  -- Internal Quiz 101 (Kiến thức nền)
  (
    '40000000-0000-4000-8000-000000000111',
    '30000000-0000-4000-8000-000000000101',
    'Tài liệu nào quy định hệ thống đánh mã số nhóm thiết bị và hệ thống tàu (ví dụ nhóm 7xx)?',
    '["DSS 28 (Standard SFI)", "Hole Management Guide", "Spooler User Manual", "MTO Listing"]'::jsonb,
    'DSS 28 (Standard SFI) dùng để phân nhóm mã SFI thống nhất cho các hệ thống thiết bị và đường ống trên tàu.',
    1
  ),
  (
    '40000000-0000-4000-8000-000000000112',
    '30000000-0000-4000-8000-000000000101',
    'Trước khi phát hành bản vẽ ống, kỹ sư cần đối chiếu hạng mục tự kiểm tra ở tài liệu nào?',
    '["Pipe checklist", "DB listing", "Search tool", "Vendor catalogue"]'::jsonb,
    'Pipe checklist liệt kê các bước tự kiểm tra kỹ thuật bắt buộc trước khi gửi Lead/Senior review và phát hành bản vẽ.',
    2
  )
on conflict (id) do update
set
  quiz_id = excluded.quiz_id,
  question = excluded.question,
  options = excluded.options,
  explanation = excluded.explanation,
  sort_order = excluded.sort_order;

-- 5. Seed Đáp án đúng vào bảng riêng training_quiz_answers (index bắt đầu từ 0)
insert into public.training_quiz_answers (question_id, correct_index)
values
  ('40000000-0000-4000-8000-000000000211', 1),
  ('40000000-0000-4000-8000-000000000212', 2),
  ('40000000-0000-4000-8000-000000000221', 1),
  ('40000000-0000-4000-8000-000000000222', 1),
  ('40000000-0000-4000-8000-000000000111', 0),
  ('40000000-0000-4000-8000-000000000112', 0)
on conflict (question_id) do update
set correct_index = excluded.correct_index;
