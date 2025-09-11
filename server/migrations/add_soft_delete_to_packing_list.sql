-- 패킹리스트 테이블에 소프트 삭제 필드 추가
ALTER TABLE mj_packing_list 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP NULL,
ADD COLUMN deleted_by VARCHAR(255) NULL;

-- 인덱스 추가 (삭제되지 않은 레코드 조회 최적화)
CREATE INDEX idx_mj_packing_list_is_deleted ON mj_packing_list(is_deleted);
CREATE INDEX idx_mj_packing_list_deleted_at ON mj_packing_list(deleted_at);

-- 기존 삭제된 레코드가 있다면 복구 (선택사항)
-- UPDATE mj_packing_list SET is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL;

