-- ============================================================================
-- 003_training_seed.sql
-- Piping Academy (Trainning App) - Seed 5 Module ban đầu, bài học & quiz mẫu
--
-- Lưu ý bảo mật:
-- - Module "Equipment Modeling" (is_public = true) chỉ chứa nội dung tự biên
--   soạn về thao tác AVEVA Marine Equipment chung, TUYỆT ĐỐI KHÔNG chứa tài
--   liệu DSS, DNV hay tiêu chuẩn nội bộ của xưởng.
-- - Dùng UUID cố định + ON CONFLICT DO NOTHING để chạy lại an toàn (idempotent).
-- ============================================================================

-- 1. Seed 5 Module ban đầu
insert into public.training_modules (id, title, description, sort_order, is_public)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Kiến thức nền',
    'Cấu trúc thư mục dự án, VPP3, DSS 28 Standard SFI, CAD/Pipe standard & guideline, DSS 12 Yard Technological, Pipe checklist, DSS 00 EN Handbook, DNV Rules/Class notation và SOLAS.',
    1,
    false
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Equipment Modeling',
    'Module công khai (Public): hướng dẫn tự biên soạn về tạo, sửa, quản lý sub-equipment, kiểm tra kích thước bao và các attribute quan trọng trong AVEVA Marine.',
    2,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Pipe Modeling',
    'Tạo, chỉnh sửa và quản lý hệ thống Pipe - Branch, nguyên tắc routing, kiểm tra clash (Clash Check) và các attribute quan trọng trên tuyến ống.',
    3,
    false
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    '2D Drawing',
    'Sử dụng Spooler xuất bản vẽ ISO kèm attribute chuẩn, và Marine Drafting để hoàn thiện chi tiết ISO, bản vẽ 2D layout và sketch chế tạo.',
    4,
    false
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'Hole & Report',
    'Quản lý lỗ khoét kết cấu (Hole Management: chức năng, workflow, tạo & request cut-out) và công cụ xuất báo cáo (MTO, DB listing, Outfitting Report, search & custom tool).',
    5,
    false
  )
on conflict (id) do nothing;

-- 2. Seed bài học mẫu cho từng Module
insert into public.training_lessons (id, module_id, title, content_md, video_url, slides_url, sort_order)
values
  -- Module 1: Kiến thức nền (internal)
  (
    '20000000-0000-4000-8000-000000000101',
    '10000000-0000-4000-8000-000000000001',
    'Tổng quan cấu trúc thư mục, VPP3 & hệ thống tiêu chuẩn DSS',
    E'## Mục tiêu bài học\nNắm được cây thư mục làm việc chuẩn của phòng Piping, quy trình VPP3 và cách tra cứu bộ tài liệu tiêu chuẩn xưởng.\n\n### Nội dung trọng tâm\n- **Cấu trúc thư mục dự án & VPP3**: vị trí lưu bản vẽ 2D, ISO, MTO, file check và quy ước đặt tên theo Hull/Block.\n- **DSS 28 Standard SFI**: mã hóa nhóm thiết bị và hệ thống tàu theo chuẩn SFI (ví dụ nhóm 7xx - Ship Systems / Piping).\n- **CAD Standard, Pipe Standard & Pipe Guideline**: quy chuẩn layer, line type, text height, pipe spec, khoảng hở lắp đặt và giá đỡ.\n- **DSS 12 Yard Technological & Pipe Checklist**: yêu cầu công nghệ đóng tàu tại xưởng và danh mục tự kiểm tra trước khi phát hành bản vẽ.\n- **DSS 00 EN Handbook**: sổ tay kỹ thuật tổng hợp cho kỹ sư mới.\n\n> Lưu ý: Tải các file tiêu chuẩn gốc tại mục **Thư viện tài liệu** (yêu cầu đăng nhập tài khoản nội bộ).',
    null,
    null,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000102',
    '10000000-0000-4000-8000-000000000001',
    'Quy phạm DNV (Rules, Guideline, Class Notation) & SOLAS cho hệ thống ống',
    E'## Mục tiêu bài học\nHiểu cách áp dụng quy phạm đăng kiểm DNV và công ước SOLAS vào thiết kế hệ thống đường ống tàu thủy và công trình ngoài khơi.\n\n### Các điểm kiểm tra bắt buộc\n1. **DNV Rules & Class Notation**: phân biệt cấp tàu (Class I, II, III cho đường ống), áp suất/nhiệt độ thiết kế và yêu cầu thử áp lực.\n2. **DNV Guideline**: hướng dẫn bố trí ống xuyên vách kín nước, van cách ly thân tàu (shell valves) và thông hơi/đo sâu két.\n3. **SOLAS (An toàn sinh mạng trên biển)**:\n   - Hệ thống cứu hỏa (Fire main, CO2/Water mist), khoảng cách họng cứu hỏa.\n   - Bảo vệ đường ống nhiên liệu gần bề mặt nóng trong buồng máy (double-walled piping / shielding).\n   - Ngăn cháy lan khi ống đi qua vách chống cháy cấp A/B.',
    null,
    null,
    2
  ),

  -- Module 2: Equipment Modeling (PUBLIC - tự biên soạn, không tài liệu nội bộ)
  (
    '20000000-0000-4000-8000-000000000201',
    '10000000-0000-4000-8000-000000000002',
    'Tạo, chỉnh sửa và quản lý Sub-Equipment trong AVEVA Marine',
    E'## Giới thiệu\nTrong môi trường 3D AVEVA Marine (Outfitting / Equipment), mỗi thiết bị chính (`EQUI`) được tổ chức dưới `ZONE` theo cấu trúc phân cấp rõ ràng để phục vụ đấu nối ống và kiểm tra không gian.\n\n### Cấu trúc phân cấp cơ bản\n- `ZONE` → `EQUI` (Equipment) → `SUBE` (Sub-Equipment) / Primitives (`CYLINDER`, `BOX`, `NOZZLE`...)\n\n### Thao tác chính\n1. **Tạo mới Equipment & Sub-Equipment**:\n   - Chọn đúng `ZONE` đích trên Design Explorer.\n   - Tạo `EQUI` với tên quy chuẩn (ví dụ mã tag thiết bị).\n   - Tách thành các `SUBE` cho từng cụm (thân bơm, động cơ, đế bệ, tủ điều khiển) để dễ ẩn/hiện và quản lý thay đổi.\n2. **Đặt `NOZZLE` (đầu nối ống)**:\n   - Xác định đúng tọa độ tâm bích, hướng (`Orientation`) trục Z hướng ra ngoài ống.\n   - Gán `CATREF` đúng chuẩn kích thước danh nghĩa (DN) và cấp áp lực (PN/Class) để Branch kết nối khớp hoàn toàn.\n3. **Chỉnh sửa & di chuyển**:\n   - Luôn kiểm tra gốc tọa độ (`Origin`) và dùng lệnh `Position` / `Move` chính xác theo Frame, Longitudinal và Elevation thay vì kéo tay tự do.',
    null,
    null,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000202',
    '10000000-0000-4000-8000-000000000002',
    'Kiểm tra kích thước bao và các Attribute quan trọng của Equipment',
    E'## Kiểm tra kích thước (Dimensional Check)\nTrước khi khóa mô hình thiết bị để đi ống, kỹ sư cần đối chiếu mô hình 3D với Vendor Drawing:\n\n- **Kích thước tổng thể**: dài × rộng × cao, khoảng hở tháo lắp bảo trì (maintenance clearance / withdrawal space).\n- **Tọa độ tâm bích & bu-lông neo**: kiểm tra cao độ (`Z`) từ sàn/bệ máy, khoảng cách từ tâm thiết bị đến mặt bích hút/xả.\n- **Không gian cản (Obstruction / Volume)**: dùng volume mềm đại diện cho cửa mở tủ điện, hành trình rút ruột sinh hàn để Clash Check phát hiện sớm.\n\n### Các Attribute quan trọng cần kiểm tra\n| Attribute | Ý nghĩa | Lưu ý |\n|---|---|---|\n| `NAME` | Tên định danh duy nhất | Không trùng lặp trong cùng Database |\n| `DESC` | Mô tả tên thiết bị | Ghi rõ công năng để hiển thị trên báo cáo |\n| `POS` | Tọa độ vị trí gốc `EQUI` | Khớp bản vẽ bố trí máy (Machinery Arrangement) |\n| `ORI` | Hướng xoay thiết bị | Tránh xoay lệch góc lẻ gây khó xuất 2D |\n| `BUIL` / `SHOP` | Trạng thái chế tạo / lắp đặt | Phân biệt hạng mục xưởng đóng hay nhà cung cấp |\n| `CATREF` (trên Nozzle) | Tham chiếu catalog mặt bích | Bắt buộc đúng tiêu chuẩn nối ống |',
    null,
    null,
    2
  ),

  -- Module 3: Pipe Modeling (internal)
  (
    '20000000-0000-4000-8000-000000000301',
    '10000000-0000-4000-8000-000000000003',
    'Tạo Pipe - Branch, đấu nối & quản lý thứ tự Component',
    E'## Quy trình dựng mô hình Pipe & Branch\n1. Tạo đối tượng `PIPE` trong `ZONE` phù hợp và gán `PSPEC` (Pipe Specification) chính xác theo môi chất.\n2. Tạo `BRAN` (Branch), thiết lập `HREF` (Head Reference) và `TREF` (Tail Reference) nối tới Nozzle hoặc Tee.\n3. Kiểm tra hướng dòng chảy và thứ tự các thành phần (`FLAN`, `GASK`, `ELBO`, `VALV`, `TEE`, `REDU`) từ Head → Tail.\n4. Sử dụng `Arrive` / `Leave` hợp lý để tránh gãy trục hoặc hở mối nối (Implied Tube bị lỗi).',
    null,
    null,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000302',
    '10000000-0000-4000-8000-000000000003',
    'Clash Check và các Attribute quan trọng trên Pipe / Branch',
    E'## Clash Check (Kiểm tra va chạm)\n- Chạy Clash Check theo Block hoặc System sau mỗi lần chỉnh sửa routing.\n- Phân loại mức độ: **Hard Clash** (va chạm vật lý ống–kết cấu–thiết bị), **Touch** (chạm tiếp xúc), **Clearance** (vi phạm khoảng hở bảo ôn hoặc tháo lắp).\n\n### Attribute quan trọng\n- `PSPEC` / `ISPEC` / `TSPEC`: Spec đường ống, bọc cách nhiệt (Insulation), gia nhiệt (Tracing).\n- `BORE`: Đường kính danh nghĩa tại Head/Tail.\n- `HCONN` / `TCONN`, `HSTU` / `LSTU`: Kiểu kết nối đầu/cuối và tube mặc định.\n- `TEMP`, `PRESS`: Nhiệt độ và áp suất làm việc phục vụ xuất Line List & tính toán.',
    null,
    null,
    2
  ),

  -- Module 4: 2D Drawing (internal)
  (
    '20000000-0000-4000-8000-000000000401',
    '10000000-0000-4000-8000-000000000004',
    'Spooler: Xuất bản vẽ ISO & các Attribute quan trọng',
    E'## Quy trình làm việc với Spooler\n- Chia Spool hợp lý theo năng lực gia công workshop, giới hạn kích thước khung mạ kẽm / vận chuyển và vị trí mối hàn công trường (`Field Weld`).\n- Kiểm tra các Attribute bắt buộc trước khi xuất ISO: `SPREF`, `SHOP` flag (phân biệt gia công xưởng hay lắp trên tàu), `SPOOL` name, góc xoay nhánh và hướng dòng chảy.\n- Đảm bảo bảng vật tư (MTO) và Cut List trên tờ ISO khớp với model 3D.',
    null,
    null,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000402',
    '10000000-0000-4000-8000-000000000004',
    'Marine Drafting: Hoàn thiện chi tiết ISO, 2D Layout và Sketch',
    E'## Hoàn thiện bản vẽ trong Marine Drafting\n1. **Chi tiết ISO**: sắp xếp kích thước không chồng chéo, ghi chú mối hàn, hướng dốc ống (`Slope`), độ mở góc bích và chú thích đặc biệt.\n2. **Bản vẽ 2D Layout**: tạo View cắt theo mặt bằng/mặt đứng khu vực buồng máy hoặc boong, gắn tag tên thiết bị, Line No., xuyên vách.\n3. **Sketch chế tạo**: trích xuất chi tiết các cụm ống phức tạp hoặc bệ đỡ đặc biệt gửi xuống xưởng.',
    null,
    null,
    2
  ),

  -- Module 5: Hole & Report (internal)
  (
    '20000000-0000-4000-8000-000000000501',
    '10000000-0000-4000-8000-000000000005',
    'Hole Management: Chức năng, Workflow, Tạo & Request Cut-out',
    E'## Quản lý lỗ khoét kết cấu (Hole Management)\n### Chức năng & Workflow\n1. Phát hiện vị trí ống hoặc máng xuyên qua tôn/vách/boong (`Penetration`).\n2. Piping tạo **Hole Request** kèm kích thước, khoảng hở lớp bọc (`Insulation allowance`) và kiểu gia cường.\n3. Bộ phận Hull/Structure thẩm định, phê duyệt (`Approve`) hoặc phản hồi điều chỉnh nếu vi phạm dầm/sườn chính.\n4. Sau khi duyệt, lỗ khoét được khóa kích thước để xuất bản vẽ cắt tôn và bản vẽ lắp đặt ống.',
    null,
    null,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000502',
    '10000000-0000-4000-8000-000000000005',
    'Report: MTO, DB Listing, Outfitting Report Tool, Search & Custom Tool',
    E'## Công cụ báo cáo và truy vấn dữ liệu 3D\n- **MTO (Material Take-Off)**: tổng hợp khối lượng ống, co, tê, van, mặt bích, bu-lông, gioăng theo System/Block để đặt hàng.\n- **DB Listing**: xuất dữ liệu thô thuộc tính từ database phục vụ đối chiếu nhanh.\n- **Outfitting Report Tool**: sử dụng các template báo cáo chuẩn của xưởng (Line List, Penetration List, Valve List).\n- **Search Tool & Custom Tool**: viết biểu thức lọc tìm phần tử thiếu attribute, sai spec hoặc chưa kết nối để QA/QC trước khi phát hành.',
    null,
    null,
    2
  )
on conflict (id) do nothing;

-- 3. Seed Quiz mẫu (cho bài Equipment Modeling - public, và Kiến thức nền - internal)
insert into public.training_quizzes (id, lesson_id, title, pass_score)
values
  (
    '30000000-0000-4000-8000-000000000201',
    '20000000-0000-4000-8000-000000000201',
    'Quiz: Tạo & quản lý Equipment / Sub-Equipment',
    70
  ),
  (
    '30000000-0000-4000-8000-000000000202',
    '20000000-0000-4000-8000-000000000202',
    'Quiz: Kiểm tra kích thước & Attribute Equipment',
    70
  ),
  (
    '30000000-0000-4000-8000-000000000101',
    '20000000-0000-4000-8000-000000000101',
    'Quiz: Kiến thức nền & Tiêu chuẩn Piping',
    70
  )
on conflict (id) do nothing;

-- 4. Seed Câu hỏi (training_quiz_questions)
insert into public.training_quiz_questions (id, quiz_id, question, options, explanation, sort_order)
values
  -- Public Quiz 201
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
  -- Public Quiz 202
  (
    '40000000-0000-4000-8000-000000000221',
    '30000000-0000-4000-8000-000000000202',
    'Mục đích chính của việc dựng khối Volume mềm (Maintenance/Withdrawal Volume) quanh thiết bị là gì?',
    '["Để tăng dung lượng file mô hình", "Để Clash Check phát hiện sớm nếu đường ống chắn lối tháo lắp bảo trì", "Để tự động sinh mặt bích", "Để thay thế bản vẽ 2D Layout"]'::jsonb,
    'Volume không gian bảo trì giúp đảm bảo ống và máng cáp không đi cắt ngang vùng rút ruột sinh hàn, mở cửa tủ hoặc tháo bơm.',
    1
  ),
  (
    '40000000-0000-4000-8000-000000000222',
    '30000000-0000-4000-8000-000000000202',
    'Attribute nào trên NOZZLE quyết định loại mặt bích, tiêu chuẩn DN và cấp áp lực để Branch kết nối khớp?',
    '["DESC", "CATREF", "SHOP", "ORI"]'::jsonb,
    'CATREF tham chiếu trực tiếp đến Catalog Component của Nozzle, quy định kích thước danh nghĩa (Bore) và kiểu mặt bích kết nối.',
    2
  ),
  -- Internal Quiz 101
  (
    '40000000-0000-4000-8000-000000000111',
    '30000000-0000-4000-8000-000000000101',
    'Tài liệu nào quy định hệ thống đánh mã số nhóm thiết bị và hệ thống tàu (ví dụ nhóm 7xx)?',
    '["DSS 28 Standard SFI", "Hole Management Guide", "Spooler User Manual", "MTO Listing"]'::jsonb,
    'DSS 28 Standard SFI dùng để phân nhóm mã SFI thống nhất cho các hệ thống thiết bị và đường ống trên tàu.',
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
on conflict (id) do nothing;

-- 5. Seed Đáp án đúng vào bảng riêng training_quiz_answers (index bắt đầu từ 0)
insert into public.training_quiz_answers (question_id, correct_index)
values
  ('40000000-0000-4000-8000-000000000211', 1),
  ('40000000-0000-4000-8000-000000000212', 2),
  ('40000000-0000-4000-8000-000000000221', 1),
  ('40000000-0000-4000-8000-000000000222', 1),
  ('40000000-0000-4000-8000-000000000111', 0),
  ('40000000-0000-4000-8000-000000000112', 0)
on conflict (question_id) do nothing;
