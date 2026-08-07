-- Demo data for the current local WorkspaceHub account.
-- Safe to run repeatedly: projects with the [DEMO] prefix are skipped.
DO $$
<<demo_data>>
DECLARE
  owner_id UUID := '9d0deeb4-a868-45d9-923e-62feecde6a6e';
  project_id UUID;
  sprint_id UUID;
  parent_id UUID;
  child_id UUID;
  label_id UUID;
  created_at TIMESTAMP := CURRENT_TIMESTAMP;
  project_names TEXT[] := ARRAY[
    '[DEMO] CRM & Chăm sóc khách hàng',
    '[DEMO] Kế hoạch Marketing Sự kiện 2026',
    '[DEMO] WorkspaceHub Mobile App',
    '[DEMO] Nền tảng thương mại điện tử'
  ];
  project_types TEXT[] := ARRAY['GENERAL', 'GENERAL', 'SOFTWARE_DEVELOPMENT', 'SOFTWARE_DEVELOPMENT'];
  project_colors TEXT[] := ARRAY['#2563EB', '#DB2777', '#7C3AED', '#EA580C'];
  parent_titles TEXT[] := ARRAY[
    'Phân tích quy trình khách hàng', 'Chuẩn hóa dữ liệu khách hàng', 'Đào tạo đội ngũ CSKH',
    'Xây dựng thông điệp sự kiện', 'Chuẩn bị kênh truyền thông', 'Tổng kết và đo lường hiệu quả',
    'Thiết kế trải nghiệm người dùng', 'Xây dựng ứng dụng di động', 'Kiểm thử và phát hành phiên bản đầu tiên',
    'Phân tích nghiệp vụ bán hàng', 'Xây dựng catalog sản phẩm', 'Thanh toán và vận hành đơn hàng'
  ];
  subtask_a TEXT[] := ARRAY[
    'Thu thập yêu cầu từ bộ phận kinh doanh', 'Dọn dữ liệu khách hàng trùng lặp', 'Soạn tài liệu hướng dẫn CSKH',
    'Phỏng vấn khách hàng mục tiêu', 'Lập lịch nội dung theo tuần', 'Tổng hợp số liệu từ các kênh',
    'Vẽ user flow và wireframe', 'Khởi tạo cấu trúc ứng dụng', 'Lập test plan cho bản beta',
    'Vẽ quy trình đặt hàng', 'Nhập dữ liệu sản phẩm mẫu', 'Thiết kế trạng thái đơn hàng'
  ];
  subtask_b TEXT[] := ARRAY[
    'Vẽ customer journey map', 'Thiết kế bộ trường dữ liệu chuẩn', 'Tổ chức workshop nội bộ',
    'Chốt key visual và slogan', 'Thiết lập lịch đăng bài', 'Viết báo cáo retrospective',
    'Review thiết kế với stakeholder', 'Tích hợp màn hình đăng nhập', 'Chuẩn bị checklist release',
    'Xác định rule tính phí vận chuyển', 'Kiểm tra bộ lọc và tìm kiếm', 'Tích hợp cổng thanh toán thử nghiệm'
  ];
  parent_index INT;
  subtask_index INT;
  task_index INT;
  item_index INT;
BEGIN
  FOR item_index IN 1..4 LOOP
    SELECT id INTO project_id FROM projects WHERE name = project_names[item_index] LIMIT 1;
    IF project_id IS NOT NULL THEN
      CONTINUE;
    END IF;

    project_id := gen_random_uuid();
    INSERT INTO projects (id, name, description, color, icon, owner_id, status, project_type, visibility, archived, created_at, updated_at, version)
    VALUES (
      project_id,
      project_names[item_index],
      'Project demo đầy đủ task, subtask, checklist để preview luồng quản lý công việc.',
      project_colors[item_index],
      CASE WHEN project_types[item_index] = 'SOFTWARE_DEVELOPMENT' THEN '🚀' ELSE '📌' END,
      owner_id, 'ACTIVE', project_types[item_index], 'MEMBERS_ONLY', FALSE, created_at, created_at, 0
    );

    INSERT INTO project_settings (id, project_id, allow_member_create_task, allow_member_edit_others_task, allow_member_edit_own_task, allow_member_invite)
    VALUES (gen_random_uuid(), project_id, TRUE, TRUE, TRUE, TRUE);

    INSERT INTO project_members (id, project_id, user_id, role, status, joined_at, updated_at, version)
    VALUES (gen_random_uuid(), project_id, owner_id, 'OWNER', 'ACTIVE', created_at, created_at, 0);

    INSERT INTO task_labels (id, project_id, name, color)
    VALUES (gen_random_uuid(), project_id, 'Ưu tiên', '#DC2626'),
           (gen_random_uuid(), project_id, 'Đang làm', '#2563EB'),
           (gen_random_uuid(), project_id, 'Cần review', '#D97706');

    sprint_id := NULL;
    IF project_types[item_index] = 'SOFTWARE_DEVELOPMENT' THEN
      sprint_id := gen_random_uuid();
      INSERT INTO project_sprints (id, project_id, name, goal, status, start_date, end_date, created_by, created_at, updated_at, version)
      VALUES (sprint_id, project_id, 'Sprint 01 - Nền tảng', 'Hoàn thiện luồng nền tảng đầu tiên để review nội bộ.', 'PLANNED', CURRENT_DATE, CURRENT_DATE + 13, owner_id, created_at, created_at, 0);
    END IF;

    FOR parent_index IN 1..3 LOOP
      task_index := (item_index - 1) * 3 + parent_index;
      parent_id := gen_random_uuid();
      INSERT INTO tasks (id, project_id, parent_task_id, title, description, priority, status, created_by, reporter_id, start_date, due_date, all_day, completed_at, estimated_minutes, rank, archived, is_parent_task, auto_complete_sprint, sprint_id, created_at, updated_at, version)
      VALUES (
        parent_id, project_id, NULL, parent_titles[task_index],
        'Task lớn cần được theo dõi bằng các subtask và checklist.',
        CASE WHEN parent_index = 1 THEN 'HIGH' WHEN parent_index = 2 THEN 'MEDIUM' ELSE 'LOW' END,
        CASE WHEN parent_index = 1 THEN 'IN_PROGRESS' WHEN parent_index = 2 THEN 'TODO' ELSE 'IN_REVIEW' END,
        owner_id, owner_id, CURRENT_DATE + parent_index - 1, CURRENT_DATE + parent_index + 6, FALSE, NULL,
        240, LPAD(parent_index::TEXT, 3, '0'), FALSE, TRUE, FALSE,
        CASE WHEN parent_index = 1 THEN sprint_id ELSE NULL END, created_at, created_at, 0
      );

      SELECT tl.id INTO label_id FROM task_labels AS tl WHERE tl.project_id = demo_data.project_id ORDER BY tl.name LIMIT 1;
      INSERT INTO task_label_mappings (id, task_id, label_id, project_id)
      VALUES (gen_random_uuid(), parent_id, label_id, project_id);
      INSERT INTO task_assignees (id, task_id, project_id, user_id, assigned_at)
      VALUES (gen_random_uuid(), parent_id, project_id, owner_id, created_at);

      INSERT INTO task_checklists (id, task_id, title, completed, completed_by, created_at, rank)
      VALUES (gen_random_uuid(), parent_id, 'Xác định mục tiêu và phạm vi', parent_index = 3, CASE WHEN parent_index = 3 THEN owner_id ELSE NULL END, created_at, '001'),
             (gen_random_uuid(), parent_id, 'Review kết quả với stakeholder', FALSE, NULL, created_at, '002');

      FOR subtask_index IN 1..2 LOOP
        child_id := gen_random_uuid();
        INSERT INTO tasks (id, project_id, parent_task_id, title, description, priority, status, created_by, reporter_id, start_date, due_date, all_day, completed_at, estimated_minutes, rank, archived, is_parent_task, auto_complete_sprint, sprint_id, created_at, updated_at, version)
        VALUES (
          child_id, project_id, parent_id,
          CASE WHEN subtask_index = 1 THEN subtask_a[task_index] ELSE subtask_b[task_index] END,
          'Subtask thuộc task lớn, có checklist riêng để theo dõi tiến độ.',
          CASE WHEN subtask_index = 1 THEN 'MEDIUM' ELSE 'LOW' END,
          CASE WHEN subtask_index = 1 THEN 'TODO' ELSE 'IN_PROGRESS' END,
          owner_id, owner_id, CURRENT_DATE + parent_index - 1, CURRENT_DATE + parent_index + 4, FALSE, NULL,
          90, LPAD((parent_index * 10 + subtask_index)::TEXT, 3, '0'), FALSE, FALSE, FALSE,
          CASE WHEN parent_index = 1 THEN sprint_id ELSE NULL END, created_at, created_at, 0
        );

        INSERT INTO task_assignees (id, task_id, project_id, user_id, assigned_at)
        VALUES (gen_random_uuid(), child_id, project_id, owner_id, created_at);
        INSERT INTO task_checklists (id, task_id, title, completed, completed_by, created_at, rank)
        VALUES (gen_random_uuid(), child_id, 'Hoàn thành phần chuẩn bị', FALSE, NULL, created_at, '001'),
               (gen_random_uuid(), child_id, 'Đính kèm kết quả và cập nhật trạng thái', FALSE, NULL, created_at, '002');
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
