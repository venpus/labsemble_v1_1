-- 재고 조회 성능 최적화를 위한 인덱스 추가

-- 1. mj_project 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_mj_project_user_id ON mj_project(user_id);
CREATE INDEX IF NOT EXISTS idx_mj_project_name ON mj_project(project_name);
CREATE INDEX IF NOT EXISTS idx_mj_project_created_at ON mj_project(created_at);
CREATE INDEX IF NOT EXISTS idx_mj_project_factory_status ON mj_project(factory_shipping_status);

-- 2. warehouse_entries 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_warehouse_entries_project_id ON warehouse_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_entries_status ON warehouse_entries(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_entries_created_at ON warehouse_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_warehouse_entries_deleted_at ON warehouse_entries(deleted_at);

-- 3. mj_packing_list 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_mj_packing_list_project_id ON mj_packing_list(project_id);
CREATE INDEX IF NOT EXISTS idx_mj_packing_list_created_at ON mj_packing_list(created_at);
CREATE INDEX IF NOT EXISTS idx_mj_packing_list_deleted_at ON mj_packing_list(deleted_at);

-- 4. logistic_payment 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_logistic_payment_packing_list_id ON logistic_payment(mj_packing_list_id);
CREATE INDEX IF NOT EXISTS idx_logistic_payment_is_paid ON logistic_payment(is_paid);

-- 5. 복합 인덱스 (자주 함께 사용되는 컬럼들)
CREATE INDEX IF NOT EXISTS idx_warehouse_entries_project_status ON warehouse_entries(project_id, status);
CREATE INDEX IF NOT EXISTS idx_mj_packing_list_project_deleted ON mj_packing_list(project_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_logistic_payment_packing_paid ON logistic_payment(mj_packing_list_id, is_paid);

-- 6. 재고 조회 최적화를 위한 뷰 생성
CREATE OR REPLACE VIEW v_inventory_summary AS
SELECT 
  p.id as project_id,
  p.project_name,
  p.quantity as total_quantity,
  p.entry_quantity,
  p.export_quantity,
  p.remain_quantity,
  p.factory_shipping_status,
  p.actual_factory_shipping_date,
  p.expected_factory_shipping_date,
  p.user_id,
  p.created_at,
  p.updated_at,
  COALESCE(we_scheduled.total, 0) as scheduled_entry_quantity,
  COALESCE(we_completed.total, 0) as completed_entry_quantity,
  COALESCE(pl_shipping.total, 0) as shipping_quantity,
  COALESCE(pl_delivered.total, 0) as delivered_quantity
FROM mj_project p
LEFT JOIN (
  SELECT project_id, SUM(quantity) as total
  FROM warehouse_entries 
  WHERE status = '입고중' AND deleted_at IS NULL
  GROUP BY project_id
) we_scheduled ON p.id = we_scheduled.project_id
LEFT JOIN (
  SELECT project_id, SUM(quantity) as total
  FROM warehouse_entries 
  WHERE status = '입고완료' AND deleted_at IS NULL
  GROUP BY project_id
) we_completed ON p.id = we_completed.project_id
LEFT JOIN (
  SELECT mpl.project_id, SUM(mpl.box_count * mpl.packaging_count * mpl.packaging_method) as total
  FROM mj_packing_list mpl
  LEFT JOIN logistic_payment lp ON mpl.id = lp.mj_packing_list_id
  WHERE mpl.deleted_at IS NULL 
    AND (lp.id IS NULL OR lp.is_paid = false)
  GROUP BY mpl.project_id
) pl_shipping ON p.id = pl_shipping.project_id
LEFT JOIN (
  SELECT mpl.project_id, SUM(mpl.box_count * mpl.packaging_count * mpl.packaging_method) as total
  FROM mj_packing_list mpl
  JOIN logistic_payment lp ON mpl.id = lp.mj_packing_list_id
  WHERE mpl.deleted_at IS NULL AND lp.is_paid = true
  GROUP BY mpl.project_id
) pl_delivered ON p.id = pl_delivered.project_id
WHERE p.deleted_at IS NULL;
