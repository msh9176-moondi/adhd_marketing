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
    const types = ['coachees','surveys','matchings','goalAgreements','sessions','reflections','onboardings','welcomeMessages'];
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
    id: 'coach1', name: '고경숙', avatar: '🌸',
    phone: '010-6601-0019',
    specialties: ['미루기', '시간관리', '루틴형성', '감정조절', '목표설정'],
    coachingMethods: ['온라인'],
    availableTimes: '평일 저녁 6pm~10pm, 주말 오후 2pm~6pm',
    bio: '행복으로 안내하는 마음성장 파트너',
    detail: '플래너 사용, 공부/업무 실행을 함께 다루며, 작은 변화부터 시작해 지속 가능한 루틴을 만들어갑니다.',
    maxCoachees: 1
  },
  {
    id: 'coach2', name: '정승혜', avatar: '💼',
    phone: '010-5149-3445',
    specialties: ['미루기', '시간관리', '루틴형성', '감정조절', '소진관리'],
    coachingMethods: ['온라인'],
    availableTimes: '평일 저녁 6pm~10pm',
    bio: '현장의 경험을 바탕으로 개인의 잠재력과 조직의 성과를 연결하는 성장코치',
    detail: '목표설정, 플래너 사용, 공부/업무 실행, 소진 관리까지 폭넓게 다루며, 실질적인 성장을 돕습니다.',
    maxCoachees: 1
  },
  {
    id: 'coach3', name: '조승희', avatar: '🌿',
    phone: '010-6607-8942',
    specialties: ['미루기', '시간관리', '루틴형성', '감정조절', '목표설정'],
    coachingMethods: ['온라인'],
    availableTimes: '평일 낮 오전~오후 5pm, 주말 오후 2pm~6pm',
    bio: '일상의 작은 변화가 의미있는 성장으로 이어질 수 있도록 함께하는 코치',
    detail: '작은 변화의 힘을 믿으며, 일상에서 실천 가능한 전략을 함께 찾아갑니다.',
    maxCoachees: 1
  },
  {
    id: 'coach4', name: '김지민', avatar: '✨',
    phone: '010-5000-0590',
    specialties: ['미루기', '시간관리', '루틴형성', '감정조절', '목표설정'],
    coachingMethods: ['온라인'],
    availableTimes: '평일 저녁 6pm~10pm, 주말 오전 10am~1pm, 주말 오후 2pm~6pm',
    bio: '성장과 회복을 위한 성찰파트너',
    detail: '플래너 사용, 공부/업무 실행을 함께 다루며, 성찰을 통한 지속 가능한 변화를 만들어갑니다.',
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
  DB.set('onboardings', []);

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

    // 온보딩 데이터 추가
    DB.addItem('onboardings', {
      id: 'onboard_' + id,
      coacheeId: id,
      selfIntro: d.selfIntro || `안녕하세요, ${d.name}입니다. 일상에서 실행력이 부족해서 고민이 많아요. 해야 할 일을 알면서도 시작하기가 너무 힘들어요.`,
      expectations: d.expectations || '아침 루틴을 하나라도 꾸준히 유지하고 싶어요. 작은 성공 경험을 쌓고 싶습니다.',
      concerns: d.concerns || '과제를 못 했을 때 실망시킬까봐 걱정돼요. 중간에 포기하지 않을 수 있을지 불안해요.',
      preferredCommunication: ['빠른 피드백 선호', '칭찬에 동기부여'],
      preferredMeetingTime: ['평일 저녁', '주말 오후'],
      createdAt
    });

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

// ===== Document Box (서류함) =====
const DocumentBox = {
  // 서류 타입 설정
  types: {
    goalAgreement: { icon: '📋', name: '목표 합의서', key: 'goalAgreements' },
    session: { icon: '📝', name: '세션 일지', key: 'sessions' },
    reflection: { icon: '💭', name: '성찰일지', key: 'reflections' },
    welcomeMessage: { icon: '💌', name: '웰컴 메시지', key: 'welcomeMessages' }
  },

  // 시간 경과 표시
  getTimeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return fmtDate(dateStr);
  },

  // 합의서 상태 판별
  getGoalStatus(goal) {
    if (!goal) return null;
    if (goal.status) return goal.status;
    if (goal.coacheeConsent && goal.coachConsent) return 'completed';
    if (goal.coacheeConsent) return 'pending_coach_sign';
    return 'draft';
  },

  // 상태 텍스트
  getStatusText(status, role) {
    const texts = {
      draft: '작성 중',
      pending_coach_sign: role === 'coach' ? '서명 필요' : '코치 서명 대기',
      revision_requested: '수정 요청됨',
      completed: '완료',
      sent: '전송됨',
      new: '새로 도착'
    };
    return texts[status] || status;
  },

  // 피코치용 서류 분류
  getCoacheeDocuments(coacheeId) {
    const received = [];
    const sent = [];
    const drafts = [];

    // 웰컴 메시지 (코치 → 피코치)
    const welcome = DB.get('welcomeMessages').find(w => w.coacheeId === coacheeId);
    if (welcome) {
      received.push({
        type: 'welcomeMessage',
        doc: welcome,
        isNew: !welcome.readAt,
        title: '웰컴 메시지',
        meta: this.getTimeAgo(welcome.sentAt),
        link: null // 대시보드에서 바로 표시
      });
    }

    // 목표 합의서
    const goal = DB.get('goalAgreements').find(g => g.coacheeId === coacheeId);
    if (goal) {
      const status = this.getGoalStatus(goal);
      if (status === 'revision_requested') {
        // 수정 요청 받음 → 받은 서류
        received.push({
          type: 'goalAgreement',
          doc: goal,
          isNew: !goal.revisionReadAt,
          title: '목표 합의서',
          meta: '수정 요청됨',
          link: `goal-agreement.html?id=${coacheeId}`
        });
      } else if (status === 'completed') {
        // 완료 → 받은 서류 (코치 서명 완료)
        received.push({
          type: 'goalAgreement',
          doc: goal,
          isNew: false,
          title: '목표 합의서',
          meta: '양측 서명 완료',
          link: `goal-agreement.html?id=${coacheeId}`,
          status: 'completed'
        });
      } else if (status === 'pending_coach_sign') {
        // 코치 서명 대기 → 보낸 서류
        sent.push({
          type: 'goalAgreement',
          doc: goal,
          title: '목표 합의서',
          meta: '코치 서명 대기',
          link: `goal-agreement.html?id=${coacheeId}`,
          status: 'waiting'
        });
      } else if (status === 'draft' || !goal.coacheeConsent) {
        // 작성 중
        drafts.push({
          type: 'goalAgreement',
          doc: goal,
          title: '목표 합의서',
          meta: '작성 중',
          link: `goal-agreement.html?id=${coacheeId}`
        });
      }
    }

    // 성찰일지
    const reflections = DB.get('reflections').filter(r => r.coacheeId === coacheeId);
    reflections.forEach(r => {
      const num = r.sessionId?.split('_')[2] || '';
      sent.push({
        type: 'reflection',
        doc: r,
        title: `${num}회기 성찰일지`,
        meta: this.getTimeAgo(r.createdAt),
        link: `sessions.html?id=${coacheeId}&role=coachee`,
        status: 'completed'
      });
    });

    return { received, sent, drafts };
  },

  // 코치용 서류 분류
  getCoachDocuments(coachId) {
    const matchings = DB.get('matchings').filter(m => m.coachId === coachId);
    const coacheeIds = matchings.map(m => m.coacheeId);

    const received = [];
    const sent = [];
    const drafts = [];

    coacheeIds.forEach(coacheeId => {
      const coachee = DB.getItem('coachees', coacheeId);
      if (!coachee) return;

      // 목표 합의서 (서명 필요)
      const goal = DB.get('goalAgreements').find(g => g.coacheeId === coacheeId);
      if (goal) {
        const status = this.getGoalStatus(goal);
        if (status === 'pending_coach_sign') {
          received.push({
            type: 'goalAgreement',
            doc: goal,
            isNew: !goal.coachReadAt,
            title: '목표 합의서',
            meta: `${coachee.name} · 서명 필요`,
            link: null, // 모달로 처리
            coacheeId,
            coacheeName: coachee.name
          });
        }
      }

      // 성찰일지 (확인 필요)
      const reflections = DB.get('reflections').filter(r => r.coacheeId === coacheeId);
      reflections.forEach(r => {
        const num = r.sessionId?.split('_')[2] || '';
        received.push({
          type: 'reflection',
          doc: r,
          isNew: !r.coachReadAt,
          title: `${num}회기 성찰일지`,
          meta: `${coachee.name} · ${this.getTimeAgo(r.createdAt)}`,
          link: `sessions.html?id=${coacheeId}&role=coach`,
          coacheeId,
          coacheeName: coachee.name
        });
      });
    });

    // 웰컴 메시지 (보낸 것)
    const welcomes = DB.get('welcomeMessages').filter(w => w.coachId === coachId);
    welcomes.forEach(w => {
      const coachee = DB.getItem('coachees', w.coacheeId);
      sent.push({
        type: 'welcomeMessage',
        doc: w,
        title: '웰컴 메시지',
        meta: `${coachee?.name || ''} · ${this.getTimeAgo(w.sentAt)}`,
        status: 'completed'
      });
    });

    // 세션 일지 (작성/완료)
    const sessions = DB.get('sessions').filter(s => s.coachId === coachId);
    sessions.forEach(s => {
      const coachee = DB.getItem('coachees', s.coacheeId);
      const item = {
        type: 'session',
        doc: s,
        title: `${s.sessionNumber}회기 세션 일지`,
        meta: `${coachee?.name || ''} · ${this.getTimeAgo(s.createdAt)}`,
        link: `sessions.html?id=${s.coacheeId}&role=coach`
      };
      if (s.completed) {
        item.status = 'completed';
        sent.push(item);
      } else {
        drafts.push(item);
      }
    });

    return { received, sent, drafts };
  },

  // 읽음 처리
  markAsRead(type, docId) {
    const key = this.types[type]?.key;
    if (!key) return;
    const doc = DB.get(key).find(d => d.id === docId);
    if (doc && !doc.readAt) {
      DB.upsert(key, { ...doc, readAt: new Date().toISOString() });
    }
  }
};
