# DB 스키마

> 백엔드 개발자 참고용. **로컬에너지 플랫폼 (에너지히어로) 파일럿 1호 · 곡성군**.
> 프로토타입(`src.html` + `app.js` + `api.js`)에 등장하는 화면 요소를 기준으로 역설계한 초안입니다.
> 협의 후 확정.

---

## 네이밍 규칙

- 모든 테이블: `snake_case`, 복수형 (`users`, `coop_members`)
- PK: `id` — UUID v4 (BIGSERIAL 대신)
- FK: `<테이블단수>_id` (`user_id`, `coop_id`)
- 시간: `created_at`, `updated_at` — `TIMESTAMPTZ`, 서버 UTC 저장
- 금액: `BIGINT` (단위 "원"). 비율은 `DECIMAL(5,4)` (0.0920 = 9.20%)
- enum 은 PostgreSQL ENUM 타입 또는 VARCHAR + CHECK 제약

---

## 1. 사용자 · 인증

### `users`
앱에 로그인한 사용자. 카카오/PASS 3단계 인증(카카오 로그인 → PASS 본인확인 → 거주지 증빙)을 거친다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `kakao_id` | VARCHAR(100) UNIQUE | 카카오 OAuth sub (마스킹 저장) |
| `name` | VARCHAR(50) | 본인확인 결과명 |
| `birth_year` | SMALLINT | 본인확인 결과 (명부에서 연령대 표기) |
| `phone_hash` | VARCHAR(64) | SHA-256 해시 (본인확인 재조회용) |
| `phone_masked` | VARCHAR(20) | UI 표기용 `010-****-8721` |
| `email` | VARCHAR(100) NULL | 선택 |
| `residence_region_code` | VARCHAR(32) FK → `regions.code` | 곡성군 등 |
| `residence_emd_code` | VARCHAR(32) FK → `emds.code` NULL | 곡성군 삼기면 등 |
| `residence_verified_at` | TIMESTAMPTZ NULL | 거주지 증빙 완료 시각 |
| `pass_verified_at` | TIMESTAMPTZ NULL | PASS 본인확인 시각 |
| `kakao_verified_at` | TIMESTAMPTZ NULL | 카카오 로그인 시각 |
| `created_at` | TIMESTAMPTZ DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | |

- idx: `(residence_region_code, residence_emd_code)`
- CHECK: 거주지증빙 완료되지 않은 user 는 `resident` role 부여 금지

### `user_roles`
M:N (한 user 가 resident/member/admin 복수 보유 가능).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `user_id` | UUID FK → `users.id` | |
| `role` | ENUM('resident','member','admin') | |
| `scope_region_code` | VARCHAR(32) NULL | admin 은 지역 스코프 필수 (곡성군청 등) |
| `granted_at` | TIMESTAMPTZ | |
| `granted_by` | UUID NULL | |

- PK: `(user_id, role, scope_region_code)`

---

## 2. 지역 · 공간 데이터

### `regions`
시군 단위. 파일럿은 곡성군 1곳, 향후 다지역 확장.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `code` | VARCHAR(32) PK | `gokseong`, `younggwang`, `shinan`, `jeongseon` |
| `name` | VARCHAR(50) | `곡성군` |
| `prov` | VARCHAR(50) | `전라남도` |
| `tag` | VARCHAR(100) | `장미·기차의 고장 ⭐` (드롭다운 부제) |
| `is_pilot` | BOOLEAN | 파일럿 지역 플래그 |
| `pilot_sequence` | SMALLINT NULL | `1` (파일럿 1호) |
| `created_at` | TIMESTAMPTZ | |

### `emds`
법정면 (읍·면·동). 지도 대시보드의 기본 단위.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `code` | VARCHAR(32) PK | `gokseong-eup`, `godal`, `okgwa`, … |
| `region_code` | VARCHAR(32) FK → `regions.code` | |
| `name` | VARCHAR(50) | `곡성읍`, `고달면` |
| `sgg` | VARCHAR(50) | 시군구 표기 |
| `center_lat` | DECIMAL(9,6) | 지도 라벨 위치 |
| `center_lng` | DECIMAL(9,6) | |
| `pop_total` | INT | 총인구 |
| `hh_total` | INT | 세대수 |
| `pop_farmer` | INT | 농업인 인구 |
| `score_solar` | SMALLINT | 0-100, 연 일사량 상대값 |
| `score_grid` | SMALLINT | 변전소 잔여용량 기반 |
| `score_land` | SMALLINT | 임야·관리지역 비율 (보호구역은 감점) |
| `score_accept` | SMALLINT | 주민수용성 (설문·조합원 밀도) |
| `suitability` | SMALLINT GENERATED | `solar*0.25 + grid*0.30 + land*0.25 + accept*0.20` — DB view 로 처리 가능 |
| `nearest_sub_code` | VARCHAR(32) FK → `substations.code` NULL | |
| `nearest_sub_distance_km` | DECIMAL(5,2) | |
| `grid_residual_mw` | DECIMAL(6,2) | 해당 변전소 잔여접속용량 (캐시) |
| `constraint_text` | TEXT NULL | `농업진흥 일부 · 관리지역 혼재` |
| `project_summary` | TEXT NULL | `두가리 5MW 태양광 · 파일럿` (대표 진행사업 한 줄) |
| `geom` | GEOGRAPHY(POLYGON) | PostGIS 폴리곤 (EPSG:5186 → WGS84) |
| `updated_at` | TIMESTAMPTZ | |

- idx: GIST(`geom`), `(region_code)`

### `substations`
변전소. 사업 가능여부 판단의 핵심 제약.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `code` | VARCHAR(32) PK | `gs-154`, `ok-154`, `sc-154`, `gr-154` |
| `region_code` | VARCHAR(32) FK → `regions.code` | |
| `name` | VARCHAR(100) | `곡성 154kV 변전소` |
| `addr` | VARCHAR(200) | `곡성읍 교촌리` |
| `voltage_kv` | SMALLINT | `154` |
| `total_capacity_mw` | DECIMAL(6,2) | |
| `residual_mw` | DECIMAL(6,2) | 잔여 접속용량 |
| `status` | ENUM('ok','warn','full') | UI 색상 플래그 |
| `lat` | DECIMAL(9,6) | |
| `lng` | DECIMAL(9,6) | |
| `updated_at` | TIMESTAMPTZ | 한전 공개자료 수집일시 |

### `candidate_sites`
적합 부지 후보지. 지도 drawer 에서 노출.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `emd_code` | VARCHAR(32) FK → `emds.code` | |
| `name` | VARCHAR(100) | `두가리 임야 A` |
| `area_m2` | INT | 면적 (㎡) |
| `site_type` | ENUM('지상형','영농형','수상형','건물옥상형') | |
| `score` | SMALLINT | 0-100 |
| `flags` | JSONB | `['일사 우수','계통 여유','주민 의사 확인']` |
| `geom` | GEOGRAPHY(POLYGON) | |
| `created_at` | TIMESTAMPTZ | |

### `projects`
진행 중인 발전 사업 (운영/인허가/검토/파일럿).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | VARCHAR(32) PK | `godal5`, `okgwa8` (슬러그) |
| `region_code` | VARCHAR(32) FK → `regions.code` | |
| `emd_code` | VARCHAR(32) FK → `emds.code` NULL | |
| `name` | VARCHAR(100) | `고달 5MW` |
| `capacity_mw` | DECIMAL(6,2) | |
| `energy_type` | ENUM('solar','agrisolar','wind','hydro','other') | |
| `status` | ENUM('review','plan','permit','build','operating','pilot') | |
| `status_label` | VARCHAR(100) | UI 문구 (운영 중 · 인허가 진행 중 …) |
| `is_pilot` | BOOLEAN | |
| `start_at` | DATE NULL | 착공 |
| `complete_at` | DATE NULL | 준공 |
| `color` | VARCHAR(20) NULL | 지도 색상 override |
| `geom` | GEOGRAPHY(POLYGON) NULL | |
| `created_at` | TIMESTAMPTZ | |

---

## 3. 홈 피드

### `home_feed_items`
동네 소식 · 조례 설명회 · 준비 중 사업 등. 자동 수집 또는 운영자 등록.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `region_code` | VARCHAR(32) FK → `regions.code` | |
| `kind` | ENUM('briefing','project','reference') | |
| `title` | VARCHAR(200) | |
| `description` | TEXT | |
| `status` | ENUM('pending','plan','run','done') | |
| `status_label` | VARCHAR(20) | UI badge text |
| `source` | VARCHAR(100) NULL | '자동 수집' 시 출처 |
| `published_at` | TIMESTAMPTZ | |

### `news_items`
외부 언론 기사. 크롤링/수집.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `headline` | VARCHAR(300) | |
| `source` | VARCHAR(50) | `전기신문`, `이투데이` |
| `url` | TEXT | |
| `thumb_url` | TEXT NULL | |
| `published_at` | DATE | |
| `region_tag` | VARCHAR(32) NULL | 지역 태그 (선택) |
| `collected_at` | TIMESTAMPTZ | |

---

## 4. AI 에이전트 (자유문의 + 햇빛소득 진단)

### `chat_sessions`
자유문의 세션과 햇빛 진단 세션을 함께 담음.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `user_id` | UUID FK → `users.id` | |
| `kind` | ENUM('free','haebit') | |
| `region_code` | VARCHAR(32) | |
| `started_at` | TIMESTAMPTZ | |
| `ended_at` | TIMESTAMPTZ NULL | haebit 은 finalize 시 채움 |

### `chat_messages`
자유문의 · 햇빛 진단 공통 대화 로그.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `session_id` | UUID FK → `chat_sessions.id` | |
| `role` | ENUM('user','ai','system') | |
| `content_html` | TEXT | 렌더링된 HTML (서버에서 sanitize) |
| `sources` | JSONB NULL | `['곡성군 재생에너지 기본계획 (2026.02)', …]` |
| `created_at` | TIMESTAMPTZ | |

### `faqs`
자유문의 상위 질문에서 운영자가 승격한 FAQ.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `question` | TEXT | |
| `answer_html` | TEXT | |
| `sources` | JSONB | |
| `category` | VARCHAR(50) NULL | |
| `promoted_from_query_id` | UUID NULL FK → `query_logs.id` | |
| `promoted_by` | UUID FK → `users.id` | |
| `created_at` | TIMESTAMPTZ | |

### `query_logs`
AI 질의 로그 (admin-logs 화면). 유사질문 집계.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `user_id` | UUID NULL | 비로그인 허용 시 |
| `session_id` | UUID FK → `chat_sessions.id` | |
| `question` | TEXT | |
| `canonical_question` | TEXT NULL | 유사질문 클러스터 대표 |
| `answer_id` | UUID NULL FK → `chat_messages.id` | |
| `satisfaction` | DECIMAL(2,1) NULL | 1.0 ~ 5.0 |
| `asked_at` | TIMESTAMPTZ | |

### `haebit_sessions`
햇빛소득 진단 세션 (9단계). `chat_sessions.kind='haebit'` 와 1:1 연결.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK (== `chat_sessions.id`) | |
| `user_id` | UUID FK → `users.id` | |
| `region_code` | VARCHAR(32) | |
| `emd_code` | VARCHAR(32) NULL | |
| `address_input` | TEXT NULL | step1 원본 |
| `consent_level` | ENUM('high','mid','low','conflict') NULL | step7 |
| `finalized_at` | TIMESTAMPTZ NULL | |
| `summary` | JSONB NULL | `finalize` 결과 캐시 (signal, capacity_mw, cost_eok, …) |

### `haebit_parcels`
햇빛 진단 · 지도에서 선택한 필지 (step2).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `session_id` | UUID FK → `haebit_sessions.id` | |
| `parcel_label` | VARCHAR(50) | `산 23-1` |
| `area_m2` | INT | |
| `land_use` | VARCHAR(50) | `임야`, `농지`, `대지 (제외)` |
| `use_ok` | BOOLEAN | |
| `is_selected` | BOOLEAN | |

---

## 5. 협동조합

### `cooperatives`
지역별 군민에너지협동조합.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `region_code` | VARCHAR(32) FK → `regions.code` UNIQUE | 1지역 1조합 기준 |
| `name` | VARCHAR(100) | `곡성군민에너지협동조합` |
| `rep_name` | VARCHAR(50) | `정○○` |
| `established_at` | DATE | |
| `articles_version` | VARCHAR(20) | 정관 버전 (`v2`) |
| `created_at` | TIMESTAMPTZ | |

### `coop_members`
조합원 명부.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `coop_id` | UUID FK → `cooperatives.id` | |
| `user_id` | UUID FK → `users.id` NULL | 온라인 가입자는 연결, 오프라인 가입자는 null |
| `member_no` | VARCHAR(10) | `0318` (조합 내부 번호, 4자리 좌패딩) |
| `name_snapshot` | VARCHAR(50) | |
| `birth_year` | SMALLINT | |
| `address` | VARCHAR(200) | `삼기면 근촌리` |
| `distance_category` | ENUM('ADJACENT','NEARBY','GENERAL') | 발전소 기준 500m / 1km / 일반 |
| `contribution_amount` | BIGINT | 출자금 (원) |
| `distribution_preference` | ENUM('CASH','VOUCHER') DEFAULT 'VOUCHER' | 배당 수령방식 |
| `bank_account_masked` | VARCHAR(50) NULL | `농협 352-**-****-89` |
| `status` | ENUM('PENDING','ACTIVE','SUSPENDED','WITHDRAWN') | PENDING=납입 대기 |
| `joined_at` | DATE | |
| `withdrawn_at` | DATE NULL | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

- idx: `(coop_id, status)`, `(coop_id, member_no)` UNIQUE, `user_id`

### `coop_contributions`
출자금 납입 트랜잭션 (추가 출자 포함).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `member_id` | UUID FK → `coop_members.id` | |
| `amount` | BIGINT | |
| `paid_at` | TIMESTAMPTZ | |
| `kind` | ENUM('initial','additional','refund') | |
| `tx_hash` | VARCHAR(80) NULL | 블록체인 원장 기록 |

### `coop_applications`
조합원 가입 신청 (승인 대기).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `coop_id` | UUID FK → `cooperatives.id` | |
| `user_id` | UUID NULL | 온라인 가입자 |
| `name` | VARCHAR(50) | |
| `address` | VARCHAR(200) | |
| `contribution_amount` | BIGINT | |
| `status` | ENUM('PENDING','APPROVED','REJECTED') | |
| `applied_at` | TIMESTAMPTZ | |
| `approved_by` | UUID NULL FK → `users.id` | |
| `approved_at` | TIMESTAMPTZ NULL | |

---

## 6. 펀드 · 사업 참여

### `funds`
군민펀드 (사업 단위로 개별 펀드가 하나씩 생성).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | VARCHAR(32) PK | `fund-godal1` |
| `coop_id` | UUID FK → `cooperatives.id` | |
| `project_id` | VARCHAR(32) FK → `projects.id` | |
| `name` | VARCHAR(100) | `곡성군민펀드 (고달 5MW 1차)` |
| `target_amount` | BIGINT | |
| `current_amount` | BIGINT | |
| `yield_rate_yearly` | DECIMAL(5,4) | `0.1000` = 10% |
| `min_investment` | BIGINT | 최소 납입 (원) |
| `max_per_person` | BIGINT | 1인 한도 |
| `funding_start` | DATE | |
| `funding_end` | DATE | |
| `maturity` | DATE | |
| `status` | ENUM('draft','recruiting','running','matured','closed') | |

### `fund_investments`
펀드 납입 내역.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `fund_id` | VARCHAR(32) FK → `funds.id` | |
| `member_id` | UUID FK → `coop_members.id` | |
| `amount` | BIGINT | |
| `invested_at` | TIMESTAMPTZ | |
| `tx_hash` | VARCHAR(80) NULL | |

---

## 7. 배당 집행

### `dividend_periods`
배당 정산 기간 (반기). 상태머신: `DRAFT → REVIEW → APPROVED → PAID`. 2인 승인 필수 (조합장 + 감사).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | VARCHAR(32) PK | `dp-2026h1` |
| `coop_id` | UUID FK → `cooperatives.id` | |
| `period_start` | DATE | `2025-10-01` |
| `period_end` | DATE | `2026-03-31` |
| `eligible_member_count` | INT | ACTIVE 기준 스냅샷 |
| `total_amount` | BIGINT | |
| `per_member_avg` | BIGINT | |
| `state` | ENUM('DRAFT','REVIEW','APPROVED','PAID') | |
| `chair_user_id` | UUID NULL FK → `users.id` | |
| `chair_approved_at` | TIMESTAMPTZ NULL | |
| `auditor_user_id` | UUID NULL FK → `users.id` | |
| `auditor_signed_at` | TIMESTAMPTZ NULL | |
| `paid_at` | TIMESTAMPTZ NULL | |
| `transfer_file_url` | TEXT NULL | |

- CHECK: `state='PAID'` → `chair_approved_at AND auditor_signed_at` 모두 NOT NULL

### `dividends`
조합원별 배당 지급 내역.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `period_id` | VARCHAR(32) FK → `dividend_periods.id` | |
| `member_id` | UUID FK → `coop_members.id` | |
| `base_amount` | BIGINT | 배당 원금 |
| `bonus_amount` | BIGINT DEFAULT 0 | 상품권 +3% 가산 등 |
| `method` | ENUM('CASH','VOUCHER') | |
| `paid_at` | TIMESTAMPTZ NULL | |
| `voucher_ref` | VARCHAR(80) NULL FK → `vouchers.id` | |
| `tx_hash` | VARCHAR(80) NULL | |

- idx: `(member_id, period_id)` UNIQUE

### `vouchers`
곡성사랑상품권 발행. 지역화폐 API 연동 결과.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | VARCHAR(80) PK | 지역화폐 API 발급 코드 |
| `coop_id` | UUID FK → `cooperatives.id` | |
| `member_id` | UUID FK → `coop_members.id` | |
| `amount` | BIGINT | 원금 + 가산 합계 |
| `api_request_id` | VARCHAR(100) | 외부 API 호출 ID |
| `issued_at` | TIMESTAMPTZ | |
| `status` | ENUM('REQUESTED','ISSUED','USED','EXPIRED') | |

### `voucher_batches`
반기 일괄 발행 배치 (admin-coop 상단 카드).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `period_id` | VARCHAR(32) FK → `dividend_periods.id` | |
| `principal_amount` | BIGINT | 원금 합계 |
| `bonus_rate` | DECIMAL(5,4) | 조합 부담 가산율 (`0.0300`) |
| `bonus_amount` | BIGINT | |
| `total_funding` | BIGINT | 원금 + 가산 |
| `target_members` | INT | |
| `prepare_lead_days` | SMALLINT | T-일 |
| `expected_local_return_amount` | BIGINT | 지역 환류 예상액 |
| `created_at` | TIMESTAMPTZ | |

---

## 8. 총회 · 의결

### `votes`
안건 (진행중/과거/예정).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `coop_id` | UUID FK → `cooperatives.id` | |
| `session_name` | VARCHAR(100) | `2026년 상반기 정기총회` |
| `agenda_no` | SMALLINT | 안건 번호 |
| `title` | VARCHAR(200) | |
| `body_html` | TEXT | 상세 본문 (발의·이유·첨부) |
| `proposer` | VARCHAR(100) | `이사회` |
| `proposed_at` | TIMESTAMPTZ | |
| `deadline_at` | TIMESTAMPTZ | |
| `quorum_required` | INT | 의결정족수 (ACTIVE 기준 스냅샷) |
| `status` | ENUM('PENDING','ACTIVE','PASSED','REJECTED','EXPIRED') | |
| `closed_at` | TIMESTAMPTZ NULL | |

### `vote_ballots`
조합원별 투표 기록. 블록체인 원장에 저장, 변경은 한정된 창 내에서만 허용.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `vote_id` | UUID FK → `votes.id` | |
| `member_id` | UUID FK → `coop_members.id` | |
| `choice` | ENUM('AGREE','DISAGREE','ABSTAIN') | |
| `cast_at` | TIMESTAMPTZ | |
| `changeable_until` | TIMESTAMPTZ | `cast_at + 24h` 가 기본 |
| `changed_at` | TIMESTAMPTZ NULL | |
| `tx_hash` | VARCHAR(80) | 블록체인 기록 해시 |

- `(vote_id, member_id)` UNIQUE

---

## 9. 문서 (RAG)

### `documents`
운영자 업로드 문서 → RAG 인덱스 대상.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `region_code` | VARCHAR(32) FK → `regions.code` | |
| `title` | VARCHAR(300) | |
| `file_key` | VARCHAR(500) | S3 키 등 |
| `file_type` | ENUM('pdf','hwp','docx','xlsx','txt') | |
| `visibility` | ENUM('L0','L1','L2','L3') | L0 공개 · L1 회원 · L2 주민전용 · L3 어드민 |
| `chunks_count` | INT DEFAULT 0 | RAG 색인 청크 수 |
| `questions_hit` | INT DEFAULT 0 | 질의 인용된 횟수 (캐시) |
| `uploaded_by` | UUID FK → `users.id` | |
| `uploaded_at` | TIMESTAMPTZ | |
| `indexed_at` | TIMESTAMPTZ NULL | |
| `status` | ENUM('uploaded','indexing','indexed','failed') | |

### `document_chunks`
벡터 검색용 청크. pgvector 또는 외부 벡터 DB.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `document_id` | UUID FK → `documents.id` ON DELETE CASCADE | |
| `chunk_no` | INT | |
| `text` | TEXT | |
| `embedding` | VECTOR(1536) | |
| `page_no` | INT NULL | |

---

## 10. 로그 · 원장 · 플래그

### `activity_logs`
"내 조합 활동 기록" + "명부 변경 로그" 통합. 블록체인 원장 대응 이벤트.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `coop_id` | UUID FK → `cooperatives.id` | |
| `actor_kind` | ENUM('member','admin','system') | |
| `actor_id` | UUID NULL | user_id 또는 member_id |
| `action` | VARCHAR(50) | `dividend_received`, `join_approved`, `vote_cast`, `account_changed`, `method_changed`, `withdraw_request`, `fund_contribution` |
| `target_kind` | VARCHAR(50) | `member`, `vote`, `dividend`, `fund` |
| `target_id` | VARCHAR(80) | |
| `summary` | TEXT | UI 한 줄 요약 |
| `meta` | JSONB | 액션별 추가 속성 (amount, from/to 등) |
| `tx_hash` | VARCHAR(80) NULL | 블록체인 원장 해시 |
| `occurred_at` | TIMESTAMPTZ | |

- idx: `(coop_id, occurred_at DESC)`, `(actor_id, occurred_at DESC)`

### `feature_flags`
법인별 기능 on/off (admin-coop 하단).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `coop_id` | UUID FK → `cooperatives.id` | |
| `key` | VARCHAR(50) | `voucher_api_enabled`, `online_join_enabled`, … |
| `label` | VARCHAR(100) | UI 표기 |
| `enabled` | BOOLEAN | |
| `updated_by` | UUID FK → `users.id` | |
| `updated_at` | TIMESTAMPTZ | |

- PK: `(coop_id, key)`

### `app_kpi_daily`
운영 대시보드용 일별 집계 (마감 배치).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `date` | DATE | |
| `region_code` | VARCHAR(32) | |
| `mau` | INT | |
| `verified_cumulative` | INT | 주민인증 누적 |
| `ai_queries` | INT | 일별 AI 질의 수 |
| `haebit_completed` | INT | 누적 진단완료 |

- PK: `(date, region_code)`

---

## 연결 개요

```
users ─┬─ user_roles
       ├─ coop_members ─┬─ coop_contributions
       │                ├─ fund_investments ── funds ── projects
       │                ├─ dividends ── dividend_periods
       │                │        └── vouchers (batch:voucher_batches)
       │                └─ vote_ballots ── votes
       ├─ chat_sessions ── chat_messages
       │        └── haebit_sessions ── haebit_parcels
       ├─ query_logs ─(promote)→ faqs
       └─ activity_logs  (블록체인 원장 이벤트 집약)

regions ── emds ─┬─ candidate_sites
                 └─ projects ── funds

documents ── document_chunks   (RAG)
```

---

## 파일럿 단계 유의

- **파일럿 1호 = 곡성군 단일 지역**: 대부분 테이블에 `region_code` 가 들어가 있지만, 초기 마이그레이션은 `gokseong` 한 row 로만 시작. 다지역 확장 시 테넌시 분리 여부 재검토.
- **블록체인 원장**은 UI 카피상 "변경 불가"로 표기되지만, 초기엔 `tx_hash` 필드만 두고 실제 체인 연동은 v2 에서. DB 자체가 append-only 원장 역할 + 감사 서명 2단계로 tamper-evident 보장.
- **지역화폐 API (곡성사랑상품권)** 는 `voucher_api_enabled` 플래그로 on/off. 배당 기본 수령방식(`distribution_preference`)이 `VOUCHER` 로 저장되며, 미연동 지역은 자동 `CASH` fallback.
- **거리 구분 (ADJACENT/NEARBY/GENERAL)** 은 발전소 기준 500m/1km/그 외. 발전소가 여러 개면 가장 가까운 쪽 기준. 지금은 명부 등록시 수동 선택이지만, 추후 좌표 + PostGIS 로 자동화 가능.

_작성: 2026-04-23 · 준석 · src.html/app.js 기준 역설계_
