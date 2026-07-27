-- competition_rate 자릿수 확장: DECIMAL(5,2) -> DECIMAL(10,2)
--
-- 배경
--   DECIMAL(5,2)의 상한은 999.99다. 신청자수가 1000명을 넘는 매물이 나오면
--   competition_rate 계산 결과가 이 범위를 벗어나 upsert가 통째로 실패한다.
--     ERROR 22003: numeric field overflow
--     A field with precision 5, scale 2 must round to an absolute value less than 10^3.
--
--   이미 저장된 행도 갱신이 막혀 마지막 성공값(999)에 얼어붙는다. 경쟁률이 가장
--   높은 매물부터 조용히 멈추기 때문에 눈에 잘 띄지 않는다.
--
-- 실행 방법
--   Supabase 대시보드 > SQL Editor 에 붙여넣고 실행.
--
-- 참고
--   competition_rate는 GENERATED 컬럼이라 타입 변경 대신 재생성한다.
--   컬럼을 지우면 인덱스도 함께 사라지므로 다시 만든다.
--   트랜잭션으로 묶여 있어 다른 세션에는 컬럼이 사라진 중간 상태가 보이지 않는다.

BEGIN;

ALTER TABLE properties DROP COLUMN competition_rate;

ALTER TABLE properties ADD COLUMN competition_rate DECIMAL(10,2) GENERATED ALWAYS AS (
  CASE WHEN recruitment_count > 0
  THEN applicant_count::DECIMAL / recruitment_count
  ELSE 0 END
) STORED;

CREATE INDEX IF NOT EXISTS idx_properties_competition_rate ON properties(competition_rate);

COMMIT;
