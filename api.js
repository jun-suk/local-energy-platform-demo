// ═══════════════════════════════════════════════════════════════════════════
// api.js — 로컬에너지 플랫폼 API 레이어
// ═══════════════════════════════════════════════════════════════════════════
//
// [목적]
//   app.js 에 하드코딩된 더미 데이터를 한곳에 모아 fetch() 스텁으로 정리한 파일.
//   백엔드가 붙기 전까지는 mock 데이터를 그대로 Promise 로 되돌려주고,
//   백엔드 엔드포인트가 준비되면 `API.config.useMock = false` 한 줄로 전환합니다.
//
// [사용 패턴]
//   const res = await API.coop.me();                 // { data, meta }
//   const votes = await API.coop.votes.list();
//   await API.coop.votes.cast(voteId, 'AGREE');
//
// [응답 스펙 규약]
//   모든 응답은 { data, meta?, error? } 형태.
//   - data : 리소스 본체 (배열 또는 객체)
//   - meta : page/total/quorum 등 부가정보
//   - error: { code, message } (useMock=true 에서는 발생하지 않음)
//
// [인증]
//   실 배포 시 `API.config.token` 에 JWT 를 세팅하면 모든 fetch 에 자동 Bearer 첨부.
//
// [MOCK 소스]
//   현재 파일 안의 MOCK_* 블록이 곧 샘플 응답. 구조가 바뀌면 이 블록만 수정.
//   백엔드 개발자는 이 구조를 응답 계약으로 참고해주세요.
// ═══════════════════════════════════════════════════════════════════════════

(function (root) {
  'use strict';

  // ───────────────────────────────────────── 설정
  const config = {
    baseUrl: '',                // 실 배포 시 'https://api.local-energy.kr' 등
    useMock: true,              // false 로 토글 시 실제 fetch 수행
    token: null,                // JWT Bearer
    mockLatencyMs: 250,         // mock 응답 지연 (UX 확인용)
  };

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function request(method, path, body, params) {
    if (config.useMock) {
      // mock 은 각 API 메서드에서 직접 처리. 여기서는 안전망.
      await sleep(config.mockLatencyMs);
      throw new Error('mock not implemented for ' + method + ' ' + path);
    }
    const url = new URL(config.baseUrl + path, window.location.origin);
    if (params) Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.append(k, v));
    const headers = { 'Content-Type': 'application/json' };
    if (config.token) headers['Authorization'] = 'Bearer ' + config.token;
    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(json?.error?.message || res.statusText), { status: res.status, payload: json });
    return json;
  }

  // mock 헬퍼: 지연 + 응답 포장
  async function mock(data, meta) {
    await sleep(config.mockLatencyMs);
    return meta ? { data, meta } : { data };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MOCK 데이터 (현재 app.js 와 1:1 매칭)
  // ═════════════════════════════════════════════════════════════════════════
  const MOCK = {};

  // ─── 현재 사용자 (src.html · app.js state.user)
  MOCK.me = {
    id: 'user-0318',
    name: '윤태환',
    kakao_id: 'juns****@kakao.com',
    phone_masked: '010-****-8721',
    email: null,
    roles: ['resident', 'member'],      // 'admin' 은 토글
    residence: {
      region_code: 'gokseong',
      region_name: '곡성군',
      emd_code: 'samgi',
      emd_name: '삼기면',
      verified_at: '2026-04-20T10:12:00+09:00',
    },
    pass_verified_at: '2026-04-20T10:10:00+09:00',
    kakao_verified_at: '2026-04-20T10:08:00+09:00',
    member_no: '0318',
    created_at: '2026-02-20T14:30:00+09:00',
  };

  // ─── 지역 목록 (사이드바 region 드롭다운)
  MOCK.regions = [
    { code: 'gokseong',   name: '곡성군', prov: '전라남도', tag: '장미·기차의 고장 ⭐', is_pilot: true  },
    { code: 'younggwang', name: '영광군', prov: '전라남도', tag: '군민조합형',             is_pilot: false },
    { code: 'shinan',     name: '신안군', prov: '전라남도', tag: '도서·군민펀드',          is_pilot: false },
    { code: 'jeongseon',  name: '정선군', prov: '강원도',   tag: '폐광지역',               is_pilot: false },
  ];

  // ─── 법정면 (곡성군 11개) — app.js GS_EMDS
  MOCK.emds = [
    { code:'gokseong-eup', region_code:'gokseong', name:'곡성읍',   center:[35.282,127.294], pop_total:7824, hh_total:3912, pop_farmer:1212, scores:{ solar:78, grid:92, land:42, accept:71 }, suitability:72, nearest_sub:{ code:'gs-154', name:'곡성 154kV', distance_km:0.4 }, grid_residual_mw:38.4, constraint:'읍 중심부 · 가용지 적음',         project_summary:'섬진강 소수력 0.5MW 운영' },
    { code:'ogok',         region_code:'gokseong', name:'오곡면',   center:[35.248,127.280], pop_total:1120, hh_total: 612, pop_farmer: 680, scores:{ solar:82, grid:78, land:64, accept:68 }, suitability:73, nearest_sub:{ code:'gs-154', name:'곡성 154kV', distance_km:3.1 }, grid_residual_mw:38.4, constraint:'농업진흥 일부 · 관리지역 혼재',    project_summary:null },
    { code:'samgi',        region_code:'gokseong', name:'삼기면',   center:[35.305,127.242], pop_total:1540, hh_total: 820, pop_farmer: 892, scores:{ solar:80, grid:74, land:62, accept:66 }, suitability:71, nearest_sub:{ code:'gs-154', name:'곡성 154kV', distance_km:5.2 }, grid_residual_mw:38.4, constraint:'농업진흥 비율 높음',                project_summary:null },
    { code:'seokgok',      region_code:'gokseong', name:'석곡면',   center:[35.192,127.268], pop_total:2110, hh_total:1120, pop_farmer:1150, scores:{ solar:83, grid:72, land:58, accept:64 }, suitability:71, nearest_sub:{ code:'gr-154', name:'구례 154kV', distance_km:9.8 }, grid_residual_mw: 5.3, constraint:'계통 포화 · 남부계통 연계 필요',    project_summary:null },
    { code:'moksadong',    region_code:'gokseong', name:'목사동면', center:[35.165,127.225], pop_total: 980, hh_total: 520, pop_farmer: 512, scores:{ solar:85, grid:58, land:72, accept:58 }, suitability:70, nearest_sub:{ code:'gr-154', name:'구례 154kV', distance_km:6.4 }, grid_residual_mw: 5.3, constraint:'계통 포화 경고 · 상수원 일부',      project_summary:'고달 5MW 인접 영향권' },
    { code:'jukkok',       region_code:'gokseong', name:'죽곡면',   center:[35.162,127.320], pop_total:1540, hh_total: 802, pop_farmer: 728, scores:{ solar:86, grid:54, land:68, accept:72 }, suitability:71, nearest_sub:{ code:'gr-154', name:'구례 154kV', distance_km:5.1 }, grid_residual_mw: 5.3, constraint:'계통 포화 · 영농형 권장',           project_summary:'영농형 2MW 검토' },
    { code:'godal',        region_code:'gokseong', name:'고달면',   center:[35.175,127.245], pop_total:1890, hh_total: 960, pop_farmer:1020, scores:{ solar:87, grid:82, land:74, accept:81 }, suitability:81, nearest_sub:{ code:'ok-154', name:'옥과 154kV', distance_km:6.2 }, grid_residual_mw:14.7, constraint:'적합도 최상 · 파일럿 시범 면',       project_summary:'두가리 5MW 태양광 · 파일럿' },
    { code:'okgwa',        region_code:'gokseong', name:'옥과면',   center:[35.322,127.207], pop_total:4210, hh_total:2160, pop_farmer:1430, scores:{ solar:79, grid:86, land:52, accept:74 }, suitability:73, nearest_sub:{ code:'ok-154', name:'옥과 154kV', distance_km:0.3 }, grid_residual_mw:14.7, constraint:'계통 접속 우수 · 도심형',            project_summary:'구산리 8MW · 인허가 진행' },
    { code:'ip',           region_code:'gokseong', name:'입면',     center:[35.355,127.260], pop_total:1340, hh_total: 720, pop_farmer: 780, scores:{ solar:81, grid:70, land:66, accept:62 }, suitability:70, nearest_sub:{ code:'ok-154', name:'옥과 154kV', distance_km:5.8 }, grid_residual_mw:14.7, constraint:'농지 비율 · 문화재 일부',            project_summary:null },
    { code:'gyeom',        region_code:'gokseong', name:'겸면',     center:[35.308,127.170], pop_total:1620, hh_total: 860, pop_farmer: 820, scores:{ solar:80, grid:76, land:70, accept:70 }, suitability:74, nearest_sub:{ code:'sc-154', name:'순창 154kV', distance_km:4.1 }, grid_residual_mw:22.1, constraint:'순창계통 연계 · 양호',                project_summary:null },
    { code:'osan',         region_code:'gokseong', name:'오산면',   center:[35.235,127.195], pop_total:1430, hh_total: 760, pop_farmer: 820, scores:{ solar:81, grid:68, land:64, accept:63 }, suitability:69, nearest_sub:{ code:'gs-154', name:'곡성 154kV', distance_km:8.4 }, grid_residual_mw:38.4, constraint:'농업진흥 비율 높음',                 project_summary:null },
  ];

  // ─── 적합 부지 후보지 — app.js GS_CANDIDATES
  MOCK.candidates = [
    { id:'c1', emd_code:'godal',     name:'두가리 임야 A', area_m2:18400, site_type:'지상형', score:91, flags:['일사 우수','계통 여유','주민 의사 확인'] },
    { id:'c2', emd_code:'godal',     name:'두가리 임야 B', area_m2: 9800, site_type:'지상형', score:84, flags:['경사 양호','관리지역'] },
    { id:'c3', emd_code:'okgwa',     name:'구산리 유휴지', area_m2:24600, site_type:'지상형', score:88, flags:['변전소 인접','인허가 중'] },
    { id:'c4', emd_code:'jukkok',    name:'태안리 영농형', area_m2:12400, site_type:'영농형', score:74, flags:['농업 겸업','계통 포화 유의'] },
    { id:'c5', emd_code:'gyeom',     name:'덕림리 임야',   area_m2:15200, site_type:'지상형', score:82, flags:['순창 계통 연계'] },
    { id:'c6', emd_code:'samgi',     name:'괴소리 임야',   area_m2: 8800, site_type:'지상형', score:68, flags:['농업진흥 경계'] },
    { id:'c7', emd_code:'seokgok',   name:'능파리 임야',   area_m2:21000, site_type:'지상형', score:62, flags:['계통 포화','접속 협의 필요'] },
    { id:'c8', emd_code:'moksadong', name:'용사리 유휴지', area_m2: 6400, site_type:'영농형', score:58, flags:['계통 포화','상수원 거리 검토'] },
  ];

  // ─── 사업 구역 — app.js GS_ZONES
  MOCK.projects = [
    { id:'godal5',   region_code:'gokseong', emd_code:'godal',    name:'고달 5MW',            capacity_mw:5.0, energy_type:'solar',      status:'pilot',     status_label:'파일럿 · 군민조합 연계', is_pilot:true,  timeline:{ start:'2026-02', complete:'2026-11' } },
    { id:'okgwa8',   region_code:'gokseong', emd_code:'okgwa',    name:'옥과 8MW',            capacity_mw:8.0, energy_type:'solar',      status:'permit',    status_label:'인허가 진행 중',        is_pilot:false, timeline:null },
    { id:'jukkok2',  region_code:'gokseong', emd_code:'jukkok',   name:'죽곡 영농형 2MW',     capacity_mw:2.0, energy_type:'agrisolar',  status:'review',    status_label:'검토 · 주민설명회 예정',   is_pilot:false, timeline:null },
    { id:'sumjin05', region_code:'gokseong', emd_code:'gokseong-eup', name:'섬진강 소수력',   capacity_mw:0.5, energy_type:'hydro',      status:'operating', status_label:'운영 중 · 교촌리',         is_pilot:false, timeline:{ start:'2018', complete:'2018' } },
  ];

  // ─── 변전소 — app.js GS_SUBS
  MOCK.substations = [
    { code:'gs-154', region_code:'gokseong', name:'곡성 154kV 변전소',      addr:'곡성읍 교촌리',  voltage_kv:154, residual_mw:38.4, status:'ok',   lat:35.280, lng:127.296 },
    { code:'ok-154', region_code:'gokseong', name:'옥과 154kV 변전소',      addr:'옥과면',        voltage_kv:154, residual_mw:14.7, status:'warn', lat:35.322, lng:127.210 },
    { code:'sc-154', region_code:'gokseong', name:'순창 154kV (겸면 연계)', addr:'겸면 접속점',   voltage_kv:154, residual_mw:22.1, status:'warn', lat:35.308, lng:127.170 },
    { code:'gr-154', region_code:'gokseong', name:'구례 154kV (남부 연계)', addr:'고달·죽곡',    voltage_kv:154, residual_mw: 5.3, status:'full', lat:35.160, lng:127.280 },
  ];

  // ─── home 피드 (동네 소식 + 뉴스)
  MOCK.homeFeed = [
    { id:'fd1', type:'briefing', title:'곡성군 신·재생에너지 군민참여 조례(안) 주민설명회', desc:'2026.05.14 · 곡성군청 대강당 · 주민참여 30% 권고안 설명', status:'pending', status_label:'예정' },
    { id:'fd2', type:'project',  title:'고달면 5MW 태양광 군민조합 1차 모집 준비 중',        desc:'연 목표 수익률 9% · 1인당 최대 500만원 · 6월 공고 예정',      status:'plan',    status_label:'준비' },
    { id:'fd3', type:'reference',title:'신안군민펀드 4차 모집 완료 (참고 사례)',             desc:'군민 2,340명 참여 · 42억원 조성 · 연 10% 수익률 · 2026.04', status:'run',     status_label:'완료' },
  ];
  MOCK.homeNews = [
    { id:'n1', headline:"루트에너지, 햇빛바람 펀드 플랫폼 '루트펀드' 앱 출시",                 source:'전기신문', published_at:'2026-01-28', thumb:'assets/news-1.png', url:'#' },
    { id:'n2', headline:"\"재생에너지에 투자해볼까\"…태양광·풍력 '그린 P2P' 두배 성장",       source:'이투데이', published_at:'2025-11-14', thumb:'assets/news-2.png', url:'#' },
    { id:'n3', headline:"핀테크 기업, ESG로 수익화까지",                                    source:'전자신문', published_at:'2025-08-14', thumb:'assets/news-3.png', url:'#' },
  ];

  // ─── 자유문의 Q&A (app.js freeReplies 미러)
  MOCK.freeReplies = {
    '태양광이 우리 마을에 들어오면 뭐가 좋나요?': { sources:['곡성군 재생에너지 기본계획 (2026.02)','루트에너지 조사(2025.11)'] },
    'REC가 뭔가요? 쉽게 설명해주세요':          { sources:['산업통상자원부 RPS 운영지침','전력거래소 REC 거래정보'] },
    '곡성군 재생에너지 사업 히스토리가 궁금해요': { sources:['곡성군청 에너지팀 (2026.04)','군민조합 설립 정관'] },
    '주민이 참여하는 3가지 방식 알려주세요':      { sources:['루트에너지 조사 보고서(2025.11)'] },
    '주민수용성을 높이려면 뭐가 중요한가요?':     { sources:['정선군 사례 보고서 (2025.11)','루트에너지 주민수용성 연구'] },
  };

  // ─── 햇빛 진단 단계 정의 (app.js haebitSteps 와 동일한 스텝 키)
  MOCK.haebitFlow = [
    { step:1, key:'addr',     kind:'input',  q:'부지 주소를 알려주세요.' },
    { step:2, key:'parcels',  kind:'map',    q:'활용할 필지를 클릭해 선택해주세요.' },
    { step:3, key:'land_use', kind:'auto',   q:'토지 이용 현황 자동 조회' },
    { step:4, key:'regulate', kind:'auto',   q:'부지 규제 자동 조회' },
    { step:5, key:'solar',    kind:'auto',   q:'햇빛 조건' },
    { step:6, key:'grid',     kind:'auto',   q:'계통 접속 가능성' },
    { step:7, key:'consent',  kind:'choice', q:'마을 분위기', options:['high','mid','low','conflict'] },
    { step:8, key:'summary',  kind:'auto',   q:'예상 규모 산정' },
    { step:9, key:'final',    kind:'final',  q:'진단 완료' },
  ];

  // ─── 내 조합 자산 (app.js views.coop)
  MOCK.coopMe = {
    coop: { id:'coop-gs', name:'곡성군민에너지협동조합', established_at:'2026-02-20', rep:'정○○' },
    member: { member_no:'0318', joined_at:'2026-02-20', distance:'GENERAL', status:'ACTIVE' },
    contribution: { amount:5000000, share_pct:1.04, first_paid_at:'2026-02-20' },
    funds: [
      { fund_id:'fund-godal1', fund_name:'곡성군민펀드 (고달 5MW 1차)', project_id:'godal5', balance:2400000, yield_rate:0.10, maturity:'2031-06', status:'running' },
    ],
    totals: { total_received:440000, dividend:335000, interest:105000, last_paid_at:'2026-03-30', next_paid_at:'2026-06-30', preferred_method:'VOUCHER' },
  };

  // ─── 내 수령 내역 (표)
  MOCK.coopMyDividends = [
    { quarter:'2026 Q1', paid_at:'2026-03-30', voucher:85000, interest:28200, total:113200 },
    { quarter:'2025 Q4', paid_at:'2025-12-30', voucher:82000, interest:27400, total:109400 },
    { quarter:'2025 Q3', paid_at:'2025-09-30', voucher:84000, interest:27800, total:111800 },
    { quarter:'2025 Q2', paid_at:'2025-06-30', voucher:84000, interest:21600, total:105600 },
    { quarter:'2025 Q1', paid_at:'2025-03-30', voucher:    0, interest:    0, total:     0 },
  ];

  // ─── 내 참여 사업 (pro bar)
  MOCK.coopMyProjects = [
    { project_id:'godal5',   name:'고달면 두가리 태양광 5MW', my_amount:2400000, expected_yearly_dividend:220800, progress_pct:47, status:'build',   status_label:'건설 47%', milestone:'착공 2026.02 · 준공 2026.11' },
    { project_id:'sumjin05', name:'섬진강 소수력 0.5MW',      my_amount:5000000, cumulative_dividend:440000,      progress_pct:100, status:'running', status_label:'운영중', milestone:'2024~ · 가동률 92%' },
  ];

  // ─── 내 조합 활동 로그 (블록체인 원장)
  MOCK.coopMyActivity = [
    { id:'act1', kind:'dividend_received', title:'상반기 배당 수령 (곡성사랑상품권)', amount:175200, at:'2026-03-30T00:00:00+09:00', tx_hash:null },
    { id:'act2', kind:'fund_contribution', title:'고달 펀드 추가 납입',                amount:400000, at:'2026-02-15T00:00:00+09:00', tx_hash:null },
    { id:'act3', kind:'vote_cast',         title:"정기총회 안건 3호 '찬성' 투표",       at:'2026-04-19T00:00:00+09:00', tx_hash:'f4a8…92e1' },
    { id:'act4', kind:'member_joined',     title:'조합원 가입 · 본인인증',               at:'2026-02-20T00:00:00+09:00', tx_hash:null },
  ];

  // ─── 조합원 명부 (app.js views['coop-members'])
  MOCK.coopMembers = {
    summary: {
      total: 1247, active: 1231, pending: 16,
      contribution_total: 482150000, contribution_avg: 386000,
      last_year_dividend_paid: 42340000, next_dividend_at: '2026-09-30', expected_rate: 0.092,
      audit_approved: true, audit_approved_at: '2026-04-12',
    },
    rows: [
      { id:'m001', name:'이영자', birth_year:1952, address:'곡성읍 교촌리', distance:'ADJACENT', contribution:5000000, last_dividend:45000, status:'ACTIVE' },
      { id:'m002', name:'박상훈', birth_year:1968, address:'고달면 두가리', distance:'ADJACENT', contribution:5000000, last_dividend:45000, status:'ACTIVE' },
      { id:'m003', name:'김영순', birth_year:1945, address:'옥과면 옥과리', distance:'NEARBY',   contribution:3000000, last_dividend:24800, status:'ACTIVE' },
      { id:'m004', name:'정미경', birth_year:1978, address:'죽곡면 원달리', distance:'GENERAL',  contribution:1000000, last_dividend: 8200, status:'ACTIVE' },
      { id:'m005', name:'최봉석', birth_year:1960, address:'석곡면 유정리', distance:'NEARBY',   contribution:5000000, last_dividend:45000, status:'ACTIVE' },
      { id:'m006', name:'한수정', birth_year:1985, address:'곡성읍 학산리', distance:'GENERAL',  contribution: 500000, last_dividend:    0, status:'PENDING' },
      { id:'m007', name:'윤태환', birth_year:1990, address:'삼기면 근촌리', distance:'GENERAL',  contribution:2000000, last_dividend:17400, status:'ACTIVE' },
    ],
    pending_applications: [
      { id:'app1', name:'한수정', address:'곡성읍 학산리', contribution:500000, applied_at:'2026-04-19' },
      { id:'app2', name:'오진혁', address:'오산면 가곡리', contribution:1000000, applied_at:'2026-04-20' },
      { id:'app3', name:'김은정', address:'입면 금산리',   contribution:3000000, applied_at:'2026-04-21' },
    ],
  };

  // ─── 투표 · 의결 (app.js views['coop-vote'])
  MOCK.coopVoteCurrent = {
    id:'vote-2026h1-3', session:'2026년 상반기 정기총회', agenda_no:3,
    title:'고달면 5MW 태양광 발전소 출자 승인의 건',
    proposer:'이사회', proposed_at:'2026-04-12',
    deadline_at:'2026-04-25T18:00:00+09:00',
    body:'고달면 두가리 5MW 태양광 사업에 군민조합 출자금 1.2억원 투입을 승인하고자 합니다. 예상 배당률은 연 9.2%이며, 건설 기간 중 월 진행현황을 조합원 앱으로 공개합니다. 투자 설명회는 2026.04.28 예정.',
    quorum: { required:1247, cast:842, pct:0.675 },
    tally: { agree:691, disagree:76, abstain:75 },
    my_choice:'AGREE', changeable_until:'2026-04-22T00:00:00+09:00',
    status:'ACTIVE',
  };
  MOCK.coopVoteAgenda = [
    { id:'ag1', no:1, title:'2025 회계연도 결산 승인의 건',        desc:'감사 승인 완료 · 자료 열람 가능',   status:'PASSED',  status_label:'가결'  },
    { id:'ag2', no:2, title:'2026 사업계획 및 예산 승인의 건',      desc:'루트에너지 협력 예산 포함',        status:'PASSED',  status_label:'가결'  },
    { id:'ag3', no:3, title:'고달면 태양광 출자 승인의 건',         desc:'현재 투표 중 · 마감 4.25',         status:'ACTIVE',  status_label:'진행중'},
    { id:'ag4', no:4, title:'정관 일부 개정의 건',                  desc:'출자금 한도 상향 · 500→1,000만',    status:'PENDING', status_label:'예정'  },
  ];
  MOCK.coopVoteHistory = [
    { id:'hv1', title:'2025 하반기 배당률 결정', closed_at:'2025-12-20', result:'PASSED',   agree_pct:0.894 },
    { id:'hv2', title:'이사장 선임 건',           closed_at:'2025-11-05', result:'PASSED',   agree_pct:0.942 },
    { id:'hv3', title:'타 지역 사업 투자 건',      closed_at:'2025-09-18', result:'REJECTED', agree_pct:0.421 },
  ];

  // ─── 운영 KPI
  MOCK.adminKpis = {
    as_of:'2026-04-23',
    mau:           { value:612, goal:500,  delta_label:'목표 500 달성 ✓' },
    verified:      { value:184, goal:150,  delta_label:'목표 150 달성 ✓' },
    daily_queries: { value: 67, trend_pct_wow: +0.13, delta_label:'↑ 13% 전주' },
    haebit_done:   { value: 28, goal: 20,  delta_label:'목표 20 달성 ✓' },
    weekly_queries:[52, 67, 74, 58, 91, 43, 38],  // 월~일
  };
  MOCK.adminTopQueries = [
    { rank:1, title:'시민펀드 참여 방법',       count:94, pct:0.34, note:'FAQ 승격 검토' },
    { rank:2, title:'고달면 사업 진행 현황',    count:58, pct:0.21, note:'상세 정보 요청 다수' },
    { rank:3, title:'주민참여형 자격 요건',     count:41, pct:0.15, note:'거리 기준 혼동' },
    { rank:4, title:'REC 수익 배분 구조',       count:28, pct:0.10, note:'설명 콘텐츠 보강 필요' },
  ];
  MOCK.adminQueryLogs = [
    { id:'ql1', question:'시민펀드 어떻게 가입해요?',    similar_count:94, avg_satisfaction:4.2 },
    { id:'ql2', question:'고달면 사업 언제 시작해요?',   similar_count:58, avg_satisfaction:null, note:'답변 일관성 점검 필요' },
    { id:'ql3', question:'인접주민이 뭐에요?',           similar_count:41, avg_satisfaction:null, note:'용어 설명 콘텐츠 필요' },
    { id:'ql4', question:'REC 수익 어떻게 나눠요?',      similar_count:28, avg_satisfaction:null },
  ];
  MOCK.adminDocs = [
    { id:'doc1', title:'곡성군 2026 재생에너지 기본계획.pdf', file_type:'pdf',  visibility:'L2', uploaded_at:'2026-04-18', chunks:14, questions_hit:28 },
    { id:'doc2', title:'고달면 태양광 주민설명회 자료.hwp',    file_type:'hwp',  visibility:'L1', uploaded_at:'2026-04-12', chunks: 8, questions_hit:12 },
    { id:'doc3', title:'군민조합 정관 v2.docx',                 file_type:'docx', visibility:'L0', uploaded_at:'2026-03-28', chunks:22, questions_hit:41 },
  ];

  // ─── 운영 · 조합 운영 (배당 파이프라인 등)
  MOCK.adminDividendPipeline = {
    period: { id:'dp-2026h1', start:'2025-10-01', end:'2026-03-31' },
    eligible_members: 1231,
    total_amount: 42340000,
    per_member_avg: 34395,
    state: 'REVIEW',
    steps: [
      { key:'DRAFT',    label:'DRAFT',    sub:'계산 완료 · 4.10',    done:true,  current:false },
      { key:'REVIEW',   label:'REVIEW',   sub:'조합장 검토 중',        done:false, current:true  },
      { key:'APPROVED', label:'APPROVED', sub:'감사 서명 필요',        done:false, current:false },
      { key:'PAID',     label:'PAID',     sub:'지급 실행',            done:false, current:false },
    ],
    chair_approval:   { by:'정○○', status:'PENDING' },
    auditor_signing:  { by:'강○○', status:'NOT_STARTED' },
    voucher:          { api_connected:true, target_members:1231, per_avg:34395, prepare_lead_days:3, expected_return_krw:42340000 },
  };
  MOCK.adminMemberLogs = [
    { id:'mlog1', kind:'join_approved',  actor:'#0318', target:'#1248 윤○희',   summary:'출자금 1,000,000 원 입금 확인 · 승인자 정○○',        at:'2026-04-23T09:55:00+09:00', tx_hash:'3f1c…b02a' },
    { id:'mlog2', kind:'account_changed',actor:'#0318', target:'#0912 박○수',   summary:'농협 352-**-****-52 → 352-**-****-89 · 본인인증 완료', at:'2026-04-23T09:43:00+09:00', tx_hash:'a82e…491d' },
    { id:'mlog3', kind:'method_changed', actor:'#0318', target:'#0654 이○자',   summary:'계좌 → 곡성사랑상품권 (+3%)',                          at:'2026-04-23T08:55:00+09:00', tx_hash:'9c02…ef78' },
    { id:'mlog4', kind:'withdraw_request',actor:'#0287',target:'#0287 최○○',   summary:'출자금 환급 예정 · 총회 의결 대기',                    at:'2026-04-23T06:55:00+09:00', tx_hash:'1d54…7a0b' },
    { id:'mlog5', kind:'join_pending',   actor:null,    target:'김○호 외 2명', summary:'주소 증빙 확인 필요',                                   at:'2026-04-23T00:00:00+09:00', tx_hash:null },
  ];
  MOCK.adminVoucherBatch = {
    currency:'곡성사랑상품권', api_connected:true,
    total_funding:29598640, principal:28736544, bonus_pct:0.03, bonus:862096,
    target_members:838, per_avg:35320, prepare_lead_days:3,
    expected_local_return_krw:25158844, last_year_return_rate:0.875,
  };
  MOCK.adminFlags = [
    { key:'sms_enabled',            label:'SMS 알림 발송',            enabled:true  },
    { key:'excel_export_enabled',   label:'엑셀 내보내기',            enabled:true  },
    { key:'multi_dividend_enabled', label:'복수 배당 기간',           enabled:false },
    { key:'online_join_enabled',    label:'온라인 자가 가입',          enabled:true  },
    { key:'virtual_acct_enabled',   label:'가상계좌 자동 감지',        enabled:false },
    { key:'voucher_api_enabled',    label:'곡성사랑상품권 API',       enabled:true  },
  ];

  // ═════════════════════════════════════════════════════════════════════════
  // API 메서드
  // ═════════════════════════════════════════════════════════════════════════

  // ─── auth
  const auth = {
    // POST /api/auth/login/kakao → { data: {user, token} }
    kakaoLogin:        () => config.useMock ? mock({ user: MOCK.me, token: 'mock-jwt' }) : request('POST','/api/auth/login/kakao'),
    // POST /api/auth/verify/pass
    verifyPass:        () => config.useMock ? mock({ verified:true, at:new Date().toISOString() }) : request('POST','/api/auth/verify/pass'),
    // POST /api/auth/verify/residence  body:{ region_code, emd_code }
    verifyResidence:   (body) => config.useMock ? mock({ verified:true, ...body, at:new Date().toISOString() }) : request('POST','/api/auth/verify/residence', body),
    // POST /api/auth/logout
    logout:            () => config.useMock ? mock({ ok:true }) : request('POST','/api/auth/logout'),
    // GET  /api/auth/me → { data: user }
    me:                () => config.useMock ? mock(MOCK.me) : request('GET','/api/auth/me'),
    // POST /api/auth/roles/toggle-admin (데모 전용 — 운영 시 role RBAC 로 대체)
    toggleAdminDemo:   () => config.useMock ? mock({ roles: MOCK.me.roles.includes('admin') ? ['resident','member'] : ['resident','member','admin'] }) : request('POST','/api/auth/roles/toggle-admin'),
  };

  // ─── regions
  const regions = {
    // GET /api/regions
    list:              () => config.useMock ? mock(MOCK.regions) : request('GET','/api/regions'),
    // GET /api/regions/:code
    get:               (code) => config.useMock ? mock(MOCK.regions.find(r => r.code === code) || null) : request('GET',`/api/regions/${code}`),
    // GET /api/regions/:code/emds
    emds:              (code) => config.useMock ? mock(MOCK.emds.filter(e => e.region_code === code)) : request('GET',`/api/regions/${code}/emds`),
    // GET /api/regions/:code/candidates
    candidates:        (code) => config.useMock ? mock(MOCK.candidates.filter(c => MOCK.emds.find(e => e.code === c.emd_code && e.region_code === code))) : request('GET',`/api/regions/${code}/candidates`),
    // GET /api/regions/:code/projects
    projects:          (code) => config.useMock ? mock(MOCK.projects.filter(p => p.region_code === code)) : request('GET',`/api/regions/${code}/projects`),
    // GET /api/regions/:code/substations
    substations:       (code) => config.useMock ? mock(MOCK.substations.filter(s => s.region_code === code)) : request('GET',`/api/regions/${code}/substations`),
    // GET /api/regions/:code/geojson  (EMD 폴리곤. 현재는 shapefile 변환본을 window.GOKSEONG_EMD_GEOJSON 로 로드)
    geojson:           (code) => config.useMock ? mock(window.GOKSEONG_EMD_GEOJSON || { type:'FeatureCollection', features:[] }) : request('GET',`/api/regions/${code}/geojson`),
  };

  // ─── home
  const home = {
    // GET /api/home/feed?region=
    feed:              (region) => config.useMock ? mock(MOCK.homeFeed) : request('GET','/api/home/feed', null, { region }),
    // GET /api/home/news?region=
    news:              (region) => config.useMock ? mock(MOCK.homeNews) : request('GET','/api/home/news', null, { region }),
  };

  // ─── chat (free)
  const chat = {
    // POST /api/chat/free  body:{ question, region }  → { data: { answer_html, sources[] } }
    ask: async (question, region) => {
      if (!config.useMock) return request('POST','/api/chat/free', { question, region });
      await sleep(config.mockLatencyMs);
      const matched = MOCK.freeReplies[question];
      if (matched) return { data: { answer_html: '<em>(mock) app.js freeReplies 참조</em>', sources: matched.sources } };
      return { data: { answer_html: `<p>"<strong>${question}</strong>"에 대한 답변 준비 중 (mock).</p>`, sources: ['곡성군 에너지팀 안내'] } };
    },
  };

  // ─── haebit (진단)
  const haebit = {
    // GET  /api/haebit/flow → 단계 정의
    flow:              () => config.useMock ? mock(MOCK.haebitFlow) : request('GET','/api/haebit/flow'),
    // POST /api/haebit/sessions  body:{ region }  → { data:{ session_id } }
    startSession:      (region) => config.useMock ? mock({ session_id:'hb-' + Date.now(), region }) : request('POST','/api/haebit/sessions', { region }),
    // PATCH /api/haebit/sessions/:id/steps/:key  body:{ value }
    submitStep:        (sessionId, key, value) => config.useMock ? mock({ session_id:sessionId, key, value, ok:true }) : request('PATCH',`/api/haebit/sessions/${sessionId}/steps/${key}`, { value }),
    // GET  /api/haebit/sessions/:id/lookup/parcels?addr=
    lookupParcels:     (sessionId, addr) => config.useMock ? mock({ addr, parcels: [
                          { id:'A', label:'산 23-1', area_m2:1820, land_use:'임야',         use_ok:true  },
                          { id:'B', label:'산 23-2', area_m2:2140, land_use:'임야',         use_ok:true  },
                          { id:'C', label:'산 24',   area_m2:1560, land_use:'임야',         use_ok:true  },
                          { id:'D', label:'전 215',  area_m2: 860, land_use:'농지',          use_ok:true  },
                          { id:'E', label:'답 216',  area_m2: 920, land_use:'농지',          use_ok:true  },
                          { id:'F', label:'대 217',  area_m2: 420, land_use:'대지 (제외)',   use_ok:false },
                          { id:'G', label:'이우 임야', area_m2:1680, land_use:'상수원보호구역', use_ok:false },
                        ]}) : request('GET',`/api/haebit/sessions/${sessionId}/lookup/parcels`, null, { addr }),
    // GET /api/haebit/sessions/:id/lookup/regulation?parcels=
    lookupRegulation:  (sessionId, parcels) => config.useMock ? mock({
                          checks:[['농업진흥구역','해당 없음 ✓'],['산림보전지역','해당 없음 ✓'],['문화재·상수원 보호구역','해당 없음 ✓'],['계획관리지역','일부 포함 ⚠']],
                          verdict:'조건부 가능 · 관리지역 세부검토 권고'
                        }) : request('GET',`/api/haebit/sessions/${sessionId}/lookup/regulation`, null, { parcels:parcels.join(',') }),
    // GET /api/haebit/sessions/:id/lookup/solar
    lookupSolar:       (sessionId) => config.useMock ? mock({
                          annual_kwh_m2_day:3.82, vs_national_pct:0.95, yearly_hours:1380, mw_yield_mwh:1380
                        }) : request('GET',`/api/haebit/sessions/${sessionId}/lookup/solar`),
    // GET /api/haebit/sessions/:id/lookup/grid
    lookupGrid:        (sessionId) => config.useMock ? mock({
                          nearest_sub:'옥과 154kV', distance_km:3.2, total_mw:40, residual_mw:14.7, feasible:true, note:'선착순 협의'
                        }) : request('GET',`/api/haebit/sessions/${sessionId}/lookup/grid`),
    // POST /api/haebit/sessions/:id/finalize → 종합 결과
    finalize:          (sessionId) => config.useMock ? mock({
                          signal:'GREEN', signal_label:'조건부 가능 · 다음 단계 권장',
                          capacity_mw:1.8, total_cost_eok:25.2, yearly_revenue_eok:4.0, fund_raise_eok:0.99,
                          next_steps:['곡성군 에너지팀 상담 예약','루트에너지 전문가 연결','주민 설명회 지원 요청']
                        }) : request('POST',`/api/haebit/sessions/${sessionId}/finalize`),
    // GET /api/haebit/sessions/me
    history:           () => config.useMock ? mock([]) : request('GET','/api/haebit/sessions/me'),
  };

  // ─── coop (조합원 뷰)
  const coop = {
    // GET /api/coop/me  (내 자산 요약)
    me:                () => config.useMock ? mock(MOCK.coopMe) : request('GET','/api/coop/me'),
    // GET /api/coop/me/dividends  (수령 내역)
    myDividends:       () => config.useMock ? mock(MOCK.coopMyDividends) : request('GET','/api/coop/me/dividends'),
    // GET /api/coop/me/projects
    myProjects:        () => config.useMock ? mock(MOCK.coopMyProjects) : request('GET','/api/coop/me/projects'),
    // GET /api/coop/me/activity
    myActivity:        () => config.useMock ? mock(MOCK.coopMyActivity) : request('GET','/api/coop/me/activity'),

    // 명부
    // GET /api/coop/members?q=&distance=&status=&page=&page_size=
    members: async (q, filters) => {
      if (!config.useMock) return request('GET','/api/coop/members', null, { q, ...(filters||{}) });
      await sleep(config.mockLatencyMs);
      let rows = MOCK.coopMembers.rows;
      if (q) rows = rows.filter(m => m.name.includes(q) || m.address.includes(q));
      if (filters?.distance) rows = rows.filter(m => m.distance === filters.distance);
      if (filters?.status)   rows = rows.filter(m => m.status === filters.status);
      return { data: rows, meta: { ...MOCK.coopMembers.summary, page:1, page_size:rows.length, shown:rows.length, total:MOCK.coopMembers.summary.total } };
    },
    membersSummary:    () => config.useMock ? mock(MOCK.coopMembers.summary) : request('GET','/api/coop/members/summary'),
    // GET /api/coop/members/applications  (승인 대기)
    pendingApps:       () => config.useMock ? mock(MOCK.coopMembers.pending_applications) : request('GET','/api/coop/members/applications'),
    // POST /api/coop/members — body:{ name, address, contribution, ... } (신규 등록)
    registerMember:    (body) => config.useMock ? mock({ id:'new-' + Date.now(), status:'PENDING', ...body }) : request('POST','/api/coop/members', body),
    // POST /api/coop/members/applications/:id/approve
    approveApp:        (appId) => config.useMock ? mock({ id:appId, status:'ACTIVE', approved_at:new Date().toISOString() }) : request('POST',`/api/coop/members/applications/${appId}/approve`),

    // 투표
    votes: {
      current:         () => config.useMock ? mock(MOCK.coopVoteCurrent) : request('GET','/api/coop/votes/current'),
      agenda:          () => config.useMock ? mock(MOCK.coopVoteAgenda) : request('GET','/api/coop/votes/agenda'),
      history:         () => config.useMock ? mock(MOCK.coopVoteHistory) : request('GET','/api/coop/votes/history'),
      // POST /api/coop/votes/:id/ballot  body:{ choice: 'AGREE'|'DISAGREE'|'ABSTAIN' }
      cast:            (voteId, choice) => config.useMock ? mock({ vote_id:voteId, choice, at:new Date().toISOString(), tx_hash:'mock…' + Math.random().toString(16).slice(2,6) }) : request('POST',`/api/coop/votes/${voteId}/ballot`, { choice }),
    },
  };

  // ─── admin
  const admin = {
    // GET /api/admin/kpis?region=
    kpis:              (region) => config.useMock ? mock(MOCK.adminKpis) : request('GET','/api/admin/kpis', null, { region }),
    // GET /api/admin/queries/top
    topQueries:        () => config.useMock ? mock(MOCK.adminTopQueries) : request('GET','/api/admin/queries/top'),
    // GET /api/admin/queries/logs?from=&to=
    queryLogs:         (range) => config.useMock ? mock(MOCK.adminQueryLogs) : request('GET','/api/admin/queries/logs', null, range),
    // POST /api/admin/queries/:id/promote → FAQ 승격
    promoteToFaq:      (queryId, body) => config.useMock ? mock({ faq_id:'faq-' + Date.now(), from_query:queryId, ...body }) : request('POST',`/api/admin/queries/${queryId}/promote`, body),

    // 문서
    docs: {
      list:            () => config.useMock ? mock(MOCK.adminDocs, { total:42, last_updated_at:'2026-04-21' }) : request('GET','/api/admin/docs'),
      // multipart 로 업로드 (mock 에서는 형태만)
      upload:          (fileMeta) => config.useMock ? mock({ id:'doc-' + Date.now(), status:'indexing', ...fileMeta }) : request('POST','/api/admin/docs', fileMeta),
      setVisibility:   (id, level) => config.useMock ? mock({ id, visibility:level }) : request('PATCH',`/api/admin/docs/${id}/visibility`, { level }),
    },

    // 조합 운영
    dividend: {
      pipeline:        () => config.useMock ? mock(MOCK.adminDividendPipeline) : request('GET','/api/admin/coop/dividends/current'),
      approve:         (periodId) => config.useMock ? mock({ period_id:periodId, state:'APPROVED' }) : request('POST',`/api/admin/coop/dividends/${periodId}/approve`),
      auditSign:       (periodId) => config.useMock ? mock({ period_id:periodId, audit_signed:true }) : request('POST',`/api/admin/coop/dividends/${periodId}/audit-sign`),
      transferFile:    (periodId) => config.useMock ? mock({ preview_url:'mock://transfer.xlsx', rows:1231 }) : request('GET',`/api/admin/coop/dividends/${periodId}/transfer-file`),
      notifyMembers:   (periodId) => config.useMock ? mock({ sent:1231 }) : request('POST',`/api/admin/coop/dividends/${periodId}/notify`),
    },
    memberLogs:        () => config.useMock ? mock(MOCK.adminMemberLogs) : request('GET','/api/admin/coop/member-logs'),
    voucherBatch:      () => config.useMock ? mock(MOCK.adminVoucherBatch) : request('GET','/api/admin/voucher/batch/current'),

    // 기능 플래그
    flags: {
      list:            () => config.useMock ? mock(MOCK.adminFlags) : request('GET','/api/admin/flags'),
      // PUT /api/admin/flags/:key  body:{ enabled }
      set:             (key, enabled) => config.useMock ? mock({ key, enabled }) : request('PUT',`/api/admin/flags/${key}`, { enabled }),
    },
  };

  // ─── 공개 객체
  root.API = { config, auth, regions, home, chat, haebit, coop, admin, _MOCK: MOCK };
})(window);
