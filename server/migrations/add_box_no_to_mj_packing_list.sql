-- mj_packing_list 테이블에 box_no 필드 추가
ALTER TABLE mj_packing_list 
ADD COLUMN box_no INT(11) DEFAULT 1 AFTER packing_code;

-- box_no에 인덱스 추가
ALTER TABLE mj_packing_list 
ADD INDEX idx_mj_packing_list_box_no (box_no);

-- packing_code + box_no + pl_date 조합 인덱스 추가 (유니크 제약조건용)
ALTER TABLE mj_packing_list 
ADD INDEX idx_mj_packing_list_unique (packing_code, box_no, pl_date);
