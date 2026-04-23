// ===========================
// 로컬에너지플랫폼 - 공통 유틸
// ===========================

/**
 * 금액 포맷 (1000000 → "100만원")
 */
function formatKRW(amount) {
  if (amount >= 100000000) {
    return (amount / 100000000).toFixed(1).replace(/\.0$/, '') + '억원';
  } else if (amount >= 10000) {
    return (amount / 10000).toFixed(0) + '만원';
  }
  return amount.toLocaleString() + '원';
}

/**
 * 퍼센트 포맷 (0.054 → "5.40%")
 */
function formatPercent(value, digits = 2) {
  return (value * 100).toFixed(digits) + '%';
}

/**
 * 날짜 포맷 (Date → "2026.04.23")
 */
function formatDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/**
 * D-Day 계산 (남은 일수)
 */
function calcDday(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return 'D-Day';
  return `D+${Math.abs(diff)}`;
}

/**
 * 펀딩 달성률 계산 (%)
 */
function calcAchievementRate(current, target) {
  if (!target) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

/**
 * 프로그레스 바 업데이트
 * @param {string} selector - CSS selector
 * @param {number} percent - 0~100
 */
function setProgressBar(selector, percent) {
  const el = document.querySelector(selector);
  if (el) el.style.width = `${percent}%`;
}

/**
 * 더미 투자 상품 데이터
 * (API 연동 전 프로토타입용)
 */
const DUMMY_PRODUCTS = [
  {
    id: 'prod_001',
    title: '신안 주민 햇빛 펀드 1호',
    region: '전남 신안군',
    type: 'solar',              // solar | wind | etc
    targetAmount: 500000000,    // 5억
    currentAmount: 312000000,
    interestRate: 0.054,        // 연 5.4%
    period: 24,                 // 개월
    startDate: '2026-04-01',
    endDate: '2026-05-15',
    status: 'funding',          // funding | closed | repaying | completed
    investorCount: 87,
    minInvestment: 100000,      // 10만원
    tags: ['지역주민우선', '햇빛소득']
  },
  {
    id: 'prod_002',
    title: '영광 풍력 주민 참여 펀드',
    region: '전남 영광군',
    type: 'wind',
    targetAmount: 1000000000,
    currentAmount: 1000000000,
    interestRate: 0.062,
    period: 36,
    startDate: '2026-03-01',
    endDate: '2026-04-01',
    status: 'repaying',
    investorCount: 234,
    minInvestment: 100000,
    tags: ['풍력', '지역주민우선']
  }
];

/**
 * 더미 사용자 데이터
 */
const DUMMY_USER = {
  id: 'user_001',
  name: '김지역',
  region: '전남 신안군',
  isLocalResident: true,
  totalInvested: 5000000,
  portfolioCount: 3,
  expectedReturn: 270000
};
