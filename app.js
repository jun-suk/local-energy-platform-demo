// ═══════════════════════════════════════════
// 로컬에너지플랫폼 — 클라이언트 로직
// ═══════════════════════════════════════════

const state = {
  user: {
    name: '윤태환',
    kakaoId: 'juns****@kakao.com',
    verified: true,       // 주민인증 완료
    region: 'gokseong',
    roles: ['resident', 'member'], // 'admin'은 토글로 추가
  },
  view: 'home',
  region: { name: '곡성군', prov: '전라남도', code: 'gokseong' },
  haebit: { step: 0, answers: {}, active: false },
  chartsInited: {},
  selectedEmd: null,
  selectedCand: null,
};

function hasRole(r) { return state.user.roles.includes(r); }

const viewTitles = {
  'home': ['홈'],
  'chat-free': ['AI 에이전트', '자유 문의'],
  'chat-haebit': ['AI 에이전트', '햇빛소득 진단'],
  'dashboard': ['지역', '대시보드'],
  'coop': ['협동조합', '조합 현황'],
  'coop-members': ['협동조합', '조합원 명부'],
  'coop-vote': ['협동조합', '총회 · 의결'],
  'admin-home': ['운영', '대시보드'],
  'admin-docs': ['운영', '문서 관리'],
  'admin-logs': ['운영', '질의 로그'],
  'admin-coop': ['운영', '조합 운영'],
};

function toggleAdmin() {
  const has = hasRole('admin');
  state.user.roles = has
    ? state.user.roles.filter(r => r !== 'admin')
    : [...state.user.roles, 'admin'];
  applyRoleUI();
  go(has ? 'home' : 'admin-home');
  closeUserMenu();
}

function applyRoleUI() {
  const admin = hasRole('admin');
  document.getElementById('nav-admin').style.display = admin ? '' : 'none';
  const chip = document.getElementById('role-admin');
  if (chip) chip.classList.toggle('on', admin);
  const pillRole = document.getElementById('user-pill-role');
  if (pillRole) {
    pillRole.innerHTML = admin
      ? '<span class="dot-ok"></span>운영자 · 곡성군청'
      : '<span class="dot-ok"></span>주민 인증 · 곡성군';
  }
}

function openUserMenu() { document.getElementById('user-menu').classList.toggle('open'); }
function closeUserMenu() { document.getElementById('user-menu').classList.remove('open'); }
function openLoginSheet() { document.getElementById('login-sheet').classList.add('open'); closeUserMenu(); }
function closeLoginSheet() { document.getElementById('login-sheet').classList.remove('open'); }
function openNotif() { /* placeholder */ }

// legacy entry point for any stale callers
function setMode(m) { if (m === 'admin' && !hasRole('admin')) toggleAdmin(); else if (m === 'resident' && hasRole('admin')) toggleAdmin(); }

function toggleRegion() {
  document.getElementById('region-menu').classList.toggle('open');
}
function selectRegion(name, prov, code) {
  state.region = { name, prov, code };
  document.getElementById('region-name').textContent = name;
  document.querySelector('.region-sub').textContent = prov + ' · 파일럿 1호';
  document.getElementById('region-menu').classList.remove('open');
  go(state.view);
}

function go(view) {
  state.view = view;
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.view === view));
  const [root, leaf] = viewTitles[view] || ['', ''];
  const bcRoot = document.getElementById('bc-root');
  const bcLeaf = document.getElementById('bc-leaf');
  if (bcRoot) bcRoot.textContent = root;
  if (bcLeaf) bcLeaf.textContent = leaf;

  // show mascot on home/chat views
  const shouldShowMascot = ['home', 'chat-free', 'chat-haebit'].includes(view);
  const mode = document.body.dataset.mascot || 'chat';
  const mascot = document.getElementById('mascot-float');
  if (mascot) mascot.style.display =
    (mode === 'off') ? 'none' :
    (mode === 'full') ? '' :
    (mode === 'chat' && shouldShowMascot) ? '' : 'none';

  renderView();
}

function renderView() {
  const c = document.getElementById('content');
  // clear selection on any view change
  state.selectedEmd = null;
  state.selectedCand = null;
  c.innerHTML = views[state.view] ? views[state.view]() : '<div class="card"><div class="card-bd">준비 중입니다.</div></div>';
  // init any charts
  queueMicrotask(() => {
    if (state.view === 'home') initDashCharts();
    if (state.view === 'dashboard') initMapDash();
    if (state.view === 'coop') initCoopCharts();
    if (state.view === 'admin-home') initAdminCharts();
    if (state.view === 'chat-haebit') {
      if (!state.haebit.active) state.haebit = { step: 0, answers: {}, active: true };
      renderHaebitChat();
    }
  });
}

// ═══════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════
const views = {};

views.home = () => `
  <div class="stack">
    <div class="hero">
      <div class="hero-content">
        <div class="hero-greeting"><span class="dot"></span>안녕하세요, 윤태환 님 · 곡성군 주민</div>
        <div class="hero-title">재생에너지,<br>우리 마을에서 우리가 주인이 되는 플랫폼</div>
        <div class="hero-desc">궁금한 것 물어보기, 우리 마을 진단받기, 우리 조합</div>
      </div>
      <div class="hero-mascot">
        <div class="hero-mascot-card">
          <div class="hero-mascot-img"><img src="assets/character.png" alt="에너지 히어로 마스코트"></div>
          <div class="hero-mascot-text">
            <div class="n">에너지 히어로</div>
            <div class="s">안녕하세요! 곡성 AI 길잡이예요.<br>무엇이든 편하게 물어보세요.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="entry-grid">
      <div class="entry" onclick="go('chat-free')">
        <div class="entry-ic">
          <svg viewBox="0 0 24 24"><path d="M4 4h16v13H10l-4 4v-4H4V4z" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>
        </div>
        <div>
          <h3>궁금한 점 답해드려요</h3>
          <p>재생에너지, 우리 지역 이야기, 정책<br>- 어려운 말은 쉽게 풀어드려요.</p>
        </div>
        <div class="entry-foot">물어보기 <svg viewBox="0 0 16 16" width="12" height="12"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></div>
      </div>

      <div class="entry" onclick="go('coop')">
        <div class="entry-ic">
          <svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="16" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 20c0-3 2-5 5-5s5 2 5 5M11 20c0-3 2-5 5-5s5 2 5 5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>
        </div>
        <div>
          <h3>우리 조합</h3>
          <p>조합원 현황·배당·총회 안건<br>우리 조합의 모든 소식을 한눈에.</p>
        </div>
        <div class="entry-foot">조합 보기 <svg viewBox="0 0 16 16" width="12" height="12"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></div>
      </div>

      <div class="entry" onclick="go('dashboard')">
        <div class="entry-ic">
          <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="9" r="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>
        </div>
        <div>
          <h3>우리 지역 지도</h3>
          <p>우리 군 어디에 발전소가 들어올 수 있는지,<br>진행 중인 사업은 어디인지 지도로 보세요.</p>
        </div>
        <div class="entry-foot">지도 열기 <svg viewBox="0 0 16 16" width="12" height="12"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></div>
      </div>
    </div>

    <div class="card">
      <div class="card-hd">
        <div><div class="card-tt">우리 동네 소식</div><div class="card-sub">곧 열리는 설명회와 진행 중인 사업</div></div>
        <span class="badge bd-blue">자동 수집</span>
      </div>
      <div class="card-bd">
        <div class="proj-row">
          <div class="proj-ic"><svg viewBox="0 0 16 16"><path d="M3 3h10v10H3z M3 6h10" stroke="currentColor" stroke-width="1.4" fill="none"/></svg></div>
          <div style="flex:1">
            <div class="proj-name">곡성군 신·재생에너지 군민참여 조례(안) 주민설명회</div>
            <div class="proj-desc">2026.05.14 · 곡성군청 대강당 · 주민참여 30% 권고안 설명</div>
          </div>
          <span class="proj-st st-pending">예정</span>
        </div>
        <div class="proj-row">
          <div class="proj-ic"><svg viewBox="0 0 16 16"><path d="M2 13l4-4 3 3 5-6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></div>
          <div style="flex:1">
            <div class="proj-name">고달면 5MW 태양광 군민조합 1차 모집 준비 중</div>
            <div class="proj-desc">연 목표 수익률 9% · 1인당 최대 500만원 · 6월 공고 예정</div>
          </div>
          <span class="proj-st st-plan">준비</span>
        </div>
        <div class="proj-row">
          <div class="proj-ic"><svg viewBox="0 0 16 16"><path d="M8 2l2 5h5l-4 3 1.5 5L8 12l-4.5 3L5 10 1 7h5z" stroke="currentColor" stroke-width="1.4" fill="none"/></svg></div>
          <div style="flex:1">
            <div class="proj-name">신안군민펀드 4차 모집 완료 (참고 사례)</div>
            <div class="proj-desc">군민 2,340명 참여 · 42억원 조성 · 연 10% 수익률 · 2026.04</div>
          </div>
          <span class="proj-st st-run">완료</span>
        </div>
      </div>
    </div>

    <!-- 최신뉴스 -->
    <div class="home-news">
      <div class="hn-hd">
        <div class="hn-title">최신뉴스</div>
        <button class="hn-more" onclick="toast('전체 뉴스 페이지는 연결 예정입니다')">전체보기 ›</button>
      </div>
      <div class="hn-grid">
        <a class="hn-card" href="javascript:toast('외부 기사 — 전기신문')">
          <div class="hn-thumb"><img src="assets/news-1.png" alt="루트에너지 햇빛바람 펀드 앱 출시"/></div>
          <div class="hn-body">
            <div class="hn-headline">루트에너지, 햇빛바람 펀드 플랫폼 '루트펀드' 앱 출시</div>
            <div class="hn-meta"><span>전기신문</span><span class="hn-dot">·</span><span>2026-01-28</span></div>
          </div>
        </a>
        <a class="hn-card" href="javascript:toast('외부 기사 — 이투데이')">
          <div class="hn-thumb"><img src="assets/news-2.png" alt="재생에너지 그린 P2P 두배 성장"/></div>
          <div class="hn-body">
            <div class="hn-headline">"재생에너지에 투자해볼까"…태양광·풍력 '그린 P2P' 두배 성장 [온실가…</div>
            <div class="hn-meta"><span>이투데이</span><span class="hn-dot">·</span><span>2025-11-14</span></div>
          </div>
        </a>
        <a class="hn-card" href="javascript:toast('외부 기사 — 전자신문')">
          <div class="hn-thumb"><img src="assets/news-3.png" alt="핀테크 기업 ESG 수익화"/></div>
          <div class="hn-body">
            <div class="hn-headline">핀테크 기업, ESG로 수익화까지</div>
            <div class="hn-meta"><span>전자신문</span><span class="hn-dot">·</span><span>2025-08-14</span></div>
          </div>
        </a>
      </div>
    </div>
  </div>
`;
views.dashboard = () => {
  // top 5 suitability
  const sorted = [...GS_EMDS].sort((a,b) => b.suitability - a.suitability);
  const top5 = sorted.slice(0, 5);
  return `
  <div class="map-dash">
    <aside class="md-side" id="md-side-panel">
      <div class="md-profile">
        <div class="md-prof-hd">
          <div>
            <div class="md-prof-title">📍 곡성군 · 전라남도</div>
            <div class="md-prof-sub">섬진강 유역 · 장미와 기차의 고장 · 파일럿 1호</div>
          </div>
        </div>
        <div class="md-prof-kpi">
          <div><span>법정면</span><strong>${GS_EMDS.length}</strong></div>
          <div><span>적합 부지</span><strong>${GS_CANDIDATES.length}</strong></div>
          <div><span>진행 사업</span><strong>${GS_ZONES.length}</strong></div>
          <div><span>변전소</span><strong>${GS_SUBS.length}</strong></div>
        </div>
      </div>

      <div class="md-sec">
        <div class="md-sec-tt">🗺 레이어</div>
        <div class="md-layers">
          <div class="md-layer">
            <div class="md-lay-sw" style="background:linear-gradient(90deg,#EF4444,#F59E0B,#60A5FA,#10B981)"></div>
            <div class="md-lay-info"><div class="md-lay-n">법정면 (적합도)</div><div class="md-lay-d">11개 면 · 색상=종합 점수</div></div>
            <label class="md-tog"><input type="checkbox" id="tog-법정면" checked onchange="toggleMapLayer('법정면')"><span></span></label>
          </div>
          <div class="md-layer">
            <div class="md-lay-sw" style="background:#10B981;border:2px dashed #059669;border-radius:4px"></div>
            <div class="md-lay-info"><div class="md-lay-n" style="color:#059669">적합 부지 후보</div><div class="md-lay-d">${GS_CANDIDATES.length}곳 · 점수 58-91</div></div>
            <label class="md-tog"><input type="checkbox" id="tog-적합부지" checked onchange="toggleMapLayer('적합부지')"><span></span></label>
          </div>
          <div class="md-layer">
            <div class="md-lay-sw" style="background:rgba(162,155,254,0.7);border:1px solid rgba(162,155,254,0.4)"></div>
            <div class="md-lay-info"><div class="md-lay-n" style="color:#a29bfe">진행 사업</div><div class="md-lay-d">계획·인허가·운영</div></div>
            <label class="md-tog"><input type="checkbox" id="tog-사업" checked onchange="toggleMapLayer('사업')"><span></span></label>
          </div>
          <div class="md-layer">
            <div class="md-lay-sw" style="background:#f59e0b;border-radius:50%"></div>
            <div class="md-lay-info"><div class="md-lay-n" style="color:#f59e0b">변전소</div><div class="md-lay-d">154kV 계통 접속점</div></div>
            <label class="md-tog"><input type="checkbox" id="tog-변전" checked onchange="toggleMapLayer('변전')"><span></span></label>
          </div>
        </div>
      </div>

      <div class="md-sec">
        <div class="md-sec-tt">🏆 적합도 상위 5개 면</div>
        <div class="md-ranklist">
          ${top5.map((e,i) => {
            const c = suitColor(e.suitability);
            return `
              <div class="md-rank" onclick="selectEmd('${e.cd}')">
                <div class="md-rank-n">${i+1}</div>
                <div class="md-rank-bd">
                  <div class="md-rank-nm">${e.nm}</div>
                  <div class="md-rank-sub">${e.constraint || ''}</div>
                </div>
                <div class="md-rank-sc" style="background:${c.fill}">${e.suitability}</div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <div class="md-sec">
        <div class="md-sec-tt">🎯 주목 후보지</div>
        <div class="md-ranklist">
          ${[...GS_CANDIDATES].sort((a,b)=>b.score-a.score).slice(0,4).map(c => {
            const emd = GS_EMDS.find(e=>e.cd===c.emd);
            const cc = suitColor(c.score);
            return `
              <div class="md-rank" onclick="selectCandidate('${c.id}')">
                <div class="md-rank-bd">
                  <div class="md-rank-nm">${c.nm}</div>
                  <div class="md-rank-sub">${emd?emd.nm:''} · ${c.type} · ${Math.round(c.area_m2/10)}kW</div>
                </div>
                <div class="md-rank-sc" style="background:${cc.fill}">${c.score}</div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </aside>

    <div class="md-map-wrap">
      <div id="md-map"></div>
      <div class="md-map-ov">
        <div class="md-ov-title">곡성군 법정면 적합도 지도</div>
        <div class="md-ov-sub">마우스 올리면 미리보기 · 클릭하면 상세 정보 · 색상=적합도</div>
      </div>
      <div class="md-zoom">
        <button onclick="window._gsMap && window._gsMap.zoomIn()">+</button>
        <button onclick="window._gsMap && window._gsMap.zoomOut()">−</button>
      </div>
      <div class="md-legend">
        <div class="md-lg-tt">적합도</div>
        <div class="md-lg-row"><div class="md-lg-dot" style="background:#10B981"></div>85+ 최상</div>
        <div class="md-lg-row"><div class="md-lg-dot" style="background:#22D3A1"></div>75+ 우수</div>
        <div class="md-lg-row"><div class="md-lg-dot" style="background:#60A5FA"></div>65+ 양호</div>
        <div class="md-lg-row"><div class="md-lg-dot" style="background:#F59E0B"></div>55+ 보통</div>
        <div class="md-lg-row"><div class="md-lg-dot" style="background:#EF4444"></div>&lt;55 낮음</div>
      </div>
    </div>

    <aside class="md-drawer" id="md-drawer"></aside>
    <div id="md-hover" class="md-hover"></div>
  </div>
`;};

// Legacy chart dashboard (retained but unused — replaced by map)
views['dashboard-legacy'] = () => `
  <div class="stack">
    <div class="grid-4">
      <div class="stat-box"><div class="stat-lbl">재생에너지 설비 용량</div><div class="stat-val">18.4<span class="stat-unit">MW</span></div><div class="stat-delta">↑ 2.1 전년</div></div>
      <div class="stat-box"><div class="stat-lbl">오늘의 SMP</div><div class="stat-val">94.2<span class="stat-unit">원/kWh</span></div><div class="stat-delta dn">↓ 1.8</div></div>
      <div class="stat-box"><div class="stat-lbl">REC 평균</div><div class="stat-val">69.3<span class="stat-unit">원</span></div><div class="stat-delta">↑ 0.4</div></div>
      <div class="stat-box"><div class="stat-lbl">계통 여유율</div><div class="stat-val">38.5<span class="stat-unit">%</span></div><div class="stat-delta">양호</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-hd">
          <div><div class="card-tt">읍면별 계통 여유 현황</div><div class="card-sub">새 발전소를 붙일 수 있는 여유 용량</div></div>
          <span class="badge bd-blue">한전 공개자료</span>
        </div>
        <div class="card-bd">
          <svg class="heat-svg" viewBox="0 0 360 240" xmlns="http://www.w3.org/2000/svg">
            <g font-family="Pretendard,sans-serif">
              ${heatCell(10, 10, '곡성읍', 38, '#D97706')}
              ${heatCell(120, 10, '오곡면', 74, '#0EA5A3')}
              ${heatCell(230, 10, '삼기면', 61, '#14B8A6')}
              ${heatCell(10, 68, '석곡면', 55, '#3B82F6')}
              ${heatCell(120, 68, '목사동면', 31, '#D97706')}
              ${heatCell(230, 68, '죽곡면', 9, '#DC2626')}
              ${heatCell(10, 126, '고달면', 42, '#3B82F6')}
              ${heatCell(120, 126, '옥과면', 68, '#0EA5A3')}
              ${heatCell(230, 126, '입면', 57, '#14B8A6')}
              ${heatCell(10, 184, '겸면', 70, '#0EA5A3')}
              ${heatCell(120, 184, '오산면', 53, '#3B82F6')}
            </g>
          </svg>
          <div class="heat-legend">
            <span><span class="heat-dot" style="background:#0EA5A3"></span>여유 (60%+)</span>
            <span><span class="heat-dot" style="background:#3B82F6"></span>양호 (40~60%)</span>
            <span><span class="heat-dot" style="background:#D97706"></span>보통 (20~40%)</span>
            <span><span class="heat-dot" style="background:#DC2626"></span>포화</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-hd">
          <div><div class="card-tt">주요 변전소 잔여용량</div><div class="card-sub">발전소 연결 가능 용량</div></div>
          <span class="badge bd-ok">L2 전용</span>
        </div>
        <div class="card-bd">
          <div class="sub-list">
            <div><div class="sub-pin ok">A</div><div class="sub-meta"><div class="sub-name">곡성 154kV 변전소</div><div class="sub-addr">곡성읍 교촌리 · 업데이트 2026.03</div></div><div class="sub-cap"><div class="sub-bar"><div style="width:64%;background:var(--ok);"></div></div><div class="sub-num">38.4 MW</div></div></div>
            <div><div class="sub-pin warn">B</div><div class="sub-meta"><div class="sub-name">옥과 154kV 변전소</div><div class="sub-addr">옥과면 · 업데이트 2026.03</div></div><div class="sub-cap"><div class="sub-bar"><div style="width:37%;background:var(--warn);"></div></div><div class="sub-num">14.7 MW</div></div></div>
            <div><div class="sub-pin warn">C</div><div class="sub-meta"><div class="sub-name">순창 154kV (겸면 연계)</div><div class="sub-addr">겸면 접속점 · 업데이트 2026.03</div></div><div class="sub-cap"><div class="sub-bar"><div style="width:37%;background:var(--warn);"></div></div><div class="sub-num">22.1 MW</div></div></div>
            <div><div class="sub-pin full">D</div><div class="sub-meta"><div class="sub-name">구례 154kV (남부 연계)</div><div class="sub-addr">고달·죽곡면 접속점</div></div><div class="sub-cap"><div class="sub-bar"><div style="width:9%;background:var(--danger);"></div></div><div class="sub-num">5.3 MW</div></div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-hd"><div><div class="card-tt">전기 도매가 추이 (6개월)</div><div class="card-sub">SMP · 원/kWh</div></div><span class="badge bd-blue">전력거래소</span></div>
        <div class="card-bd"><div class="chart-wrap"><canvas id="smpChart"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-hd"><div><div class="card-tt">곡성군 설비 누적 추이</div><div class="card-sub">연도별 설치 용량 · MW</div></div><span class="badge bd-ok">에너지공단</span></div>
        <div class="card-bd"><div class="chart-wrap"><canvas id="trendChart"></canvas></div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-hd">
        <div><div class="card-tt">재생에너지 적합 부지 · 진행 사업</div><div class="card-sub">곡성군 내 검토/진행 중인 사업들</div></div>
        <span class="badge bd-ok">L2 전용</span>
      </div>
      <div class="card-bd">
        <div class="proj-row">
          <div class="proj-ic"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></div>
          <div style="flex:1"><div class="proj-name">고달면 두가리 5MW 태양광 (군민조합 연계)</div><div class="proj-desc">파일럿 시범사업 · 군민펀드 1차 준비 · 2027 착공 목표</div></div>
          <span class="proj-st st-plan">계획</span>
        </div>
        <div class="proj-row">
          <div class="proj-ic"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></div>
          <div style="flex:1"><div class="proj-name">옥과면 구산리 8MW 태양광</div><div class="proj-desc">인허가 진행 중 · 주민참여형 지정 검토</div></div>
          <span class="proj-st st-pending">인허가</span>
        </div>
        <div class="proj-row">
          <div class="proj-ic"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></div>
          <div style="flex:1"><div class="proj-name">죽곡면 영농형 태양광 2MW</div><div class="proj-desc">주민 설명회 예정 · 농업 겸업형</div></div>
          <span class="proj-st st-pending">검토</span>
        </div>
        <div class="proj-row">
          <div class="proj-ic"><svg viewBox="0 0 16 16"><path d="M4 12c4-8 4 0 8-8" stroke="currentColor" stroke-width="1.4" fill="none"/></svg></div>
          <div style="flex:1"><div class="proj-name">섬진강 소수력 발전 0.5MW</div><div class="proj-desc">운영 중 · 곡성읍 교촌리</div></div>
          <span class="proj-st st-run">운영중</span>
        </div>
      </div>
    </div>
  </div>
`;

function heatCell(x, y, name, pct, color) {
  return `
    <rect x="${x}" y="${y}" width="100" height="50" fill="${color}" opacity="0.85" rx="6"/>
    <text x="${x+50}" y="${y+24}" text-anchor="middle" fill="#fff" font-size="11.5" font-weight="600">${name}</text>
    <text x="${x+50}" y="${y+40}" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="10">여유 ${pct}%</text>
  `;
}

// ─── Chat: Free Question ────────────────
views['chat-free'] = () => `
  <div class="chat-page">
    <div class="chat-hd">
      <div class="chat-hd-ico"><img src="assets/character.png" alt=""></div>
      <div>
        <div class="chat-hd-title">에너지 히어로 · 자유 문의</div>
        <div class="chat-hd-sub"><span class="badge bd-ok" style="padding:1px 6px;">● 온라인</span>재생에너지 · 곡성 히스토리 · 정책 · 주민수용성</div>
      </div>
      <div class="chat-hd-meta">
        <span class="badge bd-ink">출처 표기</span>
        <span class="badge bd-blue">곡성군 RAG</span>
      </div>
    </div>

    <div class="chat-area themed" style="flex:1">
      <div class="chat-box" id="chat-free-box">
        ${renderMsg('ai', `
          <p>안녕하세요! 곡성군 에너지 히어로이에요. 👋</p>
          <p>재생에너지가 뭔지, 우리 군 역사나 정책, 주민분들이 가장 궁금해하시는 주민수용성 이야기까지<br>— 어려운 용어는 제가 쉽게 풀어드릴게요.</p>
          <div class="quick-pills">
            <button class="qp" onclick="sendQ('태양광이 우리 마을에 들어오면 뭐가 좋나요?')">태양광 장단점</button>
            <button class="qp" onclick="sendQ('REC가 뭔가요? 쉽게 설명해주세요')">REC 쉽게 설명</button>
            <button class="qp" onclick="sendQ('곡성군 재생에너지 사업 히스토리가 궁금해요')">곡성 히스토리</button>
            <button class="qp" onclick="sendQ('주민이 참여하는 3가지 방식 알려주세요')">참여 3가지 방식</button>
            <button class="qp" onclick="sendQ('주민수용성을 높이려면 뭐가 중요한가요?')">주민수용성</button>
          </div>
        `)}
      </div>
      <div class="chat-in-bar">
        <textarea class="chat-in" id="chat-in-free" rows="1" placeholder="무엇이든 물어보세요. 어려운 용어는 쉽게 풀어드려요."></textarea>
        <button class="send-btn" onclick="sendFree()"><svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M2 10l16-8-6 8 6 8z"/></svg></button>
      </div>
    </div>
  </div>
`;

// ─── Chat: Haebit 진단 ──────────────────
views['chat-haebit'] = () => `
  <div class="chat-page">
    <div class="chat-hd">
      <div class="chat-hd-ico"><img src="assets/character.png" alt=""></div>
      <div>
        <div class="chat-hd-title">햇빛소득마을 설치 진단</div>
        <div class="chat-hd-sub"><span class="badge bd-ok" style="padding:1px 6px;">● 진단 중</span>9단계 간편 체크 · 약 3분 소요</div>
      </div>
      <div class="chat-hd-meta">
        <span class="badge bd-blue" id="hb-stepbadge">1/9</span>
      </div>
    </div>

    <div class="chat-area themed" style="flex:1">
      <div class="haebit-progress">
        <div class="hp-dots" id="hb-dots"></div>
        <div class="hp-txt" id="hb-txt">진행 0%</div>
      </div>
      <div class="chat-box" id="chat-haebit-box"></div>
      <div class="chat-in-bar">
        <textarea class="chat-in" id="chat-in-haebit" rows="1" placeholder="답변을 선택하거나 직접 입력해주세요"></textarea>
        <button class="send-btn" onclick="sendHaebitText()"><svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M2 10l16-8-6 8 6 8z"/></svg></button>
      </div>
    </div>
  </div>
`;

// ─── Coop: 내 조합 (주민 뷰) ──────────────
views.coop = () => `
  <div class="stack">
    <div class="coop-hero">
      <div class="coop-hero-l">
        <div class="coop-hero-badge"><span class="badge bd-blue">곡성군민에너지협동조합</span><span class="badge bd-ok">조합원 · 윤태환 님</span></div>
        <div class="coop-hero-title">내 에너지 자산</div>
        <div class="coop-hero-sub">출자금 · 펀드 · 배당 내역을 한눈에 볼 수 있어요</div>
      </div>
      <div class="coop-hero-r">
        <div class="me-asset">
          <div class="me-total-lbl">지금까지 지급받은 금액</div>
          <div class="me-total-val">440,000<span>원</span></div>
          <div class="me-total-sub">배당 335,000 · 이자 105,000 · 전액 곡성사랑상품권</div>
        </div>
      </div>
    </div>

    <div class="grid-3">
      <div class="me-card">
        <div class="me-card-hd"><div class="me-card-ic ic-blue">출</div><div class="me-card-tt">출자금</div><span class="badge bd-ok">정상</span></div>
        <div class="me-card-val">5,000,000 <span>원</span></div>
        <div class="me-card-meta">최초 납입 2026.02.20 · 조합원 번호 #0318</div>
        <div class="me-mini-row"><span>지분 비율</span><strong>전체의 1.04%</strong></div>
      </div>
      <div class="me-card">
        <div class="me-card-hd"><div class="me-card-ic ic-teal">펀</div><div class="me-card-tt">곡성군민펀드</div><span class="badge bd-blue">운용 중</span></div>
        <div class="me-card-val">2,400,000 <span>원</span></div>
        <div class="me-card-meta">고달면 5MW 1차 펀드 · 만기 2031.06</div>
        <div class="me-mini-row"><span>약정 수익률</span><strong>연 10%</strong></div>
      </div>
      <div class="me-card">
        <div class="me-card-hd"><div class="me-card-ic ic-amber">수</div><div class="me-card-tt">누적 지급받음</div></div>
        <div class="me-card-val">440,000 <span>원</span></div>
        <div class="me-card-meta">최근 수령 2026.03.30 · 다음 예정 2026.06.30</div>
        <div class="me-mini-row"><span>수령 방식</span><strong>전액 곡성사랑상품권</strong></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-hd"><div><div class="card-tt">내 배당·이자 흐름</div><div class="card-sub">분기별 · 최근 12개월</div></div></div>
        <div class="card-bd">
          <div class="chart-wrap"><canvas id="myDivChart"></canvas></div>
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div><div class="card-tt">수령 내역</div><div class="card-sub">분기별 지급 · 전액 곡성사랑상품권으로 받으셨어요</div></div></div>
        <div class="card-bd">
          <table class="tbl tbl-compact">
            <thead><tr><th>분기</th><th>지급일</th><th>상품권 (배당)</th><th>펀드(이자)</th><th style="text-align:right;">합계</th></tr></thead>
            <tbody>
              <tr><td><strong>2026 Q1</strong></td><td>2026.03.30</td><td class="money">85,000</td><td class="money">28,200</td><td class="money"><strong>113,200</strong></td></tr>
              <tr><td><strong>2025 Q4</strong></td><td>2025.12.30</td><td class="money">82,000</td><td class="money">27,400</td><td class="money"><strong>109,400</strong></td></tr>
              <tr><td><strong>2025 Q3</strong></td><td>2025.09.30</td><td class="money">84,000</td><td class="money">27,800</td><td class="money"><strong>111,800</strong></td></tr>
              <tr><td><strong>2025 Q2</strong></td><td>2025.06.30</td><td class="money">84,000</td><td class="money">21,600</td><td class="money"><strong>105,600</strong></td></tr>
              <tr><td><strong>2025 Q1</strong></td><td>2025.03.30</td><td class="money">0</td><td class="money">0</td><td class="money ink-500">—</td></tr>
            </tbody>
            <tfoot>
              <tr><td colspan="2"><strong>누적</strong></td><td class="money"><strong>335,000</strong></td><td class="money"><strong>105,000</strong></td><td class="money"><strong>440,000</strong></td></tr>
            </tfoot>
          </table>
          <div class="tz-note" style="margin-top:10px;">💡 곡성사랑상품권은 곡성군 전통시장·읍면 가맹점에서 사용하실 수 있어요. 상품권은 곡성군 지역화폐 앱으로 자동 전송됩니다.</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-hd">
        <div><div class="card-tt">내가 참여 중인 사업</div><div class="card-sub">출자금·펀드가 투입된 곡성군 사업</div></div>
        <span class="badge bd-blue">실시간 연동</span>
      </div>
      <div class="card-bd">
        <div class="my-proj">
          <div class="my-proj-hd">
            <div class="my-proj-name">고달면 두가리 태양광 5MW</div>
            <span class="proj-st st-pending">건설 47%</span>
          </div>
          <div class="my-proj-bar"><div style="width:47%;"></div></div>
          <div class="my-proj-meta">
            <div><span>내 출자·펀드</span><strong>2,400,000 원</strong></div>
            <div><span>예상 연 배당</span><strong>220,800 원</strong></div>
            <div><span>착공</span><strong>2026.02 · 준공 2026.11</strong></div>
          </div>
        </div>
        <div class="my-proj">
          <div class="my-proj-hd">
            <div class="my-proj-name">섬진강 소수력 0.5MW</div>
            <span class="proj-st st-run">운영중</span>
          </div>
          <div class="my-proj-bar"><div style="width:100%;background:var(--ok);"></div></div>
          <div class="my-proj-meta">
            <div><span>내 출자금</span><strong>5,000,000 원</strong></div>
            <div><span>누적 수령 배당</span><strong>440,000 원</strong></div>
            <div><span>가동 이력</span><strong>2024~ · 가동률 92%</strong></div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-hd"><div><div class="card-tt">조합 공지·총회</div><div class="card-sub">투표는 '총회 · 의결'에서 참여</div></div></div>
        <div class="card-bd">
          <div class="proj-row"><div class="av-sm" style="width:28px;height:28px;font-size:11px;">3</div><div style="flex:1;"><div class="proj-name">고달면 태양광 출자 승인의 건</div><div class="proj-desc">4.18 발의 · 4.25 마감 · 찬성 82.1%</div></div><button class="btn-primary" style="padding:6px 12px;font-size:11.5px;" onclick="go('coop-vote')">투표 ▸</button></div>
          <div class="proj-row"><div class="av-sm" style="width:28px;height:28px;font-size:11px;">2</div><div style="flex:1;"><div class="proj-name">2026 사업계획 승인</div><div class="proj-desc">4.12 가결 · 찬성 91.0%</div></div><span class="badge bd-ok">가결</span></div>
          <div class="proj-row"><div class="av-sm" style="width:28px;height:28px;font-size:11px;">1</div><div style="flex:1;"><div class="proj-name">2025 결산 승인</div><div class="proj-desc">4.05 가결 · 찬성 93.3%</div></div><span class="badge bd-ok">가결</span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div><div class="card-tt">내 조합 활동 기록</div><div class="card-sub">블록체인 원장 기반 · 변경 불가</div></div></div>
        <div class="card-bd">
          <div class="act-log">
            <div class="act"><div class="act-dot ok"></div><div><div class="act-tt">상반기 배당 수령 (곡성사랑상품권)</div><div class="act-sub">2026.03.30 · 175,200 원</div></div></div>
            <div class="act"><div class="act-dot ok"></div><div><div class="act-tt">고달 펀드 추가 납입</div><div class="act-sub">2026.02.15 · 400,000 원</div></div></div>
            <div class="act"><div class="act-dot"></div><div><div class="act-tt">정기총회 안건 3호 '찬성' 투표</div><div class="act-sub">2026.04.19 · TX f4a8…92e1</div></div></div>
            <div class="act"><div class="act-dot"></div><div><div class="act-tt">조합원 가입 · 본인인증</div><div class="act-sub">2026.02.20 · #0318</div></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

// ─── Coop: Members ───────────────────────
views['coop-members'] = () => {
  const members = [
    ['이영자', '1952년생', '곡성읍 교촌리', 'ADJACENT', '500만', '45,000', 'ACTIVE'],
    ['박상훈', '1968년생', '고달면 두가리', 'ADJACENT', '500만', '45,000', 'ACTIVE'],
    ['김영순', '1945년생', '옥과면 옥과리', 'NEARBY', '300만', '24,800', 'ACTIVE'],
    ['정미경', '1978년생', '죽곡면 원달리', 'GENERAL', '100만', '8,200', 'ACTIVE'],
    ['최봉석', '1960년생', '석곡면 유정리', 'NEARBY', '500만', '45,000', 'ACTIVE'],
    ['한수정', '1985년생', '곡성읍 학산리', 'GENERAL', '50만', '—', 'PENDING'],
    ['윤태환', '1990년생', '삼기면 근촌리', 'GENERAL', '200만', '17,400', 'ACTIVE'],
  ];
  const distMap = { ADJACENT: ['bd-ok', '인접'], NEARBY: ['bd-blue', '근거리'], GENERAL: ['bd-ink', '일반'] };
  const statMap = { ACTIVE: ['bd-ok', '정상'], PENDING: ['bd-warn', '납입 대기'] };
  return `
    <div class="stack">
      <div class="card">
        <div class="card-hd">
          <div><div class="card-tt">조합원 명부</div><div class="card-sub">총 1,247명 · 정상 1,231 · 납입 대기 16</div></div>
          <div style="display:flex;gap:8px;">
            <button class="btn-ghost">엑셀 내보내기</button>
            <button class="btn-primary">+ 신규 등록</button>
          </div>
        </div>
        <div style="padding:12px 18px;display:flex;gap:8px;align-items:center;border-bottom:1px solid var(--ink-100);">
          <input class="fm-text" style="max-width:260px;" placeholder="이름·주소·전화번호로 검색">
          <span class="badge bd-ink">거리 전체</span>
          <span class="badge bd-ink">상태 전체</span>
        </div>
        <div style="overflow-x:auto;">
          <table class="tbl">
            <thead><tr>
              <th>조합원</th><th>주소</th><th>거리 구분</th><th style="text-align:right;">출자금</th><th style="text-align:right;">전년 배당</th><th>상태</th><th></th>
            </tr></thead>
            <tbody>
              ${members.map((m, i) => `
                <tr>
                  <td><div class="avatar-cell"><div class="av-sm">${m[0][0]}</div><div><div class="mn-name">${m[0]}</div><div class="mn-sub">${m[1]}</div></div></div></td>
                  <td>${m[2]}</td>
                  <td><span class="badge ${distMap[m[3]][0]}">${distMap[m[3]][1]}</span></td>
                  <td class="money">${m[4]} 원</td>
                  <td class="money">${m[5]} 원</td>
                  <td><span class="badge ${statMap[m[6]][0]}">${statMap[m[6]][1]}</span></td>
                  <td><button class="btn-ghost" style="padding:4px 10px;font-size:11px;">상세</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="padding:12px 18px;display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:var(--ink-500);border-top:1px solid var(--ink-100);">
          <span>7 / 1,247명 표시</span>
          <div style="display:flex;gap:4px;">
            <button class="btn-icon" style="font-size:11px;">‹</button>
            <button class="btn-icon" style="background:var(--blue-700);color:#fff;border-color:var(--blue-700);">1</button>
            <button class="btn-icon">2</button>
            <button class="btn-icon">3</button>
            <button class="btn-icon">›</button>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-hd"><div><div class="card-tt">최근 가입 신청</div><div class="card-sub">승인 대기 중 · 2인 승인 필요</div></div><span class="badge bd-warn">3건</span></div>
          <div class="card-bd">
            <div class="proj-row"><div class="av-sm" style="width:32px;height:32px;">한</div><div style="flex:1;"><div class="proj-name">한수정 · 곡성읍 학산리</div><div class="proj-desc">출자금 50만 원 · 신청일 2026.04.19</div></div><button class="btn-primary" style="padding:6px 12px;font-size:11.5px;">승인</button></div>
            <div class="proj-row"><div class="av-sm" style="width:32px;height:32px;">오</div><div style="flex:1;"><div class="proj-name">오진혁 · 오산면 가곡리</div><div class="proj-desc">출자금 100만 원 · 신청일 2026.04.20</div></div><button class="btn-primary" style="padding:6px 12px;font-size:11.5px;">승인</button></div>
            <div class="proj-row"><div class="av-sm" style="width:32px;height:32px;">김</div><div style="flex:1;"><div class="proj-name">김은정 · 입면 금산리</div><div class="proj-desc">출자금 300만 원 · 신청일 2026.04.21</div></div><button class="btn-primary" style="padding:6px 12px;font-size:11.5px;">승인</button></div>
          </div>
        </div>
        <div class="card">
          <div class="card-hd"><div><div class="card-tt">출자금 · 배당 요약</div><div class="card-sub">현재 회계연도 기준</div></div></div>
          <div class="card-bd">
            <dl class="kv-list">
              <dt>총 출자금</dt><dd>482,150,000 원</dd>
              <dt>1인 평균</dt><dd>386,000 원</dd>
              <dt>전년 배당 지급</dt><dd>42,340,000 원</dd>
              <dt>다음 배당 예정</dt><dd>2026.09.30</dd>
              <dt>예상 배당률</dt><dd>9.2%</dd>
              <dt>감사 승인</dt><dd>○ 완료 (2026.04.12)</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  `;
};

// ─── Coop: Vote ──────────────────────────
views['coop-vote'] = () => `
  <div class="stack">
    <div class="card">
      <div class="card-hd">
        <div><div class="card-tt">진행 중인 의결 · 총회</div><div class="card-sub">전자 투표 · 실시간 반영</div></div>
        <span class="badge bd-warn">투표 진행 중</span>
      </div>
      <div class="card-bd">
        <div class="vote-card" style="border:none;box-shadow:none;">
          <div class="vote-hd">
            <div>
              <div class="vote-tt">2026년 상반기 정기총회 · 안건 3호</div>
              <div class="vote-sub">고달면 5MW 태양광 발전소 출자 승인의 건 · 마감 2026.04.25 18:00</div>
            </div>
            <span class="badge bd-blue">정족수 842/1,247 (67.5%)</span>
          </div>
          <div class="vote-body">
            <div class="vote-q">
              <strong>발의:</strong> 이사회 (2026.04.12)<br>
              고달면 두가리 5MW 태양광 사업에 <strong>군민조합 출자금 1.2억원 투입</strong>을 승인하고자 합니다. 예상 배당률은 연 9.2%이며, 건설 기간 중 월 진행현황을 조합원 앱으로 공개합니다. 투자 설명회는 2026.04.28 예정.
            </div>
            <div class="vote-bars">
              <div class="vote-bar-row agree">
                <span>찬성</span>
                <div class="vote-bar-bg"><div class="vote-bar-fill" style="width:82%;"></div></div>
                <span class="vote-num">691</span>
                <span class="vote-pct">82.1%</span>
              </div>
              <div class="vote-bar-row disagree">
                <span>반대</span>
                <div class="vote-bar-bg"><div class="vote-bar-fill" style="width:9%;"></div></div>
                <span class="vote-num">76</span>
                <span class="vote-pct">9.0%</span>
              </div>
              <div class="vote-bar-row abstain">
                <span>기권</span>
                <div class="vote-bar-bg"><div class="vote-bar-fill" style="width:9%;"></div></div>
                <span class="vote-num">75</span>
                <span class="vote-pct">8.9%</span>
              </div>
            </div>
            <div class="vote-actions">
              <button class="btn-vote voted">✓ 찬성 (내 투표)</button>
              <button class="btn-vote disagree">반대</button>
              <button class="btn-vote">기권</button>
            </div>
            <div style="margin-top:10px;font-size:11px;color:var(--ink-500);text-align:center;">
              투표 후 24시간 이내 1회 변경 가능합니다. 조합원 본인 인증으로 블록체인 원장에 기록됩니다.
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-hd"><div><div class="card-tt">다음 총회 안건</div><div class="card-sub">2026년 상반기 정기총회 · 4건</div></div></div>
        <div class="card-bd">
          <div class="proj-row"><div class="av-sm" style="width:28px;height:28px;font-size:11px;">1</div><div style="flex:1;"><div class="proj-name">2025 회계연도 결산 승인의 건</div><div class="proj-desc">감사 승인 완료 · 자료 열람 가능</div></div><span class="badge bd-ok">가결</span></div>
          <div class="proj-row"><div class="av-sm" style="width:28px;height:28px;font-size:11px;">2</div><div style="flex:1;"><div class="proj-name">2026 사업계획 및 예산 승인의 건</div><div class="proj-desc">루트에너지 협력 예산 포함</div></div><span class="badge bd-ok">가결</span></div>
          <div class="proj-row"><div class="av-sm" style="width:28px;height:28px;font-size:11px;">3</div><div style="flex:1;"><div class="proj-name">고달면 태양광 출자 승인의 건</div><div class="proj-desc">현재 투표 중 · 마감 4.25</div></div><span class="badge bd-warn">진행중</span></div>
          <div class="proj-row"><div class="av-sm" style="width:28px;height:28px;font-size:11px;">4</div><div style="flex:1;"><div class="proj-name">정관 일부 개정의 건</div><div class="proj-desc">출자금 한도 상향 · 500→1,000만</div></div><span class="badge bd-ink">예정</span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div><div class="card-tt">과거 의결 기록</div><div class="card-sub">블록체인 원장 기반 · 변경 불가</div></div></div>
        <div class="card-bd">
          <div class="proj-row"><div class="proj-ic"><svg viewBox="0 0 16 16"><path d="M4 8l3 3 5-6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></div><div style="flex:1;"><div class="proj-name">2025 하반기 배당률 결정</div><div class="proj-desc">2025.12.20 · 찬성 89.4%</div></div><span class="badge bd-ok">가결</span></div>
          <div class="proj-row"><div class="proj-ic"><svg viewBox="0 0 16 16"><path d="M4 8l3 3 5-6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></div><div style="flex:1;"><div class="proj-name">이사장 선임 건</div><div class="proj-desc">2025.11.05 · 찬성 94.2%</div></div><span class="badge bd-ok">가결</span></div>
          <div class="proj-row"><div class="proj-ic"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5"/></svg></div><div style="flex:1;"><div class="proj-name">타 지역 사업 투자 건</div><div class="proj-desc">2025.09.18 · 찬성 42.1%</div></div><span class="badge bd-danger">부결</span></div>
        </div>
      </div>
    </div>
  </div>
`;

// ─── Admin home ──────────────────────────
views['admin-home'] = () => `
  <div class="stack">
    <div class="coop-banner">
      <div>
        <div class="coop-name">곡성군 운영 대시보드</div>
        <div class="coop-status">
          <span class="badge bd-blue">L3 어드민</span>
          <span>담당자: 곡성군 에너지팀 김○○ 주무관</span>
        </div>
      </div>
      <div class="coop-actions">
        <button class="btn-ghost">보고서 다운</button>
        <button class="btn-primary">+ 문서 업로드</button>
      </div>
    </div>
    <div class="grid-4">
      <div class="stat-box"><div class="stat-lbl">MAU (월간 활성 사용자)</div><div class="stat-val">612<span class="stat-unit">명</span></div><div class="stat-delta">목표 500 달성 ✓</div></div>
      <div class="stat-box"><div class="stat-lbl">주민 인증 완료</div><div class="stat-val">184<span class="stat-unit">명</span></div><div class="stat-delta">목표 150 달성 ✓</div></div>
      <div class="stat-box"><div class="stat-lbl">일평균 AI 질의</div><div class="stat-val">67<span class="stat-unit">건</span></div><div class="stat-delta">↑ 13% 전주</div></div>
      <div class="stat-box"><div class="stat-lbl">햇빛소득 진단 완료</div><div class="stat-val">28<span class="stat-unit">건</span></div><div class="stat-delta">목표 20 달성 ✓</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-hd"><div><div class="card-tt">주간 질의 추이</div></div></div>
        <div class="card-bd"><div class="chart-wrap"><canvas id="adminChart"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-hd"><div><div class="card-tt">상위 질문 카테고리</div></div></div>
        <div class="card-bd">
          <div class="proj-row"><div class="av-sm" style="width:28px;height:28px;font-size:11px;">1</div><div style="flex:1;"><div class="proj-name">시민펀드 참여 방법</div><div class="proj-desc">94건 · FAQ 승격 검토</div></div><span class="badge bd-blue">34%</span></div>
          <div class="proj-row"><div class="av-sm" style="width:28px;height:28px;font-size:11px;">2</div><div style="flex:1;"><div class="proj-name">고달면 사업 진행 현황</div><div class="proj-desc">58건 · 상세 정보 요청 다수</div></div><span class="badge bd-blue">21%</span></div>
          <div class="proj-row"><div class="av-sm" style="width:28px;height:28px;font-size:11px;">3</div><div style="flex:1;"><div class="proj-name">주민참여형 자격 요건</div><div class="proj-desc">41건 · 거리 기준 혼동</div></div><span class="badge bd-blue">15%</span></div>
          <div class="proj-row"><div class="av-sm" style="width:28px;height:28px;font-size:11px;">4</div><div style="flex:1;"><div class="proj-name">REC 수익 배분 구조</div><div class="proj-desc">28건 · 설명 콘텐츠 보강 필요</div></div><span class="badge bd-blue">10%</span></div>
        </div>
      </div>
    </div>
  </div>
`;

views['admin-docs'] = () => `
  <div class="stack">
    <div class="card">
      <div class="card-hd"><div><div class="card-tt">문서 업로드</div><div class="card-sub">PDF·HWP·DOCX·XLSX 지원 · 자동 RAG 색인</div></div></div>
      <div class="card-bd">
        <div style="border:2px dashed var(--ink-200);border-radius:10px;padding:30px;text-align:center;background:var(--ink-50);">
          <div style="font-size:24px;opacity:0.4;">⬆</div>
          <div style="font-size:13px;font-weight:500;color:var(--ink-700);margin-top:6px;">파일을 드래그하거나 클릭하여 업로드</div>
          <div style="font-size:11px;color:var(--ink-500);margin-top:4px;">공개 범위(L0~L3)는 업로드 후 지정합니다</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-hd"><div><div class="card-tt">최근 문서</div><div class="card-sub">총 42개 · 마지막 업데이트 2026.04.21</div></div></div>
      <div class="card-bd">
        <div class="proj-row"><div class="proj-ic">📄</div><div style="flex:1;"><div class="proj-name">곡성군 2026 재생에너지 기본계획.pdf</div><div class="proj-desc">업로드 2026.04.18 · 14개 청크 · 질의 28건</div></div><span class="badge bd-ok">L2 주민전용</span></div>
        <div class="proj-row"><div class="proj-ic">📄</div><div style="flex:1;"><div class="proj-name">고달면 태양광 주민설명회 자료.hwp</div><div class="proj-desc">업로드 2026.04.12 · 8개 청크 · 질의 12건</div></div><span class="badge bd-blue">L1 회원</span></div>
        <div class="proj-row"><div class="proj-ic">📄</div><div style="flex:1;"><div class="proj-name">군민조합 정관 v2.docx</div><div class="proj-desc">업로드 2026.03.28 · 22개 청크 · 질의 41건</div></div><span class="badge bd-ink">L0 공개</span></div>
      </div>
    </div>
  </div>
`;

views['admin-logs'] = () => `
  <div class="stack">
    <div class="card">
      <div class="card-hd"><div><div class="card-tt">AI 질의 로그</div><div class="card-sub">최근 7일 · 467건</div></div><div style="display:flex;gap:8px;"><button class="btn-ghost">필터</button><button class="btn-primary">FAQ로 승격</button></div></div>
      <div class="card-bd">
        <div class="proj-row"><div class="av-sm">94</div><div style="flex:1;"><div class="proj-name">"시민펀드 어떻게 가입해요?"</div><div class="proj-desc">유사 질문 94건 · 평균 응답 만족도 4.2/5</div></div><button class="btn-ghost" style="padding:5px 10px;font-size:11.5px;">답변 보기</button></div>
        <div class="proj-row"><div class="av-sm">58</div><div style="flex:1;"><div class="proj-name">"고달면 사업 언제 시작해요?"</div><div class="proj-desc">유사 질문 58건 · 답변 일관성 점검 필요</div></div><button class="btn-ghost" style="padding:5px 10px;font-size:11.5px;">답변 보기</button></div>
        <div class="proj-row"><div class="av-sm">41</div><div style="flex:1;"><div class="proj-name">"인접주민이 뭐에요?"</div><div class="proj-desc">유사 질문 41건 · 용어 설명 콘텐츠 필요</div></div><button class="btn-ghost" style="padding:5px 10px;font-size:11.5px;">답변 보기</button></div>
        <div class="proj-row"><div class="av-sm">28</div><div style="flex:1;"><div class="proj-name">"REC 수익 어떻게 나눠요?"</div><div class="proj-desc">유사 질문 28건</div></div><button class="btn-ghost" style="padding:5px 10px;font-size:11.5px;">답변 보기</button></div>
      </div>
    </div>
  </div>
`;

views['admin-coop'] = () => `
  <div class="stack">
    <div class="grid-4">
      <div class="stat-box"><div class="stat-lbl">조합원 (승인 대기)</div><div class="stat-val">3<span class="stat-unit">명</span></div><div class="stat-delta neutral">일괄 승인 →</div></div>
      <div class="stat-box"><div class="stat-lbl">명부 변경 로그 (7일)</div><div class="stat-val">42<span class="stat-unit">건</span></div><div class="stat-delta">감사 서명 완료</div></div>
      <div class="stat-box"><div class="stat-lbl">배당 집행 상태</div><div class="stat-val" style="font-size:16px;">REVIEW<span class="stat-unit"></span></div><div class="stat-delta neutral">조합장 승인 대기</div></div>
      <div class="stat-box"><div class="stat-lbl">지역화폐 API</div><div class="stat-val" style="font-size:16px;">연동 완료<span class="stat-unit"></span></div><div class="stat-delta">곡성사랑상품권</div></div>
    </div>

    <div class="card">
      <div class="card-hd">
        <div><div class="card-tt">배당 집행 파이프라인 · 2026년 상반기</div><div class="card-sub">DRAFT → REVIEW → APPROVED → PAID · 4단계 상태머신, 2인 이상 승인 필수</div></div>
        <span class="badge bd-warn">현재 REVIEW 단계</span>
      </div>
      <div class="card-bd">
        <div class="state-flow">
          <div class="sf-step done"><div class="sf-badge">1</div><div class="sf-lbl">DRAFT</div><div class="sf-sub">계산 완료 · 4.10</div></div>
          <div class="sf-line done"></div>
          <div class="sf-step curr"><div class="sf-badge">2</div><div class="sf-lbl">REVIEW</div><div class="sf-sub">조합장 검토 중</div></div>
          <div class="sf-line"></div>
          <div class="sf-step"><div class="sf-badge">3</div><div class="sf-lbl">APPROVED</div><div class="sf-sub">감사 서명 필요</div></div>
          <div class="sf-line"></div>
          <div class="sf-step"><div class="sf-badge">4</div><div class="sf-lbl">PAID</div><div class="sf-sub">지급 실행</div></div>
        </div>
        <div class="div-grid">
          <dl class="kv-list">
            <dt>정산 기간</dt><dd>2025.10.01 ~ 2026.03.31</dd>
            <dt>기준일 조합원</dt><dd>1,231명 (ACTIVE)</dd>
            <dt>총 배당 재원</dt><dd class="money-lg">42,340,000 원</dd>
            <dt>1인 평균</dt><dd>34,395 원</dd>
            <dt>조합장 승인</dt><dd><span class="badge bd-warn">대기</span> 정○○</dd>
            <dt>감사 서명</dt><dd><span class="badge bd-ink">미착수</span> 강○○</dd>
          </dl>
          <div class="voucher-only">
            <div class="vo-hd">
              <div class="vo-ic">💳</div>
              <div>
                <div class="vo-title">전액 곡성사랑상품권으로 지급</div>
                <div class="vo-sub">곡성군 지역화폐 API 연동 · 조합원 전원 일괄 발행</div>
              </div>
              <span class="badge bd-ok">API 연동 완료</span>
            </div>
            <div class="vo-body">
              <div class="vo-row"><span>대상 조합원</span><strong>1,231명</strong></div>
              <div class="vo-row"><span>1인 평균</span><strong>34,395 원</strong></div>
              <div class="vo-row"><span>지역 환류 예상</span><strong>약 42,340,000 원</strong></div>
              <div class="vo-row"><span>발행 준비</span><strong>T-3일</strong></div>
            </div>
            <div class="vo-note">상품권은 전통시장·읍면 가맹점에서 사용하실 수 있어요. 수령 후 곡성군 내 소비로 환류돼 지역 경제에 다시 돌아갑니다.</div>
          </div>
        </div>
        <div class="exec-foot">
          <div class="ef-warn"><span>⚠</span> 2인 승인 완료 후 PAID로 전환 · 이체 파일 자동 생성됩니다.</div>
          <div class="ef-btns">
            <button class="btn-ghost">이체 파일 미리보기</button>
            <button class="btn-ghost">조합원에게 안내 발송</button>
            <button class="btn-primary">조합장 승인 요청 ▸</button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-hd">
          <div><div class="card-tt">명부 변경 로그</div><div class="card-sub">블록체인 원장 연동 · 변경 불가</div></div>
          <button class="btn-ghost">전체 보기</button>
        </div>
        <div class="card-bd">
          <div class="log-list">
            <div class="log-item">
              <div class="log-dot new"></div>
              <div class="log-main">
                <div class="log-act"><strong>가입 승인</strong> · 윤○희 (#1248)</div>
                <div class="log-sub">출자금 1,000,000 원 입금 확인 · 승인자 정○○</div>
              </div>
              <div class="log-time">방금 전<br><span class="tx">TX 3f1c…b02a</span></div>
            </div>
            <div class="log-item">
              <div class="log-dot edit"></div>
              <div class="log-main">
                <div class="log-act"><strong>계좌 변경</strong> · 박○수 (#0912)</div>
                <div class="log-sub">농협 352-**-****-52 → 352-**-****-89 · 본인인증 완료</div>
              </div>
              <div class="log-time">12분 전<br><span class="tx">TX a82e…491d</span></div>
            </div>
            <div class="log-item">
              <div class="log-dot edit"></div>
              <div class="log-main">
                <div class="log-act"><strong>수령 방식 변경</strong> · 이○자 (#0654)</div>
                <div class="log-sub">계좌 → <strong>곡성사랑상품권 (+3%)</strong></div>
              </div>
              <div class="log-time">1시간 전<br><span class="tx">TX 9c02…ef78</span></div>
            </div>
            <div class="log-item">
              <div class="log-dot off"></div>
              <div class="log-main">
                <div class="log-act"><strong>탈퇴 신청</strong> · 최○○ (#0287)</div>
                <div class="log-sub">출자금 환급 예정 · 총회 의결 대기</div>
              </div>
              <div class="log-time">3시간 전<br><span class="tx">TX 1d54…7a0b</span></div>
            </div>
            <div class="log-item">
              <div class="log-dot new"></div>
              <div class="log-main">
                <div class="log-act"><strong>승인 대기</strong> · 김○호 외 2명</div>
                <div class="log-sub">주소 증빙 확인 필요</div>
              </div>
              <div class="log-time">오늘<br><span class="tx">—</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-hd">
          <div><div class="card-tt">상품권 집행 준비 현황</div><div class="card-sub">곡성군 지역화폐 API 연동</div></div>
          <span class="badge bd-ok">API 정상</span>
        </div>
        <div class="card-bd">
          <div class="voucher-card">
            <div class="vc-hd">
              <div><div class="vc-tt">곡성사랑상품권</div><div class="vc-sub">재원 · 수령자 · 수수료 자동 계산</div></div>
              <div class="vc-amt">29,598,640<span>원</span></div>
            </div>
            <div class="vc-bars">
              <div class="vc-bar"><span>발행 재원 (원금)</span><div class="vc-bar-bg"><div style="width:100%;background:var(--blue-600);"></div></div><span class="vc-num">28,736,544</span></div>
              <div class="vc-bar"><span>+3% 가산 (조합 부담)</span><div class="vc-bar-bg"><div style="width:3%;background:var(--ok);"></div></div><span class="vc-num">+862,096</span></div>
              <div class="vc-bar"><span>지역 환류 예상액</span><div class="vc-bar-bg"><div style="width:85%;background:#F59E0B;"></div></div><span class="vc-num">≈ 25,158,844</span></div>
            </div>
            <div class="vc-foot">
              <div class="vc-stat"><span>수령 대상</span><strong>838명</strong></div>
              <div class="vc-stat"><span>1인 평균</span><strong>35,320 원</strong></div>
              <div class="vc-stat"><span>발행 준비</span><strong>T-3일</strong></div>
            </div>
          </div>
          <div class="tz-note">
            <strong>💡 지역 환류 효과</strong> · 상품권 수령을 선택한 조합원들의 배당은 약 25,160,000원이 곡성군 내 소비로 돌아올 것으로 예상됩니다. (전년 환류율 87.5%)
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-hd"><div><div class="card-tt">기능 플래그 · EXTRA_CONFIG</div><div class="card-sub">법인별 기능 on/off · 코드 변경 없이 제어</div></div></div>
      <div class="card-bd">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;">
          ${[
            ['sms_enabled', 'SMS 알림 발송', true],
            ['excel_export_enabled', '엑셀 내보내기', true],
            ['multi_dividend_enabled', '복수 배당 기간', false],
            ['online_join_enabled', '온라인 자가 가입', true],
            ['virtual_acct_enabled', '가상계좌 자동 감지', false],
            ['voucher_api_enabled', '곡성사랑상품권 API', true],
          ].map(([k, l, on]) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--ink-50);border-radius:8px;">
              <div><div style="font-size:12px;font-weight:500;color:var(--ink-900);">${l}</div><div style="font-size:10.5px;color:var(--ink-500);font-family:var(--mono);">${k}</div></div>
              <span class="badge ${on ? 'bd-ok' : 'bd-ink'}">${on ? 'ON' : 'OFF'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </div>
`;

// ═══════════════════════════════════════════
// Chat helpers
// ═══════════════════════════════════════════
function renderMsg(who, content, srcs) {
  if (who === 'me') {
    return `<div class="msg me"><div class="msg-av me">강</div><div class="msg-content"><div class="msg-who"><span class="who-name">나</span></div><div class="bubble">${content}</div></div></div>`;
  }
  const src = srcs ? `<div class="src-row">${srcs.map(s => `<span class="src-chip">📄 ${s}</span>`).join('')}</div>` : '';
  return `<div class="msg"><div class="msg-av"><img src="assets/character.png" alt=""></div><div class="msg-content"><div class="msg-who"><span class="who-name">에너지 히어로</span><span>· 곡성군 AI</span></div><div class="bubble">${content}${src}</div></div></div>`;
}

const freeReplies = {
  '태양광이 우리 마을에 들어오면 뭐가 좋나요?': {
    html: `<h4>장단점을 솔직하게 말씀드릴게요.</h4>
<p><strong>좋은 점</strong></p>
<ul><li>마을 소득 발생 (임대료/군민조합 배당, 연 5~10%)</li><li>공사 기간 지역 고용 창출</li><li>탄소중립 기여 · 지역 이미지 개선</li></ul>
<p><strong>조심할 점</strong></p>
<ul><li>경관 변화, 일부 농지 활용 제한</li><li>계통 접속 자리가 있어야 사업 가능</li><li>이익공유 조건은 반드시 문서로 확인 필요</li></ul>
<p>곡성군 <strong>고달면 5MW 태양광</strong>은 군민조합+펀드형으로 진행 중이에요. 조합 가입하시면 참여 가능합니다.</p>`,
    sources: ['곡성군 재생에너지 기본계획 (2026.02)', '루트에너지 조사(2025.11)']
  },
  'REC가 뭔가요? 쉽게 설명해주세요': {
    html: `<h4>REC = 친환경 발전소에 주는 '보너스 수익'</h4>
<p>재생에너지로 전기 1MWh를 만들면 정부가 <strong>인증서 1장</strong>을 발급합니다. 한국전력·발전공기업이 이 인증서를 <strong>의무 구매</strong>해요.</p>
<p>그래서 발전소는 ① SMP(전기값) + ② REC(보너스), 두 번 돈을 받습니다.</p>
<dl class="kv"><dt>태양광 REC 단가</dt><dd>약 69 원/kWh</dd><dt>주민참여 가중치</dt><dd>+0.2 (약 +14원/kWh)</dd><dt>연간 보너스 추가</dt><dd>1MW당 약 1,900만원</dd></dl>
<p>이 보너스가 바로 <strong>인접주민 몫</strong>의 재원이 됩니다.</p>`,
    sources: ['산업통상자원부 RPS 운영지침', '전력거래소 REC 거래정보']
  },
  '곡성군 재생에너지 사업 히스토리가 궁금해요': {
    html: `<h4>곡성군 재생에너지 주요 이정표</h4>
<ul><li><strong>2018</strong> · 섬진강 소수력 0.5MW 가동 (교촌리)</li><li><strong>2022</strong> · 햇빛소득마을 시범사업 첫 선정</li><li><strong>2024</strong> · 에너지전환 조례 제정 (주민참여 20% 권고)</li><li><strong>2025.11</strong> · 루트에너지 타당성 용역 완료</li><li><strong>2026.02</strong> · 곡성군민에너지협동조합 설립 (이사장 정○○)</li><li><strong>2026.04</strong> · 고달면 5MW 태양광 착수 · 이번 플랫폼 파일럿 1호 선정</li></ul>
<p>곡성은 <strong>군민조합+펀드형을 표준 모델</strong>로 시범 적용 중인 첫 지자체예요.</p>`,
    sources: ['곡성군청 에너지팀 (2026.04)', '군민조합 설립 정관']
  },
  '주민이 참여하는 3가지 방식 알려주세요': {
    html: `<h4>주민 참여 3유형 비교</h4>
<p><strong>① 지분형 (주인 되기)</strong> — 발전소의 주주가 됩니다. 수익 높을 수 있지만 초기비용·리스크 큼.</p>
<p><strong>② 채권형 (돈 빌려주기)</strong> — 정해진 이자를 받습니다. 안정적.</p>
<p><strong>③ 펀드형 (여럿이 모으기) ⭐</strong> — 10만원부터 소액 참여. 정기 원리금 수령.</p>
<p>👉 곡성군은 <strong>군민조합+펀드형</strong>을 기본 모델로 제안합니다. 소액 참여 가능 · 안정적 · 투명 관리.</p>`,
    sources: ['루트에너지 조사 보고서(2025.11)']
  },
  '주민수용성을 높이려면 뭐가 중요한가요?': {
    html: `<h4>절차적 정의 + 분배적 정의 + 신뢰, 3가지 축이에요</h4>
<p><strong>절차적 정의</strong> — "우리 모르게" 결정되지 않도록, 기획 단계부터 설명회·공청회 개최.</p>
<p><strong>분배적 정의</strong> — 이익이 외부로 빠지지 않도록, 인접주민·군민 몫을 <strong>문서로 명확히</strong>.</p>
<p><strong>신뢰</strong> — 약속이 지켜지는 구조. 군민조합 가입으로 <strong>실시간 배당 내역 확인</strong> 가능.</p>
<p>정선군 사례 보고서에 따르면, 주민 반대의 실제 원인 1순위는 "사업 자체"가 아니라 "절차의 불공정"이었어요.</p>`,
    sources: ['정선군 사례 보고서 (2025.11)', '루트에너지 주민수용성 연구']
  },
};

function sendQ(q) {
  document.getElementById('chat-in-free').value = q;
  sendFree();
}

function sendFree() {
  const input = document.getElementById('chat-in-free');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  const box = document.getElementById('chat-free-box');
  box.insertAdjacentHTML('beforeend', renderMsg('me', q));
  box.scrollTop = box.scrollHeight;
  setTimeout(() => {
    const reply = freeReplies[q];
    if (reply) {
      box.insertAdjacentHTML('beforeend', renderMsg('ai', reply.html, reply.sources));
    } else {
      box.insertAdjacentHTML('beforeend', renderMsg('ai',
        `<p>"<strong>${q}</strong>"에 대해 답변을 준비하고 있어요.</p><p>현재 베타 단계라 일부 질문은 답변이 제한적입니다. 위의 예시 질문이나 <strong>곡성군 에너지팀(☎ 061-360-XXXX)</strong>으로 직접 문의하실 수 있어요.</p>`,
        ['곡성군 에너지팀 안내']));
    }
    box.scrollTop = box.scrollHeight;
  }, 450);
}

// ═══════════════════════════════════════════
// Haebit chat flow
// ═══════════════════════════════════════════
const haebitSteps = [
  { q: '햇빛소득마을 설치 진단을 도와드릴게요! 먼저 <strong>부지 주소</strong>를 알려주세요.', hint: '도로명·지번 모두 가능합니다. 아래 입력창에 적어주세요.<br>예: 전남 곡성군 고달면 두가리 산 23–1', type: 'input', placeholder: '예: 전남 곡성군 고달면 두가리 산 23-1', key: 'addr' },
  { q: '지도에서 <strong>활용할 필지를 클릭</strong>해 선택해주세요.', hint: '여러 필지 선택 가능 · 다시 클릭하면 제거돼요', type: 'map', key: 'parcels' },
  { q: '선택하신 필지의 <strong>토지 이용 현황</strong>을 공공데이터에서 불러왔어요.', hint: 'VWORLD · 농지은행 · 임야정보', type: 'auto', data: [
    ['지목 구분', '전 · 답 위주 (산림 1필지 포함)'], ['용도지역', '계획관리지역 · 농림지역 혼재'],
    ['경사도', '평균 4° (양호)'], ['점유자', '개인 4 · 곡성군 1 · 한국농어촌공사 1']
  ]},
  { q: '<strong>부지 규제</strong>를 확인했어요.', hint: '환경부 · 머티조팔 · 문화재청 자료 기반', type: 'auto', data: [
    ['농업진흥구역', '해당 없음 ✓'], ['산림보전지역', '해당 없음 ✓'],
    ['문화재·상수원 보호구역', '해당 없음 ✓'], ['계획관리지역', '일부 포함 ⚠']
  ], result: '조건부 가능 · 관리지역 세부검토 권고'},
  { q: '해당 지역의 <strong>햇빛 조건</strong>입니다.', hint: '기상청 일사량 강수교 데이터', type: 'auto', data: [
    ['연 평균 일사량', '3.82 kWh/m²·일'], ['국내 평균 대비', '약 95%'],
    ['연간 발전시간', '약 1,380시간'], ['1MW당 연 발전량', '1,380 MWh']
  ]},
  { q: '<strong>계통 접속</strong> 가능성을 조회했어요.', hint: '한전 계통 정보 기반', type: 'auto', data: [
    ['가까운 변전소', '옥과 154kV (3.2km)'], ['변전소 총용량', '40 MW'],
    ['현재 잔여용량', '14.7 MW'], ['신규 접속', '가능 ✓ 선착순 협의']
  ]},
  { q: '이 부지에 대한 <strong>마을 분위기</strong>는 어떤가요?', hint: '정확하지 않아도 됩니다', type: 'choice', key: 'consent', options: [
    ['high', '대다수 찬성', '이장·주민대표 의견 수렴 완료'], ['mid', '일부 반대 있음', '추가 소통 필요'],
    ['low', '아직 협의 안 함', '공청회·설명회 필요'], ['conflict', '갈등 진행 중', '중재 필요']
  ]},
  { q: '입력하신 조건으로 <strong>예상 규모</strong>를 산정했어요.', hint: '개략 추정치 · 설계 단계에서 조정됨', type: 'auto', dynamic: 'summary' },
  { q: '진단이 완료됐어요!', hint: '다음 단계 안내', type: 'final' },
];

function renderHaebitChat() {
  const box = document.getElementById('chat-haebit-box');
  if (!box) return;
  // Fresh start (step 0) OR returning to an empty box (standalone reload) → greet + first step
  if (state.haebit.step === 0 || !box.innerHTML.trim()) {
    box.innerHTML = renderMsg('ai', '<p>안녕하세요 👋 저는 곡성군 에너지 히어로이에요. <strong>햇빛소득마을 설치 진단</strong>을 도와드릴게요.<br>9단계로 빠르게 체크해요!</p>');
    state.haebit.step = 0;
    setTimeout(() => askHaebitStep(), 400);
  }
  updateHaebitProgress();
}

function askHaebitStep() {
  const box = document.getElementById('chat-haebit-box');
  if (!box) return;
  const i = state.haebit.step;
  const step = haebitSteps[i];
  if (!step) return;
  // reset chat input placeholder by default
  const ci = document.getElementById('chat-in-haebit');
  if (ci && step.type !== 'input') ci.placeholder = '답변을 선택하거나 직접 입력해주세요';

  let formHtml = '';
  if (step.type === 'input') {
    formHtml = `<div class="form-msg"><div class="fm-q">${step.q}</div><div class="fm-hint">${step.hint}</div><div class="fm-pointer">↓ 아래 채팅창에 입력해주세요</div></div>`;
    // focus the bottom input so user just types
    setTimeout(() => document.getElementById('chat-in-haebit')?.focus(), 50);
    // update placeholder
    const ci = document.getElementById('chat-in-haebit');
    if (ci) ci.placeholder = step.placeholder;
  } else if (step.type === 'map') {
    formHtml = renderMapStep(i, step);
  } else if (step.type === 'choice') {
    formHtml = `<div class="form-msg"><div class="fm-q">${step.q}</div><div class="fm-hint">${step.hint}</div><div class="fm-options">${step.options.map(([v, l, h]) => `<button class="fm-opt" onclick="chooseHaebit('${step.key}','${v}','${l}')"><div class="fm-opt-lbl">${l}</div><div class="fm-opt-hint">${h}</div></button>`).join('')}</div></div>`;
  } else if (step.type === 'auto') {
    const data = step.dynamic === 'summary' ? buildSummaryData() : step.data;
    const rows = data.map(([l, v]) => `<dt>${l}</dt><dd>${v}</dd>`).join('');
    formHtml = `<p>${step.q}</p><div class="fm-hint" style="margin-bottom:6px;font-size:11.5px;color:var(--ink-500);">${step.hint}</div><dl class="kv">${rows}</dl>${step.result ? `<p style="margin-top:8px;"><strong>종합 판정:</strong> ${step.result}</p>` : ''}<div class="quick-pills"><button class="qp" onclick="nextHaebit()">다음 단계 ▸</button></div>`;
  } else if (step.type === 'final') {
    const sum = computeSummary();
    const parcels = state.haebit.answers.parcels || [];
    formHtml = `
      <p>진단 결과입니다! 🎉</p>
      <div class="diag-card">
        <div class="diag-signal">🟢 조건부 가능 · 다음 단계 권장</div>
        <div class="diag-title">${state.haebit.answers.addr || '고달면 두가리'} · ${parcels.length}필지 · 약 ${sum.capMW} MW 태양광</div>
        <div class="diag-desc">일사량·계통·부지조건 모두 양호. 관리지역 세부검토와 주민 설명회만 보완하면 진행할 수 있어요.</div>
        <div class="diag-nums">
          <div class="diag-num"><div class="n-l">예상 용량</div><div class="n-v">${sum.capMW} MW</div></div>
          <div class="diag-num"><div class="n-l">총사업비</div><div class="n-v">${sum.costEok} 억</div></div>
          <div class="diag-num"><div class="n-l">연 수익</div><div class="n-v">${sum.revEok} 억</div></div>
        </div>
      </div>
      <p style="margin-top:12px;"><strong>다음 단계 추천</strong></p>
      <ul><li>곡성군 에너지팀 상담 예약</li><li>루트에너지 전문가 연결</li><li>주민 설명회 지원 요청</li></ul>
      <div class="quick-pills">
        <button class="qp" onclick="go('coop')">협동조합 가입 ▸</button>
        <button class="qp" onclick="resetHaebit()">다시 진단하기</button>
      </div>
    `;
  }

  const box2 = document.getElementById('chat-haebit-box');
  box2.insertAdjacentHTML('beforeend', renderMsg('ai', formHtml));
  box2.scrollTop = box2.scrollHeight;
}

function chooseHaebit(key, val, label) {
  state.haebit.answers[key] = val;
  const box = document.getElementById('chat-haebit-box');
  box.insertAdjacentHTML('beforeend', renderMsg('me', label));
  box.scrollTop = box.scrollHeight;
  nextHaebit();
}

function sendHaebitText() {
  const input = document.getElementById('chat-in-haebit');
  const val = input.value.trim();
  if (!val) return;
  input.value = '';
  const step = haebitSteps[state.haebit.step];
  if (step && step.type === 'input') {
    state.haebit.answers[step.key] = val;
  }
  const box = document.getElementById('chat-haebit-box');
  box.insertAdjacentHTML('beforeend', renderMsg('me', val));
  box.scrollTop = box.scrollHeight;
  nextHaebit();
}

function nextHaebit() {
  state.haebit.step++;
  if (state.haebit.step >= haebitSteps.length) state.haebit.step = haebitSteps.length - 1;
  updateHaebitProgress();
  setTimeout(askHaebitStep, 400);
}

function resetHaebit() {
  state.haebit = { step: 0, answers: {}, active: true };
  document.getElementById('chat-haebit-box').innerHTML = '';
  renderHaebitChat();
}

// ─── Haebit: Map step (부지 선택) ─────────────
const MOCK_PARCELS = [
  { id: 'A', label: '산 23-1', area: 1820, use: '임야', useOk: true,  path: 'M80,140 L170,130 L190,185 L95,200 Z' },
  { id: 'B', label: '산 23-2', area: 2140, use: '임야', useOk: true,  path: 'M170,130 L260,125 L275,180 L190,185 Z' },
  { id: 'C', label: '산 24',   area: 1560, use: '임야', useOk: true,  path: 'M260,125 L330,140 L340,200 L275,180 Z' },
  { id: 'D', label: '전 215',  area: 860,  use: '농지',  useOk: true,  path: 'M95,200 L190,185 L210,245 L110,260 Z' },
  { id: 'E', label: '답 216',  area: 920,  use: '농지',  useOk: true,  path: 'M190,185 L275,180 L290,245 L210,245 Z' },
  { id: 'F', label: '대 217',  area: 420,  use: '대지 (제외)', useOk: false, path: 'M275,180 L340,200 L355,255 L290,245 Z' },
  { id: 'G', label: '이우 임야', area: 1680, use: '상수원보호구역', useOk: false, path: 'M110,260 L290,245 L310,305 L115,315 Z' },
];

function renderMapStep(i, step) {
  if (!state.haebit.answers.parcels) state.haebit.answers.parcels = [];
  const selected = state.haebit.answers.parcels;
  const addr = state.haebit.answers.addr || '곡성군 고달면 두가리';

  const polygons = MOCK_PARCELS.map(p => {
    const isSel = selected.includes(p.id);
    const fill = !p.useOk ? 'rgba(220,38,38,0.18)' : isSel ? 'rgba(29,78,216,0.45)' : 'rgba(59,130,246,0.12)';
    const stroke = !p.useOk ? '#DC2626' : isSel ? '#1D4ED8' : '#64748B';
    const sw = isSel ? 2.2 : 1.2;
    const click = p.useOk ? `onclick="toggleParcel('${p.id}')"` : '';
    const cursor = p.useOk ? 'pointer' : 'not-allowed';
    return `<path d="${p.path}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${p.useOk ? '' : '4,3'}" style="cursor:${cursor};transition:all .15s;" ${click}/>`;
  }).join('');

  const labels = MOCK_PARCELS.map(p => {
    const bbox = getBBox(p.path);
    return `<text x="${bbox.cx}" y="${bbox.cy}" text-anchor="middle" font-size="9" font-weight="600" fill="${p.useOk ? '#1E293B' : '#991B1B'}" style="pointer-events:none;">${p.label}</text>
           <text x="${bbox.cx}" y="${bbox.cy+10}" text-anchor="middle" font-size="7.5" fill="${p.useOk ? '#64748B' : '#991B1B'}" style="pointer-events:none;">${p.use}</text>`;
  }).join('');

  const list = selected.length === 0
    ? `<div class="parcel-empty">지도에서 필지를 클릭해주세요</div>`
    : selected.map(id => {
        const p = MOCK_PARCELS.find(x => x.id === id);
        return `<div class="parcel-item"><div><div class="pi-name">${p.label}</div><div class="pi-meta">${p.use} · ${p.area.toLocaleString()} m²</div></div><button class="pi-rm" onclick="toggleParcel('${p.id}')">×</button></div>`;
      }).join('');

  const totalArea = selected.reduce((a, id) => a + (MOCK_PARCELS.find(x => x.id === id)?.area || 0), 0);
  const canNext = selected.length > 0;

  return `
    <div class="form-msg map-msg">
      <div class="fm-q">${step.q}</div>
      <div class="fm-hint">${step.hint}</div>
      <div class="map-wrap">
        <div class="map-addr"><span>📍</span> ${addr}</div>
        <svg class="map-svg" viewBox="0 0 420 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mapgrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" stroke-width="0.4"/>
            </pattern>
          </defs>
          <rect width="420" height="340" fill="#F1F5F9"/>
          <rect width="420" height="340" fill="url(#mapgrid)"/>
          <path d="M0,90 Q80,80 200,95 T420,110" stroke="#93C5FD" stroke-width="12" fill="none" opacity="0.55"/>
          <text x="330" y="82" font-size="10" fill="#1E40AF" opacity="0.7">섬진강</text>
          <path d="M10,115 Q60,125 120,118 Q190,112 260,118 Q330,124 410,118" stroke="#64748B" stroke-width="1.2" stroke-dasharray="6,4" fill="none"/>
          <text x="370" y="112" font-size="9" fill="#64748B">지방도 18호선</text>
          ${polygons}
          ${labels}
          <circle cx="210" cy="220" r="6" fill="#DC2626" stroke="#fff" stroke-width="2"/>
          <circle cx="210" cy="220" r="12" fill="none" stroke="#DC2626" stroke-width="1.5" opacity="0.4"/>
        </svg>
        <div class="map-legend">
          <span><span class="lg-sq" style="background:rgba(29,78,216,0.45);border-color:#1D4ED8;"></span>선택됨</span>
          <span><span class="lg-sq" style="background:rgba(59,130,246,0.12);border-color:#64748B;"></span>선택 가능</span>
          <span><span class="lg-sq" style="background:rgba(220,38,38,0.18);border-color:#DC2626;border-style:dashed;"></span>제외 (보호구역)</span>
        </div>
      </div>
      <div class="parcel-panel">
        <div class="parcel-head">선택한 부지 · <strong>${selected.length}필지</strong>${totalArea ? ` · ${totalArea.toLocaleString()} m² (약 ${(totalArea / 3.3).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 평)` : ''}</div>
        <div class="parcel-list">${list}</div>
      </div>
      <button class="btn-primary parcel-confirm" ${canNext ? '' : 'disabled'} onclick="confirmParcels()">부지 확정 ▸</button>
    </div>
  `;
}

function getBBox(path) {
  const pts = path.match(/[ML]\s*(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g) || [];
  let xs = [], ys = [];
  pts.forEach(p => { const [x, y] = p.replace(/[ML]\s*/, '').split(',').map(Number); xs.push(x); ys.push(y); });
  return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2 + 2 };
}

function toggleParcel(id) {
  const arr = state.haebit.answers.parcels || [];
  const idx = arr.indexOf(id);
  if (idx >= 0) arr.splice(idx, 1); else arr.push(id);
  state.haebit.answers.parcels = arr;
  // re-render ONLY the map form-msg (last .form-msg.map-msg)
  const mapMsg = document.querySelectorAll('.form-msg.map-msg');
  if (mapMsg.length) {
    const fresh = renderMapStep(state.haebit.step, haebitSteps[state.haebit.step]);
    // unwrap the outer form-msg — we re-inject inner HTML
    const tmp = document.createElement('div');
    tmp.innerHTML = fresh;
    const newNode = tmp.firstElementChild;
    mapMsg[mapMsg.length - 1].replaceWith(newNode);
  }
}

function confirmParcels() {
  const arr = state.haebit.answers.parcels || [];
  if (arr.length === 0) return;
  const summary = arr.map(id => MOCK_PARCELS.find(p => p.id === id)?.label).join(', ');
  const box = document.getElementById('chat-haebit-box');
  box.insertAdjacentHTML('beforeend', renderMsg('me', `선택한 부지: ${summary} (총 ${arr.length}필지)`));
  box.scrollTop = box.scrollHeight;
  nextHaebit();
}

function computeSummary() {
  const arr = state.haebit.answers.parcels || [];
  const totalArea = arr.reduce((a, id) => a + (MOCK_PARCELS.find(x => x.id === id)?.area || 0), 0);
  // 약 10m² = 1kW 태양광 설치 용량 가정
  const capKW = Math.max(50, Math.round(totalArea / 10));
  const capMW = (capKW / 1000).toFixed(1);
  const costEok = ((capKW / 1000) * 14).toFixed(1); // 1MW ≈ 14억
  const revEok = ((capKW / 1000) * 2.2).toFixed(1); // 1MW ≈ 2.2억/년
  const fundEok = ((capKW / 1000) * 0.55).toFixed(2);
  return { capKW, capMW, costEok, revEok, fundEok, totalArea };
}

function buildSummaryData() {
  const s = computeSummary();
  return [
    ['선택 부지 합산', `${(state.haebit.answers.parcels||[]).length}필지 · ${s.totalArea.toLocaleString()} m²`],
    ['예상 발전 용량', `약 ${s.capMW} MW (${s.capKW.toLocaleString()} kW)`],
    ['총사업비 추정', `약 ${s.costEok}억원`],
    ['연간 발전 수익', `약 ${s.revEok}억원`],
    ['군민펀드 조성 가능', `약 ${s.fundEok}억원`],
  ];
}

function updateHaebitProgress() {
  const dots = document.getElementById('hb-dots');
  const txt = document.getElementById('hb-txt');
  const badge = document.getElementById('hb-stepbadge');
  if (!dots) return;
  const total = haebitSteps.length;
  const cur = state.haebit.step;
  dots.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const d = document.createElement('div');
    d.className = 'hp-dot' + (i < cur ? ' done' : i === cur ? ' curr' : '');
    dots.appendChild(d);
  }
  txt.textContent = `${cur + 1} / ${total} 단계`;
  badge.textContent = `${cur + 1}/${total}`;
}

// ═══════════════════════════════════════════
// Charts
// ═══════════════════════════════════════════
function initDashCharts() {
  const smp = document.getElementById('smpChart');
  if (smp && !state.chartsInited.smp) {
    state.chartsInited.smp = true;
    new Chart(smp, {
      type: 'line',
      data: { labels: ['10월','11월','12월','1월','2월','3월','4월'], datasets: [{
        data: [88.5, 91.2, 96.8, 98.1, 95.4, 92.7, 94.2],
        borderColor: '#1D4ED8', backgroundColor: 'rgba(29,78,216,0.08)',
        borderWidth: 2, fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#1D4ED8',
      }]},
      options: chartOpts({ min: 80, max: 105 })
    });
  }
  const trend = document.getElementById('trendChart');
  if (trend && !state.chartsInited.trend) {
    state.chartsInited.trend = true;
    new Chart(trend, {
      type: 'bar',
      data: { labels: ['2020','2021','2022','2023','2024','2025','2026'], datasets: [{
        data: [4.2, 7.1, 9.8, 12.3, 14.7, 16.3, 18.4], backgroundColor: '#3B82F6', borderRadius: 6
      }]},
      options: chartOpts()
    });
  }
}

function initCoopCharts() {
  const myd = document.getElementById('myDivChart');
  if (myd && !state.chartsInited.myd) {
    state.chartsInited.myd = true;
    new Chart(myd, {
      type: 'bar',
      data: { labels: ['2025.03','06','09','12','2026.03'], datasets: [
        { label: '상품권 (배당)', data: [0, 84, 84, 82, 85], backgroundColor: '#0EA5A3', borderRadius: 6, stack: 's' },
        { label: '펀드 (이자)',  data: [0, 21.6, 27.8, 27.4, 28.2], backgroundColor: '#1D4ED8', borderRadius: 6, stack: 's' }
      ]},
      options: Object.assign({}, chartOpts(), {
        plugins: { legend: { display: true, position: 'bottom', labels: { font: { size: 11, family: 'Pretendard' }, color: '#475569', boxWidth: 10, padding: 10 } } },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 10, family: 'Pretendard' } } },
          y: { stacked: true, grid: { color: '#F1F5F9' }, ticks: { color: '#94A3B8', font: { size: 10, family: 'Pretendard' } } }
        }
      })
    });
  }
  const mem = document.getElementById('memChart');
  if (mem && !state.chartsInited.mem) {
    state.chartsInited.mem = true;
    new Chart(mem, {
      type: 'line',
      data: { labels: ['2025.10','11','12','2026.01','02','03','04'], datasets: [{
        data: [342, 480, 612, 780, 938, 1112, 1247], borderColor: '#1D4ED8',
        backgroundColor: 'rgba(29,78,216,0.1)', borderWidth: 2, fill: true, tension: 0.35,
        pointRadius: 3, pointBackgroundColor: '#1D4ED8'
      }]},
      options: chartOpts()
    });
  }
  const dist = document.getElementById('distChart');
  if (dist && !state.chartsInited.dist) {
    state.chartsInited.dist = true;
    new Chart(dist, {
      type: 'doughnut',
      data: { labels: ['인접 (500m)', '근거리 (1km)', '일반 군민'], datasets: [{
        data: [184, 412, 651], backgroundColor: ['#0EA5A3', '#3B82F6', '#94A3B8'], borderWidth: 0
      }]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11, family: 'Pretendard' }, color: '#475569', padding: 10 } } }, cutout: '62%' }
    });
  }
}

function initAdminCharts() {
  const a = document.getElementById('adminChart');
  if (a && !state.chartsInited.admin) {
    state.chartsInited.admin = true;
    new Chart(a, {
      type: 'bar',
      data: { labels: ['월','화','수','목','금','토','일'], datasets: [{
        data: [52, 67, 74, 58, 91, 43, 38], backgroundColor: '#3B82F6', borderRadius: 6
      }]},
      options: chartOpts()
    });
  }
}

function chartOpts(yLim) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 10, family: 'Pretendard' } }},
      y: Object.assign({ grid: { color: '#F1F5F9' }, ticks: { color: '#94A3B8', font: { size: 10, family: 'Pretendard' } }}, yLim || {})
    }
  };
}

// ═══════════════════════════════════════════
// Map dashboard (Leaflet) — Gokseong 법정면 view
// ═══════════════════════════════════════════
// 모든 단위를 "법정면 (EMD)"으로 통일. 각 면마다 인구·농업·계통·규제·일사량·수용성 지표를 갖고
// suitability (0-100)는 이 지표들로 파생된다. 실 배포 시 VWORLD/KOSTAT EMD geojson으로 교체.
//
// 지표 정의:
//   solar    : 연 일사량 대비 상대값 (0-100)
//   grid     : 가장 가까운 변전소 잔여용량 기반 (0-100)
//   land     : 임야·관리지역 비율 (0-100, 농업진흥·보호구역은 감점)
//   accept   : 주민 수용성 (설문·조합원 밀도)
//   proj     : 해당 면에 진행 중인 사업 요약 (선택)
const GS_EMDS = [
  { cd:'gokseong-eup', nm:'곡성읍',   sgg:'곡성군', center:[35.282,127.294],
    pop_total:7824, hh_total:3912, pop_farmer:1212,
    solar:78, grid:92, land:42, accept:71,
    nearest_sub:'곡성 154kV (0.4km)', grid_res:'38.4 MW',
    constraint:'읍 중심부 · 가용지 적음',
    proj:'섬진강 소수력 0.5MW 운영',
    poly:[[35.302,127.275],[35.302,127.320],[35.262,127.330],[35.258,127.282]]},
  { cd:'ogok',         nm:'오곡면',   sgg:'곡성군', center:[35.248,127.280],
    pop_total:1120, hh_total:612, pop_farmer:680,
    solar:82, grid:78, land:64, accept:68,
    nearest_sub:'곡성 154kV (3.1km)', grid_res:'38.4 MW',
    constraint:'농업진흥 일부 · 관리지역 혼재',
    poly:[[35.262,127.255],[35.265,127.298],[35.230,127.304],[35.228,127.260]]},
  { cd:'samgi',        nm:'삼기면',   sgg:'곡성군', center:[35.305,127.242],
    pop_total:1540, hh_total:820, pop_farmer:892,
    solar:80, grid:74, land:62, accept:66,
    nearest_sub:'곡성 154kV (5.2km)', grid_res:'38.4 MW',
    constraint:'농업진흥 비율 높음',
    poly:[[35.320,127.218],[35.325,127.268],[35.288,127.274],[35.285,127.222]]},
  { cd:'seokgok',      nm:'석곡면',   sgg:'곡성군', center:[35.192,127.268],
    pop_total:2110, hh_total:1120, pop_farmer:1150,
    solar:83, grid:72, land:58, accept:64,
    nearest_sub:'구례 154kV (9.8km)', grid_res:'5.3 MW',
    constraint:'계통 포화 · 남부계통 연계 필요',
    poly:[[35.215,127.240],[35.218,127.300],[35.170,127.305],[35.168,127.248]]},
  { cd:'moksadong',    nm:'목사동면', sgg:'곡성군', center:[35.165,127.225],
    pop_total:980, hh_total:520, pop_farmer:512,
    solar:85, grid:58, land:72, accept:58,
    nearest_sub:'구례 154kV (6.4km)', grid_res:'5.3 MW',
    constraint:'계통 포화 경고 · 상수원 일부',
    proj:'고달 5MW 인접 영향권',
    poly:[[35.188,127.200],[35.190,127.250],[35.150,127.256],[35.148,127.205]]},
  { cd:'jukkok',       nm:'죽곡면',   sgg:'곡성군', center:[35.162,127.320],
    pop_total:1540, hh_total:802, pop_farmer:728,
    solar:86, grid:54, land:68, accept:72,
    nearest_sub:'구례 154kV (5.1km)', grid_res:'5.3 MW',
    constraint:'계통 포화 · 영농형 권장',
    proj:'영농형 2MW 검토',
    poly:[[35.185,127.295],[35.188,127.350],[35.145,127.355],[35.142,127.300]]},
  { cd:'godal',        nm:'고달면',   sgg:'곡성군', center:[35.175,127.245],
    pop_total:1890, hh_total:960, pop_farmer:1020,
    solar:87, grid:82, land:74, accept:81,
    nearest_sub:'옥과 154kV (6.2km)', grid_res:'14.7 MW',
    constraint:'적합도 최상 · 파일럿 시범 면',
    proj:'두가리 5MW 태양광 · 파일럿',
    poly:[[35.198,127.220],[35.200,127.270],[35.152,127.276],[35.150,127.225]]},
  { cd:'okgwa',        nm:'옥과면',   sgg:'곡성군', center:[35.322,127.207],
    pop_total:4210, hh_total:2160, pop_farmer:1430,
    solar:79, grid:86, land:52, accept:74,
    nearest_sub:'옥과 154kV (0.3km)', grid_res:'14.7 MW',
    constraint:'계통 접속 우수 · 도심형',
    proj:'구산리 8MW · 인허가 진행',
    poly:[[35.345,127.180],[35.348,127.235],[35.300,127.240],[35.298,127.185]]},
  { cd:'ip',           nm:'입면',     sgg:'곡성군', center:[35.355,127.260],
    pop_total:1340, hh_total:720, pop_farmer:780,
    solar:81, grid:70, land:66, accept:62,
    nearest_sub:'옥과 154kV (5.8km)', grid_res:'14.7 MW',
    constraint:'농지 비율 · 문화재 일부',
    poly:[[35.378,127.234],[35.380,127.288],[35.335,127.292],[35.333,127.240]]},
  { cd:'gyeom',        nm:'겸면',     sgg:'곡성군', center:[35.308,127.170],
    pop_total:1620, hh_total:860, pop_farmer:820,
    solar:80, grid:76, land:70, accept:70,
    nearest_sub:'순창 154kV (4.1km)', grid_res:'22.1 MW',
    constraint:'순창계통 연계 · 양호',
    poly:[[35.330,127.145],[35.332,127.195],[35.288,127.200],[35.286,127.150]]},
  { cd:'osan',         nm:'오산면',   sgg:'곡성군', center:[35.235,127.195],
    pop_total:1430, hh_total:760, pop_farmer:820,
    solar:81, grid:68, land:64, accept:63,
    nearest_sub:'곡성 154kV (8.4km)', grid_res:'38.4 MW',
    constraint:'농업진흥 비율 높음',
    poly:[[35.256,127.168],[35.258,127.220],[35.215,127.226],[35.213,127.172]]},
];

// ── 파생 지표: 종합 적합도 (0-100) = 일사 25% + 계통 30% + 부지 25% + 수용성 20%
GS_EMDS.forEach(e => {
  e.suitability = Math.round(e.solar*0.25 + e.grid*0.30 + e.land*0.25 + e.accept*0.20);
});

// 적합 부지 후보지 (작은 폴리곤, 면 내부에 박힘)
const GS_CANDIDATES = [
  { id:'c1', emd:'godal',     nm:'두가리 임야 A', area_m2:18400, type:'지상형', score:91, flags:['일사 우수','계통 여유','주민 의사 확인'],
    poly:[[35.184,127.238],[35.186,127.252],[35.172,127.254],[35.170,127.240]] },
  { id:'c2', emd:'godal',     nm:'두가리 임야 B', area_m2:9800,  type:'지상형', score:84, flags:['경사 양호','관리지역'],
    poly:[[35.168,127.230],[35.170,127.242],[35.160,127.244],[35.158,127.232]] },
  { id:'c3', emd:'okgwa',     nm:'구산리 유휴지', area_m2:24600, type:'지상형', score:88, flags:['변전소 인접','인허가 중'],
    poly:[[35.322,127.198],[35.324,127.214],[35.312,127.216],[35.310,127.200]] },
  { id:'c4', emd:'jukkok',    nm:'태안리 영농형', area_m2:12400, type:'영농형', score:74, flags:['농업 겸업','계통 포화 유의'],
    poly:[[35.168,127.315],[35.170,127.326],[35.158,127.328],[35.156,127.317]] },
  { id:'c5', emd:'gyeom',     nm:'덕림리 임야',   area_m2:15200, type:'지상형', score:82, flags:['순창 계통 연계'],
    poly:[[35.318,127.158],[35.320,127.172],[35.306,127.174],[35.304,127.160]] },
  { id:'c6', emd:'samgi',     nm:'괴소리 임야',   area_m2:8800,  type:'지상형', score:68, flags:['농업진흥 경계'],
    poly:[[35.312,127.232],[35.314,127.244],[35.304,127.246],[35.302,127.234]] },
  { id:'c7', emd:'seokgok',   nm:'능파리 임야',   area_m2:21000, type:'지상형', score:62, flags:['계통 포화','접속 협의 필요'],
    poly:[[35.196,127.262],[35.198,127.278],[35.184,127.280],[35.182,127.264]] },
  { id:'c8', emd:'moksadong', nm:'용사리 유휴지', area_m2:6400,  type:'영농형', score:58, flags:['계통 포화','상수원 거리 검토'],
    poly:[[35.172,127.218],[35.174,127.230],[35.164,127.232],[35.162,127.220]] },
];

const GS_ZONES = [
  { id:'godal5', name:'고달 5MW', cap:'5 MW', status:'파일럿 · 군민조합 연계', color:'#a29bfe',
    poly:[[35.179,127.236],[35.182,127.254],[35.168,127.256],[35.166,127.238]] },
  { id:'okgwa8', name:'옥과 8MW', cap:'8 MW', status:'인허가 진행 중', color:'#a29bfe', dash:'8 4',
    poly:[[35.328,127.198],[35.330,127.220],[35.315,127.222],[35.313,127.200]] },
  { id:'jukkok2', name:'죽곡 영농형 2MW', cap:'2 MW', status:'검토 · 주민설명회 예정', color:'#a29bfe', dash:'8 4',
    poly:[[35.170,127.315],[35.172,127.328],[35.158,127.330],[35.156,127.317]] },
  { id:'sumjin05', name:'섬진강 소수력', cap:'0.5 MW', status:'운영 중 · 교촌리', color:'#00d4aa',
    poly:[[35.285,127.290],[35.286,127.300],[35.280,127.301],[35.279,127.291]] },
];

const GS_SUBS = [
  { name:'곡성 154kV 변전소', addr:'곡성읍 교촌리', cap:'38.4 MW 잔여', ll:[35.280,127.296], st:'ok' },
  { name:'옥과 154kV 변전소', addr:'옥과면',       cap:'14.7 MW 잔여', ll:[35.322,127.210], st:'warn' },
  { name:'순창 154kV (겸면 연계)', addr:'겸면 접속점', cap:'22.1 MW 잔여', ll:[35.308,127.170], st:'warn' },
  { name:'구례 154kV (남부 연계)', addr:'고달·죽곡', cap:'5.3 MW 잔여',  ll:[35.160,127.280], st:'full' },
];

const GS_CAT_STYLE = null; // deprecated — replaced by suitability ramp

// Suitability → color (blue low ↔ green high)
function suitColor(score) {
  if (score >= 85) return { fill:'#10B981', stroke:'#059669' }; // excellent
  if (score >= 75) return { fill:'#22D3A1', stroke:'#0EA5A3' }; // good
  if (score >= 65) return { fill:'#60A5FA', stroke:'#3B82F6' }; // moderate
  if (score >= 55) return { fill:'#F59E0B', stroke:'#D97706' }; // fair
  return              { fill:'#EF4444', stroke:'#B91C1C' };        // low
}
function suitLabel(score) {
  if (score >= 85) return '최상';
  if (score >= 75) return '우수';
  if (score >= 65) return '양호';
  if (score >= 55) return '보통';
  return '낮음';
}

function initMapDash() {
  const el = document.getElementById('md-map');
  if (!el) return;
  // clear any previous map instance
  if (window._gsMap) { try { window._gsMap.remove(); } catch(e){} window._gsMap = null; }
  const map = L.map('md-map', { center:[35.26,127.26], zoom:11, zoomControl:false, attributionControl:true });
  window._gsMap = map;

  // base: satellite imagery (ESRI World Imagery) — no label overlay so only Gokseong EMDs show names
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution:'Imagery © Esri, Maxar, Earthstar Geographics', maxZoom:19
  }).addTo(map);

  const layers = { '법정면':L.layerGroup(), '사업':L.layerGroup(), '적합부지':L.layerGroup(), '변전':L.layerGroup() };
  window._gsLayers = layers;
  window._gsEmdPolys = {};

  // Build lookup of real geometries from LSMD shapefile (EPSG:5186→WGS84, DP-simplified)
  const realGeom = {};
  if (window.GOKSEONG_EMD_GEOJSON) {
    for (const f of window.GOKSEONG_EMD_GEOJSON.features) {
      // GeoJSON rings are [lng,lat]; Leaflet needs [lat,lng]
      const latlngs = f.geometry.coordinates.map(ring => ring.map(([lng,lat]) => [lat,lng]));
      realGeom[f.properties.slug] = latlngs;
    }
  }

  // 법정면 폴리곤
  GS_EMDS.forEach(emd => {
    const s = suitColor(emd.suitability);
    const geom = realGeom[emd.cd] || [emd.poly]; // real if available, else sketch
    const poly = L.polygon(geom, {
      color: s.stroke, weight: 1.6, opacity: 0.95,
      fillColor: s.fill, fillOpacity: 0.35,
      smoothFactor: 0.8,
    });
    poly._emd = emd;
    window._gsEmdPolys[emd.cd] = poly;
    poly.on('mouseover', (e) => {
      if (state.selectedEmd !== emd.cd) {
        poly.setStyle({ fillOpacity: 0.55, weight: 2.4 });
        poly.bringToFront();
      }
      gsShowHover(e.originalEvent, emd);
    });
    poly.on('mousemove', (e) => gsPosHover(e.originalEvent));
    poly.on('mouseout',  () => {
      if (state.selectedEmd !== emd.cd) {
        poly.setStyle({ fillOpacity: 0.35, weight: 1.6 });
      }
      gsHideHover();
    });
    poly.on('click', () => selectEmd(emd.cd));
    layers['법정면'].addLayer(poly);
    // label: place at real polygon centroid if available, else fall back to emd.center
    let labelPt = emd.center;
    if (realGeom[emd.cd]) {
      try { labelPt = poly.getBounds().getCenter(); labelPt = [labelPt.lat, labelPt.lng]; } catch(e){}
    }
    const lbl = L.divIcon({
      className:'md-emd-lbl',
      html:`<span class="emd-n">${emd.nm}</span><span class="emd-s suit-${suitLabel(emd.suitability)}">${emd.suitability}</span>`,
      iconSize:[92,36], iconAnchor:[46,18]
    });
    L.marker(labelPt, { icon:lbl, interactive:false }).addTo(layers['법정면']);
  });

  // 사업 구역
  GS_ZONES.forEach(z => {
    const poly = L.polygon(z.poly, {
      color: z.color, weight: 2.2, opacity: 0.9,
      fillColor: z.color, fillOpacity: 0.32,
      dashArray: z.dash || null,
    });
    poly.on('mouseover', (e) => {
      poly.setStyle({ fillOpacity: 0.5 });
      gsShowZoneHover(e.originalEvent, z);
    });
    poly.on('mousemove', (e) => gsPosHover(e.originalEvent));
    poly.on('mouseout',  () => { poly.setStyle({ fillOpacity: 0.32 }); gsHideHover(); });
    layers['사업'].addLayer(poly);
    const lbl = L.divIcon({ className:'md-zone-lbl', html:`<span>⚡ ${z.name}</span>`, iconSize:[140,22], iconAnchor:[70,30] });
    L.marker(poly.getBounds().getCenter(), { icon:lbl, interactive:false }).addTo(layers['사업']);
  });

  // 적합 부지 후보지 (star markers + small polygon)
  GS_CANDIDATES.forEach(c => {
    const s = suitColor(c.score);
    const poly = L.polygon(c.poly, {
      color: s.stroke, weight: 1.8, opacity: 0.95,
      fillColor: s.fill, fillOpacity: 0.55,
      dashArray: '3 3',
    });
    poly._cand = c;
    poly.on('mouseover', (e) => {
      poly.setStyle({ fillOpacity: 0.8, weight: 2.5 });
      gsShowCandHover(e.originalEvent, c);
    });
    poly.on('mousemove', (e) => gsPosHover(e.originalEvent));
    poly.on('mouseout',  () => { poly.setStyle({ fillOpacity: 0.55, weight: 1.8 }); gsHideHover(); });
    poly.on('click', () => selectCandidate(c.id));
    layers['적합부지'].addLayer(poly);
    // center pin with score
    const center = poly.getBounds().getCenter();
    const pin = L.divIcon({
      className:'md-cand-pin',
      html:`<div class="cand-pin-in" style="background:${s.fill};border-color:${s.stroke}"><span>${c.score}</span></div>`,
      iconSize:[32,32], iconAnchor:[16,16]
    });
    const mk = L.marker(center, { icon:pin });
    mk.on('mouseover', (e) => gsShowCandHover(e.originalEvent, c));
    mk.on('mousemove', (e) => gsPosHover(e.originalEvent));
    mk.on('mouseout',  () => gsHideHover());
    mk.on('click', () => selectCandidate(c.id));
    layers['적합부지'].addLayer(mk);
  });

  // 변전소 마커
  GS_SUBS.forEach(s => {
    const color = s.st==='ok' ? '#10B981' : s.st==='warn' ? '#f59e0b' : '#ef4444';
    const icon = L.divIcon({
      className:'md-sub-mk',
      html:`<div class="md-sub-pin" style="background:${color}"><svg viewBox="0 0 16 16"><path d="M5 2L3 8h3l-1 6 6-8H8l1-4z" fill="#fff"/></svg></div>`,
      iconSize:[28,28], iconAnchor:[14,14]
    });
    const mk = L.marker(s.ll, { icon });
    mk.on('mouseover', (e) => gsShowSubHover(e.originalEvent, s));
    mk.on('mousemove', (e) => gsPosHover(e.originalEvent));
    mk.on('mouseout',  () => gsHideHover());
    layers['변전'].addLayer(mk);
  });

  // add all by default
  Object.values(layers).forEach(g => g.addTo(map));

  // fit
  const group = L.featureGroup(GS_EMDS.map(e => L.polygon(e.poly)));
  map.fitBounds(group.getBounds(), { padding:[40,40] });
  setTimeout(() => map.invalidateSize(), 100);
}

// ─── Selection (click to open detail drawer) ───
function selectEmd(cd) {
  const emd = GS_EMDS.find(e => e.cd === cd);
  if (!emd) return;
  // reset previous
  if (state.selectedEmd && window._gsEmdPolys[state.selectedEmd]) {
    const prev = window._gsEmdPolys[state.selectedEmd];
    const prevEmd = GS_EMDS.find(e => e.cd === state.selectedEmd);
    const ps = suitColor(prevEmd.suitability);
    prev.setStyle({ weight: 1.6, fillOpacity: 0.35, color: ps.stroke });
  }
  state.selectedEmd = cd;
  state.selectedCand = null;
  const poly = window._gsEmdPolys[cd];
  poly.setStyle({ weight: 3.2, fillOpacity: 0.5, color:'#60A5FA' });
  poly.bringToFront();
  window._gsMap.fitBounds(poly.getBounds(), { padding:[80,80], maxZoom: 13 });
  openDetailDrawer(renderEmdDetail(emd));
}

function selectCandidate(id) {
  const c = GS_CANDIDATES.find(x => x.id === id);
  if (!c) return;
  state.selectedCand = id;
  openDetailDrawer(renderCandidateDetail(c));
  const cen = [(c.poly[0][0]+c.poly[2][0])/2, (c.poly[0][1]+c.poly[2][1])/2];
  window._gsMap.flyTo(cen, 14, { duration: 0.6 });
}

function clearSelection() {
  if (state.selectedEmd && window._gsEmdPolys[state.selectedEmd]) {
    const prev = window._gsEmdPolys[state.selectedEmd];
    const emd = GS_EMDS.find(e => e.cd === state.selectedEmd);
    const s = suitColor(emd.suitability);
    prev.setStyle({ weight: 1.6, fillOpacity: 0.35, color: s.stroke });
  }
  state.selectedEmd = null;
  state.selectedCand = null;
  closeDetailDrawer();
}

function openDetailDrawer(html) {
  const d = document.getElementById('md-drawer');
  if (!d) return;
  d.innerHTML = html;
  d.classList.add('open');
}
function closeDetailDrawer() {
  const d = document.getElementById('md-drawer');
  if (d) d.classList.remove('open');
}

function renderEmdDetail(e) {
  const color = suitColor(e.suitability);
  const candsInEmd = GS_CANDIDATES.filter(c => c.emd === e.cd);
  const metric = (l, v, color) => `
    <div class="md-metric">
      <div class="md-metric-hd"><span>${l}</span><strong style="color:${color}">${v}</strong></div>
      <div class="md-metric-bar"><div style="width:${v}%;background:${color}"></div></div>
    </div>`;
  return `
    <div class="md-dw-hd">
      <button class="md-dw-x" onclick="clearSelection()">✕</button>
      <div class="md-dw-suit" style="background:${color.fill}">
        <div class="suit-num">${e.suitability}</div>
        <div class="suit-lbl">적합도 ${suitLabel(e.suitability)}</div>
      </div>
      <div>
        <div class="md-dw-nm">${e.nm}</div>
        <div class="md-dw-sub">${e.sgg} · 법정면</div>
      </div>
    </div>
    <div class="md-dw-bd">
      <div class="md-dw-sec">
        <div class="md-dw-sectt">📊 지표별 점수</div>
        ${metric('☀ 일사 조건', e.solar, '#F59E0B')}
        ${metric('🔌 계통 접속', e.grid, '#3B82F6')}
        ${metric('🏞 부지 조건', e.land, '#10B981')}
        ${metric('🤝 주민 수용성', e.accept, '#A855F7')}
      </div>

      <div class="md-dw-sec">
        <div class="md-dw-sectt">👥 인구·세대</div>
        <div class="md-dw-kvrow"><span>총 인구</span><strong>${e.pop_total.toLocaleString()} 명</strong></div>
        <div class="md-dw-kvrow"><span>세대 수</span><strong>${e.hh_total.toLocaleString()} 세대</strong></div>
        <div class="md-dw-kvrow"><span>농업인</span><strong>${e.pop_farmer.toLocaleString()} 명</strong></div>
      </div>

      <div class="md-dw-sec">
        <div class="md-dw-sectt">🔌 계통 정보</div>
        <div class="md-dw-kvrow"><span>가까운 변전소</span><strong>${e.nearest_sub}</strong></div>
        <div class="md-dw-kvrow"><span>잔여 접속용량</span><strong>${e.grid_res}</strong></div>
      </div>

      ${e.constraint ? `<div class="md-dw-sec"><div class="md-dw-sectt">⚠ 제약 · 특성</div><div class="md-dw-note">${e.constraint}</div></div>` : ''}
      ${e.proj ? `<div class="md-dw-sec"><div class="md-dw-sectt">⚡ 진행 사업</div><div class="md-dw-proj">${e.proj}</div></div>` : ''}

      ${candsInEmd.length > 0 ? `
        <div class="md-dw-sec">
          <div class="md-dw-sectt">🎯 이 면의 적합 부지 (${candsInEmd.length})</div>
          ${candsInEmd.map(c => {
            const cc = suitColor(c.score);
            return `
              <div class="md-dw-cand" onclick="selectCandidate('${c.id}')">
                <div class="cand-sc" style="background:${cc.fill}">${c.score}</div>
                <div class="cand-bd">
                  <div class="cand-nm">${c.nm}</div>
                  <div class="cand-sub">${c.type} · ${c.area_m2.toLocaleString()} m² · 약 ${Math.round(c.area_m2/10).toLocaleString()} kW</div>
                </div>
              </div>`;
          }).join('')}
        </div>` : ''}
    </div>
  `;
}

function renderCandidateDetail(c) {
  const color = suitColor(c.score);
  const emd = GS_EMDS.find(e => e.cd === c.emd);
  const capKW = Math.round(c.area_m2 / 10);
  return `
    <div class="md-dw-hd">
      <button class="md-dw-x" onclick="clearSelection()">✕</button>
      <div class="md-dw-suit" style="background:${color.fill}">
        <div class="suit-num">${c.score}</div>
        <div class="suit-lbl">적합도 ${suitLabel(c.score)}</div>
      </div>
      <div>
        <div class="md-dw-nm">${c.nm}</div>
        <div class="md-dw-sub">${emd ? emd.nm : ''} · 후보 부지</div>
      </div>
    </div>
    <div class="md-dw-bd">
      <div class="md-dw-sec">
        <div class="md-dw-sectt">🎯 부지 제원</div>
        <div class="md-dw-kvrow"><span>형태</span><strong>${c.type}</strong></div>
        <div class="md-dw-kvrow"><span>면적</span><strong>${c.area_m2.toLocaleString()} m² (${Math.round(c.area_m2/3.3).toLocaleString()} 평)</strong></div>
        <div class="md-dw-kvrow"><span>예상 설비용량</span><strong>${(capKW/1000).toFixed(1)} MW (${capKW.toLocaleString()} kW)</strong></div>
        <div class="md-dw-kvrow"><span>총사업비 추정</span><strong>약 ${((capKW/1000)*14).toFixed(1)} 억원</strong></div>
      </div>

      <div class="md-dw-sec">
        <div class="md-dw-sectt">✅ 특징</div>
        <div class="cand-flags">${c.flags.map(f => `<span class="cand-flag">${f}</span>`).join('')}</div>
      </div>

      ${emd ? `
      <div class="md-dw-sec">
        <div class="md-dw-sectt">📍 소속 법정면</div>
        <div class="md-dw-cand" onclick="selectEmd('${emd.cd}')">
          <div class="cand-sc" style="background:${suitColor(emd.suitability).fill}">${emd.suitability}</div>
          <div class="cand-bd">
            <div class="cand-nm">${emd.nm} 상세 보기</div>
            <div class="cand-sub">${emd.constraint || ''}</div>
          </div>
        </div>
      </div>` : ''}

      <div class="md-dw-sec">
        <div class="md-dw-sectt">🚀 다음 단계</div>
        <button class="btn-primary" style="width:100%;margin-bottom:6px;" onclick="go('chat-haebit')">햇빛 진단 시작하기 ▸</button>
        <button class="btn-ghost" style="width:100%;" onclick="go('chat-free')">문의하기</button>
      </div>
    </div>
  `;
}

function toggleMapLayer(name) {
  const map = window._gsMap;
  const layers = window._gsLayers;
  if (!map || !layers) return;
  const chk = document.getElementById('tog-' + name);
  const g = layers[name];
  if (!g) return;
  if (chk.checked) { if (!map.hasLayer(g)) map.addLayer(g); }
  else            { if (map.hasLayer(g))  map.removeLayer(g); }
}

function flyTo(lat, lng, z) {
  if (window._gsMap) window._gsMap.flyTo([lat,lng], z || 13, { duration: 0.8 });
}

function gsShowHover(ev, p) {
  const card = document.getElementById('md-hover');
  if (!card) return;
  const c = suitColor(p.suitability);
  const projRow = p.proj ? `<div class="mh-proj">⚡ ${p.proj}</div>` : '';
  card.innerHTML = `
    <div class="mh-hd" style="background:${c.fill}1f;border-bottom:1px solid ${c.fill}55">
      <div class="mh-emd">${p.nm}</div>
      <div class="mh-sgg">${p.sgg} · 법정면</div>
    </div>
    <div class="mh-bd">
      <div class="mh-row"><span class="mh-l">종합 적합도</span><span class="mh-v" style="color:${c.stroke}"><strong>${p.suitability}</strong> · ${suitLabel(p.suitability)}</span></div>
      <div class="mh-row"><span class="mh-l">인구 · 세대</span><span class="mh-v">${p.pop_total.toLocaleString()}명 · ${p.hh_total.toLocaleString()}세대</span></div>
      <div class="mh-row"><span class="mh-l">계통</span><span class="mh-v">${p.nearest_sub}</span></div>
      ${projRow}
      <div class="mh-hint">클릭하면 상세보기</div>
    </div>`;
  card.style.display = 'block';
  gsPosHover(ev);
}

function gsShowCandHover(ev, c) {
  const card = document.getElementById('md-hover');
  if (!card) return;
  const col = suitColor(c.score);
  card.innerHTML = `
    <div class="mh-hd" style="background:${col.fill}1f;border-bottom:1px solid ${col.fill}55">
      <div class="mh-emd" style="color:${col.stroke}">🎯 ${c.nm}</div>
      <div class="mh-sgg">후보 부지 · ${c.type}</div>
    </div>
    <div class="mh-bd">
      <div class="mh-row"><span class="mh-l">적합도</span><span class="mh-v" style="color:${col.stroke}"><strong>${c.score}</strong> · ${suitLabel(c.score)}</span></div>
      <div class="mh-row"><span class="mh-l">면적 · 용량</span><span class="mh-v">${c.area_m2.toLocaleString()}㎡ · ${Math.round(c.area_m2/10)}kW</span></div>
      <div class="mh-hint">클릭하면 상세보기</div>
    </div>`;
  card.style.display = 'block';
  gsPosHover(ev);
}

function gsShowZoneHover(ev, z) {
  const card = document.getElementById('md-hover');
  if (!card) return;
  card.innerHTML = `
    <div class="mh-hd" style="background:rgba(162,155,254,0.12);border-bottom:1px solid rgba(162,155,254,0.3)">
      <div class="mh-emd" style="color:#a29bfe">⚡ ${z.name}</div>
      <div class="mh-sgg">사업 구역 · ${z.cap}</div>
    </div>
    <div class="mh-bd">
      <div class="mh-row"><span class="mh-l">상태</span><span class="mh-v">${z.status}</span></div>
    </div>`;
  card.style.display = 'block';
  gsPosHover(ev);
}

function gsShowSubHover(ev, s) {
  const card = document.getElementById('md-hover');
  if (!card) return;
  const color = s.st==='ok' ? '#10B981' : s.st==='warn' ? '#f59e0b' : '#ef4444';
  const label = s.st==='ok' ? '여유' : s.st==='warn' ? '보통' : '포화';
  card.innerHTML = `
    <div class="mh-hd" style="background:rgba(245,158,11,0.1);border-bottom:1px solid rgba(245,158,11,0.3)">
      <div class="mh-emd" style="color:${color}">🔌 ${s.name}</div>
      <div class="mh-sgg">${s.addr}</div>
    </div>
    <div class="mh-bd">
      <div class="mh-row"><span class="mh-l">접속 여유</span><span class="mh-v" style="color:${color}"><strong>${s.cap}</strong> · ${label}</span></div>
    </div>`;
  card.style.display = 'block';
  gsPosHover(ev);
}

function gsPosHover(ev) {
  const card = document.getElementById('md-hover');
  if (!card) return;
  const W = window.innerWidth, H = window.innerHeight;
  const cw = card.offsetWidth || 240, ch = card.offsetHeight || 130;
  let x = ev.clientX + 18, y = ev.clientY - 12;
  if (x + cw > W - 10) x = ev.clientX - cw - 18;
  if (y + ch > H - 10) y = H - ch - 12;
  if (y < 60) y = 60;
  card.style.left = x + 'px';
  card.style.top  = y + 'px';
}

function gsHideHover() {
  const c = document.getElementById('md-hover');
  if (c) c.style.display = 'none';
}

// ═══════════════════════════════════════════
// Tweaks
// ═══════════════════════════════════════════
function openTweaks() { document.getElementById('tweaks').classList.add('open'); }
function closeTweaks() { document.getElementById('tweaks').classList.remove('open'); }

function setFontScale(v) { document.body.dataset.fs = v; syncSeg('onclick="setFontScale', v); }
function setBg(v) { document.body.dataset.bg = v; syncSeg('onclick="setBg', v); }
function setTone(v) { document.body.dataset.tone = v; syncSeg('onclick="setTone', v); }
function setMascot(v) { document.body.dataset.mascot = v; syncSeg('onclick="setMascot', v); go(state.view); }
function setDensity(v) { document.body.dataset.density = v; syncSeg('onclick="setDensity', v); }

function syncSeg(prefix, v) {
  document.querySelectorAll('.tweaks .seg button').forEach(b => {
    if (b.getAttribute('onclick') && b.getAttribute('onclick').startsWith(prefix)) {
      b.classList.toggle('active', b.dataset.v === v);
    }
  });
}

// init defaults
document.body.dataset.fs = 'large';
document.body.dataset.bg = 'none';
document.body.dataset.tone = 'slate';
document.body.dataset.mascot = 'chat';
document.body.dataset.density = 'regular';

// close region menu on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.region') && !e.target.closest('.region-menu')) {
    document.getElementById('region-menu').classList.remove('open');
  }
});

// input enter → send
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    if (e.target.id === 'chat-in-free') { e.preventDefault(); sendFree(); }
    if (e.target.id === 'chat-in-haebit') { e.preventDefault(); sendHaebitText(); }
  }
});

// close user menu on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-menu') && !e.target.closest('.user-pill')) {
    document.getElementById('user-menu')?.classList.remove('open');
  }
});

// first paint
applyRoleUI();
go('home');
