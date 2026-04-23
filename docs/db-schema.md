# DB 스키마 명세

> 백엔드 개발자 참고용. 프로토타입 기반으로 초안 작성, 협의 후 확정.

---

## users (투자자)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | 사용자 고유 ID |
| name | VARCHAR(50) | 이름 |
| email | VARCHAR(100) UNIQUE | 이메일 |
| phone | VARCHAR(20) | 전화번호 |
| region | VARCHAR(100) | 거주지역 |
| is_local_resident | BOOLEAN | 지역주민 여부 |
| kyc_status | ENUM('pending','approved','rejected') | KYC 인증 상태 |
| created_at | TIMESTAMP | 가입일 |

---

## products (투자 상품)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | 상품 고유 ID |
| title | VARCHAR(200) | 상품명 |
| region | VARCHAR(100) | 사업 지역 |
| energy_type | ENUM('solar','wind','other') | 에너지 유형 |
| target_amount | BIGINT | 목표 모집금액 (원) |
| current_amount | BIGINT | 현재 모집금액 (원) |
| interest_rate | DECIMAL(5,4) | 연 이자율 |
| period_months | INT | 투자 기간 (개월) |
| min_investment | INT | 최소 투자금액 (원) |
| funding_start | DATE | 모집 시작일 |
| funding_end | DATE | 모집 마감일 |
| status | ENUM('draft','funding','closed','repaying','completed') | 상태 |
| created_at | TIMESTAMP | 등록일 |

---

## investments (투자 내역)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | 투자 고유 ID |
| user_id | UUID FK → users.id | 투자자 |
| product_id | UUID FK → products.id | 투자 상품 |
| amount | BIGINT | 투자금액 (원) |
| status | ENUM('pending','confirmed','repaying','completed','canceled') | 상태 |
| invested_at | TIMESTAMP | 투자일시 |

---

## repayments (상환 내역)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | 상환 고유 ID |
| investment_id | UUID FK → investments.id | 투자 내역 |
| principal | BIGINT | 원금 상환액 |
| interest | BIGINT | 이자 상환액 |
| repaid_at | DATE | 상환일 |
| status | ENUM('scheduled','completed','delayed') | 상환 상태 |

---

_최초 작성: 2026-04-23 / 작성자: 준석_
