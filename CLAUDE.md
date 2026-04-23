# 로컬에너지플랫폼 프로덕트 개발

## 회사 & 프로젝트 컨텍스트

**회사**: 루트에너지 — 지역주민이 지역 재생에너지 사업에 직접 투자할 수 있도록 지원하는 온라인투자연계금융업(P2P) 플랫폼

**프로젝트**: 로컬에너지 플랫폼 — 지역(현재 파일럿: 곡성군) 주민 대상 재생에너지 투자·AI에이전트·협동조합 관리 통합 앱

**개발 목적**: 기획자(준석)가 바이브 코딩으로 화면/기능 프로토타입 제작 → 백엔드 개발자가 DB 설계 및 API 개발에 참고

## 현재 파일 구조

```
02_개발/
├── CLAUDE.md              ← 이 파일
├── index.html             ← 화면 목록 네비게이터
├── design-main.html       ← 디자인 원본 (5MB 단일파일, 참고용)
├── src.html               ← HTML 구조 소스
├── app.js                 ← 클라이언트 로직 (SPA 라우터, 상태관리)
├── styles.css             ← 디자인 시스템 (블루 슬레이트 테마)
├── assets/
│   ├── rootenergy-logo.png
│   ├── character.svg / character-splash.svg  ← AI 에이전트 캐릭터
│   └── (이미지 리소스)
├── pages/                 ← 화면별 분리 HTML (앞으로 여기에)
├── components/            ← 재사용 컴포넌트
└── docs/
    └── db-schema.md       ← DB 스키마 초안
```

## 현재 구현된 화면 (design-main.html 기준)

| view key | 화면 | 설명 |
|----------|------|------|
| home | 홈 | 메인 대시보드 |
| chat-free | AI 에이전트 · 자유 문의 | 자유 질문 챗 |
| chat-haebit | AI 에이전트 · 햇빛소득 진단 | 단계별 진단 플로우 |
| dashboard | 지역 대시보드 | 지역 에너지 현황 지도/통계 |
| coop | 협동조합 현황 | 조합 개요 |
| coop-members | 협동조합 조합원 명부 | 조합원 리스트 |
| coop-vote | 협동조합 총회·의결 | 투표/의결 |
| admin-home | 운영 대시보드 | 관리자 전용 |
| admin-docs | 운영 문서 관리 | |
| admin-logs | 운영 질의 로그 | |
| admin-coop | 운영 조합 운영 | |

## 앱 구조 (SPA)

- **상태**: `state` 객체로 중앙 관리 (user, view, region, haebit 등)
- **라우터**: `go(view)` 함수로 화면 전환
- **역할**: `resident` / `admin` (토글 방식)
- **지역**: 곡성군 파일럿 (추후 다지역 확장 예정)
- **AI 캐릭터**: 햇빛소득 진단 에이전트 (단계별 질문 플로우)

## 디자인 시스템

- **색상**: 블루 슬레이트 계열 (`--blue-900` ~ `--blue-50`, `--ink-*`)
- **폰트**: Pretendard (가변), IBM Plex Mono
- **스타일 파일**: `styles.css` (75KB)

## 기술 스택

- **프론트**: 순수 HTML / CSS / Vanilla JS (빌드 도구 없음)
- **데이터**: 더미 데이터 JS (`bg-data.js`, `char-data.js`, `gokseong-emd.js`)
- **지도**: GeoJSON 기반 (곡성군 읍면동 경계)
- **백엔드**: 미정 — `docs/` 폴더에 DB/API 명세 관리

## 개발 원칙

1. HTML 파일은 브라우저에서 바로 열 수 있어야 함 (서버 불필요)
2. 새 화면 → `pages/[view명].html`
3. 공통 컴포넌트 → `components/`
4. 새 기능 추가 시 `docs/db-schema.md` 및 `docs/api-spec.md` 병행 업데이트
5. `styles.css` 디자인 시스템 변수 최대한 재사용

## 협업

- **파일 공유 중심** (직접 전달) + GitHub 보조
- 백엔드 개발자에게는 `docs/` 폴더 + 화면 HTML 공유
