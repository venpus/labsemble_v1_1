-- logistic_payment 테이블에 box_no 필드 추가
-- box_no: 박스 번호 (숫자 형식)

-- box_no 컬럼 추가
ALTER TABLE logistic_payment 
ADD COLUMN box_no INT NOT NULL DEFAULT 1 COMMENT '박스 번호 (1부터 시작)';

-- box_no에 대한 인덱스 추가 (성능 향상)
CREATE INDEX idx_box_no ON logistic_payment(box_no);

-- packing_code와 box_no의 복합 인덱스 추가 (박스별 조회 성능 향상)
CREATE INDEX idx_packing_code_box_no ON logistic_payment(packing_code, box_no);

-- mj_packing_list_id와 box_no의 복합 인덱스 추가
CREATE INDEX idx_list_id_box_no ON logistic_payment(mj_packing_list_id, box_no);

-- 기존 데이터의 box_no를 1로 설정 (기본값)
UPDATE logistic_payment SET box_no = 1 WHERE box_no IS NULL;

-- box_no를 NOT NULL로 변경 (기본값 설정 후)
ALTER TABLE logistic_payment 
MODIFY COLUMN box_no INT NOT NULL COMMENT '박스 번호 (1부터 시작)';

-- 테이블 구조 확인
DESCRIBE logistic_payment; 