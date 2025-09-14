-- mj_packing_list 테이블에 도착 관련 필드 추가
-- is_arrived: 도착 여부 (boolean)
-- arrived_date: 도착 날짜 (date)

-- is_arrived 필드 추가 (기본값: false)
ALTER TABLE mj_packing_list 
ADD COLUMN is_arrived BOOLEAN DEFAULT FALSE COMMENT '도착 여부';

-- arrived_date 필드 추가 (기본값: NULL)
ALTER TABLE mj_packing_list 
ADD COLUMN arrived_date DATE DEFAULT NULL COMMENT '도착 날짜';

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_mj_packing_list_is_arrived ON mj_packing_list(is_arrived);
CREATE INDEX IF NOT EXISTS idx_mj_packing_list_arrived_date ON mj_packing_list(arrived_date);

-- 복합 인덱스 추가 (도착 상태와 날짜 조합 조회용)
CREATE INDEX IF NOT EXISTS idx_mj_packing_list_arrival_status ON mj_packing_list(is_arrived, arrived_date);
