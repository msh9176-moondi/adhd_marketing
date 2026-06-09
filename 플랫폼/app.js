// ===== Google Sheets API =====
const SHEETS_DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbzuw2BrOsmNOgdDGnfDjxoRSZn3prME-XdFCl1kxbNMzzzabdEqxClbEqYAfreK4esw2g/exec';

const API = {
  getUrl: () => localStorage.getItem('sheetsUrl') || SHEETS_DEFAULT_URL,

  configured() { const u = this.getUrl(); return u && u.startsWith('https://'); },

  // 데이터 저장 — GET 방식 (POST redirect body 유실 문제 우회)
  sync(type, payload) {
    if (!this.configured()) return;
    const params = new URLSearchParams({
      action: 'save',
      type,
      payload: JSON.stringify(payload)
    });
    fetch(`${this.getUrl()}?${params}`)
      .catch(e => console.warn('[Sheets sync]', e));
  },

  // 연결 테스트 (GET 핑)
  async test() {
    try {
      const res = await fetch(`${this.getUrl()}?action=ping`);
      const json = await res.json();
      return json.ok === true;
    } catch (e) { return false; }
  },

  // 전체 데이터 가져오기 (Sheets → localStorage 덮어쓰기)
  async fetchAll(type, filters = {}) {
    if (!this.configured()) return null;
    try {
      const params = new URLSearchParams({ type, ...filters });
      const res = await fetch(`${this.getUrl()}?${params}`);
      const json = await res.json();
      if (json.ok) return json.data;
    } catch (e) { console.warn('[Sheets fetch]', e); }
    return null;
  },

  // Sheets에서 불러와서 localStorage 갱신
  async pullAndCache(type) {
    const data = await this.fetchAll(type);
    if (data) { DB.set(type, data); return data; }
    return DB.get(type);
  },

  // 모든 타입 한번에 동기화 (관리자용)
  async pullAll() {
    const types = ['coachees','surveys','matchings','goalAgreements','sessions','reflections'];
    await Promise.all(types.map(t => this.pullAndCache(t)));
  }
};

// ===== DB Utilities =====
const DB = {
  get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  getItem: (key, id) => DB.get(key).find(i => i.id === id) || null,

  // 저장 + Sheets 동기화
  addItem(key, item) {
    const arr = this.get(key);
    arr.push(item);
    this.set(key, arr);
    API.sync(key, item);
    return item;
  },

  // 수정 + Sheets 동기화
  updateItem(key, id, updates) {
    const arr = this.get(key);
    const idx = arr.findIndex(i => i.id === id);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...updates };
      this.set(key, arr);
      API.sync(key, arr[idx]);
      return arr[idx];
    }
    return null;
  },

  // id 기준 upsert + Sheets 자동 동기화 — 모든 페이지에서 이걸 쓸 것
  upsert(key, item) {
    const arr = this.get(key);
    const idx = arr.findIndex(i => i.id === item.id);
    if (idx >= 0) arr[idx] = item; else arr.push(item);
    this.set(key, arr);
    API.sync(key, item);
    return item;
  },

  removeItem: (key, id) => { const arr = DB.get(key).filter(i => i.id !== id); DB.set(key, arr); }
};

const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
const getParam = (name) => new URLSearchParams(window.location.search).get(name);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ko-KR') : '-';
const today = () => new Date().toISOString().split('T')[0];

// ===== Survey Questions =====
const SURVEY_CATEGORIES = [
  {
    id: 'execution', name: '실행력', questions: [
      { id: 'e1', text: '나는 해야 할 일을 시작하는 데 어려움을 느낀다.', reverseScore: true },
      { id: 'e2', text: '나는 작은 일도 미루다가 커지게 만드는 경우가 많다.', reverseScore: true },
      { id: 'e3', text: '나는 계획한 일을 실제 행동으로 옮기는 데 어려움이 있다.', reverseScore: true },
    ]
  },
  {
    id: 'routine', name: '루틴', questions: [
      { id: 'r1', text: '나는 일정한 수면/기상 루틴을 유지하기 어렵다.', reverseScore: true },
      { id: 'r2', text: '나는 하루 계획을 세워도 자주 무너진다.', reverseScore: true },
      { id: 'r3', text: '나는 반복되는 생활 습관을 유지하기 어렵다.', reverseScore: true },
    ]
  },
  {
    id: 'time', name: '시간관리', questions: [
      { id: 't1', text: '나는 시간이 얼마나 걸릴지 예측하기 어렵다.', reverseScore: true },
      { id: 't2', text: '나는 약속이나 마감 시간을 자주 놓친다.', reverseScore: true },
      { id: 't3', text: '나는 해야 할 일을 우선순위대로 정리하기 어렵다.', reverseScore: true },
    ]
  },
  {
    id: 'efficacy', name: '자기효능감', questions: [
      { id: 'ef1', text: '나는 작은 목표를 달성할 수 있다는 믿음이 있다.', reverseScore: false },
      { id: 'ef2', text: '나는 실패해도 다시 시작할 수 있다고 느낀다.', reverseScore: false },
      { id: 'ef3', text: '나는 나에게 맞는 실행 방법을 찾아갈 수 있다고 느낀다.', reverseScore: false },
    ]
  },
  {
    id: 'career', name: '커리어/삶의 방향', questions: [
      { id: 'c1', text: '나는 앞으로 어떤 방향으로 가야 할지 어느 정도 알고 있다.', reverseScore: false },
      { id: 'c2', text: '나는 내 강점과 약점을 설명할 수 있다.', reverseScore: false },
      { id: 'c3', text: '나는 지금 내 삶에서 가장 중요한 목표를 말할 수 있다.', reverseScore: false },
    ]
  }
];

const POST_EXTRA = [
  { id: 'p1', text: '이번 코칭이 나의 실행력에 도움이 되었다.' },
  { id: 'p2', text: '코치와의 관계가 안전하고 신뢰롭게 느껴졌다.' },
  { id: 'p3', text: '다음에도 유료로 참여할 의향이 있다.' },
  { id: 'p4', text: '다른 사람에게 추천할 의향이 있다.' },
];

function calcScore(raw, reverse) { return reverse ? (6 - raw) : raw; }

function calcCategoryScores(answers) {
  const result = {};
  SURVEY_CATEGORIES.forEach(cat => {
    const scores = cat.questions.map(q => calcScore(answers[q.id] || 3, q.reverseScore));
    result[cat.id] = { name: cat.name, average: scores.reduce((a, b) => a + b, 0) / scores.length };
  });
  const all = Object.values(result).map(c => c.average);
  result.total = all.reduce((a, b) => a + b, 0) / all.length;
  return result;
}

// ===== Coach Data =====
const COACHES = [
  {
    id: 'coach1', name: '김지은', avatar: '👩‍💼',
    specialties: ['실행력', '루틴'],
    coachingMethods: ['전화', '온라인'],
    availableTimes: '평일 저녁 7pm~10pm',
    bio: '실행력 회복과 루틴 형성 전문',
    detail: '10년간 ADHD 성향을 직접 경험하며, 루틴 붕괴와 실행 차단이 삶에 미치는 영향을 깊이 이해합니다. 함께 작고 안정적인 첫 걸음을 찾아가는 코칭을 합니다.',
    maxCoachees: 1
  },
  {
    id: 'coach2', name: '박도현', avatar: '👨‍💻',
    specialties: ['시간관리', '감정 조절'],
    coachingMethods: ['온라인'],
    availableTimes: '주말 오전 10am~1pm',
    bio: '시간 지각과 감정 조절 전문',
    detail: '시간 개념이 잘 작동하지 않을 때 일상이 얼마나 혼란스러운지 압니다. 현실적인 시간 관리 전략과 감정 파도를 다루는 코칭을 제공합니다.',
    maxCoachees: 1
  },
  {
    id: 'coach3', name: '이서연', avatar: '👩‍🎨',
    specialties: ['커리어', '실행력'],
    coachingMethods: ['전화', '온라인'],
    availableTimes: '화·목 오후 2pm~6pm',
    bio: '커리어 방향과 실행력 전문',
    detail: '"내가 뭘 해야 할지 모르겠어요"라는 말 들어왔어요. 강점을 찾고, 방향을 설정하고, 실제로 움직일 수 있는 작은 계획을 세우는 코칭을 합니다.',
    maxCoachees: 1
  },
  {
    id: 'coach4', name: '최민준', avatar: '👨‍🏫',
    specialties: ['루틴', '시간관리'],
    coachingMethods: ['오프라인', '온라인'],
    availableTimes: '월·수 저녁 6pm~9pm',
    bio: '루틴 설계와 시간관리 전문',
    detail: '규칙적인 삶이 ADHD 뇌에 왜 그렇게 어려운지 데이터와 경험으로 설명해드립니다. 뇌 친화적인 루틴과 시간 블록 설계를 함께 해드립니다.',
    maxCoachees: 1
  }
];

function getCoach(id) { return COACHES.find(c => c.id === id); }

// ===== Demo Data Seeder =====
function seedDemoData() {
  DB.set('coachees', []);
  DB.set('surveys', []);
  DB.set('matchings', []);
  DB.set('goalAgreements', []);
  DB.set('sessions', []);
  DB.set('reflections', []);

  const demos = [
    { name: '이지원', phone: '010-1234-5678', email: 'jiwon@example.com', adhdStatus: '진단받음', difficulties: ['실행 시작', '루틴 유지'], topics: ['실행력', '루틴'], coachId: 'coach1', progress: 4 },
    { name: '박소연', phone: '010-2345-6789', email: 'soyeon@example.com', adhdStatus: '의심됨', difficulties: ['시간관리', '미루기'], topics: ['시간관리'], coachId: 'coach2', progress: 2 },
    { name: '김태호', phone: '010-3456-7890', email: 'taeho@example.com', adhdStatus: '진단은 없지만 실행 어려움이 있음', difficulties: ['커리어 방향'], topics: ['커리어'], coachId: 'coach3', progress: 1 },
    { name: '최예린', phone: '010-4567-8901', email: 'yerin@example.com', adhdStatus: '진단받음', difficulties: ['감정 조절', '실행 시작'], topics: ['루틴', '실행력'], coachId: 'coach4', progress: 3 },
  ];

  demos.forEach((d, i) => {
    const id = 'demo' + (i + 1);
    const createdAt = new Date(Date.now() - (30 - i * 5) * 86400000).toISOString();

    DB.addItem('coachees', {
      id, name: d.name, phone: d.phone, email: d.email,
      adhdStatus: d.adhdStatus, difficulties: d.difficulties,
      topics: d.topics, riskFlag: false,
      consentPrivacy: true, consentNonMedical: true,
      status: d.progress >= 4 ? 'completed' : 'coaching',
      createdAt
    });

    const preAnswers = {};
    SURVEY_CATEGORIES.flatMap(c => c.questions).forEach(q => {
      preAnswers[q.id] = Math.floor(Math.random() * 3) + 1;
    });
    const preScores = calcCategoryScores(preAnswers);
    DB.addItem('surveys', { id: 'pre_' + id, coacheeId: id, type: 'pre', answers: preAnswers, categoryScores: preScores, createdAt });

    if (d.progress >= 4) {
      const postAnswers = {};
      SURVEY_CATEGORIES.flatMap(c => c.questions).forEach(q => {
        postAnswers[q.id] = Math.min(5, (preAnswers[q.id] || 2) + Math.floor(Math.random() * 2) + 1);
      });
      const postScores = calcCategoryScores(postAnswers);
      DB.addItem('surveys', { id: 'post_' + id, coacheeId: id, type: 'post', answers: postAnswers, categoryScores: postScores, extraAnswers: { p1: 5, p2: 5, p3: 4, p4: 5 }, bestPart: '실행 시작 방법을 배웠어요.', regret: '기간이 좀 더 길었으면 좋겠어요.', createdAt });
    }

    DB.addItem('matchings', { id: 'match_' + id, coacheeId: id, coachId: d.coachId, status: 'matched', matchedAt: createdAt });

    DB.addItem('goalAgreements', {
      id: 'goal_' + id, coacheeId: id, coachId: d.coachId,
      coacheeName: d.name, coachName: getCoach(d.coachId)?.name,
      topic: d.topics[0], desiredOutcome: '4주 안에 아침 루틴을 정착시키기',
      actionPlan: '매일 기상 후 30분 루틴 체크리스트 작성', currentScore: 2, targetScore: 4,
      evaluationMethod: '회기별 루틴 실행률 체크', coachConsent: true, coacheeConsent: true,
      agreedAt: createdAt
    });

    for (let s = 1; s <= Math.min(d.progress, 4); s++) {
      const sDate = new Date(Date.now() - (d.progress - s) * 7 * 86400000).toISOString().split('T')[0];
      DB.addItem('sessions', {
        id: `sess_${id}_${s}`, coacheeId: id, coachId: d.coachId,
        sessionNumber: s, sessionDate: sDate,
        nextSessionDate: s < 4 ? new Date(new Date(sDate).getTime() + 7 * 86400000).toISOString().split('T')[0] : null,
        coachingGoal: '루틴 형성 및 실행력 강화',
        sessionGoal: `${s}회기 실행 과제 점검 및 전략 수립`,
        assignmentReview: '지난 과제: ' + (s > 1 ? '75% 실행' : '첫 회기'),
        topicContent: '시간 블록 설정과 작은 시작의 원칙 논의',
        outcome: '아침 루틴 3단계 설계 완료',
        nextAction: '매일 아침 10분 루틴 체크리스트 실행',
        share: '지난주 과제 3개 중 2개 실행. 수면 루틴은 아직 불안정.',
        develop: '완벽한 루틴이 아닌 "최소 루틴" 개념 소개',
        learning: '실패해도 다음날 다시 시작하는 것이 핵심임을 인식',
        wrapUp: '이번 주 실행 과제: 기상 후 5분 루틴 3가지만 지키기',
        completed: true, createdAt
      });
      DB.addItem('reflections', {
        id: `refl_${id}_${s}`, sessionId: `sess_${id}_${s}`, coacheeId: id,
        topic: '루틴 형성 전략',
        previousActionDone: s > 1 ? '부분 실행' : '해당없음',
        targetScore: 4, previousScore: 1 + s, currentScore: 2 + s,
        learned: '완벽하지 않아도 괜찮다는 것을 배웠습니다.',
        felt: '코치님과 대화하니 마음이 좀 편안해졌어요.',
        actionPlan: '내일부터 기상 후 물 마시기, 스트레칭 5분, 오늘 할 일 3개 적기',
        nextSessionExpectation: '실행 과제 점검과 추가 전략 논의', createdAt
      });
    }
  });
  return true;
}
