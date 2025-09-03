-- logistic_payment 테이블에 pl_date 필드 추가
-- 이 필드는 mj_packing_list의 pl_date를 참조합니다.

ALTER TABLE logistic_payment 
ADD COLUMN pl_date DATE AFTER mj_packing_list_id;

-- 기존 데이터의 pl_date를 mj_packing_list에서 가져와서 업데이트
UPDATE logistic_payment lp
JOIN mj_packing_list mpl ON lp.mj_packing_list_id = mpl.id
SET lp.pl_date = mpl.pl_date
WHERE lp.pl_date IS NULL;

-- pl_date에 인덱스 추가 (날짜별 조회 성능 향상)
CREATE INDEX idx_logistic_payment_pl_date ON logistic_payment(pl_date);

-- pl_date를 NOT NULL로 설정 (데이터 무결성 보장)
ALTER TABLE logistic_payment 
MODIFY COLUMN pl_date DATE NOT NULL; 