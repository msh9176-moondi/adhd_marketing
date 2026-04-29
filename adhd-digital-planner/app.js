/**
 * FLOCA - ADHD 맞춤형 플래너
 *
 * 설계 원칙:
 * 1. 신경가소성 활용 - 작은 단계로 쪼개기, 반복적 보상
 * 2. 도파민 시스템 활성화 - 즉각적 피드백, 시각적 보상
 * 3. 시간 감각 보완 - 타이머, 알림
 * 4. 인지 부하 최소화 - 명확한 UI, 단순한 인터랙션
 */

// ============================================
// 상태 관리
// ============================================

const state = {
    tasks: [],
    goals: {
        life: [],
        yearly: [],
        monthly: [], // 월별로 저장 { month: 1, goals: [] }
        weekly: [],  // 주차별 { week: 1, month: 4, goals: [] }
        daily: []    // 요일별 { day: 0-6, week: 1, goals: [] }
    },
    points: 0,
    xp: 0,
    level: 1,
    totalCompleted: 0,
    streak: 0,
    lastActiveDate: null,
    completedToday: 0,
    totalTasks: 0,
    achievements: {
        'first-task': false,
        'streak-3': false,
        'streak-7': false,
        'streak-30': false,
        'pomodoro-10': false
    },
    pomodoro: {
        completed: 0,
        totalFocusTime: 0
    },
    tracker: {
        sleep: [],
        exercise: [],
        meal: [],
        mood: [],
        medication: [],
        routine: [],
        environment: [],
        emotionJournal: []
    },
    currentFocusTask: null,
    focusTimer: null,
    pomodoroTimer: null,
    // NOW 모드 상태
    now: {
        currentEnergy: 3,
        brainDumps: [],
        currentTaskId: null,
        timerSeconds: 25 * 60,
        timerRunning: false,
        skippedTasks: []
    }
};

// 시간표 드래그 선택 상태
let timeSlotDrag = {
    isDragging: false,
    startHour: null,
    startMinute: 0,
    endHour: null,
    endMinute: 0,
    startY: null,
    gridElement: null
};

// ============================================
// 초기화
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initNavigation();
    initMindmap();
    initQuickAdd();
    initTaskSections();
    initPomodoro();
    initTracker();
    initRewards();
    initModals();
    initTimeSlotDrag();
    updateDateDisplay();
    checkStreak();
    initNotifications();  // 알림 초기화
    initNowMode();  // NOW 모드 초기화
    initApp();  // 모든 초기화 후 렌더링
});

function loadState() {
    const savedState = localStorage.getItem('floca-state');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);

            // goals 객체 초기화
            if (!state.goals) {
                state.goals = { life: [], yearly: [], monthly: [], weekly: [], daily: [] };
            }

            // goals를 안전하게 병합
            if (parsed.goals) {
                state.goals.life = parsed.goals.life || [];
                state.goals.yearly = parsed.goals.yearly || [];
                state.goals.monthly = parsed.goals.monthly || [];
                state.goals.weekly = parsed.goals.weekly || [];
                state.goals.daily = parsed.goals.daily || [];

                // 시작 시간 없는 일일 목표 자동 정리
                const beforeCount = state.goals.daily.length;
                state.goals.daily = state.goals.daily.filter(g => g.hour !== undefined && g.hour !== null);
                const removedCount = beforeCount - state.goals.daily.length;
                if (removedCount > 0) {
                    console.log(`시작 시간 없는 일일 목표 ${removedCount}개 자동 삭제됨`);
                }
            }

            // tasks 초기화
            if (!state.tasks) state.tasks = [];

            // 나머지 상태 병합 (goals 제외)
            const { goals, ...rest } = parsed;
            Object.assign(state, rest);

            // tasks가 없으면 빈 배열로
            if (!state.tasks) state.tasks = [];

            // 새로 추가된 필드 초기화
            if (state.xp === undefined) state.xp = 0;
            if (state.level === undefined) state.level = 1;
            if (state.totalCompleted === undefined) state.totalCompleted = 0;
            if (state.dayEndLogs === undefined) state.dayEndLogs = [];

            // tracker 필드 초기화
            if (!state.tracker) state.tracker = {};
            if (!state.tracker.routine) state.tracker.routine = [];
            if (!state.tracker.sleep) state.tracker.sleep = [];
            if (!state.tracker.exercise) state.tracker.exercise = [];
            if (!state.tracker.meal) state.tracker.meal = [];
            if (!state.tracker.mood) state.tracker.mood = [];
            if (!state.tracker.medication) state.tracker.medication = [];
            if (!state.tracker.environment) state.tracker.environment = [];
            if (!state.tracker.emotionJournal) state.tracker.emotionJournal = [];

        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }
}

function initApp() {
    syncTodayDailyGoals(); // 오늘의 일일 목표를 할 일에 동기화
    renderTasks();
    renderMindmap();
    initProgressTabs(); // 달성률 탭 이벤트 초기화
    updateProgress();
    updateRewardsPage();
    updateAchievements();
    updatePomodoroStats();

    // 상태 기반 환영 메시지 표시
    showAdaptiveWelcome();
}

// 상태 기반 환영 메시지
function showAdaptiveWelcome() {
    // 오늘 첫 방문인지 확인
    const today = new Date().toDateString();
    const lastWelcome = localStorage.getItem('lastWelcomeDate');

    if (lastWelcome === today) return; // 오늘 이미 표시함

    localStorage.setItem('lastWelcomeDate', today);

    // 조금 지연 후 표시 (앱 로드 완료 후)
    setTimeout(() => {
        const moodState = getRecentMoodState();
        const encouragement = getAdaptiveEncouragement();
        const greeting = getTimeBasedGreeting();

        showWelcomeToast(greeting, encouragement, moodState);
    }, 1000);
}

// 시간대별 인사말
function getTimeBasedGreeting() {
    const hour = new Date().getHours();

    if (hour < 6) return "늦은 밤이에요 🌙";
    if (hour < 12) return "좋은 아침이에요 ☀️";
    if (hour < 18) return "좋은 오후예요 🌤️";
    return "좋은 저녁이에요 🌆";
}

// 환영 토스트 표시
function showWelcomeToast(greeting, encouragement, moodState) {
    const moodEmoji = {
        tired: '😴',
        anxious: '😰',
        sad: '😢',
        frustrated: '😤',
        positive: '😊',
        neutral: '😐',
        default: '👋'
    };

    const toast = document.createElement('div');
    toast.className = 'welcome-toast';
    toast.innerHTML = `
        <div class="welcome-toast-content">
            <span class="welcome-emoji">${moodEmoji[moodState] || '👋'}</span>
            <div class="welcome-text">
                <strong>${greeting}</strong>
                <p>${encouragement}</p>
            </div>
            <button class="welcome-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    document.body.appendChild(toast);

    // 5초 후 자동 사라짐
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// 오늘의 일일 목표를 오늘의 할 일에 동기화
function syncTodayDailyGoals() {
    const today = new Date().getDay(); // 0=일요일, 6=토요일
    const dailyGoals = state.goals.daily || [];

    // 오늘 요일의 목표들 찾기
    const todayGoals = dailyGoals.filter(g => g.day === today);

    todayGoals.forEach(goal => {
        // 이미 연결된 할 일이 없으면 추가
        const existingTask = state.tasks.find(t => t.linkedGoal === goal.id);
        if (!existingTask) {
            addTaskFromDailyGoal(goal);
        } else {
            // 기존 할 일의 완료 상태를 목표에 동기화
            if (existingTask.completed && !goal.completed) {
                goal.completed = true;
            }
        }
    });

    saveState();
}

function saveState() {
    localStorage.setItem('floca-state', JSON.stringify(state));
}

// 로컬스토리지 데이터 확인 (개발자 콘솔용)
function debugStorage() {
    const data = JSON.parse(localStorage.getItem('floca-state') || '{}');
    console.log('=== 로컬스토리지 데이터 ===');
    console.log('인생 목표:', data.goals?.life?.length || 0, '개', data.goals?.life);
    console.log('연간 목표:', data.goals?.yearly?.length || 0, '개', data.goals?.yearly);
    console.log('월간 목표:', data.goals?.monthly?.length || 0, '개', data.goals?.monthly);
    console.log('주간 목표:', data.goals?.weekly?.length || 0, '개', data.goals?.weekly);
    console.log('일일 목표:', data.goals?.daily?.length || 0, '개', data.goals?.daily);
    console.log('할 일:', data.tasks?.length || 0, '개');
    console.log('전체 데이터:', data);
    return data;
}

// 전체 데이터 초기화
function resetAllData() {
    const confirmed = confirm('⚠️ 모든 데이터를 삭제하시겠습니까?\n\n인생 목표, 연간/월간/주간/일일 목표, 할 일, 포인트, 레벨 등 모든 데이터가 삭제됩니다.\n\n이 작업은 되돌릴 수 없습니다.');

    if (!confirmed) return;

    const doubleConfirm = confirm('정말로 모든 데이터를 삭제하시겠습니까?\n\n마지막 확인입니다.');

    if (!doubleConfirm) return;

    localStorage.removeItem('floca-state');
    showToast('모든 데이터가 초기화되었습니다. 페이지를 새로고침합니다.', 'success');
    setTimeout(() => location.reload(), 1000);
}

// 특정 레벨 전체 초기화
function resetLevelData(level) {
    const levelNames = {
        'life': '인생 목표',
        'yearly': '연간 목표',
        'monthly': '월간 목표',
        'weekly': '주간 목표',
        'daily': '일일 목표',
        'tasks': '오늘의 할 일'
    };

    const confirmed = confirm(`${levelNames[level] || level} 전체를 삭제하시겠습니까?`);
    if (!confirmed) return;

    if (level === 'tasks') {
        state.tasks = [];
    } else if (state.goals[level]) {
        state.goals[level] = [];
    }

    saveState();
    showToast(`${levelNames[level]}가 초기화되었습니다`, 'success');
    renderMindmap();
    renderTasks();
    updateProgress();
}

// ============================================
// 네비게이션
// ============================================

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);
        });
    });
}

function switchView(viewName) {
    const navItems = document.querySelectorAll('.nav-item');

    // 활성 상태 업데이트
    navItems.forEach(nav => nav.classList.remove('active'));
    const targetNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (targetNav) targetNav.classList.add('active');

    // 뷰 전환
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) targetView.classList.add('active');

    // 트래커 뷰로 전환 시 인사이트 분석
    if (viewName === 'tracker') {
        analyzeInsights();
    }
}

// ============================================
// 날짜 표시
// ============================================

function updateDateDisplay() {
    const dateDisplay = document.querySelector('.date-display');
    if (!dateDisplay) return;

    const now = new Date();
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    };
    dateDisplay.textContent = now.toLocaleDateString('ko-KR', options);
}

// ============================================
// 할 일 관리
// ============================================

function initQuickAdd() {
    const input = document.getElementById('quick-task-input');
    const addBtn = document.getElementById('add-task-btn');

    // NOW 모드에서는 이 요소들이 없으므로 방어 코드 추가
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTask();
            }
        });
    }

    if (addBtn) {
        addBtn.addEventListener('click', addTask);
    }
}

function addTask() {
    const input = document.getElementById('quick-task-input');
    const prioritySelect = document.getElementById('task-priority');
    const priority = prioritySelect ? prioritySelect.value : 'low';
    const hourSelect = document.getElementById('task-hour');
    const hour = hourSelect ? hourSelect.value : '';
    const endHourSelect = document.getElementById('task-end-hour');
    const endHour = endHourSelect ? endHourSelect.value : '';

    if (!input.value.trim()) return;

    // 시간 필수 체크
    if (!hour) {
        showToast('시작 시간을 선택해주세요!', 'warning');
        return;
    }

    // 종료 시간 체크 (선택)
    if (endHour && parseInt(endHour) <= parseInt(hour)) {
        showToast('종료 시간은 시작 시간보다 늦어야 합니다!', 'warning');
        return;
    }

    // 일일 목표도 함께 생성
    const today = new Date().getDay(); // 0=일요일, 6=토요일
    const goalId = Date.now();

    // 우선순위 매핑 (할 일 → 일일 목표)
    const priorityMap = {
        'urgent': 'urgent',
        'high': 'important',
        'medium': 'todo',
        'low': 'nice'
    };

    const dailyGoal = {
        id: goalId,
        title: input.value.trim(),
        description: '',
        createdAt: new Date().toISOString(),
        day: today,
        hour: parseInt(hour),
        endHour: endHour ? parseInt(endHour) : null,
        priority: priorityMap[priority] || 'nice',
        completed: false
    };

    // daily 배열 초기화
    if (!state.goals.daily) state.goals.daily = [];
    state.goals.daily.push(dailyGoal);

    // duration 계산: 종료 시간이 있으면 시간 차이, 없으면 기본 25분
    const calculatedDuration = endHour ? (parseInt(endHour) - parseInt(hour)) * 60 : 25;

    const task = {
        id: Date.now() + 1,
        title: input.value.trim(),
        priority: priority,
        duration: calculatedDuration,
        completed: false,
        createdAt: new Date().toISOString(),
        linkedGoal: goalId,
        linkedGoalType: 'daily',
        notes: '',
        hour: parseInt(hour),
        endHour: endHour ? parseInt(endHour) : null
    };

    state.tasks.push(task);
    state.totalTasks++;
    saveState();
    renderTasks();
    renderMindmap();
    updateProgress();

    input.value = '';
    if (hourSelect) hourSelect.value = ''; // 시간 선택 초기화
    if (endHourSelect) endHourSelect.value = ''; // 종료 시간 선택 초기화
    showToast('할 일이 추가되었습니다!', 'success');
}

// 일일 목표에서 할 일 자동 생성
function addTaskFromDailyGoal(goal) {
    // 이미 연결된 할 일이 있는지 확인
    const existingTask = state.tasks.find(t => t.linkedGoal === goal.id);
    if (existingTask) return; // 중복 방지

    // 우선순위 매핑 (일일 목표 → 할 일)
    const priorityMap = {
        'urgent': 'urgent',
        'important': 'high',
        'todo': 'medium',
        'nice': 'low'
    };

    // duration 계산: 종료 시간이 있으면 분 단위 차이, 없으면 기본 25분
    let calculatedDuration = 25;
    if (goal.endHour !== undefined && goal.hour !== undefined) {
        const startMinutes = goal.hour * 60 + (goal.minute || 0);
        const endMinutes = goal.endHour * 60 + (goal.endMinute || 0);
        calculatedDuration = endMinutes - startMinutes;
    }

    const task = {
        id: Date.now(),
        title: goal.title,
        priority: priorityMap[goal.priority] || 'medium',
        duration: calculatedDuration,
        completed: goal.completed || false,
        createdAt: new Date().toISOString(),
        linkedGoal: goal.id,
        linkedGoalType: 'daily',
        hour: goal.hour !== undefined ? goal.hour : null,
        minute: goal.minute !== undefined ? goal.minute : null,
        endHour: goal.endHour !== undefined ? goal.endHour : null,
        endMinute: goal.endMinute !== undefined ? goal.endMinute : null,
        notes: ''
    };

    state.tasks.push(task);
    state.totalTasks++;
    renderTasks();
    updateProgress();
}

// 일일 목표 완료 상태 동기화
function syncDailyGoalCompletion(goalId, completed) {
    const dailyGoals = state.goals.daily || [];
    const goal = dailyGoals.find(g => g.id === goalId);
    if (goal) {
        goal.completed = completed;
        saveState();
        renderMindmap();
    }
}

// 일일 목표 편집
let currentEditingDailyGoalId = null;

function editDailyGoal(goalId) {
    const dailyGoals = state.goals.daily || [];
    const goal = dailyGoals.find(g => g.id === goalId);
    if (!goal) return;

    currentEditingDailyGoalId = goalId;

    // 연결된 할 일 찾기
    const linkedTask = state.tasks.find(t => t.linkedGoal === goalId);

    // 모달에 값 채우기
    document.getElementById('modal-task-title').value = goal.title;
    document.getElementById('modal-task-notes').value = linkedTask?.notes || '';

    // 우선순위 매핑 (goal priority -> task priority)
    const priorityMap = {
        'urgent': 'urgent',
        'important': 'high',
        'todo': 'medium',
        'nice': 'low'
    };
    document.getElementById('modal-task-priority').value = priorityMap[goal.priority] || 'medium';
    document.getElementById('modal-task-duration').value = linkedTask?.duration || 25;

    // 모달 표시
    document.getElementById('task-modal').style.display = 'flex';

    // 저장 시 일일 목표 업데이트 모드로 전환
    currentEditingTaskId = linkedTask?.id || null;

    // 폼 제출 이벤트 일시 변경
    const form = document.getElementById('task-form');
    form.onsubmit = (e) => {
        e.preventDefault();
        saveDailyGoalFromModal();
    };
}

function saveDailyGoalFromModal() {
    const dailyGoals = state.goals.daily || [];
    const goal = dailyGoals.find(g => g.id === currentEditingDailyGoalId);
    if (!goal) return;

    const newTitle = document.getElementById('modal-task-title').value;
    const newNotes = document.getElementById('modal-task-notes').value;
    const newPriority = document.getElementById('modal-task-priority').value;
    const newDuration = parseInt(document.getElementById('modal-task-duration').value);

    // 일일 목표 업데이트
    goal.title = newTitle;

    // 우선순위 매핑 (task priority -> goal priority)
    const priorityMap = {
        'urgent': 'urgent',
        'high': 'important',
        'medium': 'todo',
        'low': 'nice'
    };
    goal.priority = priorityMap[newPriority] || goal.priority;

    // duration 변경 시 endHour/endMinute 재계산
    if (goal.hour !== undefined && goal.hour !== null) {
        const startMinutes = goal.hour * 60 + (goal.minute || 0);
        const endMinutes = startMinutes + newDuration;
        goal.endHour = Math.floor(endMinutes / 60) % 24;
        goal.endMinute = endMinutes % 60;
    }

    // 연결된 할 일도 함께 업데이트 (양방향 동기화)
    const linkedTask = state.tasks.find(t => t.linkedGoal === currentEditingDailyGoalId);
    if (linkedTask) {
        linkedTask.title = newTitle;
        linkedTask.notes = newNotes;
        linkedTask.priority = newPriority;
        linkedTask.duration = newDuration;
        // 할 일의 endHour/endMinute도 함께 업데이트
        if (linkedTask.hour !== undefined && linkedTask.hour !== null) {
            const startMinutes = linkedTask.hour * 60 + (linkedTask.minute || 0);
            const endMinutes = startMinutes + newDuration;
            linkedTask.endHour = Math.floor(endMinutes / 60) % 24;
            linkedTask.endMinute = endMinutes % 60;
        }
    }

    saveState();

    // 모달 닫기
    document.getElementById('task-modal').style.display = 'none';

    // 폼 제출 이벤트 원래대로 복원
    const form = document.getElementById('task-form');
    form.onsubmit = (e) => {
        e.preventDefault();
        saveTaskFromModal();
    };

    // UI 즉시 업데이트
    renderTasks();
    renderMindmap();

    // 현재 열린 상세 패널 새로고침
    if (currentDetailLevel && currentDetailLevel === 'daily') {
        refreshDetailPanel();
    }

    showToast('목표가 수정되었습니다!', 'success');
}

// 일일 목표 토글 (양방향 동기화)
function toggleDailyGoal(goalId) {
    const dailyGoals = state.goals.daily || [];
    const goal = dailyGoals.find(g => g.id === goalId);
    if (!goal) return;

    goal.completed = !goal.completed;

    // 연결된 할 일도 함께 토글
    const linkedTask = state.tasks.find(t => t.linkedGoal === goalId);
    if (linkedTask && linkedTask.completed !== goal.completed) {
        linkedTask.completed = goal.completed;
        const points = getPointsForTask(linkedTask);
        if (goal.completed) {
            linkedTask.completedAt = new Date().toISOString();
            state.completedToday++;
            state.totalCompleted = (state.totalCompleted || 0) + 1;
            state.points += points;
            addXp(points);
            showCelebration(points);
            checkAchievements();
        } else {
            state.completedToday--;
            state.totalCompleted = Math.max(0, (state.totalCompleted || 0) - 1);
            state.points = Math.max(0, state.points - points);
            state.xp = Math.max(0, state.xp - Math.floor(points / 2));
        }
    } else if (!linkedTask) {
        if (goal.completed) {
            state.completedToday++;
            state.totalCompleted = (state.totalCompleted || 0) + 1;
            state.points += 10;
            addXp(10);
            showCelebration(10);
        } else {
            state.completedToday--;
            state.totalCompleted = Math.max(0, (state.totalCompleted || 0) - 1);
            state.points = Math.max(0, state.points - 10);
            state.xp = Math.max(0, state.xp - 5);
        }
    }

    saveState();
    updateRewardsPage();
    renderTasks();
    updateProgress();

    // 세로 타임라인 바 체크 상태 업데이트
    const vtBars = document.querySelectorAll(`.vt-bar`);
    vtBars.forEach(item => {
        const onclick = item.getAttribute('onclick');
        if (onclick && onclick.includes(`toggleDailyGoal(${goalId})`)) {
            const checkbox = item.querySelector('.vt-checkbox');
            if (goal.completed) {
                item.classList.add('completed');
                if (checkbox) checkbox.classList.add('completed');
            } else {
                item.classList.remove('completed');
                if (checkbox) checkbox.classList.remove('completed');
            }
        }
    });

    // 기존 가로 타임라인 바 체크 상태 업데이트 (호환성)
    const goalItems = document.querySelectorAll(`.time-goal-item, .timeline-bar`);
    goalItems.forEach(item => {
        const onclick = item.getAttribute('onclick');
        if (onclick && onclick.includes(`toggleDailyGoal(${goalId})`)) {
            const checkbox = item.querySelector('.goal-checkbox, .bar-checkbox');
            if (goal.completed) {
                item.classList.add('completed');
                if (checkbox) checkbox.classList.add('completed');
            } else {
                item.classList.remove('completed');
                if (checkbox) checkbox.classList.remove('completed');
            }
        }
    });

    // 마인드맵 새로고침 (맨 마지막에)
    renderMindmap();
}

// 목표 완료 토글 (주간, 월간, 연간, 인생 목표용)
function toggleGoalCompletion(goalId, level) {
    const goals = state.goals[level] || [];
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const wasCompleted = goal.completed;
    goal.completed = !goal.completed;

    // 목표 완료 시 보상 피드백
    if (goal.completed && !wasCompleted) {
        const levelPoints = { weekly: 15, monthly: 25, yearly: 50, life: 100 };
        const points = levelPoints[level] || 10;
        state.points = (state.points || 0) + points;
        addXp(points);
        showCelebration(points);
    }

    // UI 업데이트 - detail-goal-item
    const goalItems = document.querySelectorAll('.detail-goal-item');
    goalItems.forEach(item => {
        const checkbox = item.querySelector('.goal-checkbox');
        const title = item.querySelector('.detail-goal-title');
        const wrapper = item.querySelector('.goal-checkbox-wrapper');

        if (wrapper && wrapper.getAttribute('onclick')?.includes(`toggleGoalCompletion(${goalId}`)) {
            if (goal.completed) {
                item.classList.add('completed');
                if (checkbox) checkbox.classList.add('completed');
                if (title) title.classList.add('completed');
            } else {
                item.classList.remove('completed');
                if (checkbox) checkbox.classList.remove('completed');
                if (title) title.classList.remove('completed');
            }
        }
    });

    // UI 업데이트 - priority-goal-item (월간 목표용)
    const priorityItems = document.querySelectorAll('.priority-goal-item');
    priorityItems.forEach(item => {
        const checkbox = item.querySelector('.goal-checkbox');
        const title = item.querySelector('.goal-title');
        const wrapper = item.querySelector('.goal-checkbox-wrapper');

        if (wrapper && wrapper.getAttribute('onclick')?.includes(`toggleGoalCompletion(${goalId}`)) {
            if (goal.completed) {
                item.classList.add('completed');
                if (checkbox) checkbox.classList.add('completed');
                if (title) title.classList.add('completed');
            } else {
                item.classList.remove('completed');
                if (checkbox) checkbox.classList.remove('completed');
                if (title) title.classList.remove('completed');
            }
        }
    });

    // UI 업데이트 - parent-goal-item (상위 목표 참고용)
    const parentItems = document.querySelectorAll('.parent-goal-item');
    parentItems.forEach(item => {
        const checkbox = item.querySelector('.parent-goal-checkbox');
        const wrapper = item.querySelector('.parent-goal-checkbox-wrapper');

        if (wrapper && wrapper.getAttribute('onclick')?.includes(`toggleGoalCompletion(${goalId}`)) {
            if (goal.completed) {
                item.classList.add('completed');
                if (checkbox) checkbox.classList.add('completed');
            } else {
                item.classList.remove('completed');
                if (checkbox) checkbox.classList.remove('completed');
            }
        }
    });

    // 저장
    saveState();

    // 달성률 바 업데이트
    updateGoalProgressBar(level);

    // 사이드바 진행률 업데이트
    updateProgress();

    // 마인드맵 새로고침
    renderMindmap();
}

// 달성률 바 업데이트
function updateGoalProgressBar(level) {
    let goals = [];
    switch(level) {
        case 'monthly':
            goals = getGoalsForMonth(currentDetailData);
            break;
        case 'weekly':
            if (typeof currentDetailData === 'object') {
                goals = getGoalsForWeek(currentDetailData.week, currentDetailData.month);
            } else {
                goals = getGoalsForWeek(currentDetailData, new Date().getMonth() + 1);
            }
            break;
        case 'yearly':
            goals = state.goals.yearly || [];
            break;
        case 'life':
            goals = state.goals.life || [];
            break;
    }

    const completedGoals = goals.filter(g => g.completed).length;
    const progressPercent = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

    // 진행률 바 업데이트
    const progressInfo = document.querySelector('.goal-progress-info span:last-child, .monthly-progress-info span:last-child');
    const progressFill = document.querySelector('.goal-progress-fill, .monthly-progress-fill');

    if (progressInfo) {
        progressInfo.textContent = `${completedGoals}/${goals.length} (${progressPercent}%)`;
    }
    if (progressFill) {
        progressFill.style.width = `${progressPercent}%`;
    }

    // 월간 목표의 중요도별 카운트 업데이트
    if (level === 'monthly') {
        const priorities = ['urgent', 'important', 'todo', 'nice'];
        priorities.forEach(p => {
            const priorityGoals = goals.filter(g => g.priority === p);
            const completedInPriority = priorityGoals.filter(g => g.completed).length;
            const countEl = document.querySelector(`.priority-group[data-priority="${p}"] .priority-count`);
            if (countEl) {
                countEl.textContent = `${completedInPriority}/${priorityGoals.length}`;
            }
        });
    }
}

// 상위 목표 섹션 새로고침
function refreshParentGoals() {
    if (!currentDetailLevel) return;

    const parentList = document.getElementById('parent-goals-list');
    if (!parentList) return;

    parentList.innerHTML = '';
    const parentGoals = getParentGoals(currentDetailLevel, currentDetailData);

    parentGoals.forEach(pg => {
        const item = document.createElement('div');
        const isCompleted = pg.completed ? 'completed' : '';
        item.className = `parent-goal-item level-${pg.level} ${isCompleted}`;
        item.innerHTML = `
            <div class="parent-goal-checkbox-wrapper" onclick="event.stopPropagation(); toggleGoalCompletion(${pg.id}, '${pg.level}'); refreshParentGoals();">
                <span class="parent-goal-checkbox ${isCompleted}"></span>
            </div>
            <div class="parent-goal-content">
                <strong>[${pg.levelName}]</strong> ${pg.title}
            </div>
        `;
        parentList.appendChild(item);
    });
}

function initTaskSections() {
    // 완료 섹션 토글
    const completedToggle = document.getElementById('completed-toggle');
    const completedList = document.getElementById('completed-list');

    // NOW 모드에서는 이 요소들이 없으므로 방어 코드 추가
    if (completedToggle && completedList) {
        completedToggle.addEventListener('click', () => {
            completedToggle.classList.toggle('open');
            completedList.style.display = completedToggle.classList.contains('open') ? 'block' : 'none';
        });
    }
}

function renderTasks() {
    // 각 우선순위별 리스트 클리어
    document.querySelectorAll('.task-list').forEach(list => {
        if (!list.classList.contains('completed-list')) {
            list.innerHTML = '';
        }
    });

    // 완료된 할 일 리스트 클리어
    const completedList = document.getElementById('completed-list');
    if (completedList) {
        completedList.innerHTML = '';
    }

    let completedCount = 0;

    // 시간순으로 정렬 (5시부터 시작, 0~4시는 다음날 새벽으로 취급, 분 단위 지원)
    const getAdjustedTime = (hour, minute = 0) => {
        if (hour === null || hour === undefined) return 99 * 60;
        // 0~4시는 24~28로 변환 (다음날 새벽)
        const adjustedHour = hour < 5 ? hour + 24 : hour;
        return adjustedHour * 60 + minute;
    };
    const sortedTasks = [...state.tasks].sort((a, b) => {
        return getAdjustedTime(a.hour, a.minute) - getAdjustedTime(b.hour, b.minute);
    });

    sortedTasks.forEach(task => {
        const taskEl = createTaskElement(task);

        if (task.completed) {
            if (completedList) {
                completedList.appendChild(taskEl);
            }
            completedCount++;
        } else {
            const list = document.querySelector(`.task-list[data-priority="${task.priority}"]`);
            if (list) {
                list.appendChild(taskEl);
            }
        }
    });

    // 완료 카운트 업데이트
    const completedCountEl = document.querySelector('.completed-count');
    if (completedCountEl) {
        completedCountEl.textContent = `(${completedCount})`;
    }

    // 빈 상태 처리
    document.querySelectorAll('.task-list:not(.completed-list)').forEach(list => {
        if (list.children.length === 0) {
            const emptyMsg = document.createElement('li');
            emptyMsg.className = 'empty-state';
            emptyMsg.innerHTML = '<p>할 일이 없습니다</p>';
            list.appendChild(emptyMsg);
        }
    });
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;

    // 시간 표시 (시작 ~ 종료) + 시각적 바
    let timeDisplay = '';
    let timeBarDisplay = '';
    if (task.hour !== null && task.hour !== undefined) {
        const startTime = task.hour.toString().padStart(2, '0') + ':00';
        const endHour = (task.endHour !== null && task.endHour !== undefined) ? task.endHour : task.hour + 1;
        const endTime = endHour.toString().padStart(2, '0') + ':00';
        const duration = endHour - task.hour;

        timeDisplay = `<span class="task-time-badge">${startTime} ~ ${endTime}</span>`;

        // 시각적 시간 바 (0시~24시 기준, 24시간)
        const leftPercent = (task.hour / 24) * 100;
        const widthPercent = Math.min(100 - leftPercent, (duration / 24) * 100);

        timeBarDisplay = `
            <div class="task-time-bar-container">
                <div class="task-time-bar" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
                <div class="task-time-markers">
                    <span>0</span><span>6</span><span>12</span><span>18</span><span>24</span>
                </div>
            </div>
        `;
    }

    // 소요 시간 표시 (종료 시간이 있으면 계산된 시간, 없으면 duration)
    const durationText = task.endHour !== null && task.endHour !== undefined
        ? `${task.endHour - task.hour}시간`
        : `${task.duration}분`;

    li.innerHTML = `
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}"></div>
        <div class="task-content">
            <div class="task-header-row">
                <span class="task-title">${task.title}</span>
                ${timeDisplay}
            </div>
            ${timeBarDisplay}
            <div class="task-meta">
                <span class="task-duration">&#9201; ${durationText}</span>
                ${task.linkedGoal ? `<span class="task-goal">&#127919; ${getGoalTitle(task.linkedGoal)}</span>` : ''}
            </div>
        </div>
        <div class="task-actions">
            ${!task.completed ? `<button class="task-help-btn" data-id="${task.id}">시작이 어려워</button>` : ''}
            ${!task.completed ? `<button class="task-action-btn focus-btn" data-id="${task.id}">집중</button>` : ''}
            <button class="task-action-btn edit-btn" data-id="${task.id}">편집</button>
        </div>
    `;

    // 체크박스 클릭
    li.querySelector('.task-checkbox').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTask(task.id);
    });

    // 집중 버튼
    const focusBtn = li.querySelector('.focus-btn');
    if (focusBtn) {
        focusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startFocusMode(task);
        });
    }

    // 편집 버튼
    li.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openTaskModal(task);
    });

    // 시작 도우미 버튼
    const helpBtn = li.querySelector('.task-help-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openStartHelper(task);
        });
    }

    return li;
}

function toggleTask(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;

    if (task.completed) {
        task.completedAt = new Date().toISOString();
        state.completedToday++;
        state.totalCompleted = (state.totalCompleted || 0) + 1;

        // 포인트 추가
        const points = getPointsForTask(task);
        state.points += points;

        // XP 추가
        addXp(points);

        // 축하 애니메이션
        showCelebration(points);

        // 업적 확인
        checkAchievements();

        // 양방향 동기화: 연결된 일일 목표도 완료 처리
        if (task.linkedGoal && task.linkedGoalType === 'daily') {
            syncDailyGoalCompletion(task.linkedGoal, true);
        }
    } else {
        state.completedToday--;
        state.totalCompleted = Math.max(0, (state.totalCompleted || 0) - 1);

        // 포인트 차감
        const points = getPointsForTask(task);
        state.points = Math.max(0, state.points - points);

        // XP 차감
        state.xp = Math.max(0, state.xp - Math.floor(points / 2));

        // 양방향 동기화: 연결된 일일 목표도 미완료 처리
        if (task.linkedGoal && task.linkedGoalType === 'daily') {
            syncDailyGoalCompletion(task.linkedGoal, false);
        }
    }

    saveState();
    renderTasks();
    updateProgress();
    updateRewardsPage();
}

function getPointsForTask(task) {
    const basePoints = {
        'urgent': 20,
        'high': 15,
        'medium': 10,
        'low': 5
    };

    return basePoints[task.priority] || 10;
}

// ============================================
// 집중 모드
// ============================================

function startFocusMode(task) {
    state.currentFocusTask = task;

    const container = document.getElementById('focus-task-container');
    const titleEl = container.querySelector('.focus-task-title');
    const timerDisplay = container.querySelector('.timer-display');

    container.style.display = 'block';
    titleEl.textContent = task.title;
    timerDisplay.textContent = formatTime(task.duration * 60);

    // 타이머 초기화
    let timeRemaining = task.duration * 60;
    const totalTime = timeRemaining;
    const progressBar = container.querySelector('.focus-progress-bar');

    // 시작/일시정지 버튼
    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');
    const resetBtn = document.getElementById('timer-reset');
    const exitBtn = document.getElementById('exit-focus-btn');

    let isPaused = true;

    startBtn.onclick = () => {
        isPaused = false;
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-block';

        state.focusTimer = setInterval(() => {
            if (!isPaused && timeRemaining > 0) {
                timeRemaining--;
                timerDisplay.textContent = formatTime(timeRemaining);
                progressBar.style.width = `${((totalTime - timeRemaining) / totalTime) * 100}%`;

                if (timeRemaining === 0) {
                    clearInterval(state.focusTimer);
                    completeFocusSession();
                }
            }
        }, 1000);
    };

    pauseBtn.onclick = () => {
        isPaused = true;
        pauseBtn.style.display = 'none';
        startBtn.style.display = 'inline-block';
    };

    resetBtn.onclick = () => {
        clearInterval(state.focusTimer);
        timeRemaining = task.duration * 60;
        timerDisplay.textContent = formatTime(timeRemaining);
        progressBar.style.width = '0%';
        isPaused = true;
        pauseBtn.style.display = 'none';
        startBtn.style.display = 'inline-block';
    };

    exitBtn.onclick = () => {
        clearInterval(state.focusTimer);
        container.style.display = 'none';
        state.currentFocusTask = null;
    };
}

function completeFocusSession() {
    const container = document.getElementById('focus-task-container');
    container.style.display = 'none';

    if (state.currentFocusTask) {
        // 자동으로 완료 처리
        toggleTask(state.currentFocusTask.id);
        state.pomodoro.totalFocusTime += state.currentFocusTask.duration;
        updatePomodoroStats();
    }

    state.currentFocusTask = null;
    showToast('집중 시간 완료! 잠시 휴식하세요.', 'success');

    // 알림음 (지원하는 브라우저에서)
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('FLOCA', {
            body: '집중 시간이 끝났습니다! 잠시 휴식하세요.',
            icon: '&#9201;'
        });
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// 진행률 업데이트
// ============================================

// 현재 선택된 기간 탭
let currentProgressPeriod = 'daily';

// 기간별 달성률 계산
function calculatePeriodProgress(period) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentWeek = getWeekOfMonth(now);
    const currentYear = now.getFullYear();

    let totalCount = 0;
    let completedCount = 0;

    switch(period) {
        case 'daily':
            // 오늘 요일의 일일 목표만 계산
            const todayDay = now.getDay(); // 0=일요일, 6=토요일
            const todayGoals = (state.goals?.daily || []).filter(g => g.day === todayDay);
            todayGoals.forEach(goal => {
                totalCount++;
                if (goal.completed) completedCount++;
            });
            break;

        case 'weekly':
            // 이번 달 모든 주간 목표 (1~5주차 전체)
            const weeklyGoals = (state.goals?.weekly || []).filter(g =>
                g.month === currentMonth
            );
            weeklyGoals.forEach(goal => {
                totalCount++;
                if (goal.completed) completedCount++;
            });

            // 이번 달의 모든 일일 목표도 포함
            const monthStartForWeekly = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEndForWeekly = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            (state.goals?.daily || []).forEach(goal => {
                if (goal.date) {
                    const goalDate = new Date(goal.date);
                    if (goalDate >= monthStartForWeekly && goalDate <= monthEndForWeekly) {
                        totalCount++;
                        if (goal.completed) completedCount++;
                    }
                }
            });
            break;

        case 'monthly':
            // 이번 달 월간 목표
            const monthlyGoals = (state.goals?.monthly || []).filter(g => g.month === currentMonth);
            monthlyGoals.forEach(goal => {
                totalCount++;
                if (goal.completed) completedCount++;
            });

            // 이번 달의 주간 목표도 포함
            const monthWeeklyGoals = (state.goals?.weekly || []).filter(g => g.month === currentMonth);
            monthWeeklyGoals.forEach(goal => {
                totalCount++;
                if (goal.completed) completedCount++;
            });

            // 이번 달의 일일 목표도 포함
            const monthStart = new Date(currentYear, now.getMonth(), 1);
            const monthEnd = new Date(currentYear, now.getMonth() + 1, 0);

            (state.goals?.daily || []).forEach(goal => {
                if (goal.date) {
                    const goalDate = new Date(goal.date);
                    if (goalDate >= monthStart && goalDate <= monthEnd) {
                        totalCount++;
                        if (goal.completed) completedCount++;
                    }
                }
            });
            break;

        case 'yearly':
            // 연간 목표만 계산 (월간/주간 제외)
            const yearlyGoals = state.goals?.yearly || [];
            yearlyGoals.forEach(goal => {
                totalCount++;
                if (goal.completed) completedCount++;
            });
            break;

        case 'life':
            // 인생 목표
            const lifeGoals = state.goals?.life || [];
            lifeGoals.forEach(goal => {
                totalCount++;
                if (goal.completed) completedCount++;
            });
            break;
    }

    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
        completed: completedCount,
        total: totalCount,
        percentage: percentage
    };
}

// 월의 몇 주차인지 계산
function getWeekOfMonth(date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstDayOfWeek = firstDay.getDay();
    return Math.ceil((date.getDate() + firstDayOfWeek) / 7);
}

function updateProgress() {
    // 모든 기간별 달성률 계산
    const progressData = {
        daily: calculatePeriodProgress('daily'),
        weekly: calculatePeriodProgress('weekly'),
        monthly: calculatePeriodProgress('monthly'),
        yearly: calculatePeriodProgress('yearly'),
        life: calculatePeriodProgress('life')
    };

    // 현재 선택된 탭의 데이터
    const currentData = progressData[currentProgressPeriod];

    // 프로그레스 링 업데이트
    const progressRing = document.querySelector('.progress-ring-fill');
    const circumference = 2 * Math.PI * 40; // r = 40
    const offset = circumference - (currentData.percentage / 100) * circumference;
    progressRing.style.strokeDashoffset = offset;

    // 퍼센트 텍스트
    document.querySelector('.progress-text').textContent = `${currentData.percentage}%`;

    // 상세 완료 수
    const completedEl = document.querySelector('.progress-completed');
    const totalEl = document.querySelector('.progress-total');
    if (completedEl) completedEl.textContent = currentData.completed;
    if (totalEl) totalEl.textContent = currentData.total;

    // 모든 기간 미니 프로그레스 바 업데이트
    ['daily', 'weekly', 'monthly', 'yearly', 'life'].forEach(period => {
        const bar = document.getElementById(`${period}-bar`);
        const percent = document.getElementById(`${period}-percent`);
        if (bar) bar.style.width = `${progressData[period].percentage}%`;
        if (percent) percent.textContent = `${progressData[period].percentage}%`;
    });

    // 활성 탭 표시
    document.querySelectorAll('.progress-bar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.period === currentProgressPeriod);
    });

    // 연속 기록
    document.querySelector('.streak-count').textContent = `${state.streak}일`;

    // 스트릭 배수 배지 업데이트
    updateStreakBonusUI();
}

// 스트릭 보너스 UI 업데이트
function updateStreakBonusUI() {
    const info = getStreakBonusInfo();
    const badge = document.getElementById('streak-multiplier-badge');
    const progressBar = document.getElementById('streak-progress-bar');
    const milestone = document.getElementById('streak-next-milestone');
    const progressContainer = document.getElementById('streak-progress');

    // 배수 배지
    if (badge) {
        if (info.multiplier > 1) {
            badge.textContent = `x${info.multiplier}`;
            badge.style.display = 'inline-block';
            badge.className = 'streak-multiplier-badge';
            if (info.multiplier >= 3) badge.classList.add('legendary');
            else if (info.multiplier >= 2) badge.classList.add('epic');
            else badge.classList.add('rare');
        } else {
            badge.style.display = 'none';
        }
    }

    // 진행률 바
    if (progressBar && milestone && progressContainer) {
        if (info.nextMilestone) {
            progressContainer.style.display = 'block';

            let progress = 0;
            if (info.nextMilestone === 3) {
                progress = (info.streak / 3) * 100;
            } else if (info.nextMilestone === 7) {
                progress = ((info.streak - 3) / 4) * 100;
            } else if (info.nextMilestone === 30) {
                progress = ((info.streak - 7) / 23) * 100;
            }

            progressBar.style.width = `${Math.min(progress, 100)}%`;

            const nextMultiplier = info.nextMilestone === 3 ? 1.5 : info.nextMilestone === 7 ? 2.0 : 3.0;
            milestone.textContent = `${info.daysToNext}일 후 x${nextMultiplier} 보너스!`;
        } else {
            // 30일 이상 달성 시
            progressContainer.style.display = 'block';
            progressBar.style.width = '100%';
            milestone.textContent = '🏆 최고 보너스 달성!';
        }
    }
}

// 달성률 탭 이벤트 초기화
function initProgressTabs() {
    // 탭 버튼 클릭
    document.querySelectorAll('.progress-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.progress-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentProgressPeriod = tab.dataset.period;
            updateProgress();
        });
    });

    // 미니 프로그레스 바 클릭
    document.querySelectorAll('.progress-bar-item').forEach(item => {
        item.addEventListener('click', () => {
            const period = item.dataset.period;
            document.querySelectorAll('.progress-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.period === period);
            });
            currentProgressPeriod = period;
            updateProgress();
        });
    });
}

// ============================================
// 연속 기록 체크
// ============================================

function checkStreak() {
    const today = new Date().toDateString();

    if (state.lastActiveDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (state.lastActiveDate === yesterday.toDateString()) {
            // 연속 유지
        } else if (state.lastActiveDate !== null) {
            // 연속 끊김
            state.streak = 0;
        }

        state.lastActiveDate = today;
        state.completedToday = 0;
        saveState();
    }
}

// ============================================
// 목표 관리
// ============================================

function calculateGoalProgress(goal, level) {
    // 연결된 할 일 기반 진행률 계산
    const linkedTasks = state.tasks.filter(t => t.linkedGoal === goal.id);
    if (linkedTasks.length === 0) return 0;

    const completed = linkedTasks.filter(t => t.completed).length;
    return Math.round((completed / linkedTasks.length) * 100);
}

function getGoalTitle(goalId) {
    for (const level of ['life', 'yearly', 'monthly', 'weekly']) {
        const goal = state.goals[level].find(g => g.id === goalId);
        if (goal) return goal.title;
    }
    return '';
}

// ============================================
// 포모도로 타이머
// ============================================

let pomodoroState = {
    mode: 'focus', // 'focus', 'shortBreak', 'longBreak'
    session: 1,
    timeRemaining: 25 * 60,
    isRunning: false
};

const pomoSettings = {
    get focusTime() { return parseInt(document.getElementById('focus-time')?.value) || 25; },
    get shortBreak() { return parseInt(document.getElementById('short-break')?.value) || 5; },
    get longBreak() { return parseInt(document.getElementById('long-break')?.value) || 15; }
};

function updatePomodoroDisplay() {
    const timeDisplay = document.querySelector('.timer-time');
    const modeDisplay = document.querySelector('.timer-mode');
    const sessionDisplay = document.querySelector('.timer-session');
    const progressCircle = document.querySelector('.timer-progress');

    // 삭제된 뽀모도로 페이지 요소 - null 체크
    if (!timeDisplay) return;

    timeDisplay.textContent = formatTime(pomodoroState.timeRemaining);

    const modeNames = {
        'focus': '집중 모드',
        'shortBreak': '짧은 휴식',
        'longBreak': '긴 휴식'
    };
    if (modeDisplay) modeDisplay.textContent = modeNames[pomodoroState.mode];
    if (sessionDisplay) sessionDisplay.textContent = `세션 ${pomodoroState.session}/4`;

    // 프로그레스 원 업데이트
    const totalTime = pomodoroState.mode === 'focus'
        ? pomoSettings.focusTime * 60
        : (pomodoroState.mode === 'shortBreak' ? pomoSettings.shortBreak * 60 : pomoSettings.longBreak * 60);
    const circumference = 2 * Math.PI * 90;
    const offset = (pomodoroState.timeRemaining / totalTime) * circumference;
    if (progressCircle) {
        progressCircle.style.strokeDashoffset = circumference - offset;
    }
}

function startPomodoro() {
    const startBtn = document.querySelector('.pomo-start');
    const pauseBtn = document.querySelector('.pomo-pause');

    // 삭제된 뽀모도로 페이지 요소 - null 체크
    if (!startBtn || !pauseBtn) return;

    pomodoroState.isRunning = true;
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-block';

    state.pomodoroTimer = setInterval(() => {
        if (pomodoroState.timeRemaining > 0) {
            pomodoroState.timeRemaining--;
            updatePomodoroDisplay();
        } else {
            completePomodoro();
        }
    }, 1000);
}

function pausePomodoro() {
    const startBtn = document.querySelector('.pomo-start');
    const pauseBtn = document.querySelector('.pomo-pause');

    pomodoroState.isRunning = false;
    clearInterval(state.pomodoroTimer);

    // 삭제된 뽀모도로 페이지 요소 - null 체크
    if (!startBtn || !pauseBtn) return;

    pauseBtn.style.display = 'none';
    startBtn.style.display = 'inline-block';
}

function completePomodoro() {
    const startBtn = document.querySelector('.pomo-start');
    const pauseBtn = document.querySelector('.pomo-pause');

    clearInterval(state.pomodoroTimer);

    // 삭제된 뽀모도로 페이지 요소 - null 체크
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-block';

    if (pomodoroState.mode === 'focus') {
        state.pomodoro.completed++;
        state.pomodoro.totalFocusTime += pomoSettings.focusTime;
        state.points += 15;
        addXp(15);
        updateRewardsPage();
        updatePomodoroStats();
        checkAchievements();

        showToast('포모도로 완료! +15 포인트 +15 XP', 'success');

        // 다음 모드 결정
        if (pomodoroState.session >= 4) {
            pomodoroState.mode = 'longBreak';
            pomodoroState.timeRemaining = pomoSettings.longBreak * 60;
            pomodoroState.session = 1;
        } else {
            pomodoroState.mode = 'shortBreak';
            pomodoroState.timeRemaining = pomoSettings.shortBreak * 60;
        }
    } else {
        showToast('휴식 끝! 다시 집중하세요.', 'success');
        pomodoroState.mode = 'focus';
        pomodoroState.timeRemaining = pomoSettings.focusTime * 60;
        if (pomodoroState.mode !== 'longBreak') {
            pomodoroState.session++;
        }
    }

    updatePomodoroDisplay();
    saveState();
}

function skipPomodoro() {
    const startBtn = document.querySelector('.pomo-start');
    const pauseBtn = document.querySelector('.pomo-pause');

    clearInterval(state.pomodoroTimer);

    // 삭제된 뽀모도로 페이지 요소 - null 체크
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-block';

    completePomodoro();
}

function resetPomodoro() {
    const startBtn = document.querySelector('.pomo-start');
    const pauseBtn = document.querySelector('.pomo-pause');

    clearInterval(state.pomodoroTimer);

    // 삭제된 뽀모도로 페이지 요소 - null 체크
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-block';

    pomodoroState.mode = 'focus';
    pomodoroState.session = 1;
    pomodoroState.timeRemaining = pomoSettings.focusTime * 60;
    pomodoroState.isRunning = false;
    updatePomodoroDisplay();
}

// 포모도로 프리셋 적용 (레거시 - 삭제된 뽀모도로 페이지용)
function applyPreset(focus, shortBreak, longBreak) {
    // 삭제된 뽀모도로 페이지 요소 - null 체크
    const focusEl = document.getElementById('focus-time');
    const shortBreakEl = document.getElementById('short-break');
    const longBreakEl = document.getElementById('long-break');

    // 입력 필드 업데이트
    if (focusEl) focusEl.value = focus;
    if (shortBreakEl) shortBreakEl.value = shortBreak;
    if (longBreakEl) longBreakEl.value = longBreak;

    // 타이머 업데이트
    if (!pomodoroState.isRunning) {
        pomodoroState.timeRemaining = focus * 60;
        updatePomodoroDisplay();
    }

    // 활성 버튼 표시
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    showToast(`${focus}분 집중 모드로 설정되었습니다`, 'success');
}

function initPomodoro() {
    // 포모도로 뷰가 삭제되었으므로 NOW 모드에서 처리
    // 기존 설정 변경 리스너는 더 이상 필요 없음
}

function updatePomodoroStats() {
    // 기존 포모도로 뷰 요소 (삭제됨)
    const pomoCompletedEl = document.getElementById('pomo-completed');
    const pomoFocusTimeEl = document.getElementById('pomo-focus-time');

    if (pomoCompletedEl) {
        pomoCompletedEl.textContent = state.pomodoro.completed;
    }
    if (pomoFocusTimeEl) {
        pomoFocusTimeEl.textContent = `${state.pomodoro.totalFocusTime}분`;
    }

    // NOW 모드 통계도 업데이트
    if (typeof updateNowPomoStats === 'function') {
        updateNowPomoStats();
    }
}

// ============================================
// 건강 트래커 (ADHD 맞춤형)
// ============================================

// 트래커 상태 확장
if (!state.tracker.medication) {
    state.tracker.medication = [];
}
if (!state.tracker.emotionJournal) {
    state.tracker.emotionJournal = [];
}
if (!state.tracker.routine) {
    state.tracker.routine = [];
}
if (!state.tracker.environment) {
    state.tracker.environment = [];
}

function initTracker() {
    // 탭 전환 초기화
    const tabs = document.querySelectorAll('.tracker-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTrackerTab(tabName);
        });
    });

    // 오늘 날짜 표시
    updateTrackerDate();

    // 저장된 데이터 로드
    loadTodayTrackerData();

    // 호르몬 가이드 토글
    const hormoneToggle = document.querySelector('.hormone-toggle');
    if (hormoneToggle) {
        hormoneToggle.addEventListener('click', toggleHormoneGuide);
    }

    // 불편함 점수 슬라이더 실시간 업데이트
    const discomfortSlider = document.getElementById('discomfort-score');
    const discomfortDisplay = document.getElementById('discomfort-display');
    if (discomfortSlider && discomfortDisplay) {
        discomfortSlider.addEventListener('input', () => {
            discomfortDisplay.textContent = discomfortSlider.value;
        });
    }

    const taskDiscomfortSlider = document.getElementById('task-discomfort');
    if (taskDiscomfortSlider) {
        taskDiscomfortSlider.addEventListener('input', () => {
            // 필요시 표시 업데이트
        });
    }
}

// 탭 전환
function switchTrackerTab(tabName) {
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.tracker-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // 선택한 탭 활성화
    const activeTab = document.querySelector(`.tracker-tab[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // 모든 탭 콘텐츠 숨기기
    document.querySelectorAll('.tracker-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // 선택한 콘텐츠 표시 (HTML은 tab-${tabName} 형식)
    const activeContent = document.getElementById(`tab-${tabName}`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
}

// 날짜 업데이트
function updateTrackerDate() {
    const dateEl = document.getElementById('tracker-date');
    if (dateEl) {
        const today = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        dateEl.textContent = today.toLocaleDateString('ko-KR', options);
    }
}

// ============================================
// 복약 기록 기능
// ============================================

// 복약 시간 기록
function recordMedTaken() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    const medTimeEl = document.getElementById('med-taken-time');
    if (medTimeEl) {
        medTimeEl.textContent = timeStr;
    }

    // 시간대별 슬롯 업데이트
    updateMedTimeSlots(now);

    // 상태 저장
    const today = new Date().toISOString().split('T')[0];
    let todayMed = state.tracker.medication.find(m => m.date === today);
    if (!todayMed) {
        todayMed = { date: today, takenTime: null, logs: {} };
        state.tracker.medication.push(todayMed);
    }
    todayMed.takenTime = now.toISOString();

    saveState();
    showToast('복약 시간이 기록되었습니다!', 'success');
}

// 시간대별 슬롯 업데이트
function updateMedTimeSlots(takenTime) {
    // 인자가 없으면 입력 필드에서 시간 가져오기
    if (!takenTime) {
        const timeInput = document.getElementById('med-take-time');
        if (timeInput && timeInput.value) {
            const [hours, minutes] = timeInput.value.split(':').map(Number);
            takenTime = new Date();
            takenTime.setHours(hours, minutes, 0, 0);
        } else {
            return; // 시간이 없으면 종료
        }
    }

    const slots = ['+1H', '+3H', '+6H', '+8H'];
    const hours = [1, 3, 6, 8];

    slots.forEach((slot, index) => {
        const slotTime = new Date(takenTime.getTime() + hours[index] * 60 * 60 * 1000);
        const timeStr = slotTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

        // 해당 슬롯의 시간 표시 업데이트 (header가 아닌 time-header)
        const headerCells = document.querySelectorAll('.med-time-header .med-time-col');
        if (headerCells[index]) {
            headerCells[index].innerHTML = `<strong>${slot}</strong><br><small>${timeStr}</small>`;
        }
    });
}

// 복약 로그 저장
function saveMedLog(element, time, type) {
    const value = element.value;
    const today = new Date().toISOString().split('T')[0];

    let todayMed = state.tracker.medication.find(m => m.date === today);
    if (!todayMed) {
        todayMed = { date: today, takenTime: null, logs: {} };
        state.tracker.medication.push(todayMed);
    }

    if (!todayMed.logs[time]) {
        todayMed.logs[time] = {};
    }
    todayMed.logs[time][type] = value;

    saveState();

    // 시각적 피드백
    element.style.borderColor = '#4ecdc4';
    setTimeout(() => {
        element.style.borderColor = '';
    }, 500);
}

// 호르몬 가이드 토글
function toggleHormoneGuide() {
    const guideContent = document.getElementById('hormone-guide-content');
    const toggle = document.querySelector('.hormone-guide .guide-toggle');
    if (guideContent) {
        const isHidden = guideContent.style.display === 'none';
        guideContent.style.display = isHidden ? 'block' : 'none';
        if (toggle) {
            toggle.textContent = isHidden ? '▲' : '▼';
        }
    }
}

// ============================================
// 감정 일기 (CBT) 기능
// ============================================

// 감정 타입 선택 (충동/미루기)
function selectEmotionType(type) {
    // 버튼 상태 업데이트
    document.querySelectorAll('.emotion-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.emotion-type-btn[onclick*="${type}"]`)?.classList.add('active');

    // 콘텐츠 전환 (display 사용)
    const impulseJournal = document.getElementById('impulse-journal');
    const procrastinationJournal = document.getElementById('procrastination-journal');

    if (type === 'impulse') {
        if (impulseJournal) impulseJournal.style.display = 'block';
        if (procrastinationJournal) procrastinationJournal.style.display = 'none';
    } else {
        if (impulseJournal) impulseJournal.style.display = 'none';
        if (procrastinationJournal) procrastinationJournal.style.display = 'block';
    }
}

// 감정 일기 저장 (통합)
function saveEmotionJournal(type) {
    const today = new Date().toISOString().split('T')[0];
    let journalData;

    if (type === 'impulse') {
        // 충동 조절 일기
        // 감정 체크박스 수집
        const checkedEmotions = Array.from(
            document.querySelectorAll('#impulse-journal .emotion-checkboxes input:checked')
        ).map(cb => cb.value);

        journalData = {
            date: today,
            type: 'impulse',
            situation: document.getElementById('impulse-situation')?.value || '',
            thought: document.getElementById('impulse-thought')?.value || '',
            emotions: checkedEmotions,
            behavior: document.getElementById('impulse-behavior')?.value || '',
            resultGood: document.getElementById('impulse-result-good')?.value || '',
            resultBad: document.getElementById('impulse-result-bad')?.value || '',
            discomfort: document.getElementById('discomfort-score')?.value || 50,
            tolerance: document.querySelector('input[name="tolerance"]:checked')?.value || '',
            originalThought: document.getElementById('original-thought')?.value || '',
            thoughtEvidence: document.getElementById('thought-evidence')?.value || '',
            alternativeThought: document.getElementById('alternative-thought')?.value || '',
            oldScript: document.getElementById('old-script')?.value || '',
            newScript: document.getElementById('new-script')?.value || '',
            ifCondition: document.getElementById('if-condition')?.value || '',
            thenAction: document.getElementById('then-action')?.value || '',
            selfReward: document.getElementById('self-reward')?.value || '',
            timestamp: new Date().toISOString()
        };
    } else if (type === 'procrastination') {
        // 미루기 대처 일기
        journalData = {
            date: today,
            type: 'procrastination',
            task: document.getElementById('procrastinate-task')?.value || '',
            avoidanceThought: document.getElementById('avoidance-thought')?.value || '',
            taskDiscomfort: document.getElementById('task-discomfort')?.value || 50,
            positiveReframe: document.getElementById('positive-reframe')?.value || '',
            goalPoint: document.getElementById('goal-point')?.value || '',
            middlePoint: document.getElementById('middle-point')?.value || '',
            startPoint: document.getElementById('start-point')?.value || '',
            whenTodo: document.getElementById('when-todo')?.value || '',
            whereTodo: document.getElementById('where-todo')?.value || '',
            howLongTodo: document.getElementById('how-long-todo')?.value || '',
            distractions: document.getElementById('distractions')?.value || '',
            distractionIf: document.getElementById('distraction-if')?.value || '',
            distractionThen: document.getElementById('distraction-then')?.value || '',
            procrastinateReward: document.getElementById('procrastinate-reward')?.value || '',
            timestamp: new Date().toISOString()
        };
    } else {
        return;
    }

    // 기존 데이터 업데이트 또는 추가
    const existingIndex = state.tracker.emotionJournal.findIndex(
        j => j.date === today && j.type === type
    );

    if (existingIndex >= 0) {
        state.tracker.emotionJournal[existingIndex] = journalData;
    } else {
        state.tracker.emotionJournal.push(journalData);
    }

    // 포인트 및 XP
    state.points += 10;
    addXp(10);
    updateRewardsPage();

    saveState();

    const message = type === 'impulse' ? '충동 조절 일기가 저장되었습니다!' : '미루기 대처 일기가 저장되었습니다!';
    showToast(message + ' +10 포인트', 'success');
}

// ============================================
// 루틴 관리 기능
// ============================================

// 운동 타입 토글
function toggleExerciseType(element, type) {
    element.classList.toggle('selected');
}

// 수면 품질 설정
function setSleepQuality(level) {
    document.querySelectorAll('.quality-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    const selectedBtn = document.querySelector(`.quality-btn[data-quality="${level}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }
}

// 물 섭취 토글
function toggleWater(cupNum) {
    const cups = document.querySelectorAll('.water-cup');
    cups.forEach((cup, index) => {
        if (index < cupNum) {
            cup.classList.add('filled');
        } else {
            cup.classList.remove('filled');
        }
    });
}

// 루틴 저장
function saveRoutine() {
    const today = new Date().toISOString().split('T')[0];

    // 운동 데이터
    const exerciseData = {
        cardio: document.getElementById('ex-cardio')?.checked || false,
        strength: document.getElementById('ex-strength')?.checked || false,
        stretch: document.getElementById('ex-stretch')?.checked || false,
        balance: document.getElementById('ex-balance')?.checked || false,
        duration: parseInt(document.getElementById('exercise-minutes')?.value) || 0
    };

    // 수면 데이터
    const sleepQualityBtn = document.querySelector('.quality-btn.selected');
    const sleepData = {
        bedTime: document.getElementById('bed-time')?.value || '',
        wakeTime: document.getElementById('wake-time-routine')?.value || '',
        quality: sleepQualityBtn ? parseInt(sleepQualityBtn.dataset.quality) : 3,
        tempOk: document.getElementById('sleep-temp')?.checked || false,
        darkOk: document.getElementById('sleep-dark')?.checked || false,
        noPhoneOk: document.getElementById('sleep-nophone')?.checked || false,
        noCaffeineOk: document.getElementById('sleep-nocaffeine')?.checked || false
    };

    // 식사 데이터
    const mealData = {
        breakfast: document.getElementById('meal-breakfast')?.checked || false,
        lunch: document.getElementById('meal-lunch')?.checked || false,
        dinner: document.getElementById('meal-dinner')?.checked || false,
        water: document.querySelectorAll('.water-cup.filled').length
    };

    // 생활습관 데이터
    const lifestyleData = {
        noseBreathing: document.getElementById('life-nose')?.checked || false,
        fasting: document.getElementById('life-fasting')?.checked || false,
        sauna: document.getElementById('life-sauna')?.checked || false,
        noSmoke: document.getElementById('life-nosmoke')?.checked || false,
        noDrink: document.getElementById('life-nodrink')?.checked || false
    };

    const routineData = {
        date: today,
        exercise: exerciseData,
        sleep: sleepData,
        meal: mealData,
        lifestyle: lifestyleData,
        timestamp: new Date().toISOString()
    };

    const existingIndex = state.tracker.routine.findIndex(r => r.date === today);
    if (existingIndex >= 0) {
        state.tracker.routine[existingIndex] = routineData;
    } else {
        state.tracker.routine.push(routineData);
    }

    // 자동 저장이므로 포인트/알림은 한 번만 (첫 저장시)
    if (existingIndex < 0) {
        state.points += 5;
        addXp(5);
        updateRewardsPage();
    }

    saveState();
}

// ============================================
// 환경 관리 기능
// ============================================

// 환경 체크 토글
function toggleEnvCheck(element) {
    element.classList.toggle('checked');
    const checkbox = element.querySelector('input[type="checkbox"]');
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
    }
}

// If-Then 계획 추가
function addIfThenPlan() {
    const container = document.getElementById('ifthen-list');
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'ifthen-item';
    item.innerHTML = `
        <span class="ifthen-if">IF</span>
        <input type="text" placeholder="방해 상황 (예: SNS 알림이 오면)" class="ifthen-trigger">
        <span class="ifthen-then">THEN</span>
        <input type="text" placeholder="대처 행동 (예: 핸드폰을 서랍에 넣는다)" class="ifthen-action">
        <button class="ifthen-remove" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(item);
}

// 환경 설정 저장
function saveEnvironment() {
    const today = new Date().toISOString().split('T')[0];

    // 집중 환경
    const focusData = {
        desk: document.getElementById('env-desk')?.checked || false,
        phone: document.getElementById('env-phone')?.checked || false,
        notify: document.getElementById('env-notify')?.checked || false,
        clutter: document.getElementById('env-clutter')?.checked || false,
        ifPlan: document.getElementById('env-if')?.value || '',
        thenPlan: document.getElementById('env-then')?.value || ''
    };

    // 휴식 환경
    const restData = {
        temp: document.getElementById('env-temp')?.checked || false,
        light: document.getElementById('env-light')?.checked || false,
        screen: document.getElementById('env-screen')?.checked || false,
        trigger: document.getElementById('env-trigger')?.checked || false
    };

    // 사회적 연결
    const socialData = {
        family: document.getElementById('social-family')?.checked || false,
        friend: document.getElementById('social-friend')?.checked || false,
        group: document.getElementById('social-group')?.checked || false,
        help: document.getElementById('social-help')?.checked || false,
        gratitude: document.getElementById('gratitude-person')?.value || ''
    };

    const envData = {
        date: today,
        focus: focusData,
        rest: restData,
        social: socialData,
        timestamp: new Date().toISOString()
    };

    const existingIndex = state.tracker.environment.findIndex(e => e.date === today);
    if (existingIndex >= 0) {
        state.tracker.environment[existingIndex] = envData;
    } else {
        state.tracker.environment.push(envData);
    }

    // 자동 저장이므로 포인트/알림은 첫 저장시에만
    if (existingIndex < 0) {
        state.points += 5;
        addXp(5);
        updateRewardsPage();
    }

    saveState();
}

// 컨트롤 가이드 토글
function toggleControlGuide() {
    const guideContent = document.getElementById('control-guide-content');
    const toggle = document.querySelector('.control-guide .guide-toggle');
    if (guideContent) {
        const isHidden = guideContent.style.display === 'none';
        guideContent.style.display = isHidden ? 'block' : 'none';
        if (toggle) {
            toggle.textContent = isHidden ? '▲' : '▼';
        }
    }
}

// ============================================
// 데이터 로드 및 초기화
// ============================================

function loadTodayTrackerData() {
    const today = new Date().toISOString().split('T')[0];

    // 복약 데이터 로드
    const todayMed = state.tracker.medication.find(m => m.date === today);
    if (todayMed && todayMed.takenTime) {
        const takenTime = new Date(todayMed.takenTime);
        const medTimeInput = document.getElementById('med-take-time');
        if (medTimeInput) {
            medTimeInput.value = takenTime.toTimeString().slice(0, 5);
        }
        updateMedTimeSlots(takenTime);

        // 로그 데이터 복원
        if (todayMed.logs) {
            Object.entries(todayMed.logs).forEach(([time, data]) => {
                Object.entries(data).forEach(([type, value]) => {
                    const select = document.querySelector(`.med-cell[data-time="${time}"][data-type="${type}"] select`);
                    if (select) {
                        select.value = value;
                    }
                });
            });
        }
    }

    // 루틴 데이터 로드
    const todayRoutine = state.tracker.routine.find(r => r.date === today);
    if (todayRoutine) {
        // 운동
        if (todayRoutine.exercise) {
            const checkIds = ['ex-cardio', 'ex-strength', 'ex-stretch', 'ex-balance'];
            const checkKeys = ['cardio', 'strength', 'stretch', 'balance'];
            checkIds.forEach((id, i) => {
                const el = document.getElementById(id);
                if (el) el.checked = todayRoutine.exercise[checkKeys[i]] || false;
            });
            const durationEl = document.getElementById('exercise-minutes');
            if (durationEl) durationEl.value = todayRoutine.exercise.duration || '';
        }

        // 수면
        if (todayRoutine.sleep) {
            const bedTimeEl = document.getElementById('bed-time');
            const wakeTimeEl = document.getElementById('wake-time-routine');
            if (bedTimeEl) bedTimeEl.value = todayRoutine.sleep.bedTime || '';
            if (wakeTimeEl) wakeTimeEl.value = todayRoutine.sleep.wakeTime || '';
            if (todayRoutine.sleep.quality) {
                setSleepQuality(todayRoutine.sleep.quality);
            }
            // 수면 체크리스트
            const sleepChecks = ['sleep-temp', 'sleep-dark', 'sleep-nophone', 'sleep-nocaffeine'];
            const sleepKeys = ['tempOk', 'darkOk', 'noPhoneOk', 'noCaffeineOk'];
            sleepChecks.forEach((id, i) => {
                const el = document.getElementById(id);
                if (el) el.checked = todayRoutine.sleep[sleepKeys[i]] || false;
            });
        }

        // 식사
        if (todayRoutine.meal) {
            const mealIds = ['meal-breakfast', 'meal-lunch', 'meal-dinner'];
            const mealKeys = ['breakfast', 'lunch', 'dinner'];
            mealIds.forEach((id, i) => {
                const el = document.getElementById(id);
                if (el) el.checked = todayRoutine.meal[mealKeys[i]] || false;
            });
            if (todayRoutine.meal.water > 0) {
                toggleWater(todayRoutine.meal.water);
            }
        }

        // 생활습관
        if (todayRoutine.lifestyle) {
            const lifeIds = ['life-nose', 'life-fasting', 'life-sauna', 'life-nosmoke', 'life-nodrink'];
            const lifeKeys = ['noseBreathing', 'fasting', 'sauna', 'noSmoke', 'noDrink'];
            lifeIds.forEach((id, i) => {
                const el = document.getElementById(id);
                if (el) el.checked = todayRoutine.lifestyle[lifeKeys[i]] || false;
            });
        }
    }

    // 환경 데이터 로드
    const todayEnv = state.tracker.environment.find(e => e.date === today);
    if (todayEnv) {
        // 집중 환경
        if (todayEnv.focus) {
            const focusIds = ['env-desk', 'env-phone', 'env-notify', 'env-clutter'];
            const focusKeys = ['desk', 'phone', 'notify', 'clutter'];
            focusIds.forEach((id, i) => {
                const el = document.getElementById(id);
                if (el) el.checked = todayEnv.focus[focusKeys[i]] || false;
            });
            const ifEl = document.getElementById('env-if');
            const thenEl = document.getElementById('env-then');
            if (ifEl) ifEl.value = todayEnv.focus.ifPlan || '';
            if (thenEl) thenEl.value = todayEnv.focus.thenPlan || '';
        }

        // 휴식 환경
        if (todayEnv.rest) {
            const restIds = ['env-temp', 'env-light', 'env-screen', 'env-trigger'];
            const restKeys = ['temp', 'light', 'screen', 'trigger'];
            restIds.forEach((id, i) => {
                const el = document.getElementById(id);
                if (el) el.checked = todayEnv.rest[restKeys[i]] || false;
            });
        }

        // 사회적 연결
        if (todayEnv.social) {
            const socialIds = ['social-family', 'social-friend', 'social-group', 'social-help'];
            const socialKeys = ['family', 'friend', 'group', 'help'];
            socialIds.forEach((id, i) => {
                const el = document.getElementById(id);
                if (el) el.checked = todayEnv.social[socialKeys[i]] || false;
            });
            const gratitudeEl = document.getElementById('gratitude-person');
            if (gratitudeEl) gratitudeEl.value = todayEnv.social.gratitude || '';
        }
    }

    // 감정 일기 로드 - 충동 조절
    const todayImpulse = state.tracker.emotionJournal.find(
        j => j.date === today && j.type === 'impulse'
    );
    if (todayImpulse) {
        // 기본 필드
        const simpleFields = {
            'impulse-situation': 'situation',
            'impulse-thought': 'thought',
            'impulse-behavior': 'behavior',
            'impulse-result-good': 'resultGood',
            'impulse-result-bad': 'resultBad',
            'discomfort-score': 'discomfort',
            'original-thought': 'originalThought',
            'thought-evidence': 'thoughtEvidence',
            'alternative-thought': 'alternativeThought',
            'old-script': 'oldScript',
            'new-script': 'newScript',
            'if-condition': 'ifCondition',
            'then-action': 'thenAction',
            'self-reward': 'selfReward'
        };
        Object.entries(simpleFields).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el) el.value = todayImpulse[key] || '';
        });
        // 감정 체크박스
        if (todayImpulse.emotions) {
            todayImpulse.emotions.forEach(emotion => {
                const checkbox = document.querySelector(`#impulse-journal .emotion-checkboxes input[value="${emotion}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
        // tolerance 라디오
        if (todayImpulse.tolerance) {
            const radio = document.querySelector(`input[name="tolerance"][value="${todayImpulse.tolerance}"]`);
            if (radio) radio.checked = true;
        }
        // discomfort 슬라이더 표시 업데이트
        const discomfortDisplay = document.getElementById('discomfort-display');
        if (discomfortDisplay && todayImpulse.discomfort) {
            discomfortDisplay.textContent = todayImpulse.discomfort;
        }
    }

    // 감정 일기 로드 - 미루기 대처
    const todayProc = state.tracker.emotionJournal.find(
        j => j.date === today && j.type === 'procrastination'
    );
    if (todayProc) {
        const procFields = {
            'procrastinate-task': 'task',
            'avoidance-thought': 'avoidanceThought',
            'task-discomfort': 'taskDiscomfort',
            'positive-reframe': 'positiveReframe',
            'goal-point': 'goalPoint',
            'middle-point': 'middlePoint',
            'start-point': 'startPoint',
            'when-todo': 'whenTodo',
            'where-todo': 'whereTodo',
            'how-long-todo': 'howLongTodo',
            'distractions': 'distractions',
            'distraction-if': 'distractionIf',
            'distraction-then': 'distractionThen',
            'procrastinate-reward': 'procrastinateReward'
        };
        Object.entries(procFields).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el) el.value = todayProc[key] || '';
        });
    }
}

// ============================================
// 보상 시스템
// ============================================

// 성장 단계 설정
const GROWTH_STAGES = [
    { minLevel: 1, emoji: '&#127793;', text: '씨앗이 싹트고 있어요' },
    { minLevel: 3, emoji: '&#127794;', text: '작은 새싹이 자라나요' },
    { minLevel: 5, emoji: '&#127795;', text: '어린 나무가 되었어요' },
    { minLevel: 8, emoji: '&#127796;', text: '무성한 나무로 성장중!' },
    { minLevel: 12, emoji: '&#127797;', text: '아름드리 나무가 되었어요' },
    { minLevel: 15, emoji: '&#127800;', text: '벚꽃이 만개했어요!' },
    { minLevel: 20, emoji: '&#127774;', text: '숲의 수호자가 되었어요!' }
];

// XP 계산 함수
function getXpToNextLevel(level) {
    return 100 + (level - 1) * 50; // 레벨당 필요 XP 증가
}

function getGrowthStage(level) {
    for (let i = GROWTH_STAGES.length - 1; i >= 0; i--) {
        if (level >= GROWTH_STAGES[i].minLevel) {
            return GROWTH_STAGES[i];
        }
    }
    return GROWTH_STAGES[0];
}

function initRewards() {
    // 새 디자인 보상 획득 버튼
    document.querySelectorAll('.claim-reward-btn-new').forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.reward-card-new');
            const cost = parseInt(card.dataset.cost);
            claimReward(cost, btn);
        });
    });

    // 레거시 보상 버튼 (하위 호환성)
    document.querySelectorAll('.claim-reward-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.reward-card');
            if (card) {
                const cost = parseInt(card.dataset.cost);
                claimReward(cost, btn);
            }
        });
    });

    updateRewardsPage();
    updateAchievements();
}

function updateRewardsPage() {
    updatePointsDisplay();
    updateXpDisplay();
    updateGrowthStage();
    updateCheckinDisplay();
    updateInventoryDisplay();
}

function updatePointsDisplay() {
    const pointsEl = document.getElementById('total-points');
    if (pointsEl) {
        pointsEl.textContent = state.points;
    }

    // 새 디자인 보상 버튼 상태 업데이트
    document.querySelectorAll('.claim-reward-btn-new').forEach(btn => {
        const card = btn.closest('.reward-card-new');
        if (card) {
            const cost = parseInt(card.dataset.cost);
            btn.disabled = state.points < cost;
        }
    });

    // 레거시 버튼 업데이트
    document.querySelectorAll('.claim-reward-btn').forEach(btn => {
        const card = btn.closest('.reward-card');
        if (card) {
            const cost = parseInt(card.dataset.cost);
            btn.disabled = state.points < cost;
        }
    });
}

function updateXpDisplay() {
    const xpToNext = getXpToNextLevel(state.level);
    const xpPercent = Math.min((state.xp / xpToNext) * 100, 100);

    const levelEl = document.getElementById('xp-level');
    const progressTextEl = document.getElementById('xp-progress-text');
    const barFillEl = document.getElementById('xp-bar-fill');

    if (levelEl) levelEl.textContent = `Lv. ${state.level}`;
    if (progressTextEl) progressTextEl.textContent = `${state.xp} / ${xpToNext} XP`;
    if (barFillEl) barFillEl.style.width = `${xpPercent}%`;
}

function updateGrowthStage() {
    const stage = getGrowthStage(state.level);
    const emojiEl = document.getElementById('stage-emoji');
    const textEl = document.getElementById('growth-text');

    if (emojiEl) emojiEl.innerHTML = stage.emoji;
    if (textEl) textEl.textContent = stage.text;
}

function updateCheckinDisplay() {
    const todayCompletedEl = document.getElementById('today-completed-count');
    const totalCompletedEl = document.getElementById('total-completed-count');
    const checkinTitleEl = document.getElementById('checkin-title');
    const checkinMessageEl = document.getElementById('checkin-message');
    const checkinCoinEl = document.getElementById('checkin-coin');

    if (todayCompletedEl) todayCompletedEl.textContent = state.completedToday;
    if (totalCompletedEl) totalCompletedEl.textContent = state.totalCompleted || 0;

    // 오늘 완료한 작업이 있으면 성공 메시지 표시
    if (state.completedToday > 0) {
        if (checkinTitleEl) {
            checkinTitleEl.textContent = `오늘 ${state.completedToday}개 완료!`;
            checkinTitleEl.classList.add('earned');
        }
        if (checkinMessageEl) {
            checkinMessageEl.textContent = '당신의 한 작은 걸음이, 내일의 큰 변화가 됩니다.';
        }
        if (checkinCoinEl) {
            checkinCoinEl.classList.remove('dimmed');
        }
    } else {
        if (checkinTitleEl) {
            checkinTitleEl.textContent = '오늘의 보상';
            checkinTitleEl.classList.remove('earned');
        }
        if (checkinMessageEl) {
            checkinMessageEl.textContent = '할 일을 완료하고 포인트를 받으세요!';
        }
        if (checkinCoinEl) {
            checkinCoinEl.classList.add('dimmed');
        }
    }
}

// 스트릭 배수 계산
function getStreakMultiplier() {
    const streak = state.streak || 0;
    if (streak >= 30) return 3.0;
    if (streak >= 7) return 2.0;
    if (streak >= 3) return 1.5;
    return 1.0;
}

// ============================================
// 보상 상점 시스템
// ============================================

// 보상 정의
const rewardDefinitions = {
    // 기능형 보상
    'break-5': { name: '5분 휴식권', icon: '⏰', type: 'functional', duration: 5 },
    'break-15': { name: '15분 휴식권', icon: '🛋️', type: 'functional', duration: 15 },
    'skip-one': { name: '목표 1개 스킵', icon: '⏭️', type: 'functional' },
    'day-off': { name: '하루 휴식권', icon: '🏖️', type: 'functional' },
    'xp-boost': { name: 'XP 부스터', icon: '⚡', type: 'functional', duration: 60 },
    // 자기 보상
    'coffee': { name: '커피 한 잔', icon: '☕', type: 'self' },
    'snack': { name: '간식 타임', icon: '🍿', type: 'self' },
    'video': { name: '영상 30분', icon: '🎬', type: 'self' },
    'game': { name: '게임 1시간', icon: '🎮', type: 'self' }
};

// 보상 구매
function purchaseReward(rewardId, cost) {
    if (state.points < cost) {
        showToast('포인트가 부족해요!', 'warning');
        return;
    }

    const reward = rewardDefinitions[rewardId];
    if (!reward) return;

    // 포인트 차감
    state.points -= cost;

    // 인벤토리에 추가
    if (!state.inventory) state.inventory = [];
    state.inventory.push({
        id: rewardId,
        purchasedAt: new Date().toISOString()
    });

    saveState();
    updatePointsDisplay();
    updateInventoryDisplay();

    showToast(`${reward.icon} ${reward.name} 획득!`, 'success');
    playCompletionSound(false);
}

// 보상 사용
function useReward(index) {
    if (!state.inventory || !state.inventory[index]) return;

    const item = state.inventory[index];
    const reward = rewardDefinitions[item.id];

    if (!reward) return;

    // 기능형 보상 처리
    if (reward.type === 'functional') {
        switch (item.id) {
            case 'break-5':
            case 'break-15':
                startBreakTimer(reward.duration);
                break;
            case 'skip-one':
                skipOneGoal();
                break;
            case 'day-off':
                useDayOff();
                break;
            case 'xp-boost':
                activateXpBoost();
                break;
        }
    } else {
        // 자기 보상은 사용 확인 메시지
        showToast(`${reward.icon} ${reward.name} 사용! 즐거운 시간 보내세요!`, 'success');
    }

    // 인벤토리에서 제거
    state.inventory.splice(index, 1);
    saveState();
    updateInventoryDisplay();
}

// 인벤토리 표시 업데이트
function updateInventoryDisplay() {
    const container = document.getElementById('inventory-items');
    const emptyMsg = document.getElementById('inventory-empty');

    if (!container) return;

    const inventory = state.inventory || [];

    if (inventory.length === 0) {
        if (emptyMsg) emptyMsg.style.display = 'block';
        container.innerHTML = '<p class="inventory-empty">아직 획득한 보상이 없어요</p>';
        return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    container.innerHTML = inventory.map((item, index) => {
        const reward = rewardDefinitions[item.id];
        if (!reward) return '';
        return `
            <div class="inventory-item" data-type="${reward.type}">
                <span class="inventory-icon">${reward.icon}</span>
                <span class="inventory-name">${reward.name}</span>
                <button class="use-reward-btn" onclick="useReward(${index})">사용</button>
            </div>
        `;
    }).join('');
}

// 휴식 타이머 시작
function startBreakTimer(minutes) {
    showBreakTimerModal(minutes);
}

// 휴식 타이머 모달 표시
function showBreakTimerModal(minutes) {
    // 기존 모달 제거
    const existing = document.getElementById('break-timer-modal');
    if (existing) existing.remove();

    let seconds = minutes * 60;

    const modal = document.createElement('div');
    modal.id = 'break-timer-modal';
    modal.className = 'break-timer-modal';
    modal.innerHTML = `
        <div class="break-timer-content">
            <span class="break-emoji">🧘</span>
            <h2>휴식 시간</h2>
            <div class="break-timer-display" id="break-timer-display">${String(minutes).padStart(2, '0')}:00</div>
            <p class="break-message">잠시 쉬어가세요. 충분히 잘하고 있어요!</p>
            <button class="break-timer-close" onclick="closeBreakTimer()">휴식 끝내기</button>
        </div>
    `;
    document.body.appendChild(modal);

    // 타이머 시작
    const timerDisplay = document.getElementById('break-timer-display');
    const timerInterval = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(timerInterval);
            showToast('☀️ 휴식 끝! 다시 힘내봐요!', 'success');
            playLevelUpSound();
            modal.remove();
            return;
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, 1000);

    modal.dataset.timerId = timerInterval;
}

function closeBreakTimer() {
    const modal = document.getElementById('break-timer-modal');
    if (modal) {
        clearInterval(parseInt(modal.dataset.timerId));
        modal.remove();
        showToast('휴식 종료!', 'info');
    }
}

// 목표 1개 스킵
function skipOneGoal() {
    const dailyGoals = state.goals.daily || [];
    const incompleteGoals = dailyGoals.filter(g => !g.completed);

    if (incompleteGoals.length === 0) {
        showToast('스킵할 목표가 없어요!', 'info');
        // 보상 반환
        state.inventory.push({ id: 'skip-one', purchasedAt: new Date().toISOString() });
        saveState();
        updateInventoryDisplay();
        return;
    }

    // 가장 처음 미완료 목표 스킵
    const goalToSkip = incompleteGoals[0];
    goalToSkip.completed = true;
    goalToSkip.skipped = true;
    goalToSkip.completedAt = new Date().toISOString();

    saveState();
    renderMindmap();
    updateProgress();

    showToast(`⏭️ "${goalToSkip.title}" 스킵 완료!`, 'success');
}

// 하루 휴식권 사용
function useDayOff() {
    const dailyGoals = state.goals.daily || [];
    let skippedCount = 0;

    dailyGoals.forEach(goal => {
        if (!goal.completed) {
            goal.completed = true;
            goal.skipped = true;
            goal.completedAt = new Date().toISOString();
            skippedCount++;
        }
    });

    saveState();
    renderMindmap();
    updateProgress();

    showToast(`🏖️ 오늘 하루 휴식! ${skippedCount}개 목표 면제됨`, 'success');
}

// XP 부스터 활성화
function activateXpBoost() {
    state.xpBoostUntil = Date.now() + (60 * 60 * 1000); // 1시간
    saveState();
    showToast('⚡ XP 부스터 활성화! 1시간 동안 XP 2배!', 'success');
}

// XP 부스터 활성 여부 확인
function isXpBoostActive() {
    return state.xpBoostUntil && Date.now() < state.xpBoostUntil;
}

// 커스텀 보상 모달 열기
function openCustomRewardModal() {
    showToast('🔧 커스텀 보상 기능 준비중!', 'info');
}

// 스트릭 배수 정보 가져오기
function getStreakBonusInfo() {
    const streak = state.streak || 0;
    const multiplier = getStreakMultiplier();

    let nextMilestone = null;
    let daysToNext = 0;

    if (streak < 3) {
        nextMilestone = 3;
        daysToNext = 3 - streak;
    } else if (streak < 7) {
        nextMilestone = 7;
        daysToNext = 7 - streak;
    } else if (streak < 30) {
        nextMilestone = 30;
        daysToNext = 30 - streak;
    }

    return { streak, multiplier, nextMilestone, daysToNext };
}

function addXp(amount, applyStreakBonus = true) {
    let finalAmount = amount;
    let bonusAmount = 0;

    // XP 부스터 적용
    if (isXpBoostActive()) {
        finalAmount = finalAmount * 2;
        showToast('⚡ XP 부스터 적용!', 'info');
    }

    // 스트릭 보너스 적용 (업적 보너스 등에는 적용 안 함)
    if (applyStreakBonus && state.streak >= 3) {
        const multiplier = getStreakMultiplier();
        finalAmount = Math.floor(finalAmount * multiplier);
        bonusAmount = finalAmount - amount;

        // 스트릭 보너스 표시
        if (bonusAmount > 0) {
            showStreakBonus(bonusAmount, multiplier);
        }
    }

    state.xp += finalAmount;
    const xpToNext = getXpToNextLevel(state.level);

    // 레벨업 체크
    while (state.xp >= xpToNext) {
        state.xp -= xpToNext;
        state.level++;
        showToast(`레벨 업! Lv.${state.level} 달성! 🎉`, 'success');
        // 레벨업 보너스 포인트
        state.points += state.level * 10;
        // 레벨업 효과음
        playLevelUpSound();
    }

    saveState();
    updateRewardsPage();
}

// 스트릭 보너스 표시
function showStreakBonus(bonusAmount, multiplier) {
    const floater = document.createElement('div');
    floater.className = 'streak-bonus-floater';
    floater.innerHTML = `
        <span class="streak-multiplier">x${multiplier}</span>
        <span class="streak-bonus-xp">+${bonusAmount} 보너스 XP</span>
    `;
    floater.style.cssText = `
        position: fixed;
        top: 40%;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #FF6B6B, #FF8E53);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: bold;
        z-index: 10002;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
        animation: streakBonusPop 1.5s ease-out forwards;
    `;
    document.body.appendChild(floater);

    // 애니메이션 스타일 추가
    if (!document.getElementById('streak-bonus-style')) {
        const style = document.createElement('style');
        style.id = 'streak-bonus-style';
        style.textContent = `
            @keyframes streakBonusPop {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) scale(0.5);
                }
                20% {
                    opacity: 1;
                    transform: translateX(-50%) scale(1.1);
                }
                40% {
                    transform: translateX(-50%) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-30px);
                }
            }
            .streak-multiplier {
                background: rgba(255,255,255,0.3);
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 0.9rem;
            }
            .streak-bonus-xp {
                font-size: 0.95rem;
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => floater.remove(), 1500);
}

// 레벨업 효과음
function playLevelUpSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        // 레벨업: 상승하는 아르페지오
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.1);
        });

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        // 오디오 지원 안 되면 무시
    }
}

function claimReward(cost, btn) {
    if (state.points >= cost) {
        state.points -= cost;
        saveState();
        updatePointsDisplay();

        const card = btn.closest('.reward-card-new') || btn.closest('.reward-card');
        const rewardName = card.querySelector('.reward-name-new, .reward-name').textContent;
        showToast(`${rewardName} 보상을 획득했습니다!`, 'success');
    }
}

function checkAchievements() {
    // 첫 번째 할 일 완료
    if (!state.achievements['first-task'] && state.tasks.some(t => t.completed)) {
        state.achievements['first-task'] = true;
        state.points += 50;
        addXp(50);
        showToast('업적 달성: 첫 발걸음! +50 포인트 +50 XP', 'success');
    }

    // 3일 연속
    if (!state.achievements['streak-3'] && state.streak >= 3) {
        state.achievements['streak-3'] = true;
        state.points += 100;
        addXp(100);
        showToast('업적 달성: 3일 연속! +100 포인트 +100 XP', 'success');
    }

    // 7일 연속
    if (!state.achievements['streak-7'] && state.streak >= 7) {
        state.achievements['streak-7'] = true;
        state.points += 300;
        addXp(200, false);
        showToast('🔥 업적 달성: 7일 연속! +300 포인트 +200 XP (2배 보너스 활성화!)', 'success');
    }

    // 30일 연속
    if (!state.achievements['streak-30'] && state.streak >= 30) {
        state.achievements['streak-30'] = true;
        state.points += 1000;
        addXp(500, false);
        showToast('🏆 전설 달성: 30일 연속! +1000 포인트 +500 XP (3배 보너스 & 황금나무!)', 'success');
        // 나무 특별 진화 활성화
        state.goldenTree = true;
    }

    // 포모도로 10회
    if (!state.achievements['pomodoro-10'] && state.pomodoro.completed >= 10) {
        state.achievements['pomodoro-10'] = true;
        state.points += 200;
        addXp(150);
        showToast('업적 달성: 집중의 달인! +200 포인트 +150 XP', 'success');
    }

    saveState();
    updatePointsDisplay();
    updateAchievements();
}

function updateAchievements() {
    // 새 디자인 업적 카드
    Object.keys(state.achievements).forEach(id => {
        const card = document.querySelector(`.achievement-card-new[data-id="${id}"]`);
        if (card) {
            if (state.achievements[id]) {
                card.classList.remove('locked');
                card.classList.add('unlocked');
            }
        }
    });

    // 레거시 업적 카드
    Object.keys(state.achievements).forEach(id => {
        const card = document.querySelector(`.achievement-card[data-id="${id}"]`);
        if (card) {
            if (state.achievements[id]) {
                card.classList.remove('locked');
                card.classList.add('unlocked');
            }
        }
    });
}

// ============================================
// 하루 마무리 시스템 (단계별 플로우)
// ============================================

let selectedMoods = []; // 다중 선택으로 변경
let currentDayEndStep = 1;
const totalDayEndSteps = 5;
let selectedEnergy = 5;
let selectedSleepQuality = 0;
let selectedSleepHours = 0;
let selectedExercise = '';
let selectedMedication = '';

// 감정 이모지 맵
const moodEmojiMap = {
    // 긍정
    happy: '&#128522;',
    excited: '&#129321;',
    proud: '&#128526;',
    calm: '&#128524;',
    grateful: '&#128591;',
    hopeful: '&#127752;',
    loved: '&#129392;',
    motivated: '&#128170;',
    // 부정
    anxious: '&#128552;',
    angry: '&#128545;',
    sad: '&#128546;',
    exhausted: '&#128553;',
    frustrated: '&#128556;',
    lonely: '&#128557;',
    stressed: '&#129327;',
    overwhelmed: '&#128565;',
    // 기타
    neutral: '&#128528;',
    confused: '&#128533;',
    bored: '&#128564;',
    nostalgic: '&#128173;'
};

const moodLabelMap = {
    happy: '행복', excited: '신남', proud: '뿌듯', calm: '평온',
    grateful: '감사', hopeful: '희망', loved: '사랑받는', motivated: '의욕',
    anxious: '불안', angry: '짜증', sad: '슬픔', exhausted: '지침',
    frustrated: '답답', lonely: '외로움', stressed: '스트레스', overwhelmed: '벅참',
    neutral: '그냥', confused: '복잡', bored: '지루', nostalgic: '그리움'
};

// 감정 카테고리 분류 (상태 기반 메시지용 확장)
const moodCategories = {
    positive: ['happy', 'excited', 'proud', 'calm', 'grateful', 'hopeful', 'loved', 'motivated'],
    negative: ['anxious', 'angry', 'sad', 'exhausted', 'frustrated', 'lonely', 'stressed', 'overwhelmed'],
    neutral: ['neutral', 'confused', 'bored', 'nostalgic'],
    // 세부 카테고리 (적응형 메시지용)
    tired: ['tired', 'overwhelmed', 'exhausted'],
    anxious: ['anxious', 'worried', 'stressed', 'nervous'],
    sad: ['sad', 'lonely', 'guilty', 'depressed'],
    frustrated: ['frustrated', 'angry', 'irritated', 'restless']
};

function openDayEndModal() {
    const modal = document.getElementById('day-end-modal');

    // 초기화
    currentDayEndStep = 1;
    selectedMoods = [];
    selectedEnergy = 5;
    selectedSleepQuality = 0;
    selectedSleepHours = 0;
    selectedExercise = '';
    selectedMedication = '';

    // 수면 질 버튼 초기화
    document.querySelectorAll('.sleep-quality-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // 빠른 체크 버튼 초기화
    document.querySelectorAll('.quick-option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // 모든 단계 숨기기
    for (let i = 1; i <= totalDayEndSteps; i++) {
        const stepEl = document.getElementById(`day-end-step-${i}`);
        if (stepEl) stepEl.style.display = i === 1 ? 'block' : 'none';
    }

    // 진행 표시기 초기화
    updateDayEndProgress();

    // Step 1: 성과 요약 표시
    const summaryEl = document.getElementById('day-end-summary');
    if (summaryEl) {
        summaryEl.textContent = `오늘 ${state.completedToday}개 완료했어요!`;
    }

    // 오늘 통계 표시
    document.getElementById('stat-completed').textContent = `${state.completedToday}개`;
    document.getElementById('stat-focus-time').textContent = `${state.pomodoroStats?.focusMinutes || 0}분`;
    document.getElementById('stat-streak').textContent = `${state.streak}일`;

    // 보상 값 표시
    const bonusXp = calculateBonusXp();
    const bonusPoints = calculateBonusPoints();
    document.getElementById('xp-reward-value').textContent = `+${bonusXp}`;
    document.getElementById('coin-reward-value').textContent = `+${bonusPoints}`;

    // 감정 선택 초기화
    document.querySelectorAll('.mood-select-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    updateSelectedMoodsTags();

    // 에너지 슬라이더 초기화
    const energySlider = document.getElementById('day-end-energy');
    if (energySlider) {
        energySlider.value = 5;
        updateDayEndEnergyDisplay(5);
    }

    // 일기 초기화
    const diaryInput = document.getElementById('day-end-diary');
    if (diaryInput) {
        diaryInput.value = '';
        updateDiaryCharCount();
    }

    // 일기 날짜 표시
    const diaryDateEl = document.getElementById('diary-date');
    if (diaryDateEl) {
        const today = new Date();
        diaryDateEl.textContent = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    }

    // 버튼 상태 업데이트
    updateDayEndButtons();

    // 미완료 목표 표시
    renderIncompleteTasks();

    // 부정적 감정 도움말 숨기기
    const negativeHelpEl = document.getElementById('negative-mood-help');
    if (negativeHelpEl) negativeHelpEl.style.display = 'none';

    modal.style.display = 'flex';
}

function closeDayEndModal() {
    document.getElementById('day-end-modal').style.display = 'none';
}

function calculateBonusXp() {
    let xp = 20; // 기본
    if (state.completedToday >= 5) xp += 10;
    if (state.completedToday >= 10) xp += 20;
    return xp;
}

function calculateBonusPoints() {
    let points = 10; // 기본
    if (state.completedToday >= 5) points += 5;
    if (state.completedToday >= 10) points += 10;
    return points;
}

function updateDayEndProgress() {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        if (stepNum < currentDayEndStep) {
            step.classList.add('completed');
        } else if (stepNum === currentDayEndStep) {
            step.classList.add('active');
        }
    });
}

function updateDayEndButtons() {
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnFinish = document.getElementById('btn-finish');

    btnPrev.style.visibility = currentDayEndStep === 1 ? 'hidden' : 'visible';

    if (currentDayEndStep === totalDayEndSteps) {
        btnNext.style.display = 'none';
        btnFinish.style.display = 'block';
    } else {
        btnNext.style.display = 'block';
        btnFinish.style.display = 'none';
    }
}

function nextDayEndStep() {
    // Step 3에서 감정 선택 필수 체크
    if (currentDayEndStep === 3 && selectedMoods.length === 0) {
        showToast('감정을 하나 이상 선택해주세요!', 'warning');
        return;
    }

    if (currentDayEndStep < totalDayEndSteps) {
        // 현재 단계 숨기기
        document.getElementById(`day-end-step-${currentDayEndStep}`).style.display = 'none';

        currentDayEndStep++;

        // 다음 단계 표시
        document.getElementById(`day-end-step-${currentDayEndStep}`).style.display = 'block';

        // Step 2: 나무 성장 애니메이션
        if (currentDayEndStep === 2) {
            updateTreeGrowthStep();
        }

        // Step 5: 통계 그래프 렌더링
        if (currentDayEndStep === 5) {
            renderDayEndStats();
        }

        updateDayEndProgress();
        updateDayEndButtons();
    }
}

function prevDayEndStep() {
    if (currentDayEndStep > 1) {
        document.getElementById(`day-end-step-${currentDayEndStep}`).style.display = 'none';
        currentDayEndStep--;
        document.getElementById(`day-end-step-${currentDayEndStep}`).style.display = 'block';

        updateDayEndProgress();
        updateDayEndButtons();
    }
}

function updateTreeGrowthStep() {
    const stages = ['&#127793;', '&#127794;', '&#127795;', '&#127796;', '&#127797;'];
    const currentLevel = state.level || 1;
    const currentStageIndex = Math.min(Math.floor((currentLevel - 1) / 2), stages.length - 1);
    const nextStageIndex = Math.min(currentStageIndex + (currentLevel % 2 === 0 ? 1 : 0), stages.length - 1);

    document.getElementById('tree-before-emoji').innerHTML = stages[currentStageIndex];
    document.getElementById('tree-after-emoji').innerHTML = stages[nextStageIndex];

    // XP 바 애니메이션
    const xpForLevel = getXpForLevel(currentLevel);
    const currentXp = state.xp || 0;
    const xpInLevel = currentXp % xpForLevel;
    const xpPercent = (xpInLevel / xpForLevel) * 100;

    document.getElementById('growth-level').textContent = `Lv. ${currentLevel}`;
    document.getElementById('growth-xp-text').textContent = `${xpInLevel} / ${xpForLevel} XP`;

    setTimeout(() => {
        document.getElementById('growth-xp-fill').style.width = `${xpPercent}%`;
    }, 100);

    // 성장 메시지
    const messages = [
        '꾸준히 기록하면 나무가 더 커져요!',
        '멋져요! 작은 성장이 쌓이고 있어요.',
        '오늘도 한 걸음 더 성장했어요!',
        '포기하지 않는 당신이 대단해요!'
    ];
    document.getElementById('growth-message').textContent = messages[Math.floor(Math.random() * messages.length)];
}

function getXpForLevel(level) {
    return 100 + (level - 1) * 50; // 레벨당 필요 XP 증가
}

// 다중 감정 선택 토글
function toggleMood(mood) {
    const index = selectedMoods.indexOf(mood);

    if (index > -1) {
        // 이미 선택됨 -> 제거
        selectedMoods.splice(index, 1);
    } else {
        // 새로 추가 (최대 5개)
        if (selectedMoods.length >= 5) {
            showToast('최대 5개까지 선택할 수 있어요', 'warning');
            return;
        }
        selectedMoods.push(mood);
    }

    updateMoodButtonsState();
    updateSelectedMoodsTags();
    checkNegativeMoods();
}

// 감정 버튼 상태 업데이트
function updateMoodButtonsState() {
    document.querySelectorAll('.mood-select-btn').forEach(btn => {
        const mood = btn.dataset.mood;
        if (selectedMoods.includes(mood)) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

// 선택된 감정 태그 표시
function updateSelectedMoodsTags() {
    const tagsContainer = document.getElementById('selected-moods-tags');
    if (!tagsContainer) return;

    if (selectedMoods.length === 0) {
        tagsContainer.innerHTML = '<span class="no-mood-selected">아직 선택 안함</span>';
        return;
    }

    tagsContainer.innerHTML = selectedMoods.map(mood => `
        <span class="mood-tag" data-mood="${mood}">
            <span class="tag-emoji">${moodEmojiMap[mood]}</span>
            <span class="tag-label">${moodLabelMap[mood]}</span>
            <span class="tag-remove" onclick="removeMood('${mood}')">&times;</span>
        </span>
    `).join('');
}

// 태그에서 감정 제거
function removeMood(mood) {
    const index = selectedMoods.indexOf(mood);
    if (index > -1) {
        selectedMoods.splice(index, 1);
        updateMoodButtonsState();
        updateSelectedMoodsTags();
    }
}

// 기존 selectMood 함수 (호환성 유지)
function selectMood(mood) {
    toggleMood(mood);
}

function updateDayEndEnergyDisplay(value) {
    selectedEnergy = parseInt(value);
    const displayEl = document.getElementById('energy-value-display');
    if (displayEl) displayEl.textContent = value;
}

function selectSleepQuality(quality) {
    selectedSleepQuality = quality;

    // 버튼 상태 업데이트
    document.querySelectorAll('.sleep-quality-btn').forEach(btn => {
        const btnQuality = parseInt(btn.dataset.quality);
        if (btnQuality === quality) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function selectSleepHours(hours) {
    selectedSleepHours = hours;

    document.querySelectorAll('.sleep-hours-options .quick-option-btn').forEach(btn => {
        if (parseInt(btn.dataset.hours) === hours) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function selectExercise(exercise) {
    selectedExercise = exercise;

    document.querySelectorAll('.exercise-options .quick-option-btn').forEach(btn => {
        if (btn.dataset.exercise === exercise) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function selectMedication(med) {
    selectedMedication = med;

    document.querySelectorAll('.medication-options .quick-option-btn').forEach(btn => {
        if (btn.dataset.med === med) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function insertDiaryPrompt(prompt) {
    const textarea = document.getElementById('day-end-diary');
    if (textarea) {
        textarea.value = prompt + ' ';
        textarea.focus();
        updateDiaryCharCount();
    }
}

function updateDiaryCharCount() {
    const textarea = document.getElementById('day-end-diary');
    const countEl = document.getElementById('diary-char-count');
    if (textarea && countEl) {
        countEl.textContent = textarea.value.length;
    }
}

// 일기 입력 이벤트
document.addEventListener('DOMContentLoaded', () => {
    const diaryTextarea = document.getElementById('day-end-diary');
    if (diaryTextarea) {
        diaryTextarea.addEventListener('input', updateDiaryCharCount);
    }

    const energySlider = document.getElementById('day-end-energy');
    if (energySlider) {
        energySlider.addEventListener('input', (e) => updateDayEndEnergyDisplay(e.target.value));
    }
});

function renderDayEndStats() {
    // 최근 7일 데이터
    const logs = state.dayEndLogs || [];
    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const log = logs.find(l => l.date === dateStr);
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        // moods 배열 또는 기존 mood 필드 처리
        const moods = log?.moods || (log?.mood ? [log.mood] : []);

        last7Days.push({
            date: dateStr,
            dayName: dayNames[date.getDay()],
            moods: moods,
            mood: moods[0] || null, // 호환성
            energy: log?.energy || null,
            completedCount: log?.completedCount || 0,
            routineRate: log ? calculateDailyRoutineRate(dateStr) : 0
        });
    }

    // 그래프 렌더링
    const graphBars = document.getElementById('graph-bars');
    if (graphBars) {
        graphBars.innerHTML = last7Days.map(day => {
            // 다중 감정의 평균값 사용
            const moodValue = day.moods.length > 0 ? getMoodsAverageValue(day.moods) : 0;
            const moodHeight = moodValue > 0 ? (moodValue / 5) * 100 : 0;
            const routineHeight = day.routineRate;

            return `
                <div class="graph-day">
                    <div class="graph-bar-group">
                        <div class="graph-bar mood-bar" style="height: ${moodHeight}px"></div>
                        <div class="graph-bar routine-bar" style="height: ${routineHeight}px"></div>
                    </div>
                    <span class="graph-day-label">${day.dayName}</span>
                </div>
            `;
        }).join('');
    }

    // 감정별 평균 달성률 계산 (동적 생성)
    const moodStats = calculateMoodStats();
    const moodStatsGrid = document.getElementById('mood-stats-grid');

    if (moodStatsGrid) {
        // 데이터가 있는 감정만 필터링하고 달성률 순으로 정렬
        const moodsWithData = Object.entries(moodStats)
            .filter(([_, rate]) => rate > 0)
            .sort((a, b) => b[1] - a[1]); // 높은 달성률 순

        if (moodsWithData.length === 0) {
            moodStatsGrid.innerHTML = '<p class="no-data-message">아직 기록된 데이터가 없어요</p>';
        } else {
            moodStatsGrid.innerHTML = moodsWithData.map(([mood, rate]) => `
                <div class="mood-stat-item">
                    <span class="mood-stat-emoji">${moodEmojiMap[mood] || '&#128528;'}</span>
                    <span class="mood-stat-name">${moodLabelMap[mood] || mood}</span>
                    <div class="mood-stat-bar"><div class="mood-stat-fill" style="width: ${rate}%"></div></div>
                    <span class="mood-stat-value">${rate}%</span>
                </div>
            `).join('');
        }
    }

    // 인사이트 생성
    generateInsights(logs, moodStats);
}

function getMoodValue(mood) {
    // 긍정 감정은 높은 값, 부정 감정은 낮은 값
    const values = {
        // 긍정 (4-5점)
        excited: 5, happy: 5, proud: 4.5, motivated: 4.5,
        calm: 4, grateful: 4, hopeful: 4, loved: 4.5,
        // 중립 (3점)
        neutral: 3, confused: 3, bored: 2.5, nostalgic: 3,
        // 부정 (1-2점)
        anxious: 2, angry: 1.5, sad: 2, exhausted: 1,
        frustrated: 1.5, lonely: 2, stressed: 1.5, overwhelmed: 1,
        // 기존 호환성
        great: 5, good: 4
    };
    return values[mood] || 3;
}

// 다중 감정의 평균 값 계산
function getMoodsAverageValue(moods) {
    if (!moods || moods.length === 0) return 0;
    const total = moods.reduce((sum, mood) => sum + getMoodValue(mood), 0);
    return total / moods.length;
}

function calculateDailyRoutineRate(dateStr) {
    // 해당 날짜의 일일 목표 완료율 계산
    const dailyGoals = state.goals?.daily || [];
    const targetDate = new Date(dateStr);
    const targetDay = targetDate.getDay(); // 요일 (0=일요일, 6=토요일)

    // date 필드가 있는 목표 또는 해당 요일의 목표
    const dayGoals = dailyGoals.filter(g => {
        if (g.date === dateStr) return true;
        if (g.day === targetDay && !g.date) return true;
        return false;
    });

    if (dayGoals.length === 0) return 0;

    const completed = dayGoals.filter(g => g.completed).length;
    return Math.round((completed / dayGoals.length) * 100);
}

function calculateMoodStats() {
    const logs = state.dayEndLogs || [];
    const stats = {};

    // 모든 감정 타입에 대해 통계 계산
    const allMoods = Object.keys(moodLabelMap);

    allMoods.forEach(mood => {
        // moods 배열 또는 기존 mood 필드 체크
        const moodLogs = logs.filter(l => {
            if (l.moods && Array.isArray(l.moods)) {
                return l.moods.includes(mood);
            }
            return l.mood === mood;
        });

        if (moodLogs.length > 0) {
            const avgRate = moodLogs.reduce((sum, l) => {
                return sum + calculateDailyRoutineRate(l.date);
            }, 0) / moodLogs.length;
            stats[mood] = Math.round(avgRate);
        }
    });

    return stats;
}

function generateInsights(logs, moodStats) {
    const correlationEl = document.getElementById('insight-correlation');
    const detailEl = document.getElementById('insight-detail');
    const bestDayEl = document.getElementById('insight-best-day');

    if (logs.length < 3) {
        correlationEl.textContent = '데이터 수집 중';
        detailEl.textContent = '3일 이상 기록하면 패턴을 분석해드려요';
        bestDayEl.textContent = '아직 데이터가 부족해요';
        return;
    }

    // 긍정/부정 감정별 평균 달성률 계산
    const positiveMoods = moodCategories.positive;
    const negativeMoods = moodCategories.negative;

    const positiveRates = positiveMoods.map(m => moodStats[m] || 0).filter(r => r > 0);
    const negativeRates = negativeMoods.map(m => moodStats[m] || 0).filter(r => r > 0);

    const avgPositive = positiveRates.length > 0 ? positiveRates.reduce((a, b) => a + b, 0) / positiveRates.length : 0;
    const avgNegative = negativeRates.length > 0 ? negativeRates.reduce((a, b) => a + b, 0) / negativeRates.length : 0;

    if (avgPositive > avgNegative + 10) {
        correlationEl.textContent = '기분이 좋을 때 더 잘해요!';
        detailEl.textContent = `긍정적인 날의 달성률이 ${Math.round(avgPositive - avgNegative)}% 더 높아요`;
    } else if (avgNegative > avgPositive + 10) {
        correlationEl.textContent = '힘들어도 해내는 타입!';
        detailEl.textContent = '기분과 관계없이 꾸준히 실천하고 있어요';
    } else if (avgPositive > 0 || avgNegative > 0) {
        correlationEl.textContent = '꾸준한 실천가';
        detailEl.textContent = '기분과 관계없이 안정적으로 실천 중이에요';
    } else {
        correlationEl.textContent = '패턴 분석 중';
        detailEl.textContent = '더 많은 데이터가 쌓이면 분석해드려요';
    }

    // 최고의 하루 찾기
    const bestLog = logs.reduce((best, log) => {
        const rate = calculateDailyRoutineRate(log.date);
        return rate > (best?.rate || 0) ? { ...log, rate } : best;
    }, null);

    if (bestLog && bestLog.rate > 0) {
        // moods 배열 또는 기존 mood 필드 처리
        const moods = bestLog.moods || (bestLog.mood ? [bestLog.mood] : []);
        const moodEmojis = moods.slice(0, 3).map(m => moodEmojiMap[m] || '').join(' ');
        bestDayEl.innerHTML = `${bestLog.date} (${moodEmojis} ${bestLog.rate}%)`;
    } else {
        bestDayEl.textContent = '기록을 시작해보세요!';
    }
}

function finishDayEnd() {
    const diary = document.getElementById('day-end-diary')?.value.trim() || '';
    const today = new Date().toISOString().split('T')[0];

    // 하루 마무리 기록 저장
    if (!state.dayEndLogs) {
        state.dayEndLogs = [];
    }

    // 오늘 이미 기록이 있으면 업데이트
    const existingIndex = state.dayEndLogs.findIndex(l => l.date === today);
    const logData = {
        date: today,
        moods: [...selectedMoods], // 다중 감정 저장
        mood: selectedMoods[0] || null, // 호환성: 첫 번째 감정
        energy: selectedEnergy,
        sleepQuality: selectedSleepQuality,
        sleepHours: selectedSleepHours,
        exercise: selectedExercise,
        medication: selectedMedication,
        diary: diary,
        completed: state.completedToday,
        completedCount: state.completedToday,
        routineRate: calculateDailyRoutineRate(today),
        timestamp: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        state.dayEndLogs[existingIndex] = logData;
    } else {
        state.dayEndLogs.push(logData);
    }

    // 보상 지급
    const bonusXp = calculateBonusXp();
    const bonusPoints = calculateBonusPoints();
    addXp(bonusXp);
    state.points += bonusPoints;

    saveState();
    closeDayEndModal();
    updateRewardsPage();

    showToast(`하루 마무리 완료! +${bonusXp} XP +${bonusPoints} 포인트`, 'success');
    showCelebration(bonusXp);
}

// 기존 saveDayEnd는 finishDayEnd로 대체
function saveDayEnd() {
    finishDayEnd();
}

// ============================================
// 모달 관리
// ============================================

function initModals() {
    // 모달 닫기 버튼
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });

    // 모달 외부 클릭 시 닫기
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // 할 일 폼 제출
    document.getElementById('task-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveTaskFromModal();
    });

    // 목표 폼 제출
    document.getElementById('goal-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveGoalFromModal();
    });
}

let currentEditingTaskId = null;

function openTaskModal(task) {
    currentEditingTaskId = task.id;

    document.getElementById('modal-task-title').value = task.title;
    document.getElementById('modal-task-notes').value = task.notes || '';
    document.getElementById('modal-task-priority').value = task.priority;
    document.getElementById('modal-task-duration').value = task.duration;

    document.getElementById('task-modal').style.display = 'flex';
}

function saveTaskFromModal() {
    const task = state.tasks.find(t => t.id === currentEditingTaskId);
    if (!task) return;

    const newTitle = document.getElementById('modal-task-title').value;
    const newNotes = document.getElementById('modal-task-notes').value;
    const newPriority = document.getElementById('modal-task-priority').value;
    const newDuration = parseInt(document.getElementById('modal-task-duration').value);

    // 할 일 업데이트
    task.title = newTitle;
    task.notes = newNotes;
    task.priority = newPriority;
    task.duration = newDuration;

    // duration 변경 시 endHour/endMinute 재계산
    if (task.hour !== undefined && task.hour !== null) {
        const startMinutes = task.hour * 60 + (task.minute || 0);
        const endMinutes = startMinutes + newDuration;
        task.endHour = Math.floor(endMinutes / 60) % 24;
        task.endMinute = endMinutes % 60;
    }

    saveState();

    // 모달 닫기
    document.getElementById('task-modal').style.display = 'none';

    // UI 즉시 업데이트
    renderTasks();
    renderMindmap();

    // 현재 열린 상세 패널 새로고침
    if (currentDetailLevel && currentDetailLevel === 'daily') {
        refreshDetailPanel();
    }

    showToast('할 일이 수정되었습니다!', 'success');
}

// 전역 함수 - onclick에서 호출
window.deleteTaskFromModal = function() {
    if (confirm('정말로 이 할 일을 삭제하시겠습니까?')) {
        state.tasks = state.tasks.filter(t => t.id !== currentEditingTaskId);
        saveState();
        renderTasks();
        renderMindmap();
        updateProgress();
        document.getElementById('task-modal').style.display = 'none';
        showToast('할 일이 삭제되었습니다!', 'success');
    }
}

let currentGoalLevel = null;

function openGoalModal(level) {
    currentGoalLevel = level;
    document.getElementById('modal-goal-level').value = level;
    document.getElementById('modal-goal-title').value = '';
    document.getElementById('modal-goal-description').value = '';

    // 상위 목표 드롭다운 채우기
    const parentSelect = document.getElementById('modal-parent-goal');
    parentSelect.innerHTML = '<option value="">없음</option>';

    const levelOrder = ['weekly', 'monthly', 'yearly', 'life'];
    const currentIndex = levelOrder.indexOf(level);

    // 상위 레벨의 목표만 표시
    for (let i = currentIndex + 1; i < levelOrder.length; i++) {
        state.goals[levelOrder[i]].forEach(goal => {
            const option = document.createElement('option');
            option.value = goal.id;
            option.textContent = `[${levelOrder[i]}] ${goal.title}`;
            parentSelect.appendChild(option);
        });
    }

    document.getElementById('goal-modal').style.display = 'flex';
}

function saveGoalFromModal() {
    const levelEl = document.getElementById('modal-goal-level');
    const level = levelEl.value || currentGoalLevel;
    console.log('saveGoalFromModal - level:', level, 'currentGoalLevel:', currentGoalLevel);

    const goal = {
        id: Date.now(),
        title: document.getElementById('modal-goal-title').value,
        description: document.getElementById('modal-goal-description').value,
        parentGoal: document.getElementById('modal-parent-goal').value || null,
        createdAt: new Date().toISOString()
    };

    // 월, 주, 요일 정보 추가
    if (level === 'monthly' && levelEl.dataset.month) {
        goal.month = parseInt(levelEl.dataset.month);
        delete levelEl.dataset.month;
    } else if (level === 'weekly' && levelEl.dataset.week) {
        goal.week = parseInt(levelEl.dataset.week);
        goal.month = levelEl.dataset.month ? parseInt(levelEl.dataset.month) : new Date().getMonth() + 1;
        delete levelEl.dataset.week;
        delete levelEl.dataset.month;
    } else if (level === 'daily' && levelEl.dataset.day) {
        goal.day = parseInt(levelEl.dataset.day);
        delete levelEl.dataset.day;
    }

    // 배열 초기화
    if (!state.goals[level]) {
        state.goals[level] = [];
    }

    state.goals[level].push(goal);
    console.log('Goal added to', level, ':', state.goals[level]);

    // 모달 먼저 닫기
    document.getElementById('goal-modal').style.display = 'none';

    // 저장
    saveState();

    // 저장된 레벨 정보
    const savedLevel = level;
    const savedGoalId = goal.id;
    const savedDetailLevel = currentDetailLevel;
    const savedDetailData = currentDetailData;

    // UI 즉시 업데이트 - 마인드맵 먼저 렌더링 (DOM 업데이트 즉시 반영)
    console.log('saveGoalFromModal UI update - level:', savedLevel, 'goals:', state.goals[savedLevel]?.length);
    renderMindmap();

    // 상세 패널이 열려있으면 갱신 (같은 레벨이면 해당 레벨로, 아니면 현재 열린 레벨로)
    const panel = document.getElementById('mindmap-detail-panel');
    if (panel && panel.style.display !== 'none') {
        console.log('Refreshing detail panel - savedDetailLevel:', savedDetailLevel, 'savedLevel:', savedLevel);

        // 추가된 레벨과 열린 패널 레벨이 같으면 해당 패널 갱신
        if (savedDetailLevel === savedLevel) {
            const levelLabels = {
                'life': '인생 목표',
                'yearly': '연간 목표',
                'monthly': `${savedDetailData}월 목표`,
                'weekly': `주간 목표`,
                'daily': '일일 목표'
            };
            openDetailPanel(savedLevel, levelLabels[savedLevel] || document.getElementById('detail-title').textContent, savedDetailData);
        } else {
            // 다른 레벨이면 현재 열린 패널 갱신
            openDetailPanel(savedDetailLevel, document.getElementById('detail-title').textContent, savedDetailData);
        }
    }

    // 연간/인생 목표 추가 시 목표 마인드맵 뷰로 전환
    if (savedLevel === 'yearly' || savedLevel === 'life') {
        const mindmapView = document.getElementById('mindmap-view');
        if (mindmapView) {
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            mindmapView.classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            const mindmapNav = document.querySelector('.nav-item[data-view="mindmap"]');
            if (mindmapNav) mindmapNav.classList.add('active');
        }
    }

    showToast('목표가 추가되었습니다!', 'success');

    // 다음 레벨 안내는 약간의 지연 후 표시
    requestAnimationFrame(() => {
        promptNextLevel(savedLevel, savedGoalId);
    });
}

// 다음 레벨로 이동 안내
function promptNextLevel(currentLevel, parentGoalId) {
    const levelFlow = ['life', 'yearly', 'monthly', 'weekly', 'daily'];
    const levelNames = {
        'life': '인생 목표',
        'yearly': '연간 목표',
        'monthly': '월간 목표',
        'weekly': '주간 목표',
        'daily': '일일 목표'
    };

    const currentIndex = levelFlow.indexOf(currentLevel);

    // 마지막 레벨(daily)이면 완료
    if (currentIndex >= levelFlow.length - 1) {
        showToast('모든 목표 설정이 완료되었습니다! 🎉', 'success');
        return;
    }

    // 현재 컨텍스트에 맞는 목표만 필터링하여 개수 확인
    const allGoals = state.goals[currentLevel] || [];
    let contextGoals = allGoals;

    // 레벨별로 현재 보고 있는 컨텍스트의 목표만 필터링
    if (currentLevel === 'weekly' && currentDetailData) {
        const contextMonth = typeof currentDetailData === 'object' ? currentDetailData.month : new Date().getMonth() + 1;
        const contextWeek = typeof currentDetailData === 'object' ? currentDetailData.week : currentDetailData;
        contextGoals = allGoals.filter(g => g.month === contextMonth && g.week === contextWeek);
    } else if (currentLevel === 'monthly' && currentDetailData) {
        contextGoals = allGoals.filter(g => g.month === currentDetailData);
    } else if (currentLevel === 'daily' && currentDetailData !== null) {
        contextGoals = allGoals.filter(g => g.day === currentDetailData);
    }

    const promptInterval = 5;

    // 5의 배수일 때만 안내 (5개, 10개, 15개, ...)
    if (contextGoals.length === 0 || contextGoals.length % promptInterval !== 0) {
        return;
    }

    const nextLevel = levelFlow[currentIndex + 1];
    const nextLevelName = levelNames[nextLevel];

    // 다음 레벨 안내 모달 표시
    setTimeout(() => {
        showNextLevelPrompt(nextLevel, nextLevelName, parentGoalId);
    }, 500);
}

// 다음 레벨 설정 안내 모달
function showNextLevelPrompt(nextLevel, nextLevelName, parentGoalId) {
    const now = new Date();

    // 현재 보고 있는 컨텍스트에서 월 정보 가져오기
    let contextMonth = now.getMonth() + 1;
    let contextWeek = Math.ceil(now.getDate() / 7);

    if (currentDetailData) {
        if (typeof currentDetailData === 'object' && currentDetailData.month) {
            contextMonth = currentDetailData.month;
            if (currentDetailData.week) contextWeek = currentDetailData.week;
        } else if (currentDetailLevel === 'monthly' && typeof currentDetailData === 'number') {
            contextMonth = currentDetailData;
        }
    }

    const currentDay = now.getDay();

    // 기존 프롬프트 모달이 있으면 제거
    const existingPrompt = document.getElementById('next-level-prompt');
    if (existingPrompt) {
        existingPrompt.remove();
    }

    const promptHTML = `
        <div id="next-level-prompt" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: #1a1a2e; padding: 32px; border-radius: 16px; max-width: 400px; text-align: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                <h3 style="margin-bottom: 16px; color: #fff; font-size: 1.5rem;">다음 단계로 이동</h3>
                <p style="margin-bottom: 24px; color: #aaa; font-size: 1.1rem;">
                    이제 <strong style="color: #6C5CE7;">${nextLevelName}</strong>을 설정해볼까요?
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="goToNextLevel('${nextLevel}', ${contextMonth}, ${contextWeek}, ${currentDay}, '${parentGoalId}')"
                            style="padding: 14px 28px; background: #6C5CE7; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                        네, 설정할게요
                    </button>
                    <button onclick="closeNextLevelPrompt()"
                            style="padding: 14px 28px; background: #2d2d44; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                        나중에 할게요
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', promptHTML);
}

// 다음 레벨로 이동
function goToNextLevel(level, month, week, day, parentGoalId) {
    closeNextLevelPrompt();

    const levelEl = document.getElementById('modal-goal-level');

    switch (level) {
        case 'yearly':
            openDetailPanel('yearly', '연간 목표');
            break;
        case 'monthly':
            levelEl.dataset.month = month;
            openDetailPanel('monthly', `${month}월 목표`, month);
            break;
        case 'weekly':
            levelEl.dataset.week = week;
            levelEl.dataset.month = month;
            openDetailPanel('weekly', `${month}월 ${week}주차 목표`, { week, month });
            break;
        case 'daily':
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            levelEl.dataset.day = day;
            openDetailPanel('daily', `${dayNames[day]}요일 목표`, day);
            break;
    }

    // 빠른 추가 입력창에 포커스
    setTimeout(() => {
        const quickInput = document.getElementById('quick-goal-input');
        if (quickInput) {
            quickInput.focus();
            quickInput.placeholder = '목표를 입력하세요...';
        }
    }, 300);
}

// 다음 레벨 안내 모달 닫기
function closeNextLevelPrompt() {
    const prompt = document.getElementById('next-level-prompt');
    if (prompt) {
        prompt.remove();
    }
}

// ============================================
// 축하 애니메이션
// ============================================

// 상태 기반 적응형 메시지 시스템
// ============================================

// 상태별 적응형 메시지
const adaptiveMessages = {
    tired: {
        praise: [
            "피곤한 와중에도 해냈어요! 💪",
            "지친 몸으로도 완료! 대단해요 🌙",
            "오늘 하나라도 한 게 승리예요 ✨",
            "쉬어도 돼요, 충분히 잘했어요 🛋️",
            "작은 것도 큰 성취예요! 🎯"
        ],
        encouragement: "오늘 많이 지쳤죠? 무리하지 말고, 할 수 있는 만큼만 해요."
    },
    anxious: {
        praise: [
            "불안 속에서도 해냈어요! 🌟",
            "걱정을 이겨냈네요! 💫",
            "한 걸음씩 나아가고 있어요 👣",
            "진행률이 쌓이고 있어요 📊",
            "불안해도 움직인 당신이 대단해요! 🦋"
        ],
        encouragement: "불안한 마음이 있어도 괜찮아요. 천천히 한 걸음씩!"
    },
    sad: {
        praise: [
            "힘든 날에도 움직였네요 🌈",
            "당신의 노력이 빛나요 ✨",
            "오늘도 버텼어요, 잘하고 있어요 🤗",
            "슬퍼도 괜찮아요, 해낸 게 중요해요 💜",
            "당신은 충분히 잘하고 있어요 🌸"
        ],
        encouragement: "힘든 날이네요. 그래도 여기 있는 것만으로 대단해요."
    },
    frustrated: {
        praise: [
            "답답함을 이겨냈어요! 🔥",
            "그래도 해냈잖아요! 💪",
            "화난 에너지를 성취로 바꿨어요! ⚡",
            "끈기 있네요! 멋져요 🎯",
            "포기 안 한 당신이 진짜예요! 👊"
        ],
        encouragement: "답답한 일이 있었군요. 그래도 여기서 뭔가를 해내고 있어요!"
    },
    positive: {
        praise: [
            "역시 최고예요! 🏆",
            "이 기세 그대로! 🚀",
            "오늘 컨디션 좋네요! ⭐",
            "빛나는 하루예요! ✨",
            "이 느낌 계속 가져가요! 💫"
        ],
        encouragement: "좋은 기분이네요! 오늘 하루도 화이팅!"
    },
    neutral: {
        praise: [
            "잘했어요! 👍",
            "꾸준함이 답이에요! 📈",
            "오늘도 한 걸음! 👣",
            "성실한 당신! 💎",
            "묵묵히 해내는 당신이 멋져요! 🌟"
        ],
        encouragement: "오늘도 차분하게 해나가고 있네요!"
    },
    default: {
        praise: [
            "대단해요! 💪",
            "잘했어요! ⭐",
            "멋져요! 🌟",
            "최고예요! 🏆",
            "훌륭해요! 👏"
        ],
        encouragement: "오늘도 화이팅!"
    }
};

// 최근 감정 상태 분석
function getRecentMoodState() {
    const logs = state.dayEndLogs || [];
    if (logs.length === 0) return 'default';

    // 최근 3일간의 감정 수집
    const recentLogs = logs.slice(-3);
    const allMoods = [];

    recentLogs.forEach(log => {
        if (log.moods && Array.isArray(log.moods)) {
            allMoods.push(...log.moods);
        } else if (log.mood) {
            allMoods.push(log.mood);
        }
    });

    if (allMoods.length === 0) return 'default';

    // 감정 카테고리별 카운트
    const categoryCounts = {
        tired: 0,
        anxious: 0,
        sad: 0,
        frustrated: 0,
        positive: 0,
        neutral: 0
    };

    allMoods.forEach(mood => {
        for (const [category, moods] of Object.entries(moodCategories)) {
            if (moods.includes(mood)) {
                categoryCounts[category]++;
                break;
            }
        }
    });

    // 가장 빈번한 카테고리 찾기
    let dominantCategory = 'default';
    let maxCount = 0;

    for (const [category, count] of Object.entries(categoryCounts)) {
        if (count > maxCount) {
            maxCount = count;
            dominantCategory = category;
        }
    }

    // 최소 1개 이상 있어야 해당 카테고리 반환
    return maxCount > 0 ? dominantCategory : 'default';
}

// 상태 기반 적응형 칭찬 메시지 가져오기
function getAdaptivePraise() {
    const moodState = getRecentMoodState();
    const messages = adaptiveMessages[moodState]?.praise || adaptiveMessages.default.praise;
    return messages[Math.floor(Math.random() * messages.length)];
}

// 상태 기반 격려 메시지 가져오기
function getAdaptiveEncouragement() {
    const moodState = getRecentMoodState();
    return adaptiveMessages[moodState]?.encouragement || adaptiveMessages.default.encouragement;
}

// 오늘의 감정 상태 가져오기 (오늘 기록된 감정)
function getTodayMoodState() {
    const logs = state.dayEndLogs || [];
    const today = new Date().toDateString();

    const todayLog = logs.find(log => {
        const logDate = new Date(log.date).toDateString();
        return logDate === today;
    });

    if (!todayLog) return null;

    const moods = todayLog.moods || (todayLog.mood ? [todayLog.mood] : []);
    if (moods.length === 0) return null;

    // 감정 카테고리 판단
    for (const mood of moods) {
        for (const [category, categoryMoods] of Object.entries(moodCategories)) {
            if (categoryMoods.includes(mood)) {
                return category;
            }
        }
    }

    return 'neutral';
}

// 칭찬 메시지 목록 (기본 - 폴백용)
const praiseMessages = [
    "대단해요! 💪",
    "잘했어요! ⭐",
    "멋져요! 🌟",
    "최고예요! 🏆",
    "훌륭해요! 👏",
    "해냈어요! 🎯",
    "굿잡! 👍",
    "완벽해요! ✨",
    "짱이에요! 🔥",
    "역시 당신! 💫",
    "이 기세 그대로! 🚀",
    "한 걸음 더! 👣",
    "끈기 있네요! 💎",
    "포기 안 했네요! 🙌",
    "오늘도 성장! 🌱"
];

// 연속 완료 추적
let recentCompletions = [];
const COMBO_THRESHOLD = 3; // 3개 이상 연속 완료 시 콤보

function showCelebration(points) {
    const celebration = document.getElementById('celebration');
    const pointsEl = celebration.querySelector('.celebration-points');
    const praiseEl = celebration.querySelector('.celebration-praise');
    const comboEl = celebration.querySelector('.celebration-combo');

    // 연속 완료 감지
    const now = Date.now();
    recentCompletions = recentCompletions.filter(t => now - t < 60000); // 1분 이내
    recentCompletions.push(now);

    const isCombo = recentCompletions.length >= COMBO_THRESHOLD;
    const comboCount = recentCompletions.length;

    // 상태 기반 적응형 칭찬 메시지 선택
    const adaptivePraise = getAdaptivePraise();

    // 칭찬 메시지 표시
    if (praiseEl) praiseEl.textContent = adaptivePraise;

    // 포인트 표시
    pointsEl.textContent = `+${points} 포인트`;

    // 콤보 메시지 표시
    if (comboEl) {
        if (isCombo) {
            comboEl.textContent = `🔥 ${comboCount}콤보! 연속 완료 중!`;
            comboEl.style.display = 'block';
        } else {
            comboEl.style.display = 'none';
        }
    }

    celebration.style.display = 'flex';

    // 효과음 재생
    playCompletionSound(isCombo);

    // 컨페티 생성
    createConfetti();

    // XP 플로팅 애니메이션
    showFloatingXp(points);

    setTimeout(() => {
        celebration.style.display = 'none';
        document.querySelector('.confetti').innerHTML = '';
    }, 2000);
}

// 효과음 재생 (Web Audio API)
function playCompletionSound(isCombo = false) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        if (isCombo) {
            // 콤보 사운드: 상승하는 음
            oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5
        } else {
            // 일반 완료 사운드
            oscillator.frequency.setValueAtTime(659, audioContext.currentTime); // E5
            oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.1); // G5
        }

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        // 오디오 지원 안 되면 무시
    }
}

// XP 플로팅 애니메이션
function showFloatingXp(points) {
    const floater = document.createElement('div');
    floater.className = 'floating-xp';
    floater.textContent = `+${points} XP`;
    floater.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 2rem;
        font-weight: bold;
        color: #FFD700;
        text-shadow: 0 2px 10px rgba(255, 215, 0, 0.5);
        z-index: 10001;
        pointer-events: none;
        animation: floatUp 1.5s ease-out forwards;
    `;
    document.body.appendChild(floater);

    // 애니메이션 스타일 추가
    if (!document.getElementById('float-xp-style')) {
        const style = document.createElement('style');
        style.id = 'float-xp-style';
        style.textContent = `
            @keyframes floatUp {
                0% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -80%) scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -120%) scale(1);
                }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => floater.remove(), 1500);
}

function createConfetti() {
    const confettiContainer = document.querySelector('.confetti');
    const colors = ['#4A90D9', '#27AE60', '#F39C12', '#E74C3C', '#9B59B6'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}%;
            top: -10px;
            animation: confettiFall ${1 + Math.random() * 2}s linear forwards;
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        `;
        confettiContainer.appendChild(confetti);
    }

    // 애니메이션 스타일 추가
    if (!document.getElementById('confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.textContent = `
            @keyframes confettiFall {
                to {
                    transform: translateY(100vh) rotate(720deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================
// 토스트 알림
// ============================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// 슬라이드 아웃 애니메이션 추가
if (!document.getElementById('toast-style')) {
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = `
        @keyframes slideOut {
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// 알림 권한 요청
// ============================================

if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// ============================================
// 키보드 단축키
// ============================================

document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter: 빠른 할 일 추가
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        addTask();
    }

    // Escape: 모달 닫기
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // 숫자 키로 뷰 전환
    const viewMap = {
        '1': 'mindmap',
        '2': 'today',
        '3': 'goals',
        '4': 'pomodoro',
        '5': 'tracker',
        '6': 'rewards'
    };

    if (e.altKey && viewMap[e.key]) {
        document.querySelector(`.nav-item[data-view="${viewMap[e.key]}"]`).click();
    }
});

// ============================================
// 자동 저장
// ============================================

// 5분마다 자동 저장
setInterval(() => {
    saveState();
}, 5 * 60 * 1000);

// 페이지 떠날 때 저장
window.addEventListener('beforeunload', () => {
    saveState();
});

// ============================================
// 마인드맵 기능
// ============================================

let currentDetailLevel = null;
let currentDetailData = null;

function initMindmap() {
    // 현재 날짜 기반 하이라이트
    highlightCurrentPeriods();

    // 오늘 날짜 표시
    updateMindmapDate();

    // 노드 추가 버튼들
    document.querySelectorAll('.node-add-btn, .ring-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const level = btn.dataset.level;
            openGoalModal(level);
        });
    });

    // 월간 노드 클릭
    document.querySelectorAll('.month-node').forEach(node => {
        node.addEventListener('click', () => {
            const month = parseInt(node.dataset.month);
            openDetailPanel('monthly', `${month}월 목표`, month);
        });
    });

    // 주간 노드 클릭
    document.querySelectorAll('.week-node').forEach(node => {
        node.addEventListener('click', () => {
            const week = parseInt(node.dataset.week);
            const month = parseInt(node.dataset.month) || new Date().getMonth() + 1;
            openDetailPanel('weekly', `${month}월 ${week}주차 목표`, { week, month });
        });
    });

    // 일일 노드 클릭
    document.querySelectorAll('.day-node').forEach(node => {
        node.addEventListener('click', () => {
            const day = parseInt(node.dataset.day);
            const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
            openDetailPanel('daily', `${dayNames[day]} 목표`, day);
        });
    });

    // 상세 패널 닫기
    const closeDetailBtn = document.querySelector('.close-detail-btn');
    if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', () => {
            closeDetailPanel();
        });
    }

    // 상세 패널에서 목표 추가
    const addGoalDetailBtn = document.getElementById('add-goal-detail-btn');
    if (addGoalDetailBtn) {
        addGoalDetailBtn.addEventListener('click', () => {
            if (currentDetailLevel) {
                openGoalModalWithContext(currentDetailLevel, currentDetailData);
            }
        });
    }

    // 빠른 목표 추가
    const quickGoalInput = document.getElementById('quick-goal-input');
    const quickAddGoalBtn = document.getElementById('quick-add-goal-btn');

    if (quickGoalInput && quickAddGoalBtn) {
        quickGoalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addQuickGoal();
            }
        });
        quickAddGoalBtn.addEventListener('click', addQuickGoal);
    }

    // 초기 렌더링
    renderMindmap();
}

function highlightCurrentPeriods() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDay();

    // 현재 주차 계산 (해당 월의 몇 번째 주인지)
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentWeek = Math.ceil((now.getDate() + firstDayOfMonth.getDay()) / 7);

    // 현재 월 하이라이트
    document.querySelectorAll('.month-node').forEach(node => {
        node.classList.remove('current');
        if (parseInt(node.dataset.month) === currentMonth) {
            node.classList.add('current');
        }
    });

    // 현재 주 하이라이트
    document.querySelectorAll('.week-node').forEach(node => {
        node.classList.remove('current');
        if (parseInt(node.dataset.week) === currentWeek) {
            node.classList.add('current');
        }
    });

    // 오늘 하이라이트
    document.querySelectorAll('.day-node').forEach(node => {
        node.classList.remove('today', 'weekend');
        const day = parseInt(node.dataset.day);
        if (day === currentDay) {
            node.classList.add('today');
        }
        if (day === 0 || day === 6) {
            node.classList.add('weekend');
        }
    });
}

function updateMindmapDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateEl = document.getElementById('mindmap-today-date');
    if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('ko-KR', options);
    }
}

function renderMindmap() {
    // 인생 목표 렌더링
    renderLifeNodes();

    // 연간 목표 렌더링
    renderYearlyNodes();

    // 월간 목표 카운트
    updateMonthlyGoalCounts();

    // 주간 목표 카운트
    updateWeeklyGoalCounts();

    // 일일 목표 카운트
    updateDailyGoalCounts();
}

function renderLifeNodes() {
    const container = document.getElementById('life-nodes');
    if (!container) return;

    const lifeGoals = state.goals.life || [];
    const completedCount = lifeGoals.filter(g => g.completed).length;

    // 목표 개수만 표시 (클릭하면 상세 패널 열림)
    container.innerHTML = `
        <div class="goal-summary-card" onclick="openDetailPanel('life', '인생 목표')">
            <span class="summary-count">${lifeGoals.length}</span>
            <span class="summary-label">개의 목표</span>
            ${lifeGoals.length > 0 ? `<span class="summary-completed">(${completedCount}개 완료)</span>` : ''}
        </div>
    `;
}


function renderYearlyNodes() {
    const container = document.getElementById('yearly-nodes');
    if (!container) return;

    const yearlyGoals = state.goals.yearly || [];
    const completedCount = yearlyGoals.filter(g => g.completed).length;

    // 목표 개수만 표시 (클릭하면 상세 패널 열림)
    container.innerHTML = `
        <div class="goal-summary-card" onclick="openDetailPanel('yearly', '연간 목표')">
            <span class="summary-count">${yearlyGoals.length}</span>
            <span class="summary-label">개의 목표</span>
            ${yearlyGoals.length > 0 ? `<span class="summary-completed">(${completedCount}개 완료)</span>` : ''}
        </div>
    `;
}

function deleteYearlyGoal(goalId) {
    if (confirm('이 연간 목표를 삭제하시겠습니까?')) {
        state.goals.yearly = state.goals.yearly.filter(g => g.id !== goalId);
        saveState();
        renderMindmap();
        showToast('연간 목표가 삭제되었습니다.', 'info');
    }
}

function updateMonthlyGoalCounts() {
    document.querySelectorAll('.month-node').forEach(node => {
        const month = parseInt(node.dataset.month);
        const goals = getGoalsForMonth(month);
        const countEl = node.querySelector('.month-goals');
        countEl.textContent = goals.length;

        if (goals.length > 0) {
            node.classList.add('has-goals');
        } else {
            node.classList.remove('has-goals');
        }
    });
}

function updateWeeklyGoalCounts() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    document.querySelectorAll('.week-node').forEach(node => {
        const week = parseInt(node.dataset.week);
        const goals = getGoalsForWeek(week, currentMonth);
        const countEl = node.querySelector('.week-goals');
        countEl.textContent = goals.length;
    });
}

function updateDailyGoalCounts() {
    document.querySelectorAll('.day-node').forEach(node => {
        const day = parseInt(node.dataset.day);
        const goals = getGoalsForDay(day);
        const countEl = node.querySelector('.day-goals');
        countEl.textContent = goals.length;
    });
}

// 일일 목표 가로 레이아웃 설정
function setupDailyLayout(panel) {
    // 이미 설정되어 있으면 스킵
    if (panel.querySelector('.detail-body')) return;

    const parentSection = panel.querySelector('.parent-goals-section');
    const currentSection = panel.querySelector('.current-goals-section');
    const childSection = panel.querySelector('.child-goals-section');

    // detail-body wrapper 생성
    const detailBody = document.createElement('div');
    detailBody.className = 'detail-body';

    // main-content-area wrapper 생성
    const mainArea = document.createElement('div');
    mainArea.className = 'main-content-area';

    // 현재 목표와 하위 목표를 main-content-area로 이동
    if (currentSection) mainArea.appendChild(currentSection);
    if (childSection) mainArea.appendChild(childSection);

    // 상위 목표와 main-content-area를 detail-body로 이동
    if (parentSection) detailBody.appendChild(parentSection);
    detailBody.appendChild(mainArea);

    // detail-header 다음에 삽입
    const detailHeader = panel.querySelector('.detail-header');
    if (detailHeader && detailHeader.nextSibling) {
        panel.insertBefore(detailBody, detailHeader.nextSibling);
    } else {
        panel.appendChild(detailBody);
    }
}

// 일일 목표 가로 레이아웃 해제
function removeDailyLayout(panel) {
    const detailBody = panel.querySelector('.detail-body');
    if (!detailBody) return;

    const parentSection = detailBody.querySelector('.parent-goals-section');
    const mainArea = detailBody.querySelector('.main-content-area');
    const currentSection = mainArea?.querySelector('.current-goals-section');
    const childSection = mainArea?.querySelector('.child-goals-section');

    // 원래 위치로 복원 (detail-header 다음)
    const detailHeader = panel.querySelector('.detail-header');

    if (parentSection) {
        panel.insertBefore(parentSection, detailBody);
    }
    if (currentSection) {
        panel.insertBefore(currentSection, detailBody);
    }
    if (childSection) {
        panel.insertBefore(childSection, detailBody);
    }

    // wrapper 제거
    detailBody.remove();
}

function getGoalsForMonth(month) {
    if (!state.goals || !state.goals.monthly) return [];
    return state.goals.monthly.filter(g => g.month === month);
}

function getGoalsForWeek(week, month) {
    if (!state.goals || !state.goals.weekly) return [];
    return state.goals.weekly.filter(g => g.week === week && (!g.month || g.month === month));
}

function getGoalsForDay(day) {
    if (!state.goals || !state.goals.daily) return [];
    return state.goals.daily.filter(g => g.day === day);
}

function openDetailPanel(level, title, data = null) {
    currentDetailLevel = level;
    currentDetailData = data;

    const panel = document.getElementById('mindmap-detail-panel');
    const titleEl = document.getElementById('detail-title');
    const contentEl = document.getElementById('detail-content');
    const parentSection = document.getElementById('parent-goals-section');
    const parentList = document.getElementById('parent-goals-list');
    const childSection = document.getElementById('child-goals-section');
    const childList = document.getElementById('child-goals-list');
    const levelLabel = document.getElementById('current-level-label');

    titleEl.textContent = title;
    contentEl.innerHTML = '';
    parentList.innerHTML = '';
    childList.innerHTML = '';

    // 모든 목표에 가로 레이아웃 적용
    panel.classList.add('daily-layout');
    setupDailyLayout(panel);

    // 레벨별 라벨 설정
    const levelLabels = {
        'life': '인생 목표',
        'yearly': '연간 목표',
        'monthly': '월간 목표',
        'weekly': '주간 목표',
        'daily': '일일 목표'
    };
    levelLabel.textContent = levelLabels[level] || '목표';

    // 월간 목표일 때 월 탭, 주간 목표일 때 주차 탭 추가
    const monthTabsContainer = document.getElementById('month-tabs-container');
    if (level === 'monthly') {
        const currentMonth = data;
        let tabsHTML = '';
        for (let m = 1; m <= 12; m++) {
            const isActive = m === currentMonth;
            const hasGoals = (state.goals.monthly || []).some(g => g.month === m);

            tabsHTML += `
                <button class="month-tab ${isActive ? 'active' : ''} ${hasGoals ? 'has-goals' : ''}"
                        onclick="selectMonth('monthly', ${m}, null)">
                    ${m}월
                </button>
            `;
        }
        monthTabsContainer.innerHTML = tabsHTML;
        monthTabsContainer.style.display = 'flex';
    } else if (level === 'weekly') {
        let currentMonth;
        let currentWeek = null;

        if (typeof data === 'object' && data !== null) {
            currentMonth = data.month;
            currentWeek = data.week;
        } else {
            currentMonth = new Date().getMonth() + 1;
            currentWeek = data || 1;
        }

        // 주차별 탭 표시
        let tabsHTML = '';
        for (let w = 1; w <= 5; w++) {
            const isActive = w === currentWeek;
            const hasGoals = (state.goals.weekly || []).some(g => g.week === w && g.month === currentMonth);

            tabsHTML += `
                <button class="month-tab ${isActive ? 'active' : ''} ${hasGoals ? 'has-goals' : ''}"
                        onclick="selectWeek(${currentMonth}, ${w})">
                    ${w}주차
                </button>
            `;
        }
        monthTabsContainer.innerHTML = tabsHTML;
        monthTabsContainer.style.display = 'flex';
    } else if (level === 'daily') {
        const currentDay = data !== null ? data : new Date().getDay();
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        // 요일별 탭 표시
        let tabsHTML = '';
        for (let d = 0; d <= 6; d++) {
            const isActive = d === currentDay;
            const hasGoals = (state.goals.daily || []).some(g => g.day === d);
            const isWeekend = d === 0 || d === 6;

            tabsHTML += `
                <button class="month-tab ${isActive ? 'active' : ''} ${hasGoals ? 'has-goals' : ''} ${isWeekend ? 'weekend' : ''}"
                        onclick="selectDay(${d})">
                    ${dayNames[d]}
                </button>
            `;
        }
        monthTabsContainer.innerHTML = tabsHTML;
        monthTabsContainer.style.display = 'flex';
    } else {
        monthTabsContainer.innerHTML = '';
        monthTabsContainer.style.display = 'none';
    }

    // 현재 레벨 목표 가져오기
    let goals = [];
    console.log('openDetailPanel - level:', level, 'data:', data);
    console.log('openDetailPanel - state.goals[level]:', state.goals[level]);
    switch (level) {
        case 'life':
            goals = state.goals.life || [];
            console.log('life goals:', goals);
            break;
        case 'yearly':
            goals = state.goals.yearly || [];
            console.log('yearly goals:', goals);
            break;
        case 'monthly':
            goals = getGoalsForMonth(data);
            break;
        case 'weekly':
            // data가 객체인 경우 { week, month } 형태
            if (typeof data === 'object' && data !== null) {
                goals = getGoalsForWeek(data.week, data.month);
            } else {
                goals = getGoalsForWeek(data, new Date().getMonth() + 1);
            }
            break;
        case 'daily':
            goals = getGoalsForDay(data);
            break;
    }

    // 상위 목표 표시
    const parentGoals = getParentGoals(level, data);
    if (parentGoals.length > 0) {
        parentSection.style.display = 'block';
        parentGoals.forEach(pg => {
            const item = document.createElement('div');
            const isCompleted = pg.completed ? 'completed' : '';
            item.className = `parent-goal-item level-${pg.level} ${isCompleted}`;
            item.innerHTML = `
                <div class="parent-goal-checkbox-wrapper" onclick="event.stopPropagation(); toggleGoalCompletion(${pg.id}, '${pg.level}'); refreshParentGoals();">
                    <span class="parent-goal-checkbox ${isCompleted}"></span>
                </div>
                <div class="parent-goal-content">
                    <strong>[${pg.levelName}]</strong> ${pg.title}
                </div>
            `;
            parentList.appendChild(item);
        });
    } else {
        parentSection.style.display = 'none';
    }

    // 현재 레벨 목표 표시
    if (level === 'daily') {
        // 일일 목표는 세로 타임라인 형식으로 표시
        const ROW_HEIGHT = 60; // 1시간 = 60px
        const MINUTE_HEIGHT = ROW_HEIGHT / 60; // 1분 = 1px

        // 겹치는 블록 계산을 위한 전처리 (분 단위 지원)
        const processedGoals = goals.map(g => {
            const startMin = (g.minute || 0);
            const endMin = (g.endMinute || 0);
            // 시작/종료 시간을 분 단위로 변환 (비교용)
            const startTotal = g.hour * 60 + startMin;
            let endHour = (g.endHour !== undefined && g.endHour !== null) ? g.endHour : g.hour + 1;
            let endTotal;
            if (g.endHour !== undefined && g.endHour !== null) {
                endTotal = g.endHour * 60 + endMin;
                // 자정을 넘어가는 경우 (예: 23시 -> 0시)
                if (endTotal <= startTotal) {
                    endTotal += 24 * 60; // 24시간(1440분) 추가
                }
            } else {
                endTotal = g.hour * 60 + startMin + 60; // 기본 1시간
            }
            return {
                ...g,
                startHour: g.hour,
                startMinute: startMin,
                endHour: endHour,
                endMinute: endMin,
                startTotal,
                endTotal
            };
        });

        // 각 목표의 column 위치 계산 (겹치는 블록 나란히 배치) - 분 단위
        const calcOverlapColumns = (goals) => {
            if (goals.length === 0) return [];

            // 시작 시간순 정렬 (분 단위)
            const sorted = [...goals].sort((a, b) => a.startTotal - b.startTotal || a.endTotal - b.endTotal);
            const result = [];

            sorted.forEach(goal => {
                // 이 목표와 겹치는 기존 목표들 찾기 (분 단위)
                const overlapping = result.filter(r =>
                    r.startTotal < goal.endTotal && r.endTotal > goal.startTotal
                );

                // 사용 중인 column 찾기
                const usedColumns = overlapping.map(r => r.column);

                // 빈 column 찾기
                let column = 0;
                while (usedColumns.includes(column)) column++;

                result.push({ ...goal, column });
            });

            // 연결된 겹침 그룹을 찾아서 동일한 totalColumns 적용
            // Union-Find 방식으로 연결된 그룹 찾기
            const parent = result.map((_, i) => i);
            const find = (i) => parent[i] === i ? i : (parent[i] = find(parent[i]));
            const union = (i, j) => { parent[find(i)] = find(j); };

            // 겹치는 블록들을 같은 그룹으로 연결
            for (let i = 0; i < result.length; i++) {
                for (let j = i + 1; j < result.length; j++) {
                    if (result[i].startTotal < result[j].endTotal && result[i].endTotal > result[j].startTotal) {
                        union(i, j);
                    }
                }
            }

            // 각 그룹별 최대 column 수 계산
            const groupMaxColumns = {};
            result.forEach((goal, i) => {
                const root = find(i);
                groupMaxColumns[root] = Math.max(groupMaxColumns[root] || 0, goal.column + 1);
            });

            // 각 목표에 그룹의 totalColumns 적용
            result.forEach((goal, i) => {
                goal.totalColumns = groupMaxColumns[find(i)];
            });

            return result;
        };

        const layoutGoals = calcOverlapColumns(processedGoals);

        // 5시부터 시작하는 시간 순서 생성 (5,6,...,23,0,1,2,3,4)
        const START_HOUR = 5;
        const hourOrder = [];
        for (let i = 0; i < 24; i++) {
            hourOrder.push((START_HOUR + i) % 24);
        }

        // 시간을 표시 위치로 변환 (5시=0번째, 6시=1번째, ..., 4시=23번째)
        const getDisplayIndex = (hour) => {
            return hour >= START_HOUR ? hour - START_HOUR : hour + (24 - START_HOUR);
        };

        let timetableHTML = '<div class="timetable daily-timetable vertical-timeline">';

        // 시간 그리드 + 블록 영역을 함께 감싸는 컨테이너
        timetableHTML += '<div class="vt-wrapper">';

        // 시간 그리드 (5시부터 시작) - 드래그 선택 지원
        timetableHTML += '<div class="vt-grid" id="vt-grid-drag">';
        hourOrder.forEach((hour, index) => {
            const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
            const hasGoal = layoutGoals.some(g => g.startHour <= hour && g.endHour > hour);
            timetableHTML += `
                <div class="vt-row" style="height: ${ROW_HEIGHT}px;" data-hour="${hour}" data-index="${index}">
                    <div class="vt-time">${timeLabel}</div>
                    <div class="vt-line">
                        <div class="vt-dot ${hasGoal ? 'has-goal' : ''}"></div>
                    </div>
                </div>
            `;
        });
        // 드래그 선택 오버레이
        timetableHTML += '<div class="vt-drag-overlay" id="vt-drag-overlay" style="display: none;"></div>';
        timetableHTML += '</div>';

        // 블록 영역 (그리드 위에 겹침)
        timetableHTML += '<div class="vt-blocks-area">';
        layoutGoals.forEach(g => {
            // 분 단위 duration 계산
            const durationMinutes = g.endTotal - g.startTotal;
            const isCompleted = g.completed ? 'completed' : '';
            const priorityClass = g.priority ? `priority-${g.priority}` : 'priority-todo';

            // 분 단위로 시간 표시
            const startTimeStr = `${g.startHour.toString().padStart(2, '0')}:${(g.startMinute || 0).toString().padStart(2, '0')}`;
            const endTimeStr = `${g.endHour.toString().padStart(2, '0')}:${(g.endMinute || 0).toString().padStart(2, '0')}`;

            // 위치 계산 (5시 기준, 분 단위)
            const displayStartMinutes = getDisplayIndex(g.startHour) * 60 + (g.startMinute || 0);
            const top = displayStartMinutes * MINUTE_HEIGHT;
            const height = Math.max(durationMinutes * MINUTE_HEIGHT - 4, 20); // 최소 높이 20px
            const width = (100 / g.totalColumns) - 1;
            const left = g.column * (100 / g.totalColumns);

            // 소요시간 표시 형식
            const hours = Math.floor(durationMinutes / 60);
            const mins = durationMinutes % 60;
            const durationStr = hours > 0
                ? (mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`)
                : `${mins}분`;

            // 블록 크기에 따른 클래스 (compact: 45분 이하, mini: 25분 이하)
            const sizeClass = durationMinutes <= 25 ? 'mini' : (durationMinutes <= 45 ? 'compact' : '');

            timetableHTML += `
                <div class="vt-bar ${isCompleted} ${priorityClass} ${sizeClass}"
                     style="top: ${top}px; height: ${height}px; width: ${width}%; left: ${left}%;"
                     onclick="event.stopPropagation(); toggleDailyGoal(${g.id})"
                     title="${g.title} (${startTimeStr} ~ ${endTimeStr}, ${durationStr})">
                    <div class="vt-bar-header">
                        <span class="vt-checkbox ${isCompleted}"></span>
                        <span class="vt-bar-title">${g.title}</span>
                        <div class="vt-bar-actions">
                            <button class="vt-edit-btn" onclick="event.stopPropagation(); editDailyGoal(${g.id})" title="편집">&#9998;</button>
                            ${!g.completed ? `<button class="vt-postpone-btn" onclick="event.stopPropagation(); postponeGoal(${g.id}, 'daily')" title="내일로 넘기기">&#8594;</button>` : ''}
                            <button class="vt-delete-btn" onclick="event.stopPropagation(); deleteGoal(${g.id}, 'daily')">&times;</button>
                        </div>
                    </div>
                    <div class="vt-bar-info">
                        <span class="vt-bar-time">${startTimeStr} ~ ${endTimeStr}</span>
                        <span class="vt-bar-duration">${durationStr}</span>
                    </div>
                </div>
            `;
        });
        timetableHTML += '</div>'; // vt-blocks-area
        timetableHTML += '</div>'; // vt-wrapper

        timetableHTML += '</div>'; // vertical-timeline
        contentEl.innerHTML = timetableHTML;
    } else if (level === 'life') {
        // 인생 목표는 카테고리별로 그룹화
        console.log('Rendering life goals:', level, 'count:', goals.length);
        const categories = [
            { key: 'health', label: '💪 건강', desc: '신체적, 정신적 상태', color: '#e74c3c' },
            { key: 'relationship', label: '❤️ 관계', desc: '가족, 친구, 동료', color: '#f39c12' },
            { key: 'career', label: '💼 직업/경제', desc: '커리어, 재무 상태', color: '#3498db' },
            { key: 'growth', label: '🌱 자기개발', desc: '학습, 취미, 자아실현', color: '#27ae60' },
            { key: null, label: '📋 미분류', desc: '카테고리 없음', color: '#95a5a6' }
        ];

        // 달성률 계산
        const completedGoals = goals.filter(g => g.completed).length;
        const progressPercent = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

        let categoryHTML = `
            <div class="monthly-progress-bar">
                <div class="monthly-progress-info">
                    <span>인생 목표 달성률</span>
                    <span>${completedGoals}/${goals.length} (${progressPercent}%)</span>
                </div>
                <div class="monthly-progress-track">
                    <div class="monthly-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
            </div>
        `;
        categoryHTML += '<div class="priority-groups">';
        categories.forEach(c => {
            const categoryGoals = c.key === null
                ? goals.filter(g => !g.category)
                : goals.filter(g => g.category === c.key);
            const completedInCategory = categoryGoals.filter(g => g.completed).length;
            const categoryKey = c.key || 'uncategorized';
            categoryHTML += `
                <div class="priority-group" data-category="${categoryKey}">
                    <div class="priority-header clickable-add" style="border-left: 3px solid ${c.color};" onclick="selectLifeCategory('${categoryKey}')">
                        <span class="priority-add-icon">+</span>
                        ${c.label}
                        <span class="category-desc">${c.desc}</span>
                        <span class="priority-count">${completedInCategory}/${categoryGoals.length}</span>
                    </div>
                    <div class="priority-goals ${categoryGoals.length === 0 ? 'empty-clickable' : ''}" ${categoryGoals.length === 0 ? `onclick="selectLifeCategory('${categoryKey}')"` : ''}>
                        ${categoryGoals.length > 0
                            ? categoryGoals.map(g => {
                                const isCompleted = g.completed ? 'completed' : '';
                                return `
                                <div class="priority-goal-item ${isCompleted}">
                                    <div class="goal-checkbox-wrapper" onclick="event.stopPropagation(); toggleGoalCompletion(${g.id}, 'life')">
                                        <span class="goal-checkbox ${isCompleted}"></span>
                                    </div>
                                    <span class="goal-title ${isCompleted}">${g.title}</span>
                                    <div class="goal-actions">
                                        <button class="delete-goal-btn small" onclick="event.stopPropagation(); deleteGoal(${g.id}, 'life')">&times;</button>
                                    </div>
                                </div>
                            `}).join('')
                            : '<span class="empty-priority">클릭하여 추가</span>'
                        }
                    </div>
                </div>
            `;
        });
        categoryHTML += '</div>';
        contentEl.innerHTML = categoryHTML;
    } else if (level === 'monthly' || level === 'yearly') {
        // 월간/연간 목표는 중요도별로 그룹화 + 체크박스 포함
        console.log('Rendering monthly/yearly goals:', level, 'count:', goals.length);
        const priorities = [
            { key: 'urgent', label: '🔴 긴급하고 중요한 일', color: '#e74c3c' },
            { key: 'important', label: '🟡 중요하지만 급하지 않은 일', color: '#f39c12' },
            { key: 'todo', label: '🔵 해야할 일', color: '#3498db' },
            { key: 'nice', label: '🟢 하면 좋은 일', color: '#27ae60' }
        ];

        const periodLabels = { monthly: '월간', yearly: '연간' };
        const periodLabel = periodLabels[level];

        // 달성률 계산
        const completedGoals = goals.filter(g => g.completed).length;
        const progressPercent = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

        let priorityHTML = `
            <div class="monthly-progress-bar">
                <div class="monthly-progress-info">
                    <span>${periodLabel} 달성률</span>
                    <span>${completedGoals}/${goals.length} (${progressPercent}%)</span>
                </div>
                <div class="monthly-progress-track">
                    <div class="monthly-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
            </div>
        `;
        priorityHTML += '<div class="priority-groups">';
        priorities.forEach(p => {
            const priorityGoals = goals.filter(g => g.priority === p.key);
            const completedInPriority = priorityGoals.filter(g => g.completed).length;
            const postponeTitles = { monthly: '다음 달로 넘기기', yearly: '다음 해로 넘기기' };
            const postponeTitle = postponeTitles[level] || '';
            priorityHTML += `
                <div class="priority-group" data-priority="${p.key}">
                    <div class="priority-header clickable-add" style="border-left: 3px solid ${p.color};" onclick="selectPriority('${p.key}')">
                        <span class="priority-add-icon">+</span>
                        ${p.label}
                        <span class="priority-count">${completedInPriority}/${priorityGoals.length}</span>
                    </div>
                    <div class="priority-goals ${priorityGoals.length === 0 ? 'empty-clickable' : ''}" ${priorityGoals.length === 0 ? `onclick="selectPriority('${p.key}')"` : ''}>
                        ${priorityGoals.length > 0
                            ? priorityGoals.map(g => {
                                const isCompleted = g.completed ? 'completed' : '';
                                return `
                                <div class="priority-goal-item ${isCompleted}">
                                    <div class="goal-checkbox-wrapper" onclick="event.stopPropagation(); toggleGoalCompletion(${g.id}, '${level}')">
                                        <span class="goal-checkbox ${isCompleted}"></span>
                                    </div>
                                    <span class="goal-title ${isCompleted}">${g.title}</span>
                                    <div class="goal-actions">
                                        ${!g.completed && level !== 'life' ? `<button class="postpone-goal-btn small" onclick="event.stopPropagation(); postponeGoal(${g.id}, '${level}')" title="${postponeTitle}">&#8594;</button>` : ''}
                                        <button class="delete-goal-btn small" onclick="event.stopPropagation(); deleteGoal(${g.id}, '${level}')">&times;</button>
                                    </div>
                                </div>
                            `}).join('')
                            : '<span class="empty-priority">클릭하여 추가</span>'
                        }
                    </div>
                </div>
            `;
        });
        priorityHTML += '</div>';
        console.log('Setting contentEl.innerHTML for', level);
        contentEl.innerHTML = priorityHTML;
        console.log('contentEl after update:', contentEl.innerHTML.substring(0, 100));
    } else if (level === 'weekly') {
        // 주간 목표는 요일별로 그룹화
        console.log('Rendering weekly goals by day:', goals.length);
        const days = [
            { key: 0, label: '일요일', color: '#e74c3c' },
            { key: 1, label: '월요일', color: '#3498db' },
            { key: 2, label: '화요일', color: '#3498db' },
            { key: 3, label: '수요일', color: '#3498db' },
            { key: 4, label: '목요일', color: '#3498db' },
            { key: 5, label: '금요일', color: '#3498db' },
            { key: 6, label: '토요일', color: '#27ae60' }
        ];

        const today = new Date().getDay();

        // 달성률 계산
        const completedGoals = goals.filter(g => g.completed).length;
        const progressPercent = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

        let weeklyHTML = `
            <div class="monthly-progress-bar">
                <div class="monthly-progress-info">
                    <span>주간 달성률</span>
                    <span>${completedGoals}/${goals.length} (${progressPercent}%)</span>
                </div>
                <div class="monthly-progress-track">
                    <div class="monthly-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
            </div>
        `;
        weeklyHTML += '<div class="priority-groups">';
        days.forEach(d => {
            const dayGoals = goals.filter(g => g.dayOfWeek === d.key);
            const completedInDay = dayGoals.filter(g => g.completed).length;
            const isToday = d.key === today;
            weeklyHTML += `
                <div class="priority-group ${isToday ? 'today-highlight' : ''}" data-day="${d.key}">
                    <div class="priority-header clickable-add" style="border-left: 3px solid ${d.color};" onclick="selectWeekDay(${d.key})">
                        <span class="priority-add-icon">+</span>
                        ${d.label}${isToday ? ' (오늘)' : ''}
                        <span class="priority-count">${completedInDay}/${dayGoals.length}</span>
                    </div>
                    <div class="priority-goals ${dayGoals.length === 0 ? 'empty-clickable' : ''}" ${dayGoals.length === 0 ? `onclick="selectWeekDay(${d.key})"` : ''}>
                        ${dayGoals.length > 0
                            ? dayGoals.map(g => {
                                const isCompleted = g.completed ? 'completed' : '';
                                return `
                                <div class="priority-goal-item ${isCompleted}">
                                    <div class="goal-checkbox-wrapper" onclick="event.stopPropagation(); toggleGoalCompletion(${g.id}, 'weekly')">
                                        <span class="goal-checkbox ${isCompleted}"></span>
                                    </div>
                                    <span class="goal-title ${isCompleted}">${g.title}</span>
                                    <div class="goal-actions">
                                        <button class="delete-goal-btn small" onclick="event.stopPropagation(); deleteGoal(${g.id}, 'weekly')">&times;</button>
                                    </div>
                                </div>
                            `}).join('')
                            : '<span class="empty-priority">클릭하여 추가</span>'
                        }
                    </div>
                </div>
            `;
        });
        weeklyHTML += '</div>';
        contentEl.innerHTML = weeklyHTML;
    } else if (goals.length === 0) {
        contentEl.innerHTML = '<p class="empty-goals-msg">아직 목표가 없습니다</p>';
    }

    // 강제 리플로우 트리거 - 목표 리스트 즉시 렌더링
    void contentEl.offsetHeight;

    // 하위 목표 표시 (비활성화)
    const childGoals = getChildGoals(level, data);
    childSection.style.display = 'none';
    if (false && level !== 'daily') {
        childSection.style.display = 'block';
        childList.innerHTML = '';

        // 연간 목표일 때 월별로 그룹화
        if (level === 'yearly') {
            const currentMonth = new Date().getMonth() + 1;

            for (let month = 1; month <= 12; month++) {
                const monthGoals = state.goals.monthly.filter(g => g.month === month);
                const isCurrentMonth = month === currentMonth;
                const monthSection = document.createElement('div');
                monthSection.className = `month-section ${isCurrentMonth ? 'current-month' : ''}`;
                monthSection.innerHTML = `
                    <div class="month-section-header ${isCurrentMonth ? 'highlight' : ''}">${month}월 ${isCurrentMonth ? '(이번달)' : ''}</div>
                    <div class="month-section-goals">
                        ${monthGoals.length > 0
                            ? monthGoals.map(g => `<div class="child-goal-item">${g.title}</div>`).join('')
                            : '<span class="empty-week">-</span>'
                        }
                    </div>
                `;
                childList.appendChild(monthSection);
            }
        }
        // 월간 목표일 때 주차별로 그룹화
        else if (level === 'monthly') {
            const monthNum = data;
            const weeklyGoals = state.goals.weekly.filter(g => g.month === monthNum);

            for (let week = 1; week <= 5; week++) {
                const weekGoals = weeklyGoals.filter(g => g.week === week);
                const weekSection = document.createElement('div');
                weekSection.className = 'week-section';
                weekSection.style.cursor = 'pointer';
                weekSection.innerHTML = `
                    <div class="week-section-header">${week}주차</div>
                    <div class="week-section-goals">
                        ${weekGoals.length > 0
                            ? weekGoals.map(g => `<div class="child-goal-item">${g.title}</div>`).join('')
                            : '<span class="empty-week">클릭하여 목표 추가</span>'
                        }
                    </div>
                `;
                // 주차 클릭 시 해당 월+주차의 주간 목표로 이동
                weekSection.addEventListener('click', () => {
                    goToNextLevel('weekly', monthNum, week, null, null);
                });
                childList.appendChild(weekSection);
            }
        }
        // 주간 목표일 때 요일별 + 시간표로 그룹화
        else if (level === 'weekly') {
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            const dailyGoals = state.goals.daily || [];

            for (let day = 0; day < 7; day++) {
                const dayGoals = dailyGoals.filter(g => g.day === day);
                const daySection = document.createElement('div');
                daySection.className = 'day-section';

                // 시간표 생성 (0시~23시)
                let timetableHTML = '<div class="timetable">';
                for (let hour = 0; hour <= 23; hour++) {
                    const hourGoals = dayGoals.filter(g => g.hour === hour);
                    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
                    timetableHTML += `
                        <div class="time-slot ${hourGoals.length > 0 ? 'has-goal' : ''}" data-day="${day}" data-hour="${hour}">
                            <span class="time-label">${timeLabel}</span>
                            <span class="time-goal">${hourGoals.length > 0 ? hourGoals.map(g => {
                                const minuteStr = (g.minute || 0).toString().padStart(2, '0');
                                return `${hour.toString().padStart(2, '0')}:${minuteStr} ${g.title}`;
                            }).join(', ') : '-'}</span>
                        </div>
                    `;
                }
                timetableHTML += '</div>';

                daySection.innerHTML = `
                    <div class="day-section-header">${dayNames[day]}요일</div>
                    ${timetableHTML}
                `;
                childList.appendChild(daySection);
            }
        } else if (childGoals.length > 0) {
            childGoals.forEach(cg => {
                const item = document.createElement('div');
                item.className = `child-goal-item level-${cg.level}`;
                item.innerHTML = `<strong>[${cg.levelName}]</strong> ${cg.title}`;
                childList.appendChild(item);
            });
        } else {
            childList.innerHTML = '<p class="empty-goals-msg">하위 목표를 추가하세요</p>';
        }
    } else {
        childSection.style.display = 'none';
    }

    // 빠른 추가 입력 초기화
    const quickInput = document.getElementById('quick-goal-input');
    if (quickInput) quickInput.value = '';

    // 일일 목표일 때 시간 선택 표시 (시작/종료)
    const startTimeInput = document.getElementById('quick-goal-start-time');
    const endTimeInput = document.getElementById('quick-goal-end-time');
    const timeSeparator = document.getElementById('quick-goal-time-separator');
    if (startTimeInput) {
        if (level === 'daily') {
            startTimeInput.style.display = 'block';
            startTimeInput.value = '';
        } else {
            startTimeInput.style.display = 'none';
        }
    }
    if (endTimeInput) {
        if (level === 'daily') {
            endTimeInput.style.display = 'block';
            endTimeInput.value = '';
        } else {
            endTimeInput.style.display = 'none';
        }
    }
    if (timeSeparator) {
        timeSeparator.style.display = level === 'daily' ? 'inline' : 'none';
    }

    // 연간/월간/일일 목표일 때 중요도 선택 표시
    const prioritySelect = document.getElementById('quick-goal-priority');
    if (prioritySelect) {
        if (level === 'yearly' || level === 'monthly' || level === 'daily') {
            prioritySelect.style.display = 'block';
            prioritySelect.value = '';
        } else {
            prioritySelect.style.display = 'none';
        }
    }

    // 일일 목표일 때 루틴 가져오기 버튼 표시
    const importRoutineBtn = document.getElementById('import-routine-btn');
    if (importRoutineBtn) {
        importRoutineBtn.style.display = level === 'daily' ? 'inline-flex' : 'none';
    }

    // 다음 단계로 이동 버튼 추가
    addNextLevelButton(panel, level);

    // 오버레이 표시
    let overlay = document.getElementById('detail-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'detail-overlay';
        overlay.className = 'detail-overlay';
        overlay.onclick = closeDetailPanel;
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'block';

    panel.style.display = 'block';

    // 강제 리플로우 트리거 - DOM 업데이트 즉시 반영
    void panel.offsetHeight;
}

// 다음 단계로 이동 버튼 추가
function addNextLevelButton(panel, currentLevel) {
    // 기존 버튼 제거
    const existingBtn = panel.querySelector('.next-level-nav-btn');
    if (existingBtn) existingBtn.remove();

    const levelFlow = ['life', 'yearly', 'monthly', 'weekly', 'daily'];
    const levelNames = {
        'life': '인생 목표',
        'yearly': '연간 목표',
        'monthly': '월간 목표',
        'weekly': '주간 목표',
        'daily': '일일 목표'
    };

    const currentIndex = levelFlow.indexOf(currentLevel);

    // 마지막 레벨이면 버튼 없음
    if (currentIndex >= levelFlow.length - 1) return;

    const nextLevel = levelFlow[currentIndex + 1];
    const nextLevelName = levelNames[nextLevel];

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentWeek = Math.ceil(now.getDate() / 7);
    const currentDay = now.getDay();

    const btnContainer = document.createElement('div');
    btnContainer.className = 'next-level-nav-btn';
    btnContainer.style.cssText = 'padding: 16px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 16px;';
    btnContainer.innerHTML = `
        <button onclick="goToNextLevel('${nextLevel}', ${currentMonth}, ${currentWeek}, ${currentDay}, '')"
                style="width: 100%; padding: 14px; background: linear-gradient(135deg, #6C5CE7, #a29bfe); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>다음 단계: ${nextLevelName}</span>
            <span style="font-size: 1.2rem;">→</span>
        </button>
    `;

    panel.appendChild(btnContainer);
}

// ===== 루틴 가져오기 기능 =====
let currentRoutineTab = 'yesterday';

function openRoutineModal() {
    document.getElementById('routine-modal').style.display = 'flex';
    switchRoutineTab('yesterday');
}

function closeRoutineModal() {
    document.getElementById('routine-modal').style.display = 'none';
}

function switchRoutineTab(tab) {
    currentRoutineTab = tab;

    // 탭 버튼 활성화 상태 변경
    document.querySelectorAll('.routine-tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(tab === 'yesterday' ? '어제' : tab === 'lastweek' ? '지난주' : '저장된')) {
            btn.classList.add('active');
        }
    });

    renderRoutineList(tab);
}

function renderRoutineList(tab) {
    const routineList = document.getElementById('routine-list');
    const dailyGoals = state.goals.daily || [];
    const today = new Date().getDay(); // 0-6 (일-토)
    let filteredGoals = [];

    if (tab === 'yesterday') {
        // 어제 요일 계산
        const yesterday = today === 0 ? 6 : today - 1;
        filteredGoals = dailyGoals.filter(g => g.day === yesterday);
    } else if (tab === 'lastweek') {
        // 같은 요일의 목표 (현재 선택된 요일)
        const selectedDay = currentDetailData;
        filteredGoals = dailyGoals.filter(g => g.day === selectedDay);
    } else if (tab === 'saved') {
        // 저장된 루틴
        filteredGoals = state.savedRoutines || [];
    }

    if (filteredGoals.length === 0) {
        routineList.innerHTML = '<p class="empty-routine-msg">가져올 루틴이 없습니다</p>';
        return;
    }

    // 시간순 정렬 (5시부터 시작, 0~4시는 다음날 새벽으로 취급, 분 단위 지원)
    const getAdjustedTimeForSort = (hour, minute = 0) => {
        if (hour === null || hour === undefined) return 99 * 60;
        const adjustedHour = hour < 5 ? hour + 24 : hour;
        return adjustedHour * 60 + minute;
    };
    filteredGoals.sort((a, b) => getAdjustedTimeForSort(a.hour, a.minute) - getAdjustedTimeForSort(b.hour, b.minute));

    let html = '';
    filteredGoals.forEach(goal => {
        const startTime = goal.hour !== undefined
            ? `${goal.hour.toString().padStart(2, '0')}:${(goal.minute || 0).toString().padStart(2, '0')}`
            : '';
        const endTime = goal.endHour !== undefined
            ? `${goal.endHour.toString().padStart(2, '0')}:${(goal.endMinute || 0).toString().padStart(2, '0')}`
            : '';
        const timeStr = startTime ? `${startTime}${endTime ? ' ~ ' + endTime : ''}` : '';
        const isRoutine = tab === 'saved';

        html += `
            <label class="routine-item">
                <input type="checkbox" value="${goal.id}" data-title="${goal.title}"
                       data-hour="${goal.hour || ''}" data-minute="${goal.minute || 0}"
                       data-end-hour="${goal.endHour || ''}" data-end-minute="${goal.endMinute || 0}"
                       data-priority="${goal.priority || ''}" ${isRoutine ? 'data-routine="true"' : ''}>
                <span class="routine-checkbox"></span>
                <span class="routine-time">${timeStr}</span>
                <span class="routine-title">${goal.title}</span>
                ${isRoutine ? `<button class="delete-routine-btn" onclick="event.preventDefault(); deleteRoutine(${goal.id})">×</button>` : ''}
            </label>
        `;
    });

    routineList.innerHTML = html;
}

function importSelectedRoutines() {
    const checkboxes = document.querySelectorAll('#routine-list input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showToast('가져올 항목을 선택해주세요', 'warning');
        return;
    }

    const targetDay = currentDetailData; // 현재 선택된 요일
    let importCount = 0;

    checkboxes.forEach(cb => {
        const newGoal = {
            id: Date.now() + Math.random(),
            title: cb.dataset.title,
            day: targetDay,
            completed: false
        };

        if (cb.dataset.hour) newGoal.hour = parseInt(cb.dataset.hour);
        if (cb.dataset.minute) newGoal.minute = parseInt(cb.dataset.minute);
        if (cb.dataset.endHour) newGoal.endHour = parseInt(cb.dataset.endHour);
        if (cb.dataset.endMinute) newGoal.endMinute = parseInt(cb.dataset.endMinute);
        if (cb.dataset.priority) newGoal.priority = cb.dataset.priority;

        state.goals.daily.push(newGoal);
        importCount++;
    });

    saveState();
    closeRoutineModal();
    openDetailPanel('daily', getDayTitle(targetDay), targetDay);
    showToast(`${importCount}개 루틴을 가져왔습니다`, 'success');
}

function saveCurrentAsRoutine() {
    const targetDay = currentDetailData;
    const dayGoals = (state.goals.daily || []).filter(g => g.day === targetDay);

    if (dayGoals.length === 0) {
        showToast('저장할 목표가 없습니다', 'warning');
        return;
    }

    if (!state.savedRoutines) state.savedRoutines = [];

    // 기존 루틴과 중복 체크 후 추가
    let addedCount = 0;
    dayGoals.forEach(goal => {
        const isDuplicate = state.savedRoutines.some(r =>
            r.title === goal.title && r.hour === goal.hour && r.minute === goal.minute
        );

        if (!isDuplicate) {
            state.savedRoutines.push({
                id: Date.now() + Math.random(),
                title: goal.title,
                hour: goal.hour,
                minute: goal.minute,
                endHour: goal.endHour,
                endMinute: goal.endMinute,
                priority: goal.priority
            });
            addedCount++;
        }
    });

    saveState();
    showToast(`${addedCount}개 루틴이 저장되었습니다`, 'success');
    switchRoutineTab('saved');
}

function deleteRoutine(routineId) {
    if (!state.savedRoutines) return;
    state.savedRoutines = state.savedRoutines.filter(r => r.id !== routineId);
    saveState();
    renderRoutineList('saved');
    showToast('루틴이 삭제되었습니다', 'info');
}

function getDayTitle(day) {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return `${dayNames[day]}요일 목표`;
}

// 상위 목표 가져오기 (바로 위 레벨만)
function getParentGoals(level, data) {
    const parents = [];
    const levelOrder = ['daily', 'weekly', 'monthly', 'yearly', 'life'];
    const currentIndex = levelOrder.indexOf(level);

    // 바로 위 레벨이 없으면 빈 배열 반환
    if (currentIndex >= levelOrder.length - 1) return parents;

    // data에서 월/주 정보 추출
    let targetMonth = new Date().getMonth() + 1;
    let targetWeek = null;
    if (typeof data === 'object' && data !== null) {
        if (data.month) targetMonth = data.month;
        if (data.week) targetWeek = data.week;
    } else if (level === 'monthly' && typeof data === 'number') {
        targetMonth = data;
    }

    // 바로 위 레벨만 가져오기
    const upperLevel = levelOrder[currentIndex + 1];
    let upperGoals = [];

    switch (upperLevel) {
        case 'life':
            upperGoals = state.goals.life || [];
            break;
        case 'yearly':
            upperGoals = state.goals.yearly || [];
            break;
        case 'monthly':
            upperGoals = getGoalsForMonth(targetMonth);
            break;
        case 'weekly':
            // 일일 목표에서는 이번 주의 오늘 요일 주간 목표만 표시
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const currentWeek = Math.ceil((now.getDate() + firstDay.getDay()) / 7);
            const todayDayOfWeek = now.getDay(); // 0: 일요일, 1: 월요일, ... 6: 토요일
            upperGoals = getGoalsForWeek(currentWeek, targetMonth);
            // 오늘 요일에 해당하는 목표만 필터링
            upperGoals = upperGoals.filter(g => g.dayOfWeek === todayDayOfWeek);
            // 주차 정보 추가
            upperGoals = upperGoals.map(g => ({
                ...g,
                weekNum: g.week || currentWeek
            }));
            break;
    }

    const levelNames = { 'life': '인생', 'yearly': '연간', 'monthly': '월간', 'weekly': '주간' };
    upperGoals.forEach(g => {
        const weekLabel = g.weekNum ? ` (${g.weekNum}주차)` : '';
        parents.push({
            ...g,
            levelName: levelNames[upperLevel] + weekLabel,
            level: upperLevel
        });
    });

    return parents;
}

// 하위 목표 가져오기
function getChildGoals(level, data) {
    const children = [];
    const levelOrder = ['daily', 'weekly', 'monthly', 'yearly', 'life'];
    const currentIndex = levelOrder.indexOf(level);

    if (currentIndex <= 0) return children;

    const lowerLevel = levelOrder[currentIndex - 1];
    let lowerGoals = [];

    switch (lowerLevel) {
        case 'daily':
            lowerGoals = state.goals.daily || [];
            break;
        case 'weekly':
            const currentMonth = new Date().getMonth() + 1;
            lowerGoals = (state.goals.weekly || []).filter(g => !g.month || g.month === currentMonth);
            break;
        case 'monthly':
            lowerGoals = state.goals.monthly || [];
            break;
        case 'yearly':
            lowerGoals = state.goals.yearly || [];
            break;
    }

    const levelNames = { 'daily': '일일', 'weekly': '주간', 'monthly': '월간', 'yearly': '연간' };
    lowerGoals.forEach(g => {
        children.push({ ...g, levelName: levelNames[lowerLevel], level: lowerLevel });
    });
    return children;
}

function openGoalDetail(goal, level) {
    // 연간 목표 클릭 시 상세 패널 열기
    openDetailPanel('yearly', `연간 목표: ${goal.title}`);
}

// 빠른 목표 추가
function addQuickGoal() {
    const input = document.getElementById('quick-goal-input');
    const title = input.value.trim();

    if (!title || !currentDetailLevel) return;

    // 일일 목표일 때 시작 시간 필수 체크
    if (currentDetailLevel === 'daily') {
        const startTimeInput = document.getElementById('quick-goal-start-time');
        if (!startTimeInput || startTimeInput.value === '') {
            showToast('시작 시간을 선택해주세요', 'warning');
            return;
        }
    }

    // 스크롤 위치 저장
    const mainContentArea = document.querySelector('.main-content-area');
    const verticalTimeline = document.querySelector('.vertical-timeline');
    const detailPanel = document.getElementById('mindmap-detail-panel');

    const scrollPositions = {
        mainContent: mainContentArea ? mainContentArea.scrollTop : 0,
        timeline: verticalTimeline ? verticalTimeline.scrollTop : 0,
        panel: detailPanel ? detailPanel.scrollTop : 0
    };

    const goal = {
        id: Date.now(),
        title: title,
        description: '',
        createdAt: new Date().toISOString()
    };

    // 레벨별 추가 데이터
    if (currentDetailLevel === 'monthly' && currentDetailData) {
        goal.month = currentDetailData;
        // 중요도 정보 추가
        const prioritySelect = document.getElementById('quick-goal-priority');
        if (prioritySelect && prioritySelect.value) {
            goal.priority = prioritySelect.value;
        } else {
            goal.priority = 'todo'; // 기본값: 해야할 일
        }
    } else if (currentDetailLevel === 'yearly') {
        // 연간 목표도 중요도 정보 추가
        const prioritySelect = document.getElementById('quick-goal-priority');
        if (prioritySelect && prioritySelect.value) {
            goal.priority = prioritySelect.value;
        } else {
            goal.priority = 'todo'; // 기본값: 해야할 일
        }
    } else if (currentDetailLevel === 'life') {
        // 인생 목표는 카테고리 정보 추가
        const input = document.getElementById('quick-goal-input');
        if (input && input.dataset.category) {
            goal.category = input.dataset.category;
        } else {
            goal.category = 'growth'; // 기본값: 자기개발
        }
    } else if (currentDetailLevel === 'weekly') {
        // currentDetailData가 객체인 경우 { week, month } 형태
        if (currentDetailData && typeof currentDetailData === 'object') {
            goal.week = currentDetailData.week;
            goal.month = currentDetailData.month;
        } else if (currentDetailData) {
            goal.week = currentDetailData;
            goal.month = new Date().getMonth() + 1;
        }
        // 요일 정보 추가
        const input = document.getElementById('quick-goal-input');
        if (input && input.dataset.dayOfWeek !== undefined) {
            goal.dayOfWeek = parseInt(input.dataset.dayOfWeek);
        } else {
            goal.dayOfWeek = new Date().getDay(); // 기본값: 오늘
        }
    } else if (currentDetailLevel === 'daily' && currentDetailData !== null) {
        goal.day = currentDetailData;
        // 시간 정보 추가 (분 단위 지원)
        const startTimeInput = document.getElementById('quick-goal-start-time');
        const endTimeInput = document.getElementById('quick-goal-end-time');
        if (startTimeInput && startTimeInput.value) {
            const [startHour, startMin] = startTimeInput.value.split(':').map(Number);
            goal.hour = startHour;
            goal.minute = startMin || 0;
            // 종료 시간 추가
            if (endTimeInput && endTimeInput.value) {
                const [endHour, endMin] = endTimeInput.value.split(':').map(Number);
                goal.endHour = endHour;
                goal.endMinute = endMin || 0;
            }
        }
        // 우선순위 정보 추가
        const prioritySelect = document.getElementById('quick-goal-priority');
        if (prioritySelect && prioritySelect.value) {
            goal.priority = prioritySelect.value;
        } else {
            goal.priority = 'todo'; // 기본값: 해야할 일
        }
    }

    // 배열 초기화
    if (!state.goals[currentDetailLevel]) state.goals[currentDetailLevel] = [];

    state.goals[currentDetailLevel].push(goal);
    console.log('addQuickGoal - level:', currentDetailLevel, 'goals:', state.goals[currentDetailLevel]);

    // 일일 목표인 경우 오늘의 할 일에도 자동 추가
    if (currentDetailLevel === 'daily') {
        const today = new Date().getDay(); // 0=일요일, 6=토요일
        if (goal.day === today) {
            // 오늘 요일의 목표인 경우에만 할 일에 추가
            addTaskFromDailyGoal(goal);
        }
    }

    saveState();

    // 마인드맵 즉시 렌더링 (DOM 업데이트 즉시 반영)
    renderMindmap();

    // 패널 새로고침
    const savedLevel = currentDetailLevel;
    const savedData = currentDetailData;
    const savedGoalId = goal.id;

    const getWeeklyLabel = () => {
        if (savedData !== null && typeof savedData === 'object') {
            return `${savedData.month}월 ${savedData.week}주차 목표`;
        }
        return `${savedData}주차 목표`;
    };
    const levelLabels = {
        'life': '인생 목표',
        'yearly': '연간 목표',
        'monthly': `${savedData}월 목표`,
        'weekly': getWeeklyLabel(),
        'daily': ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][savedData] + ' 목표'
    };

    console.log('addQuickGoal refresh - level:', savedLevel, 'data:', savedData, 'goals count:', state.goals[savedLevel]?.length);

    // 입력 필드 먼저 초기화
    input.value = '';
    const prioritySelect = document.getElementById('quick-goal-priority');
    if (prioritySelect) prioritySelect.value = '';

    // 상세 패널 전체 다시 렌더링
    openDetailPanel(savedLevel, levelLabels[savedLevel], savedData);

    // 스크롤 위치 복원
    setTimeout(() => {
        const newMainContentArea = document.querySelector('.main-content-area');
        const newVerticalTimeline = document.querySelector('.vertical-timeline');
        const newDetailPanel = document.getElementById('mindmap-detail-panel');

        if (newMainContentArea) newMainContentArea.scrollTop = scrollPositions.mainContent;
        if (newVerticalTimeline) newVerticalTimeline.scrollTop = scrollPositions.timeline;
        if (newDetailPanel) newDetailPanel.scrollTop = scrollPositions.panel;
    }, 50);

    showToast('목표가 추가되었습니다!', 'success');
    promptNextLevel(savedLevel, savedGoalId);
}

// 상세 패널 내용만 새로고침 (패널 자체는 열린 상태 유지)
function refreshDetailPanelContent(level, data) {
    const contentEl = document.getElementById('detail-content');
    if (!contentEl) return;

    // 내용 초기화
    contentEl.innerHTML = '';

    // 현재 레벨 목표 가져오기
    let goals = [];
    switch (level) {
        case 'life':
            goals = state.goals.life || [];
            break;
        case 'yearly':
            goals = state.goals.yearly || [];
            break;
        case 'monthly':
            goals = (state.goals.monthly || []).filter(g => g.month === data);
            break;
        case 'weekly':
            if (typeof data === 'object' && data !== null) {
                goals = (state.goals.weekly || []).filter(g => g.week === data.week && (!g.month || g.month === data.month));
            } else {
                goals = (state.goals.weekly || []).filter(g => g.week === data);
            }
            break;
        case 'daily':
            goals = (state.goals.daily || []).filter(g => g.day === data);
            break;
    }

    console.log('refreshDetailPanelContent - level:', level, 'goals:', goals.length);

    // 연간/월간 목표는 중요도별 그룹화
    if (level === 'monthly' || level === 'yearly') {
        const priorities = [
            { key: 'urgent', label: '🔴 긴급하고 중요한 일', color: '#e74c3c' },
            { key: 'important', label: '🟡 중요하지만 급하지 않은 일', color: '#f39c12' },
            { key: 'todo', label: '🔵 해야할 일', color: '#3498db' },
            { key: 'nice', label: '🟢 하면 좋은 일', color: '#27ae60' }
        ];

        const periodLabel = level === 'monthly' ? '월간' : '연간';
        const completedGoals = goals.filter(g => g.completed).length;
        const progressPercent = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

        let priorityHTML = `
            <div class="monthly-progress-bar">
                <div class="monthly-progress-info">
                    <span>${periodLabel} 달성률</span>
                    <span>${completedGoals}/${goals.length} (${progressPercent}%)</span>
                </div>
                <div class="monthly-progress-track">
                    <div class="monthly-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
            </div>
        `;
        priorityHTML += '<div class="priority-groups">';
        priorities.forEach(p => {
            const priorityGoals = goals.filter(g => g.priority === p.key);
            const completedInPriority = priorityGoals.filter(g => g.completed).length;
            const postponeTitles = { monthly: '다음 달로 넘기기', yearly: '다음 해로 넘기기' };
            const postponeTitle = postponeTitles[level] || '';
            priorityHTML += `
                <div class="priority-group" data-priority="${p.key}">
                    <div class="priority-header clickable-add" style="border-left: 3px solid ${p.color};" onclick="selectPriority('${p.key}')">
                        <span class="priority-add-icon">+</span>
                        ${p.label}
                        <span class="priority-count">${completedInPriority}/${priorityGoals.length}</span>
                    </div>
                    <div class="priority-goals ${priorityGoals.length === 0 ? 'empty-clickable' : ''}" ${priorityGoals.length === 0 ? `onclick="selectPriority('${p.key}')"` : ''}>
                        ${priorityGoals.length > 0
                            ? priorityGoals.map(g => {
                                const isCompleted = g.completed ? 'completed' : '';
                                return `
                                <div class="priority-goal-item ${isCompleted}">
                                    <div class="goal-checkbox-wrapper" onclick="event.stopPropagation(); toggleGoalCompletion(${g.id}, '${level}')">
                                        <span class="goal-checkbox ${isCompleted}"></span>
                                    </div>
                                    <span class="goal-title ${isCompleted}">${g.title}</span>
                                    <div class="goal-actions">
                                        ${!g.completed && level !== 'life' ? `<button class="postpone-goal-btn small" onclick="event.stopPropagation(); postponeGoal(${g.id}, '${level}')" title="${postponeTitle}">&#8594;</button>` : ''}
                                        <button class="delete-goal-btn small" onclick="event.stopPropagation(); deleteGoal(${g.id}, '${level}')">&times;</button>
                                    </div>
                                </div>
                            `}).join('')
                            : '<span class="empty-priority">클릭하여 추가</span>'
                        }
                    </div>
                </div>
            `;
        });
        priorityHTML += '</div>';
        contentEl.innerHTML = priorityHTML;
    } else if (level === 'daily') {
        // 일일 목표는 openDetailPanel의 전체 로직 필요 - 전체 패널 새로고침
        const levelLabels = {
            'daily': ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][data] + ' 목표'
        };
        openDetailPanel(level, levelLabels[level], data);
    } else {
        // 주간/인생 목표는 단순 리스트
        if (goals.length === 0) {
            contentEl.innerHTML = '<p class="empty-goals-msg">아직 목표가 없습니다</p>';
        } else {
            const completedGoals = goals.filter(g => g.completed).length;
            const progressPercent = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;
            const levelLabels = { weekly: '주간', life: '인생' };
            const progressLabel = levelLabels[level] || '';

            const progressBarHTML = document.createElement('div');
            progressBarHTML.className = 'goal-progress-bar-container';
            progressBarHTML.innerHTML = `
                <div class="goal-progress-info">
                    <span>${progressLabel} 달성률</span>
                    <span>${completedGoals}/${goals.length} (${progressPercent}%)</span>
                </div>
                <div class="goal-progress-track">
                    <div class="goal-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
            `;
            contentEl.appendChild(progressBarHTML);

            goals.forEach(goal => {
                const item = document.createElement('div');
                const isCompleted = goal.completed ? 'completed' : '';
                item.className = `detail-goal-item ${isCompleted}`;
                item.innerHTML = `
                    <div class="goal-checkbox-wrapper" onclick="toggleGoalCompletion(${goal.id}, '${level}')">
                        <span class="goal-checkbox ${isCompleted}"></span>
                    </div>
                    <span class="detail-goal-title ${isCompleted}">${goal.title}</span>
                    <div class="goal-actions">
                        ${!goal.completed && level !== 'life' ? `<button class="postpone-goal-btn" onclick="event.stopPropagation(); postponeGoal(${goal.id}, '${level}')" title="넘기기">&#8594;</button>` : ''}
                        <button class="delete-goal-btn" onclick="event.stopPropagation(); deleteGoal(${goal.id}, '${level}')">&times;</button>
                    </div>
                `;
                contentEl.appendChild(item);
            });
        }
    }

    // 강제 리플로우
    void contentEl.offsetHeight;
}

function openGoalModalWithContext(level, data) {
    currentGoalLevel = level;

    document.getElementById('modal-goal-level').value = level;
    document.getElementById('modal-goal-title').value = '';
    document.getElementById('modal-goal-description').value = '';

    // 상위 목표 연결 설정
    const parentSelect = document.getElementById('modal-parent-goal');
    parentSelect.innerHTML = '<option value="">없음</option>';

    const levelOrder = ['daily', 'weekly', 'monthly', 'yearly', 'life'];
    const currentIndex = levelOrder.indexOf(level);

    for (let i = currentIndex + 1; i < levelOrder.length; i++) {
        const upperLevel = levelOrder[i];
        let upperGoals = [];

        if (upperLevel === 'monthly') {
            upperGoals = state.goals.monthly;
        } else if (upperLevel === 'weekly') {
            upperGoals = state.goals.weekly;
        } else {
            upperGoals = state.goals[upperLevel] || [];
        }

        upperGoals.forEach(goal => {
            const option = document.createElement('option');
            option.value = goal.id;
            option.textContent = `[${upperLevel}] ${goal.title}`;
            parentSelect.appendChild(option);
        });
    }

    // 추가 데이터 저장 (월, 주, 요일)
    if (level === 'monthly' && data) {
        document.getElementById('modal-goal-level').dataset.month = data;
    } else if (level === 'weekly' && data) {
        document.getElementById('modal-goal-level').dataset.week = data;
    } else if (level === 'daily' && data) {
        document.getElementById('modal-goal-level').dataset.day = data;
    }

    document.getElementById('goal-modal').style.display = 'flex';
}

// 시간 슬롯 클릭 시 해당 시간 선택 (전역 함수)
function selectTimeSlot(hour) {
    const startTimeInput = document.getElementById('quick-goal-start-time');
    const endTimeInput = document.getElementById('quick-goal-end-time');
    const timeSeparator = document.getElementById('quick-goal-time-separator');
    const input = document.getElementById('quick-goal-input');

    if (startTimeInput) {
        startTimeInput.value = `${hour.toString().padStart(2, '0')}:00`;
        startTimeInput.style.display = 'block';
    }
    // 종료 시간 필드와 구분자 표시
    if (endTimeInput) {
        endTimeInput.style.display = 'block';
        // 기본 종료 시간을 1시간 후로 설정
        const endHour = (hour + 1) % 24;
        endTimeInput.value = `${endHour.toString().padStart(2, '0')}:00`;
    }
    if (timeSeparator) {
        timeSeparator.style.display = 'inline';
    }
    if (input) {
        input.focus();
        input.placeholder = `${hour.toString().padStart(2, '0')}:00 목표 입력...`;
    }
}

// ============================================
// 시간표 드래그 선택 기능
// ============================================

function initTimeSlotDrag() {
    // 이벤트 위임으로 처리 (동적으로 생성되는 요소 대응)
    document.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);

    // 터치 지원
    document.addEventListener('touchstart', handleDragStart, { passive: false });
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
}

function handleDragStart(e) {
    const grid = document.getElementById('vt-grid-drag');
    if (!grid) return;

    // 터치 또는 마우스 이벤트 처리
    const touch = e.touches ? e.touches[0] : e;
    const target = document.elementFromPoint(touch.clientX, touch.clientY);

    // vt-row 또는 그 자식 요소인지 확인
    const row = target?.closest('.vt-row');
    if (!row || !grid.contains(row)) return;

    // 기존 블록 위에서는 드래그 시작하지 않음
    if (target?.closest('.vt-bar')) return;

    e.preventDefault();

    const hour = parseInt(row.dataset.hour);
    const rect = row.getBoundingClientRect();
    const relativeY = touch.clientY - rect.top;
    const minute = Math.floor((relativeY / rect.height) * 60 / 30) * 30; // 30분 단위

    timeSlotDrag = {
        isDragging: true,
        startHour: hour,
        startMinute: minute,
        endHour: hour,
        endMinute: minute + 30,
        startY: touch.clientY,
        gridElement: grid
    };

    updateDragOverlay();
}

function handleDragMove(e) {
    if (!timeSlotDrag.isDragging) return;

    const touch = e.touches ? e.touches[0] : e;
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const row = target?.closest('.vt-row');

    if (!row || !timeSlotDrag.gridElement?.contains(row)) return;

    e.preventDefault();

    const hour = parseInt(row.dataset.hour);
    const rect = row.getBoundingClientRect();
    const relativeY = touch.clientY - rect.top;
    const minute = Math.floor((relativeY / rect.height) * 60 / 30) * 30; // 30분 단위

    let endMinute = minute + 30;
    if (endMinute >= 60) {
        timeSlotDrag.endHour = (hour + 1) % 24;
        timeSlotDrag.endMinute = 0;
    } else {
        timeSlotDrag.endHour = hour;
        timeSlotDrag.endMinute = endMinute;
    }

    updateDragOverlay();
}

function handleDragEnd(e) {
    if (!timeSlotDrag.isDragging) return;

    timeSlotDrag.isDragging = false;

    // 드래그 오버레이 숨기기
    const overlay = document.getElementById('vt-drag-overlay');
    if (overlay) overlay.style.display = 'none';

    // 시작과 끝이 같으면 단순 클릭으로 처리 (30분 이하)
    if (timeSlotDrag.startHour === timeSlotDrag.endHour &&
        timeSlotDrag.startMinute === timeSlotDrag.endMinute - 30) {
        selectTimeSlot(timeSlotDrag.startHour);
        return;
    }

    // 시간 범위 정렬 (시작이 끝보다 늦을 수 있음)
    let startHour = timeSlotDrag.startHour;
    let startMinute = timeSlotDrag.startMinute;
    let endHour = timeSlotDrag.endHour;
    let endMinute = timeSlotDrag.endMinute;

    // 5시 기준 인덱스로 비교
    const START_HOUR = 5;
    const getIdx = (h, m) => {
        const adjusted = h >= START_HOUR ? h - START_HOUR : h + (24 - START_HOUR);
        return adjusted * 60 + m;
    };

    if (getIdx(startHour, startMinute) > getIdx(endHour, endMinute)) {
        [startHour, endHour] = [endHour, startHour];
        [startMinute, endMinute] = [endMinute, startMinute];
    }

    // 종료 분이 0이면 이전 시간의 60분으로 처리
    if (endMinute === 0 && endHour !== startHour) {
        // 그대로 유지 (00:00은 자정)
    }

    // 시간 입력 필드에 설정
    applyDragSelection(startHour, startMinute, endHour, endMinute);
}

function updateDragOverlay() {
    const overlay = document.getElementById('vt-drag-overlay');
    const grid = timeSlotDrag.gridElement;
    if (!overlay || !grid) return;

    const ROW_HEIGHT = 60;
    const START_HOUR = 5;

    const getDisplayIndex = (hour) => {
        return hour >= START_HOUR ? hour - START_HOUR : hour + (24 - START_HOUR);
    };

    let startIdx = getDisplayIndex(timeSlotDrag.startHour) * 60 + timeSlotDrag.startMinute;
    let endIdx = getDisplayIndex(timeSlotDrag.endHour) * 60 + timeSlotDrag.endMinute;

    // 순서 정렬
    if (startIdx > endIdx) {
        [startIdx, endIdx] = [endIdx, startIdx];
    }

    const top = startIdx; // 1분 = 1px (ROW_HEIGHT = 60px, 1시간 = 60분)
    const height = Math.max(endIdx - startIdx, 30); // 최소 30분

    overlay.style.display = 'block';
    overlay.style.top = `${top}px`;
    overlay.style.height = `${height}px`;

    // 선택 중인 시간 표시
    const startH = Math.floor(startIdx / 60);
    const startM = startIdx % 60;
    const endH = Math.floor(endIdx / 60);
    const endM = endIdx % 60;

    const actualStartHour = (startH + START_HOUR) % 24;
    const actualEndHour = (endH + START_HOUR) % 24;

    overlay.textContent = `${String(actualStartHour).padStart(2, '0')}:${String(startM).padStart(2, '0')} ~ ${String(actualEndHour).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function applyDragSelection(startHour, startMinute, endHour, endMinute) {
    const startTimeInput = document.getElementById('quick-goal-start-time');
    const endTimeInput = document.getElementById('quick-goal-end-time');
    const timeSeparator = document.getElementById('quick-goal-time-separator');
    const input = document.getElementById('quick-goal-input');

    if (startTimeInput) {
        startTimeInput.value = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
        startTimeInput.style.display = 'block';
    }
    if (endTimeInput) {
        endTimeInput.value = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        endTimeInput.style.display = 'block';
    }
    if (timeSeparator) {
        timeSeparator.style.display = 'inline';
    }
    if (input) {
        input.focus();
        // 자정을 넘어가는 경우 duration 계산
        let duration = (endHour - startHour) * 60 + (endMinute - startMinute);
        if (duration <= 0) {
            duration += 24 * 60; // 24시간 추가
        }
        const durationStr = duration >= 60
            ? `${Math.floor(duration/60)}시간${duration%60 > 0 ? ' ' + duration%60 + '분' : ''}`
            : `${duration}분`;
        input.placeholder = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')} ~ ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')} (${durationStr}) 목표 입력...`;
    }

    // 토스트로 안내
    showToast(`${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')} ~ ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')} 선택됨`, 'info');
}

// 중요도 클릭 시 해당 중요도 선택 (전역 함수)
function selectPriority(priority) {
    const prioritySelect = document.getElementById('quick-goal-priority');
    const input = document.getElementById('quick-goal-input');

    const priorityLabels = {
        'urgent': '🔴 긴급+중요',
        'important': '🟡 중요',
        'todo': '🔵 해야할 일',
        'nice': '🟢 하면 좋은 일'
    };

    if (prioritySelect) {
        prioritySelect.value = priority;
        prioritySelect.style.display = 'block';
    }
    if (input) {
        input.focus();
        input.placeholder = `${priorityLabels[priority]} 목표 입력...`;
    }
}

// 인생 목표 카테고리 클릭 시 해당 카테고리 선택 (전역 함수)
function selectLifeCategory(category) {
    const categorySelect = document.getElementById('quick-goal-category');
    const prioritySelect = document.getElementById('quick-goal-priority');
    const input = document.getElementById('quick-goal-input');

    const categoryLabels = {
        'health': '💪 건강',
        'relationship': '❤️ 관계',
        'career': '💼 직업/경제',
        'growth': '🌱 자기개발'
    };

    // 카테고리 선택 저장 (hidden input이나 dataset 사용)
    if (categorySelect) {
        categorySelect.value = category;
        categorySelect.style.display = 'block';
    } else {
        // categorySelect가 없으면 prioritySelect에 임시 저장
        if (prioritySelect) {
            prioritySelect.dataset.category = category;
        }
    }

    if (input) {
        input.focus();
        input.dataset.category = category;
        input.placeholder = `${categoryLabels[category]} 목표 입력...`;
    }
}

// 주간 목표 요일 클릭 시 해당 요일 선택 (전역 함수)
function selectWeekDay(dayOfWeek) {
    const input = document.getElementById('quick-goal-input');

    const dayLabels = {
        0: '일요일',
        1: '월요일',
        2: '화요일',
        3: '수요일',
        4: '목요일',
        5: '금요일',
        6: '토요일'
    };

    if (input) {
        input.focus();
        input.dataset.dayOfWeek = dayOfWeek;
        input.placeholder = `${dayLabels[dayOfWeek]} 목표 입력...`;
    }
}

// 월 선택 (전역 함수)
function selectMonth(level, month, week) {
    // 월 선택 시 dataset도 업데이트
    const levelEl = document.getElementById('modal-goal-level');
    if (levelEl) {
        levelEl.dataset.month = month;
        if (week) levelEl.dataset.week = week;
    }

    if (level === 'weekly') {
        openDetailPanel('weekly', `${month}월 ${week}주차 목표`, { week: week, month: month });
    } else if (level === 'monthly') {
        openDetailPanel('monthly', `${month}월 목표`, month);
    }
}

// 주차 선택 (전역 함수)
function selectWeek(month, week) {
    openDetailPanel('weekly', `${month}월 ${week}주차 목표`, { week: week, month: month });
}

// 요일 선택 (전역 함수)
function selectDay(day) {
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    openDetailPanel('daily', `${dayNames[day]} 목표`, day);
}

// 넘기기 버튼 라벨
function getPostponeLabel(level) {
    const labels = {
        daily: '내일로 넘기기',
        weekly: '다음 주로 넘기기',
        monthly: '다음 달로 넘기기',
        yearly: '내년으로 넘기기'
    };
    return labels[level] || '넘기기';
}

// 목표 넘기기 (전역 함수)
function postponeGoal(goalId, level) {
    const goals = state.goals[level] || [];
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const labelMap = {
        daily: '내일',
        weekly: '다음 주',
        monthly: '다음 달',
        yearly: '내년'
    };

    if (!confirm(`이 목표를 ${labelMap[level]}로 넘기시겠습니까?`)) return;

    switch(level) {
        case 'daily':
            // 오늘 날짜에서 내일로
            if (goal.date) {
                const currentDate = new Date(goal.date);
                currentDate.setDate(currentDate.getDate() + 1);
                goal.date = currentDate.toISOString().split('T')[0];
            } else {
                // date가 없으면 내일 날짜로 설정
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                goal.date = tomorrow.toISOString().split('T')[0];
            }
            // day도 업데이트 (요일)
            const newDate = new Date(goal.date);
            goal.day = newDate.getDay();
            break;

        case 'weekly':
            // 다음 주로
            if (goal.week) {
                goal.week += 1;
                // 5주를 넘으면 다음 달 1주로
                if (goal.week > 5) {
                    goal.week = 1;
                    goal.month = (goal.month || new Date().getMonth() + 1) + 1;
                    if (goal.month > 12) {
                        goal.month = 1;
                        // 연도 처리가 필요하면 여기에 추가
                    }
                }
            } else {
                const now = new Date();
                goal.week = getWeekOfMonth(now) + 1;
                goal.month = now.getMonth() + 1;
                if (goal.week > 5) {
                    goal.week = 1;
                    goal.month += 1;
                    if (goal.month > 12) goal.month = 1;
                }
            }
            break;

        case 'monthly':
            // 다음 달로
            if (goal.month) {
                goal.month += 1;
                if (goal.month > 12) {
                    goal.month = 1;
                    // 연도 처리가 필요하면 여기에 추가
                }
            } else {
                goal.month = new Date().getMonth() + 2;
                if (goal.month > 12) goal.month = 1;
            }
            break;

        case 'yearly':
            // 내년으로 (연간 목표는 특별한 year 필드가 없으므로 title에 연도 표시하거나 별도 처리)
            // 일단 간단히 처리: 연간 목표에 year 필드 추가
            const currentYear = new Date().getFullYear();
            goal.year = (goal.year || currentYear) + 1;
            break;
    }

    saveState();
    renderMindmap();

    // 패널 새로고침
    if (currentDetailLevel && currentDetailData !== undefined) {
        refreshDetailPanel();
    }

    showToast(`목표가 ${labelMap[level]}로 넘겨졌습니다`, 'success');
}

// 상세 패널 새로고침
function refreshDetailPanel() {
    if (!currentDetailLevel) return;

    const levelLabels = {
        'life': '인생 목표',
        'yearly': '연간 목표',
        'monthly': `${currentDetailData}월 목표`,
        'weekly': typeof currentDetailData === 'object'
            ? `${currentDetailData.month}월 ${currentDetailData.week}주차 목표`
            : `${currentDetailData}주차 목표`,
        'daily': '일일 목표'
    };

    openDetailPanel(currentDetailLevel, levelLabels[currentDetailLevel], currentDetailData);
}

// 목표 삭제 (전역 함수)
function deleteGoal(goalId, level) {
    if (!confirm('이 목표를 삭제하시겠습니까?')) return;

    // 스크롤 위치 저장 (여러 컨테이너 확인)
    const mainContentArea = document.querySelector('.main-content-area');
    const verticalTimeline = document.querySelector('.vertical-timeline');
    const detailPanel = document.getElementById('mindmap-detail-panel');

    const scrollPositions = {
        mainContent: mainContentArea ? mainContentArea.scrollTop : 0,
        timeline: verticalTimeline ? verticalTimeline.scrollTop : 0,
        panel: detailPanel ? detailPanel.scrollTop : 0
    };

    state.goals[level] = state.goals[level].filter(g => g.id !== goalId);

    // 연결된 할 일도 함께 삭제
    state.tasks = state.tasks.filter(t => t.linkedGoal !== goalId);

    saveState();
    renderMindmap();
    renderTasks();

    // 패널 새로고침
    if (currentDetailLevel) {
        const getWeeklyLabel = () => {
            if (currentDetailData !== null && typeof currentDetailData === 'object') {
                return `${currentDetailData.month}월 ${currentDetailData.week}주차 목표`;
            }
            return `${currentDetailData}주차 목표`;
        };
        const levelLabels = {
            'life': '인생 목표',
            'yearly': '연간 목표',
            'monthly': `${currentDetailData}월 목표`,
            'weekly': getWeeklyLabel(),
            'daily': currentDetailData !== null ? ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][currentDetailData] + ' 목표' : '일일 목표'
        };
        openDetailPanel(currentDetailLevel, levelLabels[currentDetailLevel], currentDetailData);

        // 스크롤 위치 복원
        setTimeout(() => {
            const newMainContentArea = document.querySelector('.main-content-area');
            const newVerticalTimeline = document.querySelector('.vertical-timeline');
            const newDetailPanel = document.getElementById('mindmap-detail-panel');

            if (newMainContentArea) newMainContentArea.scrollTop = scrollPositions.mainContent;
            if (newVerticalTimeline) newVerticalTimeline.scrollTop = scrollPositions.timeline;
            if (newDetailPanel) newDetailPanel.scrollTop = scrollPositions.panel;
        }, 50);
    }

    showToast('목표가 삭제되었습니다', 'success');
}

// 현재 기간의 목표 초기화 (전역 함수)
function clearCurrentGoals() {
    if (!currentDetailLevel) return;

    const levelNames = {
        'life': '인생 목표',
        'yearly': '연간 목표',
        'monthly': '월간 목표',
        'weekly': '주간 목표',
        'daily': '일일 목표'
    };

    const levelName = levelNames[currentDetailLevel] || '목표';
    let targetDescription = levelName;

    // 세부 기간 설명 추가
    if (currentDetailLevel === 'monthly' && currentDetailData) {
        targetDescription = `${currentDetailData}월 목표`;
    } else if (currentDetailLevel === 'weekly' && currentDetailData) {
        const weekData = typeof currentDetailData === 'object' ? currentDetailData : { week: currentDetailData };
        targetDescription = `${weekData.month || ''}월 ${weekData.week}주차 목표`;
    } else if (currentDetailLevel === 'daily' && currentDetailData !== null) {
        const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        targetDescription = `${dayNames[currentDetailData]} 목표`;
    }

    const confirmed = confirm(`${targetDescription}를 모두 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);

    if (!confirmed) return;

    // 레벨별 목표 삭제
    if (currentDetailLevel === 'life') {
        state.goals.life = [];
    } else if (currentDetailLevel === 'yearly') {
        state.goals.yearly = [];
    } else if (currentDetailLevel === 'monthly' && currentDetailData) {
        state.goals.monthly = (state.goals.monthly || []).filter(g => g.month !== currentDetailData);
    } else if (currentDetailLevel === 'weekly' && currentDetailData) {
        const weekData = typeof currentDetailData === 'object' ? currentDetailData : { week: currentDetailData, month: new Date().getMonth() + 1 };
        state.goals.weekly = (state.goals.weekly || []).filter(g => !(g.week === weekData.week && g.month === weekData.month));
    } else if (currentDetailLevel === 'daily' && currentDetailData !== null) {
        state.goals.daily = (state.goals.daily || []).filter(g => g.day !== currentDetailData);
    }

    saveState();
    showToast(`${targetDescription}가 초기화되었습니다`, 'success');

    // 패널 새로고침
    const savedLevel = currentDetailLevel;
    const savedData = currentDetailData;
    openDetailPanel(savedLevel, document.getElementById('detail-title').textContent, savedData);

    // 마인드맵 업데이트
    updateMindmapCounts();
    updateProgress();
}

// 상세 패널 닫기 (전역 함수)
function closeDetailPanel() {
    const panel = document.getElementById('mindmap-detail-panel');
    const overlay = document.getElementById('detail-overlay');
    if (panel) {
        panel.style.display = 'none';
    }
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// 목표 모달 닫기 (전역 함수)
function closeGoalModal() {
    document.getElementById('goal-modal').style.display = 'none';
}

// 할 일 모달 닫기 (전역 함수)
function closeTaskModal() {
    document.getElementById('task-modal').style.display = 'none';
}

// ============================================
// 알림 시스템
// ============================================

let notifiedGoals = new Set(); // 이미 알림 보낸 목표 ID 저장

function initNotifications() {
    // 알림 권한 요청
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showToast('알림이 활성화되었습니다! 🔔', 'success');
                }
            });
        }
    }

    // 매 분마다 알림 체크
    checkGoalNotifications();
    setInterval(checkGoalNotifications, 60000); // 1분마다 체크
}

function checkGoalNotifications() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();

    // 오늘의 일일 목표 중 현재 시간에 해당하는 목표 찾기
    const todayGoals = (state.goals.daily || []).filter(g => g.day === currentDay);

    todayGoals.forEach(goal => {
        const goalMinute = goal.minute || 0;
        if (goal.hour === currentHour && goalMinute === currentMinute) {
            // 이미 알림 보낸 목표인지 확인
            const notifyKey = `${goal.id}-${now.toDateString()}-${currentHour}-${currentMinute}`;
            if (!notifiedGoals.has(notifyKey)) {
                sendGoalNotification(goal);
                notifiedGoals.add(notifyKey);
            }
        }
    });
}

function sendGoalNotification(goal) {
    const hourStr = goal.hour.toString().padStart(2, '0');
    const minuteStr = (goal.minute || 0).toString().padStart(2, '0');
    const timeStr = `${hourStr}:${minuteStr}`;

    // 브라우저 알림
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('FLOCA 알림 🔔', {
            body: `${timeStr} - ${goal.title}`,
            icon: '📋',
            tag: `goal-${goal.id}`,
            requireInteraction: true
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // 10초 후 자동 닫기
        setTimeout(() => notification.close(), 10000);
    }

    // 화면 내 알림 (토스트 + 모달)
    showAlarmModal(goal, timeStr);

    // 알림음 재생
    playNotificationSound();
}

function showAlarmModal(goal, timeStr) {
    // 기존 알람 모달 제거
    const existingModal = document.getElementById('alarm-modal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
        <div id="alarm-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            animation: fadeIn 0.3s ease;
        ">
            <div style="
                background: white;
                padding: 40px;
                border-radius: 24px;
                text-align: center;
                max-width: 400px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: scaleIn 0.3s ease;
            ">
                <div style="font-size: 4rem; margin-bottom: 16px;">⏰</div>
                <h2 style="color: #1C1C1E; margin-bottom: 8px; font-size: 1.5rem;">${timeStr}</h2>
                <p style="color: #007AFF; font-size: 1.25rem; font-weight: 600; margin-bottom: 24px;">${goal.title}</p>
                <button onclick="closeAlarmModal()" style="
                    padding: 14px 48px;
                    background: #007AFF;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    cursor: pointer;
                ">확인</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 스타일 추가
    if (!document.getElementById('alarm-styles')) {
        const style = document.createElement('style');
        style.id = 'alarm-styles';
        style.textContent = `
            @keyframes scaleIn {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

function closeAlarmModal() {
    const modal = document.getElementById('alarm-modal');
    if (modal) modal.remove();
}

function playNotificationSound() {
    // Web Audio API로 알림음 생성
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        // 두 번째 비프음
        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 1000;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            osc2.start(audioContext.currentTime);
            osc2.stop(audioContext.currentTime + 0.5);
        }, 200);
    } catch (e) {
        console.log('알림음 재생 실패:', e);
    }
}

// ============================================
// 기록 보기 (Journal) 시스템
// ============================================

let currentJournalYear = new Date().getFullYear();
let currentJournalMonth = new Date().getMonth() + 1;

// 기록 보기 초기화
function initJournal() {
    updateJournalMonthLabel();
    // 현재 탭에 따라 렌더링
    if (currentJournalTab === 'daily') {
        renderJournalCalendar();
        renderJournalStats();
        renderJournalChart();
        renderJournalList();
    } else if (currentJournalTab === 'procrastination') {
        renderProcrastinationJournal();
    } else if (currentJournalTab === 'emotion') {
        renderEmotionJournal();
    }
}

// 월 변경
function changeJournalMonth(delta) {
    currentJournalMonth += delta;

    if (currentJournalMonth > 12) {
        currentJournalMonth = 1;
        currentJournalYear++;
    } else if (currentJournalMonth < 1) {
        currentJournalMonth = 12;
        currentJournalYear--;
    }

    updateJournalMonthLabel();
    renderJournalCalendar();
    renderJournalStats();
    renderJournalChart();
    renderJournalList();
}

// 월 라벨 업데이트
function updateJournalMonthLabel() {
    const label = document.getElementById('journal-month-label');
    if (label) {
        label.textContent = `${currentJournalYear}년 ${currentJournalMonth}월`;
    }
}

// 해당 월의 기록 가져오기
function getMonthLogs(year, month) {
    const logs = state.dayEndLogs || [];
    return logs.filter(log => {
        const logDate = new Date(log.date);
        return logDate.getFullYear() === year && logDate.getMonth() + 1 === month;
    });
}

// 기록 보기 탭 전환
let currentJournalTab = 'daily';

function switchJournalTab(tab) {
    currentJournalTab = tab;

    // 탭 버튼 활성화
    document.querySelectorAll('.journal-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // 탭 컨텐츠 전환
    document.querySelectorAll('.journal-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`journal-tab-${tab}`)?.classList.add('active');

    // 각 탭 데이터 렌더링
    if (tab === 'daily') {
        renderJournalCalendar();
        renderJournalStats();
        renderJournalChart();
        renderJournalList();
    } else if (tab === 'procrastination') {
        renderProcrastinationJournal();
    } else if (tab === 'emotion') {
        renderEmotionJournal();
    }
}

// 미루기 대처 기록 렌더링
function renderProcrastinationJournal() {
    const records = state.procrastinationReflections || [];
    const listEl = document.getElementById('procrastination-journal-list');
    const emptyEl = document.getElementById('procrastination-journal-empty');

    if (!listEl) return;

    // 통계 업데이트
    const totalEl = document.getElementById('proc-journal-total');
    if (totalEl) totalEl.textContent = records.length;

    // 연속일 계산
    let streak = 0;
    const dates = [...new Set(records.map(r => new Date(r.date).toDateString()))].sort((a, b) => new Date(b) - new Date(a));
    for (let i = 0; i < dates.length; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - i);
        if (dates.includes(checkDate.toDateString())) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }
    const streakEl = document.getElementById('proc-journal-streak');
    if (streakEl) streakEl.textContent = streak;

    // 수용률
    const acceptanceRecords = records.filter(r => r.acceptance);
    const yesCount = acceptanceRecords.filter(r => r.acceptance === 'yes').length;
    const acceptanceRate = acceptanceRecords.length > 0 ? Math.round((yesCount / acceptanceRecords.length) * 100) : 0;
    const acceptanceEl = document.getElementById('proc-journal-acceptance');
    if (acceptanceEl) acceptanceEl.textContent = acceptanceRecords.length > 0 ? `${acceptanceRate}%` : '-';

    // 실행 자신감
    const confidenceRecords = records.filter(r => r.confidence);
    const confidentCount = confidenceRecords.filter(r => r.confidence === 'yes' || r.confidence === 'maybe').length;
    const confidenceRate = confidenceRecords.length > 0 ? Math.round((confidentCount / confidenceRecords.length) * 100) : 0;
    const confidenceEl = document.getElementById('proc-journal-confidence');
    if (confidenceEl) confidenceEl.textContent = confidenceRecords.length > 0 ? `${confidenceRate}%` : '-';

    // 기록 목록 렌더링
    listEl.innerHTML = '';

    if (records.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    // 최신순 정렬
    const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedRecords.forEach((record, index) => {
        const date = new Date(record.date);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

        const acceptanceLabel = record.acceptance === 'yes' ? '수용함' : record.acceptance === 'no' ? '수용 안함' : '-';
        const confidenceLabel = record.confidence === 'yes' ? '자신있음' : record.confidence === 'maybe' ? '해볼만함' : record.confidence === 'no' ? '어려움' : '-';

        const item = document.createElement('div');
        item.className = 'journal-item procrastination-record';
        item.innerHTML = `
            <div class="journal-item-header">
                <span class="journal-date">${dateStr} ${timeStr}</span>
                <span class="journal-badges">
                    <span class="badge ${record.acceptance === 'yes' ? 'badge-success' : 'badge-neutral'}">${acceptanceLabel}</span>
                    <span class="badge ${record.confidence === 'yes' ? 'badge-success' : record.confidence === 'maybe' ? 'badge-warning' : 'badge-neutral'}">${confidenceLabel}</span>
                </span>
            </div>
            <div class="journal-item-content">
                ${record.target ? `<div class="record-target"><strong>대상:</strong> ${record.target.title || record.target}</div>` : ''}
                ${record.thought ? `<div class="record-field"><strong>자동 생각:</strong> ${record.thought}</div>` : ''}
                ${record.reframe ? `<div class="record-field"><strong>재구성:</strong> ${record.reframe}</div>` : ''}
                ${record.startPoint ? `<div class="record-field"><strong>시작점:</strong> ${record.startPoint}</div>` : ''}
                ${record.when ? `<div class="record-field"><strong>언제:</strong> ${record.when}</div>` : ''}
                ${record.ifDistraction && record.thenAction ? `<div class="record-field"><strong>If-Then:</strong> 만약 ${record.ifDistraction}이면, ${record.thenAction}</div>` : ''}
                ${record.reward ? `<div class="record-field"><strong>보상:</strong> ${record.reward}</div>` : ''}
            </div>
            <div class="journal-item-actions">
                <button class="ai-analyze-btn" onclick="showAiAnalysisPreparing('procrastination', ${index})" title="AI 분석">&#129302; AI 분석</button>
                <button class="delete-record-btn" onclick="deleteProcrastinationRecord(${index})" title="삭제">&#128465;</button>
            </div>
        `;
        listEl.appendChild(item);
    });
}

// AI 분석 준비중 팝업
function showAiAnalysisPreparing(type, index) {
    showToast('🤖 AI 분석 기능 준비중입니다!', 'info');
}

// AI 패턴 리포트 준비중 팝업
function showAiPatternReportPreparing() {
    showToast('🤖 AI 패턴 리포트 기능 준비중입니다!', 'info');
}

// 미루기 대처 기록 삭제
function deleteProcrastinationRecord(index) {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;

    const records = state.procrastinationReflections || [];
    const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recordToDelete = sortedRecords[index];

    const originalIndex = records.findIndex(r => r.date === recordToDelete.date);
    if (originalIndex !== -1) {
        state.procrastinationReflections.splice(originalIndex, 1);
        saveState();
        renderProcrastinationJournal();
        showToast('기록이 삭제되었습니다', 'success');
    }
}

// 감정 인지치료 기록 렌더링
function renderEmotionJournal() {
    const sessions = state.emotionTherapySessions || [];
    const listEl = document.getElementById('emotion-journal-list');
    const emptyEl = document.getElementById('emotion-journal-empty');

    if (!listEl) return;

    // 통계 업데이트
    const totalEl = document.getElementById('emo-journal-total');
    if (totalEl) totalEl.textContent = sessions.length;

    // 연속일 계산
    let streak = 0;
    const dates = [...new Set(sessions.map(s => new Date(s.date).toDateString()))].sort((a, b) => new Date(b) - new Date(a));
    for (let i = 0; i < dates.length; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - i);
        if (dates.includes(checkDate.toDateString())) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }
    const streakEl = document.getElementById('emo-journal-streak');
    if (streakEl) streakEl.textContent = streak;

    // 감정 수용률
    const toleranceSessions = sessions.filter(s => s.tolerance);
    const toleranceYes = toleranceSessions.filter(s => s.tolerance === 'yes').length;
    const toleranceRate = toleranceSessions.length > 0 ? Math.round((toleranceYes / toleranceSessions.length) * 100) : 0;
    const toleranceEl = document.getElementById('emo-journal-tolerance');
    if (toleranceEl) toleranceEl.textContent = toleranceSessions.length > 0 ? `${toleranceRate}%` : '-';

    // 재해석 성공률
    const rethinkSessions = sessions.filter(s => s.rethink);
    const rethinkYes = rethinkSessions.filter(s => s.rethink === 'yes').length;
    const rethinkRate = rethinkSessions.length > 0 ? Math.round((rethinkYes / rethinkSessions.length) * 100) : 0;
    const rethinkEl = document.getElementById('emo-journal-rethink');
    if (rethinkEl) rethinkEl.textContent = rethinkSessions.length > 0 ? `${rethinkRate}%` : '-';

    // 기록 목록 렌더링
    listEl.innerHTML = '';

    if (sessions.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    // 최신순 정렬
    const sortedSessions = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));

    const moodLabels = {
        happy: '행복', excited: '신남', proud: '뿌듯', calm: '평온', grateful: '감사',
        hopeful: '희망', loved: '사랑받는', motivated: '의욕', anxious: '불안', angry: '화남',
        sad: '슬픔', frustrated: '답답', lonely: '외로움', tired: '지침', overwhelmed: '압도됨',
        guilty: '죄책감', neutral: '보통', confused: '혼란', bored: '지루함', restless: '불편'
    };

    sortedSessions.forEach((session, index) => {
        const date = new Date(session.date);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

        const moods = (session.moods || []).map(m => moodLabels[m] || m).join(', ');
        const toleranceLabel = session.tolerance === 'yes' ? '수용함' : session.tolerance === 'no' ? '수용 안함' : '-';
        const rethinkLabel = session.rethink === 'yes' ? '성공' : session.rethink === 'no' ? '어려움' : '-';

        const item = document.createElement('div');
        item.className = 'journal-item emotion-record';
        item.innerHTML = `
            <div class="journal-item-header">
                <span class="journal-date">${dateStr} ${timeStr}</span>
                <span class="journal-badges">
                    ${moods ? `<span class="badge badge-mood">${moods}</span>` : ''}
                    <span class="badge ${session.tolerance === 'yes' ? 'badge-success' : 'badge-neutral'}">${toleranceLabel}</span>
                </span>
            </div>
            <div class="journal-item-content">
                ${session.situation ? `<div class="record-field"><strong>상황:</strong> ${session.situation}</div>` : ''}
                ${session.autoThought ? `<div class="record-field"><strong>자동 생각:</strong> ${session.autoThought}</div>` : ''}
                ${session.alternative ? `<div class="record-field"><strong>대안적 생각:</strong> ${session.alternative}</div>` : ''}
                ${session.newScript ? `<div class="record-field"><strong>새로운 대본:</strong> ${session.newScript}</div>` : ''}
                ${session.ifTrigger && session.thenAction ? `<div class="record-field"><strong>If-Then:</strong> 만약 ${session.ifTrigger}이면, ${session.thenAction}</div>` : ''}
                ${session.reward ? `<div class="record-field"><strong>보상:</strong> ${session.reward}</div>` : ''}
            </div>
            <div class="journal-item-actions">
                <button class="ai-analyze-btn" onclick="showAiAnalysisPreparing('emotion', ${index})" title="AI 분석">&#129302; AI 분석</button>
                <button class="delete-record-btn" onclick="deleteEmotionRecord(${index})" title="삭제">&#128465;</button>
            </div>
        `;
        listEl.appendChild(item);
    });
}

// 감정 인지치료 기록 삭제
function deleteEmotionRecord(index) {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;

    const sessions = state.emotionTherapySessions || [];
    const sortedSessions = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const sessionToDelete = sortedSessions[index];

    const originalIndex = sessions.findIndex(s => s.date === sessionToDelete.date);
    if (originalIndex !== -1) {
        state.emotionTherapySessions.splice(originalIndex, 1);
        saveState();
        renderEmotionJournal();
        showToast('기록이 삭제되었습니다', 'success');
    }
}

// 캘린더 렌더링
function renderJournalCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;

    const year = currentJournalYear;
    const month = currentJournalMonth;

    // 해당 월의 첫날과 마지막 날
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    // 오늘 날짜
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 해당 월의 기록
    const monthLogs = getMonthLogs(year, month);

    let html = '';

    // 빈 칸 채우기
    for (let i = 0; i < startDayOfWeek; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // 날짜 채우기
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const log = monthLogs.find(l => l.date === dateStr);
        const isToday = dateStr === todayStr;

        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (log) classes += ' has-record';

        // 감정 이모지 (첫 번째 또는 대표 감정)
        let moodEmoji = '';
        if (log) {
            const moods = log.moods || (log.mood ? [log.mood] : []);
            if (moods.length > 0 && moodEmojiMap[moods[0]]) {
                moodEmoji = moodEmojiMap[moods[0]];
            }
        }

        // 달성률
        const rate = log?.routineRate || 0;

        html += `
            <div class="${classes}" onclick="showJournalDetail('${dateStr}')">
                <span class="day-number">${day}</span>
                ${moodEmoji ? `<span class="day-mood">${moodEmoji}</span>` : ''}
                ${log ? `<span class="day-rate">${rate}%</span>` : ''}
            </div>
        `;
    }

    grid.innerHTML = html;
}

// 월간 통계 렌더링
function renderJournalStats() {
    const monthLogs = getMonthLogs(currentJournalYear, currentJournalMonth);

    // 기록한 날 수
    const totalDays = monthLogs.length;
    document.getElementById('journal-total-days').textContent = totalDays;

    // 연속 기록 (현재 월 내)
    let streak = 0;
    const sortedLogs = [...monthLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    for (let i = 0; i < sortedLogs.length; i++) {
        if (i === 0) {
            streak = 1;
        } else {
            const current = new Date(sortedLogs[i].date);
            const prev = new Date(sortedLogs[i - 1].date);
            const diff = (prev - current) / (1000 * 60 * 60 * 24);
            if (diff === 1) {
                streak++;
            } else {
                break;
            }
        }
    }
    document.getElementById('journal-streak').textContent = streak;

    // 평균 달성률
    const avgRate = totalDays > 0
        ? Math.round(monthLogs.reduce((sum, log) => sum + (log.routineRate || 0), 0) / totalDays)
        : 0;
    document.getElementById('journal-avg-rate').textContent = `${avgRate}%`;

    // 가장 많이 느낀 감정
    const moodCount = {};
    monthLogs.forEach(log => {
        const moods = log.moods || (log.mood ? [log.mood] : []);
        moods.forEach(mood => {
            moodCount[mood] = (moodCount[mood] || 0) + 1;
        });
    });

    let topMood = '-';
    let maxCount = 0;
    Object.entries(moodCount).forEach(([mood, count]) => {
        if (count > maxCount) {
            maxCount = count;
            topMood = moodLabelMap[mood] || mood;
        }
    });
    document.getElementById('journal-top-mood').textContent = topMood;
}

// 그래프 렌더링
function renderJournalChart() {
    const chartBars = document.getElementById('journal-chart-bars');
    if (!chartBars) return;

    const monthLogs = getMonthLogs(currentJournalYear, currentJournalMonth);

    // 날짜순 정렬
    const sortedLogs = [...monthLogs].sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sortedLogs.length === 0) {
        chartBars.innerHTML = '<p style="text-align: center; color: var(--text-muted); width: 100%;">기록이 없습니다</p>';
        return;
    }

    // 최대 15개만 표시
    const displayLogs = sortedLogs.slice(-15);

    chartBars.innerHTML = displayLogs.map(log => {
        const date = new Date(log.date);
        const dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;

        // 감정 값 (평균)
        const moods = log.moods || (log.mood ? [log.mood] : []);
        const moodValue = moods.length > 0 ? getMoodsAverageValue(moods) : 0;
        const moodHeight = (moodValue / 5) * 100;

        // 달성률
        const rateHeight = log.routineRate || 0;

        return `
            <div class="chart-bar-group">
                <div class="chart-bar-container">
                    <div class="chart-bar mood" style="height: ${moodHeight}px"></div>
                    <div class="chart-bar rate" style="height: ${rateHeight}px"></div>
                </div>
                <span class="chart-bar-label">${dayLabel}</span>
            </div>
        `;
    }).join('');
}

// 기록 목록 렌더링
function renderJournalList() {
    const list = document.getElementById('journal-list');
    const empty = document.getElementById('journal-empty');
    if (!list) return;

    const monthLogs = getMonthLogs(currentJournalYear, currentJournalMonth);

    // 최신순 정렬
    const sortedLogs = [...monthLogs].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedLogs.length === 0) {
        list.style.display = 'none';
        if (empty) empty.style.display = 'block';
        return;
    }

    list.style.display = 'flex';
    if (empty) empty.style.display = 'none';

    list.innerHTML = sortedLogs.map(log => {
        const date = new Date(log.date);
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일 (${dayNames[date.getDay()]})`;

        // 감정 이모지들
        const moods = log.moods || (log.mood ? [log.mood] : []);
        const moodEmojis = moods.slice(0, 5).map(m => moodEmojiMap[m] || '').join('');

        // 에너지
        const energy = log.energy || '-';

        // 완료 수
        const completed = log.completedCount || 0;

        // 달성률
        const rate = log.routineRate || 0;

        // 일기
        const diary = log.diary || log.note || '';

        return `
            <div class="journal-item" onclick="showJournalDetail('${log.date}')">
                <div class="journal-item-header">
                    <span class="journal-item-date">${dateStr}</span>
                    <span class="journal-item-moods">${moodEmojis || '&#128528;'}</span>
                </div>
                <div class="journal-item-stats">
                    <span>&#9889; 에너지 ${energy}</span>
                    <span>&#9989; 완료 ${completed}개</span>
                    <span>&#128200; 달성률 ${rate}%</span>
                </div>
                ${diary ? `<div class="journal-item-diary">${diary}</div>` : ''}
            </div>
        `;
    }).join('');
}

// 상세 보기 (나중에 모달로 확장 가능)
function showJournalDetail(dateStr) {
    const logs = state.dayEndLogs || [];
    const log = logs.find(l => l.date === dateStr);

    if (!log) {
        showToast('해당 날짜에 기록이 없습니다', 'info');
        return;
    }

    // 일단 토스트로 간단히 표시 (나중에 모달로 확장 가능)
    const moods = log.moods || (log.mood ? [log.mood] : []);
    const moodLabels = moods.map(m => moodLabelMap[m] || m).join(', ');
    showToast(`${dateStr}: ${moodLabels} (${log.routineRate || 0}%)`, 'info');
}

// 뷰 전환 시 초기화
const originalSwitchView = window.switchView;
window.switchView = function(view) {
    if (typeof originalSwitchView === 'function') {
        originalSwitchView(view);
    } else {
        // 기본 뷰 전환 로직
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        const targetView = document.getElementById(`${view}-view`);
        const targetNav = document.querySelector(`[data-view="${view}"]`);

        if (targetView) targetView.classList.add('active');
        if (targetNav) targetNav.classList.add('active');
    }

    // 기록 보기 탭이면 초기화
    if (view === 'journal') {
        initJournal();
    }

    // 지금 할 일 탭이면 NOW 모드 렌더링
    if (view === 'today') {
        if (typeof renderNowMode === 'function') {
            renderNowMode();
            updateNowDate();
        }
    }
};

console.log('FLOCA - ADHD 맞춤형 플래너가 로드되었습니다.');

// ============================================
// NOW 모드 - ADHD 특화 오늘의 할 일
// ============================================

let nowTimerInterval = null;
let nowTimerSeconds = 25 * 60;
let nowTimerRunning = false;
let nowTimerFocusMinutes = 25;
let nowTimerBreakMinutes = 5;
let nowTimerLongBreakMinutes = 15;
let nowTimerMode = 'focus'; // 'focus' or 'break'
let nowPomodoroSession = 1;
const MAX_SESSIONS = 4;

function initNowMode() {
    try {
        // state.now 초기화
        if (!state.now) {
            state.now = {
                currentEnergy: 3,
                brainDumps: [],
                currentTaskId: null,
                timerSeconds: 25 * 60,
                timerRunning: false,
                skippedTasks: []
            };
        }

        // 포모도로 통계 초기화
        updateNowPomoStats();
        updateNowTimerModeDisplay();

        // 지금 할 일 탭이 활성화된 경우에만 렌더링
        const todayView = document.getElementById('today-view');
        if (todayView && todayView.classList.contains('active')) {
            // 날짜 표시
            updateNowDate();

            // 에너지 레벨 표시
            updateEnergyDisplay();

            // Brain Dump 목록 렌더링
            renderBrainDumps();

            // 오늘의 할 일 로드 및 표시
            renderNowMode();
        }
    } catch (e) {
        console.error('NOW 모드 초기화 오류:', e);
    }
}

function updateNowDate() {
    const dateEl = document.getElementById('now-date');
    if (!dateEl) return;

    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const formatted = `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
    dateEl.textContent = formatted;
}

// 오늘의 할 일 가져오기
function getTodayTasks() {
    const today = new Date();
    const todayDay = today.getDay();
    const dailyGoals = state.goals?.daily || [];

    // 오늘 요일에 해당하는 목표들
    const todayGoals = dailyGoals.filter(g => g.day === todayDay);

    // 건너뛴 항목 제외
    const skipped = state.now?.skippedTasks || [];
    const activeGoals = todayGoals.filter(g => !skipped.includes(g.id));

    // 시간순 정렬 (시간 > 분 순)
    activeGoals.sort((a, b) => {
        const hourA = a.hour ?? 24;
        const hourB = b.hour ?? 24;
        if (hourA !== hourB) return hourA - hourB;

        const minA = a.minute ?? 0;
        const minB = b.minute ?? 0;
        return minA - minB;
    });

    return activeGoals;
}

// 현재 시간에 맞는 할 일 가져오기
function getRecommendedTask() {
    const tasks = getTodayTasks();
    const incompleteTasks = tasks.filter(t => !t.completed);

    if (incompleteTasks.length === 0) return null;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    // 현재 시간에 진행 중이거나 가장 가까운 미래의 할 일 찾기
    let currentTask = null;
    let nextTask = null;
    let pastTasks = [];

    for (const task of incompleteTasks) {
        const taskHour = task.hour ?? 0;
        const taskMinute = task.minute ?? 0;
        const taskStartMinutes = taskHour * 60 + taskMinute;

        const taskEndHour = task.endHour ?? (taskHour + 1);
        const taskEndMinute = task.endMinute ?? 0;
        const taskEndMinutes = taskEndHour * 60 + taskEndMinute;

        // 현재 시간이 작업 시간 범위 내인지 확인
        if (currentTotalMinutes >= taskStartMinutes && currentTotalMinutes < taskEndMinutes) {
            currentTask = task;
            break;
        }

        // 미래 작업
        if (taskStartMinutes > currentTotalMinutes && !nextTask) {
            nextTask = task;
        }

        // 지나간 작업 (아직 완료 안 됨)
        if (taskEndMinutes <= currentTotalMinutes) {
            pastTasks.push(task);
        }
    }

    // 1순위: 현재 진행 중인 작업
    if (currentTask) return currentTask;

    // 2순위: 가장 가까운 미래 작업
    if (nextTask) return nextTask;

    // 3순위: 지나갔지만 아직 완료 안 된 작업 (가장 최근 것)
    if (pastTasks.length > 0) return pastTasks[pastTasks.length - 1];

    // 시간 정보 없는 작업
    return incompleteTasks[0];
}

// NOW 모드 렌더링
function renderNowMode() {
    try {
        const tasks = getTodayTasks();
        const incompleteTasks = tasks.filter(t => !t.completed);
        const completedTasks = tasks.filter(t => t.completed);

        // 진행률 업데이트
        updateNowProgress(completedTasks.length, tasks.length);

        // 현재 작업 렌더링
        const currentTask = getRecommendedTask();
        renderCurrentTask(currentTask);

        // 대기열 렌더링 (현재 작업 제외)
        const queueTasks = currentTask
            ? incompleteTasks.filter(t => t.id !== currentTask.id).slice(0, 3)
            : incompleteTasks.slice(0, 3);
        renderTaskQueue(queueTasks);

        // 완료 목록 렌더링
        renderCompletedTasks(completedTasks);
    } catch (e) {
        console.error('NOW 모드 렌더링 오류:', e);
    }
}

function updateNowProgress(completed, total) {
    const fillEl = document.getElementById('now-progress-fill');
    const textEl = document.getElementById('now-progress-text');

    if (fillEl) {
        const percent = total > 0 ? (completed / total) * 100 : 0;
        fillEl.style.width = `${percent}%`;
    }

    if (textEl) {
        textEl.textContent = `${completed}/${total}`;
    }
}

function renderCurrentTask(task) {
    const focusCard = document.getElementById('now-focus-card');
    const emptyState = document.getElementById('now-empty-state');
    const titleEl = document.getElementById('now-task-title');
    const metaEl = document.getElementById('now-task-meta');
    const priorityEl = document.getElementById('now-task-priority');
    const timeEl = document.getElementById('now-task-time');
    const skipBtn = document.getElementById('now-skip-btn');
    const nowLabel = document.querySelector('.now-label');

    if (!task) {
        // 할 일 없음
        if (focusCard) focusCard.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        if (skipBtn) skipBtn.style.display = 'none';
        state.now.currentTaskId = null;
        return;
    }

    if (focusCard) focusCard.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    if (skipBtn) skipBtn.style.display = 'block';

    state.now.currentTaskId = task.id;

    // 현재 시간과 비교하여 상태 표시
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    const taskHour = task.hour ?? 0;
    const taskMinute = task.minute ?? 0;
    const taskStartMinutes = taskHour * 60 + taskMinute;
    const taskEndHour = task.endHour ?? (taskHour + 1);
    const taskEndMinute = task.endMinute ?? 0;
    const taskEndMinutes = taskEndHour * 60 + taskEndMinute;

    let timeStatus = '';
    let statusClass = '';

    if (task.hour !== undefined) {
        if (currentTotalMinutes >= taskStartMinutes && currentTotalMinutes < taskEndMinutes) {
            timeStatus = '🔥 지금 할 시간!';
            statusClass = 'status-now';
        } else if (taskStartMinutes > currentTotalMinutes) {
            const diffMinutes = taskStartMinutes - currentTotalMinutes;
            if (diffMinutes <= 30) {
                timeStatus = `⏰ ${diffMinutes}분 후 시작`;
                statusClass = 'status-soon';
            } else {
                timeStatus = '📅 예정됨';
                statusClass = 'status-scheduled';
            }
        } else if (taskEndMinutes <= currentTotalMinutes) {
            timeStatus = '⚠️ 시간 지남';
            statusClass = 'status-overdue';
        }
    }

    if (nowLabel) {
        if (timeStatus && task.hour !== undefined) {
            nowLabel.innerHTML = timeStatus;
            nowLabel.className = `now-label ${statusClass}`;
        } else {
            nowLabel.innerHTML = '&#128293; 지금 집중할 것';
            nowLabel.className = 'now-label';
        }
    }

    if (titleEl) {
        titleEl.textContent = task.title;
    }

    if (priorityEl) {
        const priorityLabels = {
            urgent: '긴급+중요', important: '중요', high: '중요',
            todo: '해야할 일', medium: '해야할 일',
            nice: '하면 좋은 일', low: '하면 좋은 일'
        };
        const priorityClass = task.priority === 'important' ? 'high' :
                             task.priority === 'todo' ? 'medium' :
                             task.priority === 'nice' ? 'low' : task.priority;
        priorityEl.textContent = priorityLabels[task.priority] || '';
        priorityEl.className = `now-task-priority ${priorityClass || 'medium'}`;
    }

    if (timeEl) {
        if (task.hour !== undefined) {
            const startTime = `${String(task.hour).padStart(2, '0')}:${String(task.minute || 0).padStart(2, '0')}`;
            if (task.endHour !== undefined) {
                const endTime = `${String(task.endHour).padStart(2, '0')}:${String(task.endMinute || 0).padStart(2, '0')}`;
                timeEl.textContent = `${startTime} ~ ${endTime}`;
            } else {
                timeEl.textContent = startTime;
            }
        } else {
            timeEl.textContent = '';
        }
    }
}

function renderTaskQueue(tasks) {
    const previewEl = document.getElementById('now-queue-preview');
    if (!previewEl) return;

    if (tasks.length === 0) {
        previewEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: var(--spacing-md);">대기 중인 작업이 없습니다</p>';
        return;
    }

    previewEl.innerHTML = tasks.map((task, index) => {
        const priorityClass = task.priority === 'important' ? 'high' :
                             task.priority === 'todo' ? 'medium' :
                             task.priority === 'nice' ? 'low' : task.priority;
        const timeStr = task.hour !== undefined
            ? `${String(task.hour).padStart(2, '0')}:${String(task.minute || 0).padStart(2, '0')}`
            : '';

        return `
            <div class="now-queue-item" onclick="selectTask(${task.id})">
                <span class="queue-item-priority ${priorityClass || 'medium'}"></span>
                <div class="queue-item-content">
                    <div class="queue-item-title">${task.title}</div>
                    ${timeStr ? `<div class="queue-item-time">${timeStr}</div>` : ''}
                </div>
                <button class="queue-item-action" onclick="event.stopPropagation(); selectTask(${task.id})">지금 하기</button>
            </div>
        `;
    }).join('');
}

function renderCompletedTasks(tasks) {
    const countEl = document.getElementById('now-completed-count');
    const listEl = document.getElementById('now-completed-list');

    if (countEl) {
        countEl.textContent = `(${tasks.length})`;
    }

    if (listEl) {
        if (tasks.length === 0) {
            listEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: var(--spacing-sm);">아직 완료한 일이 없어요</p>';
            return;
        }

        listEl.innerHTML = tasks.map(task => `
            <div class="now-completed-item">
                <span class="completed-check">&#10003;</span>
                <span class="completed-title">${task.title}</span>
            </div>
        `).join('');
    }
}

// 에너지 레벨 관련
function openEnergySelector() {
    const popup = document.getElementById('energy-selector-popup');
    if (popup) {
        popup.style.display = 'flex';
        // 현재 레벨 표시
        const currentLevel = state.now?.currentEnergy || 3;
        document.querySelectorAll('.energy-option').forEach(opt => {
            opt.classList.toggle('active', parseInt(opt.dataset.level) === currentLevel);
        });
    }
}

function setEnergyLevel(level) {
    if (!state.now) state.now = {};
    state.now.currentEnergy = level;
    saveState();

    updateEnergyDisplay();
    closeEnergySelector();

    // 에너지 변경 시 추천 작업 재계산
    renderNowMode();

    const messages = {
        1: '힘든 하루네요. 가벼운 것부터 시작해요 💪',
        2: '조금 피곤하시군요. 쉬운 일 먼저 해볼까요?',
        3: '적당한 에너지! 차근차근 해봐요',
        4: '컨디션 좋네요! 중요한 일을 해볼까요?',
        5: '최고의 컨디션! 어려운 일도 거뜬해요 🔥'
    };
    showToast(messages[level], 'info');
}

function closeEnergySelector() {
    const popup = document.getElementById('energy-selector-popup');
    if (popup) popup.style.display = 'none';
}

// 에너지 팝업 외부 클릭 시 닫기
document.addEventListener('click', function(e) {
    const popup = document.getElementById('energy-selector-popup');
    if (popup && popup.style.display === 'flex') {
        const content = popup.querySelector('.energy-selector-content');
        if (content && !content.contains(e.target) && !e.target.closest('.now-energy-display')) {
            closeEnergySelector();
        }
    }
});

function updateEnergyDisplay() {
    const dots = document.querySelectorAll('.energy-dot');
    const level = state.now?.currentEnergy || 3;

    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index < level);
    });
}

// 타이머 관련
function toggleNowTimer() {
    if (nowTimerRunning) {
        pauseNowTimer();
    } else {
        startNowTimer();
    }
}

function startNowTimer() {
    nowTimerRunning = true;
    const playBtn = document.getElementById('now-timer-play');
    const iconEl = document.getElementById('now-timer-icon');

    if (playBtn) playBtn.classList.add('playing');
    if (iconEl) iconEl.innerHTML = '&#10074;&#10074;'; // 일시정지 아이콘

    nowTimerInterval = setInterval(() => {
        nowTimerSeconds--;

        if (nowTimerSeconds <= 0) {
            // 타이머 완료
            clearInterval(nowTimerInterval);
            nowTimerRunning = false;

            if (playBtn) playBtn.classList.remove('playing');
            if (iconEl) iconEl.innerHTML = '&#9658;';

            if (nowTimerMode === 'focus') {
                // 집중 모드 완료
                state.pomodoro.completed++;
                state.pomodoro.totalFocusTime += nowTimerFocusMinutes;
                saveState();
                updateNowPomoStats();

                showToast(`🍅 포모도로 ${nowPomodoroSession}/${MAX_SESSIONS} 완료! 휴식하세요`, 'success');

                // 4세션마다 긴 휴식
                if (nowPomodoroSession >= MAX_SESSIONS) {
                    nowTimerMode = 'break';
                    nowTimerSeconds = nowTimerLongBreakMinutes * 60;
                    nowPomodoroSession = 1;
                    showToast('🎉 4세션 완료! 긴 휴식 시간이에요', 'success');
                } else {
                    nowTimerMode = 'break';
                    nowTimerSeconds = nowTimerBreakMinutes * 60;
                    nowPomodoroSession++;
                }

                updateNowTimerModeDisplay();
                // 휴식 모드 자동 시작
                setTimeout(() => startNowTimer(), 1000);
            } else {
                // 휴식 모드 완료
                nowTimerMode = 'focus';
                nowTimerSeconds = nowTimerFocusMinutes * 60;
                updateNowTimerModeDisplay();
                showToast('☀️ 휴식 끝! 다시 집중할 시간이에요', 'info');
            }

            updateNowTimerDisplay();
            return;
        }

        updateNowTimerDisplay();
    }, 1000);
}

function pauseNowTimer() {
    clearInterval(nowTimerInterval);
    nowTimerRunning = false;

    const playBtn = document.getElementById('now-timer-play');
    const iconEl = document.getElementById('now-timer-icon');

    if (playBtn) playBtn.classList.remove('playing');
    if (iconEl) iconEl.innerHTML = '&#9658;';
}

function resetNowTimer() {
    pauseNowTimer();
    nowTimerMode = 'focus';
    nowTimerSeconds = nowTimerFocusMinutes * 60;
    updateNowTimerDisplay();
    updateNowTimerModeDisplay();
}

function updateNowTimerDisplay() {
    const displayEl = document.getElementById('now-timer-display');
    const progressEl = document.getElementById('now-timer-progress');

    if (displayEl) {
        const mins = Math.floor(nowTimerSeconds / 60);
        const secs = nowTimerSeconds % 60;
        displayEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    if (progressEl) {
        const totalSeconds = nowTimerMode === 'focus'
            ? nowTimerFocusMinutes * 60
            : (nowPomodoroSession === 1 && nowTimerMode === 'break' ? nowTimerLongBreakMinutes * 60 : nowTimerBreakMinutes * 60);
        const circumference = 2 * Math.PI * 54;
        const progress = (totalSeconds - nowTimerSeconds) / totalSeconds;
        progressEl.style.strokeDashoffset = circumference * (1 - progress);
    }
}

function updateNowTimerModeDisplay() {
    const modeEl = document.getElementById('now-timer-mode');
    const sessionEl = document.getElementById('now-timer-session');
    const progressEl = document.getElementById('now-timer-progress');

    if (modeEl) {
        modeEl.textContent = nowTimerMode === 'focus' ? '집중 모드' : '휴식 모드';
        modeEl.classList.toggle('break', nowTimerMode === 'break');
    }

    if (sessionEl) {
        sessionEl.textContent = `세션 ${nowPomodoroSession}/${MAX_SESSIONS}`;
    }

    if (progressEl) {
        progressEl.style.stroke = nowTimerMode === 'focus' ? 'var(--primary)' : 'var(--success)';
    }
}

function setTimerPreset(minutes) {
    pauseNowTimer();
    nowTimerFocusMinutes = minutes;
    nowTimerMode = 'focus';
    nowTimerSeconds = minutes * 60;

    // 집중 시간에 따른 휴식 시간 자동 설정
    // 15분 → 3분, 25분 → 5분, 50분 → 10분
    if (minutes <= 15) {
        nowTimerBreakMinutes = 3;
        nowTimerLongBreakMinutes = 6;
    } else if (minutes <= 25) {
        nowTimerBreakMinutes = 5;
        nowTimerLongBreakMinutes = 10;
    } else {
        nowTimerBreakMinutes = 10;
        nowTimerLongBreakMinutes = 20;
    }

    // 버튼 활성화 상태 업데이트
    document.querySelectorAll('.preset-chip').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.textContent) === minutes);
    });

    updateNowTimerDisplay();
    updateNowTimerModeDisplay();
}

function updateNowPomoStats() {
    const countEl = document.getElementById('now-pomo-count');
    const totalEl = document.getElementById('now-focus-total');

    if (countEl) {
        countEl.textContent = state.pomodoro?.completed || 0;
    }

    if (totalEl) {
        totalEl.textContent = state.pomodoro?.totalFocusTime || 0;
    }
}

// 작업 관련 액션
function completeCurrentTask() {
    const taskId = state.now?.currentTaskId;
    if (!taskId) return;

    // 목표 완료 처리
    const dailyGoals = state.goals?.daily || [];
    const goalIndex = dailyGoals.findIndex(g => g.id === taskId);

    if (goalIndex !== -1) {
        state.goals.daily[goalIndex].completed = true;
        state.goals.daily[goalIndex].completedAt = new Date().toISOString();

        // 통계 업데이트
        state.completedToday++;
        state.totalCompleted++;

        // 포인트/XP 지급
        const points = 10;
        const xp = 15;
        state.points += points;
        state.xp += xp;

        saveState();

        showCelebration(xp);
        showToast(`완료! +${points} 포인트 +${xp} XP`, 'success');

        // 타이머 리셋
        resetNowTimer();

        // UI 업데이트
        renderNowMode();
        updateProgress();
        renderMindmap();
    }
}

function skipCurrentTask() {
    const taskId = state.now?.currentTaskId;
    if (!taskId) return;

    if (!state.now.skippedTasks) state.now.skippedTasks = [];
    state.now.skippedTasks.push(taskId);
    saveState();

    showToast('나중에 할게요!', 'info');
    renderNowMode();
}

function selectTask(taskId) {
    // 건너뛴 목록에서 제거
    if (state.now?.skippedTasks) {
        state.now.skippedTasks = state.now.skippedTasks.filter(id => id !== taskId);
    }

    // 현재 작업으로 설정 (우선순위 최상위로)
    const dailyGoals = state.goals?.daily || [];
    const taskIndex = dailyGoals.findIndex(g => g.id === taskId);

    if (taskIndex !== -1) {
        // 임시로 우선순위를 높여서 맨 앞으로
        state.goals.daily[taskIndex]._selectedAt = Date.now();
        state.now.currentTaskId = taskId;
        saveState();

        renderNowMode();
        // 선택된 작업 렌더링
        renderCurrentTask(dailyGoals[taskIndex]);
    }
}

// 휴식 모드
function takeBreak() {
    pauseNowTimer();

    // 휴식 모드 오버레이 생성
    const overlay = document.createElement('div');
    overlay.className = 'break-mode-overlay';
    overlay.id = 'break-overlay';
    overlay.innerHTML = `
        <div class="break-mode-content">
            <h2>&#9749; 휴식 시간</h2>
            <p>잠시 쉬면서 재충전해요</p>
            <div class="break-timer" id="break-timer">05:00</div>
            <div class="break-tips">
                <div class="break-tip">
                    <span class="break-tip-icon">&#128167;</span>
                    <span class="break-tip-text">물 한 잔</span>
                </div>
                <div class="break-tip">
                    <span class="break-tip-icon">&#129336;</span>
                    <span class="break-tip-text">스트레칭</span>
                </div>
                <div class="break-tip">
                    <span class="break-tip-icon">&#128065;</span>
                    <span class="break-tip-text">눈 휴식</span>
                </div>
            </div>
            <button class="break-end-btn" onclick="endBreak()">다시 시작하기</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // 휴식 타이머 시작 (5분)
    let breakSeconds = 5 * 60;
    const breakTimerEl = document.getElementById('break-timer');

    const breakInterval = setInterval(() => {
        breakSeconds--;

        if (breakSeconds <= 0) {
            clearInterval(breakInterval);
            endBreak();
            showToast('휴식 끝! 다시 집중해볼까요? 💪', 'info');
            return;
        }

        const mins = Math.floor(breakSeconds / 60);
        const secs = breakSeconds % 60;
        if (breakTimerEl) {
            breakTimerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
    }, 1000);

    overlay._breakInterval = breakInterval;
}

function endBreak() {
    const overlay = document.getElementById('break-overlay');
    if (overlay) {
        if (overlay._breakInterval) {
            clearInterval(overlay._breakInterval);
        }
        overlay.remove();
    }
}

// Brain Dump 관련
function toggleBrainDump() {
    const content = document.getElementById('brain-dump-content');
    const toggle = document.getElementById('brain-dump-toggle');

    if (content && toggle) {
        const isOpen = content.style.display !== 'none';
        content.style.display = isOpen ? 'none' : 'block';
        toggle.classList.toggle('open', !isOpen);
    }
}

function addBrainDump() {
    const input = document.getElementById('brain-dump-input');
    if (!input || !input.value.trim()) return;

    if (!state.now) state.now = {};
    if (!state.now.brainDumps) state.now.brainDumps = [];

    state.now.brainDumps.push({
        id: Date.now(),
        text: input.value.trim(),
        createdAt: new Date().toISOString()
    });

    saveState();
    input.value = '';
    renderBrainDumps();

    showToast('생각을 파킹했어요! 나중에 정리하세요', 'info');
}

function renderBrainDumps() {
    const listEl = document.getElementById('brain-dump-list');
    if (!listEl) return;

    const dumps = state.now?.brainDumps || [];

    if (dumps.length === 0) {
        listEl.innerHTML = '';
        return;
    }

    listEl.innerHTML = dumps.map(dump => `
        <div class="brain-dump-item">
            <span class="dump-icon">&#128161;</span>
            <span class="dump-text">${dump.text}</span>
            <div class="dump-actions">
                <button class="dump-btn to-task" onclick="dumpToTask(${dump.id})" title="할 일로 변환">&#10132;</button>
                <button class="dump-btn delete" onclick="deleteDump(${dump.id})" title="삭제">&#10005;</button>
            </div>
        </div>
    `).join('');
}

function dumpToTask(dumpId) {
    const dumps = state.now?.brainDumps || [];
    const dump = dumps.find(d => d.id === dumpId);

    if (!dump) return;

    // 오늘의 일일 목표로 추가
    const today = new Date();
    const todayDay = today.getDay();

    if (!state.goals.daily) state.goals.daily = [];

    state.goals.daily.push({
        id: Date.now(),
        title: dump.text,
        day: todayDay,
        priority: 'todo',
        createdAt: new Date().toISOString()
    });

    // Brain Dump에서 제거
    deleteDump(dumpId);

    showToast('오늘의 할 일에 추가했어요!', 'success');
    renderNowMode();
    renderMindmap();
}

function deleteDump(dumpId) {
    if (!state.now?.brainDumps) return;

    state.now.brainDumps = state.now.brainDumps.filter(d => d.id !== dumpId);
    saveState();
    renderBrainDumps();
}

// 대기열 토글
function toggleQueueView() {
    const preview = document.getElementById('now-queue-preview');
    const full = document.getElementById('now-queue-full');
    const toggleText = document.getElementById('queue-toggle-text');

    if (!preview || !full) return;

    const isExpanded = full.style.display !== 'none';

    if (isExpanded) {
        preview.style.display = 'flex';
        full.style.display = 'none';
        if (toggleText) toggleText.textContent = '전체 보기';
    } else {
        preview.style.display = 'none';
        full.style.display = 'flex';
        if (toggleText) toggleText.textContent = '접기';

        // 전체 목록 렌더링
        const tasks = getTodayTasks().filter(t => !t.completed);
        renderFullQueue(tasks);
    }
}

function renderFullQueue(tasks) {
    const fullEl = document.getElementById('now-queue-full');
    if (!fullEl) return;

    if (tasks.length === 0) {
        fullEl.innerHTML = '<p style="color: var(--text-muted); text-align: center;">할 일이 없습니다</p>';
        return;
    }

    fullEl.innerHTML = tasks.map(task => {
        const priorityClass = task.priority === 'important' ? 'high' :
                             task.priority === 'todo' ? 'medium' :
                             task.priority === 'nice' ? 'low' : task.priority;
        const timeStr = task.hour !== undefined
            ? `${String(task.hour).padStart(2, '0')}:${String(task.minute || 0).padStart(2, '0')}`
            : '';

        return `
            <div class="now-queue-item" onclick="selectTask(${task.id})">
                <span class="queue-item-priority ${priorityClass || 'medium'}"></span>
                <div class="queue-item-content">
                    <div class="queue-item-title">${task.title}</div>
                    ${timeStr ? `<div class="queue-item-time">${timeStr}</div>` : ''}
                </div>
                <button class="queue-item-action" onclick="event.stopPropagation(); selectTask(${task.id})">지금 하기</button>
            </div>
        `;
    }).join('');
}

// 완료된 목록 토글
function toggleNowCompleted() {
    const list = document.getElementById('now-completed-list');
    const toggle = document.getElementById('now-completed-toggle');

    if (list && toggle) {
        const isOpen = list.style.display !== 'none';
        list.style.display = isOpen ? 'none' : 'block';
        toggle.classList.toggle('open', !isOpen);
    }
}

// NOW 모드는 기존 switchView에서 처리됨 (아래 코드 참조)

// ============================================
// 인사이트 분석 시스템
// ============================================

function analyzeInsights() {
    const logs = state.dayEndLogs || [];
    const routines = state.tracker?.routine || [];
    const environments = state.tracker?.environment || [];
    const medications = state.tracker?.medication || [];

    // 최소 7일 데이터 필요
    if (logs.length < 7) {
        updateInsightsSummary(logs.length);
        return;
    }

    // 날짜별 데이터 통합
    const dailyData = buildDailyData(logs, routines, environments, medications);

    // 각 요인별 분석
    analyzeSleepInsight(dailyData);
    analyzeExerciseInsight(dailyData);
    analyzeEnergyInsight(dailyData);
    analyzeMoodInsight(dailyData);
    analyzeEnvironmentInsight(dailyData);
    analyzeMedicationInsight(dailyData);

    // 상관관계 차트 렌더링
    renderCorrelationChart(dailyData);

    // 오늘의 추천 생성
    generateTodayRecommendation(dailyData);

    // 요약 업데이트
    updateInsightsSummaryWithData(dailyData);
}

function buildDailyData(logs, routines, environments, medications) {
    const dataMap = {};

    // 하루 마무리 로그 기반 (핵심 데이터)
    logs.forEach(log => {
        dataMap[log.date] = {
            date: log.date,
            completed: log.completed || log.completedCount || 0,
            energy: log.energy || 5,
            moods: log.moods || [],
            sleepQuality: log.sleepQuality || 0,
            sleepHours: log.sleepHours || 0,
            exercise: log.exercise || '',
            medication: log.medication || '',
            diary: log.diary || ''
        };
    });

    // 기존 트래커 데이터도 병합 (하루 마무리 데이터가 없는 경우 보완)
    routines.forEach(r => {
        if (dataMap[r.date]) {
            if (!dataMap[r.date].sleepHours && r.sleep) {
                const hours = calculateSleepHoursFromRoutine(r.sleep);
                if (hours) dataMap[r.date].sleepHours = hours;
            }
            if (!dataMap[r.date].exercise && r.exercise) {
                if (r.exercise.cardio || r.exercise.strength || r.exercise.stretch) {
                    dataMap[r.date].exercise = 'moderate';
                }
            }
        }
    });

    medications.forEach(m => {
        if (dataMap[m.date] && !dataMap[m.date].medication && m.takenTime) {
            dataMap[m.date].medication = 'yes';
        }
    });

    return Object.values(dataMap);
}

function calculateSleepHoursFromRoutine(sleep) {
    if (!sleep || !sleep.bedTime || !sleep.wakeTime) return null;

    const bedParts = sleep.bedTime.split(':');
    const wakeParts = sleep.wakeTime.split(':');

    let bedHour = parseInt(bedParts[0]);
    let bedMin = parseInt(bedParts[1]);
    let wakeHour = parseInt(wakeParts[0]);
    let wakeMin = parseInt(wakeParts[1]);

    if (bedHour > 12) bedHour -= 24;

    const bedTotal = bedHour * 60 + bedMin;
    const wakeTotal = wakeHour * 60 + wakeMin;

    let diff = wakeTotal - bedTotal;
    if (diff < 0) diff += 24 * 60;

    return Math.round(diff / 60);
}

function calculateSleepHours(sleep) {
    if (!sleep || !sleep.bedTime || !sleep.wakeTime) return null;

    const bedParts = sleep.bedTime.split(':');
    const wakeParts = sleep.wakeTime.split(':');

    let bedHour = parseInt(bedParts[0]);
    let bedMin = parseInt(bedParts[1]);
    let wakeHour = parseInt(wakeParts[0]);
    let wakeMin = parseInt(wakeParts[1]);

    // 자정 넘긴 경우 처리
    if (bedHour > 12) bedHour -= 24;

    const bedTotal = bedHour * 60 + bedMin;
    const wakeTotal = wakeHour * 60 + wakeMin;

    let diff = wakeTotal - bedTotal;
    if (diff < 0) diff += 24 * 60;

    return diff / 60;
}

function analyzeSleepInsight(dailyData) {
    const withSleep = dailyData.filter(d => d.sleepHours > 0);

    if (withSleep.length < 3) {
        document.getElementById('insight-sleep-value').textContent = '데이터 부족';
        return;
    }

    // 수면시간별 평균 완료 수
    const short = withSleep.filter(d => d.sleepHours <= 5);
    const medium = withSleep.filter(d => d.sleepHours === 6 || d.sleepHours === 7);
    const long = withSleep.filter(d => d.sleepHours >= 8);

    const avgShort = short.length > 0 ? short.reduce((a, d) => a + d.completed, 0) / short.length : 0;
    const avgMedium = medium.length > 0 ? medium.reduce((a, d) => a + d.completed, 0) / medium.length : 0;
    const avgLong = long.length > 0 ? long.reduce((a, d) => a + d.completed, 0) / long.length : 0;

    const best = Math.max(avgShort, avgMedium, avgLong);
    let bestRange = '';
    let improvement = 0;
    const overall = withSleep.reduce((a, d) => a + d.completed, 0) / withSleep.length;

    if (best === avgLong && long.length > 0) {
        bestRange = '8시간 이상';
        improvement = overall > 0 ? Math.round(((avgLong - overall) / overall) * 100) : 0;
    } else if (best === avgMedium && medium.length > 0) {
        bestRange = '7-8시간';
        improvement = overall > 0 ? Math.round(((avgMedium - overall) / overall) * 100) : 0;
    } else {
        bestRange = '6시간 이하';
        improvement = overall > 0 ? Math.round(((avgShort - overall) / overall) * 100) : 0;
    }

    const valueEl = document.getElementById('insight-sleep-value');
    const detailEl = document.getElementById('insight-sleep-detail');
    const cardEl = document.getElementById('insight-sleep');

    valueEl.textContent = `${bestRange} 최적`;
    detailEl.textContent = improvement > 0 ? `평균 대비 +${improvement}% 달성` : `평균 ${Math.round(best)}개 완료`;
    cardEl.classList.remove('positive', 'negative', 'neutral');
    cardEl.classList.add(improvement > 10 ? 'positive' : 'neutral');
}

function analyzeExerciseInsight(dailyData) {
    const withExercise = dailyData.filter(d => d.exercise);

    if (withExercise.length < 3) {
        document.getElementById('insight-exercise-value').textContent = '데이터 부족';
        return;
    }

    const exercised = withExercise.filter(d =>
        d.exercise === 'light' || d.exercise === 'moderate' || d.exercise === 'hard'
    );
    const notExercised = withExercise.filter(d => d.exercise === 'none');

    const avgExercised = exercised.length > 0 ? exercised.reduce((a, d) => a + d.completed, 0) / exercised.length : 0;
    const avgNot = notExercised.length > 0 ? notExercised.reduce((a, d) => a + d.completed, 0) / notExercised.length : 0;

    const diff = avgExercised - avgNot;
    const diffPercent = avgNot > 0 ? Math.round((diff / avgNot) * 100) : 0;

    const valueEl = document.getElementById('insight-exercise-value');
    const detailEl = document.getElementById('insight-exercise-detail');
    const cardEl = document.getElementById('insight-exercise');

    if (diff > 0) {
        valueEl.textContent = `운동 시 +${diffPercent}%`;
        detailEl.textContent = `운동한 날 평균 ${Math.round(avgExercised)}개 완료`;
        cardEl.classList.add('positive');
    } else if (diff < 0) {
        valueEl.textContent = '휴식이 효과적';
        detailEl.textContent = `휴식일 평균 ${Math.round(avgNot)}개 완료`;
        cardEl.classList.add('neutral');
    } else {
        valueEl.textContent = '차이 없음';
        detailEl.textContent = '운동 여부와 무관';
        cardEl.classList.add('neutral');
    }
}

function analyzeEnergyInsight(dailyData) {
    const withEnergy = dailyData.filter(d => d.energy);

    if (withEnergy.length < 5) {
        document.getElementById('insight-energy-value').textContent = '데이터 부족';
        return;
    }

    // 에너지 레벨별 평균
    const lowEnergy = withEnergy.filter(d => d.energy <= 3);
    const midEnergy = withEnergy.filter(d => d.energy > 3 && d.energy <= 7);
    const highEnergy = withEnergy.filter(d => d.energy > 7);

    const avgLow = lowEnergy.length > 0 ? lowEnergy.reduce((a, d) => a + d.completed, 0) / lowEnergy.length : 0;
    const avgMid = midEnergy.length > 0 ? midEnergy.reduce((a, d) => a + d.completed, 0) / midEnergy.length : 0;
    const avgHigh = highEnergy.length > 0 ? highEnergy.reduce((a, d) => a + d.completed, 0) / highEnergy.length : 0;

    const valueEl = document.getElementById('insight-energy-value');
    const detailEl = document.getElementById('insight-energy-detail');
    const cardEl = document.getElementById('insight-energy');

    if (avgHigh > avgMid && avgHigh > avgLow && highEnergy.length >= 2) {
        const improvement = avgLow > 0 ? Math.round(((avgHigh - avgLow) / avgLow) * 100) : 0;
        valueEl.textContent = `고에너지 시 최고`;
        detailEl.textContent = `에너지 8+ 일 때 평균 ${Math.round(avgHigh)}개`;
        cardEl.classList.add('positive');
    } else if (avgMid >= avgHigh && avgMid > avgLow) {
        valueEl.textContent = '적정 에너지가 좋아요';
        detailEl.textContent = `에너지 4-7일 때 평균 ${Math.round(avgMid)}개`;
        cardEl.classList.add('neutral');
    } else {
        valueEl.textContent = '에너지 관리 필요';
        detailEl.textContent = '충분한 휴식을 취해보세요';
        cardEl.classList.add('negative');
    }
}

function analyzeMoodInsight(dailyData) {
    const withMoods = dailyData.filter(d => d.moods && d.moods.length > 0);

    if (withMoods.length < 5) {
        document.getElementById('insight-mood-value').textContent = '데이터 부족';
        return;
    }

    // 긍정/부정 기분 분류
    const positiveMoods = ['행복', '평온', '설렘', '감사', '희망', '자신감', '기대'];
    const negativeMoods = ['불안', '우울', '짜증', '스트레스', '피곤', '무기력', '슬픔'];

    const moodStats = {};

    withMoods.forEach(d => {
        d.moods.forEach(mood => {
            if (!moodStats[mood]) {
                moodStats[mood] = { total: 0, count: 0 };
            }
            moodStats[mood].total += d.completed;
            moodStats[mood].count++;
        });
    });

    // 가장 생산적인 기분 찾기
    let bestMood = null;
    let bestAvg = 0;

    Object.entries(moodStats).forEach(([mood, stats]) => {
        if (stats.count >= 2) {
            const avg = stats.total / stats.count;
            if (avg > bestAvg) {
                bestAvg = avg;
                bestMood = mood;
            }
        }
    });

    const valueEl = document.getElementById('insight-mood-value');
    const detailEl = document.getElementById('insight-mood-detail');
    const cardEl = document.getElementById('insight-mood');

    if (bestMood) {
        valueEl.textContent = `'${bestMood}' 일 때 최고`;
        detailEl.textContent = `평균 ${Math.round(bestAvg)}개 완료`;
        cardEl.classList.add(positiveMoods.includes(bestMood) ? 'positive' : 'neutral');
    } else {
        valueEl.textContent = '분석 중';
        detailEl.textContent = '더 많은 데이터가 필요해요';
    }
}

function analyzeEnvironmentInsight(dailyData) {
    const withEnv = dailyData.filter(d => d.environment && Object.keys(d.environment).length > 0);

    if (withEnv.length < 3) {
        document.getElementById('insight-environment-value').textContent = '데이터 부족';
        return;
    }

    // 환경 체크리스트 완료 개수별
    const envScores = withEnv.map(d => {
        const env = d.environment;
        let score = 0;
        if (env.desk) score++;
        if (env.phone) score++;
        if (env.notify) score++;
        if (env.clutter) score++;
        return { score, completed: d.completed };
    });

    const goodEnv = envScores.filter(e => e.score >= 3);
    const badEnv = envScores.filter(e => e.score < 2);

    const avgGood = goodEnv.length > 0 ? goodEnv.reduce((a, e) => a + e.completed, 0) / goodEnv.length : 0;
    const avgBad = badEnv.length > 0 ? badEnv.reduce((a, e) => a + e.completed, 0) / badEnv.length : 0;

    const valueEl = document.getElementById('insight-environment-value');
    const detailEl = document.getElementById('insight-environment-detail');
    const cardEl = document.getElementById('insight-environment');

    if (goodEnv.length >= 2 && avgGood > avgBad) {
        const improvement = avgBad > 0 ? Math.round(((avgGood - avgBad) / avgBad) * 100) : 0;
        valueEl.textContent = `환경정리 시 +${improvement}%`;
        detailEl.textContent = `정리된 환경에서 ${Math.round(avgGood)}개 완료`;
        cardEl.classList.add('positive');
    } else {
        valueEl.textContent = '환경 영향 적음';
        detailEl.textContent = '환경보다 다른 요인이 중요해요';
        cardEl.classList.add('neutral');
    }
}

function analyzeMedicationInsight(dailyData) {
    const withMed = dailyData.filter(d => d.medication);

    if (withMed.length < 5) {
        document.getElementById('insight-medication-value').textContent = '데이터 부족';
        return;
    }

    const taken = withMed.filter(d => d.medication === 'yes');
    const notTaken = withMed.filter(d => d.medication === 'no');

    if (taken.length < 2 || notTaken.length < 2) {
        document.getElementById('insight-medication-value').textContent = '비교 데이터 부족';
        return;
    }

    const avgTaken = taken.reduce((a, d) => a + d.completed, 0) / taken.length;
    const avgNot = notTaken.reduce((a, d) => a + d.completed, 0) / notTaken.length;

    const diff = avgTaken - avgNot;

    const valueEl = document.getElementById('insight-medication-value');
    const detailEl = document.getElementById('insight-medication-detail');
    const cardEl = document.getElementById('insight-medication');

    cardEl.classList.remove('positive', 'negative', 'neutral');

    if (diff > 1) {
        const improvement = avgNot > 0 ? Math.round((diff / avgNot) * 100) : 0;
        valueEl.textContent = `복용 시 +${improvement}%`;
        detailEl.textContent = `복용일 평균 ${Math.round(avgTaken)}개 완료`;
        cardEl.classList.add('positive');
    } else if (diff < -1) {
        valueEl.textContent = '비복용일이 나아요';
        detailEl.textContent = '의사와 상담해보세요';
        cardEl.classList.add('neutral');
    } else {
        valueEl.textContent = '차이 미미';
        detailEl.textContent = '복용 여부 영향 적음';
        cardEl.classList.add('neutral');
    }
}

function renderCorrelationChart(dailyData) {
    const container = document.getElementById('correlation-bars');
    if (!container) return;

    const overall = dailyData.reduce((a, d) => a + d.completed, 0) / dailyData.length;

    const factors = [
        { name: '수면 7h+', getData: () => dailyData.filter(d => d.sleepHours >= 7) },
        { name: '운동', getData: () => dailyData.filter(d => d.exercise && d.exercise !== 'none') },
        { name: '에너지 7+', getData: () => dailyData.filter(d => d.energy >= 7) },
        { name: '수면질 좋음', getData: () => dailyData.filter(d => d.sleepQuality >= 4) },
        { name: '약 복용', getData: () => dailyData.filter(d => d.medication === 'yes') }
    ];

    const maxRate = 100;

    container.innerHTML = factors.map(factor => {
        const data = factor.getData();
        if (data.length < 2) {
            return `
                <div class="correlation-bar-item">
                    <span class="correlation-label">${factor.name}</span>
                    <div class="correlation-bar-container">
                        <div class="correlation-bar neutral" style="width: 0%"></div>
                    </div>
                    <span class="correlation-baseline">데이터 부족</span>
                </div>
            `;
        }

        const avg = data.reduce((a, d) => a + d.completed, 0) / data.length;
        const rate = Math.min(Math.round((avg / Math.max(overall, 1)) * 50) + 50, 100);
        const diff = Math.round(((avg - overall) / Math.max(overall, 1)) * 100);
        const diffText = diff > 0 ? `+${diff}%` : `${diff}%`;
        const barClass = diff > 10 ? 'high' : diff < -10 ? 'low' : 'medium';

        return `
            <div class="correlation-bar-item">
                <span class="correlation-label">${factor.name}</span>
                <div class="correlation-bar-container">
                    <div class="correlation-bar ${barClass}" style="width: ${rate}%">
                        <span class="correlation-value">${diffText}</span>
                    </div>
                </div>
                <span class="correlation-baseline">${Math.round(avg)}개</span>
            </div>
        `;
    }).join('');
}

function generateTodayRecommendation(dailyData) {
    const recEl = document.getElementById('today-recommendation-text');
    if (!recEl) return;

    const recommendations = [];

    // 수면 기반 추천
    const withSleep = dailyData.filter(d => d.sleep && calculateSleepHours(d.sleep));
    if (withSleep.length >= 3) {
        const longSleep = withSleep.filter(d => calculateSleepHours(d.sleep) >= 7);
        const shortSleep = withSleep.filter(d => calculateSleepHours(d.sleep) < 6);

        const avgLong = longSleep.length > 0 ? longSleep.reduce((a, d) => a + d.completed, 0) / longSleep.length : 0;
        const avgShort = shortSleep.length > 0 ? shortSleep.reduce((a, d) => a + d.completed, 0) / shortSleep.length : 0;

        if (avgLong > avgShort * 1.2) {
            recommendations.push('오늘 잠을 충분히 잤다면 어려운 과제에 도전해보세요');
        }
    }

    // 운동 기반 추천
    const withExercise = dailyData.filter(d => d.exercise);
    if (withExercise.length >= 3) {
        const exercised = withExercise.filter(d => d.exercise.cardio || d.exercise.strength);
        const avgEx = exercised.length > 0 ? exercised.reduce((a, d) => a + d.completed, 0) / exercised.length : 0;
        const avgAll = withExercise.reduce((a, d) => a + d.completed, 0) / withExercise.length;

        if (avgEx > avgAll * 1.15) {
            recommendations.push('가벼운 운동 후 집중력이 올라가는 패턴이 있어요');
        }
    }

    // 에너지 기반 추천
    const lowEnergyDays = dailyData.filter(d => d.energy <= 4);
    if (lowEnergyDays.length >= 2) {
        const lowEnergyAvg = lowEnergyDays.reduce((a, d) => a + d.completed, 0) / lowEnergyDays.length;
        recommendations.push(`에너지가 낮을 때는 작은 과제부터 시작하세요 (평균 ${Math.round(lowEnergyAvg)}개 완료)`);
    }

    if (recommendations.length > 0) {
        recEl.textContent = recommendations[Math.floor(Math.random() * recommendations.length)];
    } else {
        recEl.textContent = '꾸준히 기록하면 더 정확한 추천을 드릴 수 있어요';
    }
}

function updateInsightsSummary(dataCount) {
    const summaryEl = document.getElementById('insights-summary');
    if (!summaryEl) return;

    const remaining = 7 - dataCount;
    summaryEl.innerHTML = `
        <p class="insights-notice">
            ${remaining > 0
                ? `📊 ${remaining}일만 더 기록하면 패턴을 분석해드려요!`
                : '패턴 분석 준비 완료!'
            }
        </p>
        <p style="font-size: 0.8rem; margin-top: 8px; opacity: 0.8;">
            현재 ${dataCount}일 데이터 수집됨
        </p>
    `;
}

function updateInsightsSummaryWithData(dailyData) {
    const summaryEl = document.getElementById('insights-summary');
    if (!summaryEl) return;

    const totalCompleted = dailyData.reduce((a, d) => a + d.completed, 0);
    const avgCompleted = Math.round(totalCompleted / dailyData.length * 10) / 10;
    const bestDay = dailyData.reduce((best, d) => d.completed > best.completed ? d : best, dailyData[0]);

    summaryEl.innerHTML = `
        <p style="font-size: 1.2rem; font-weight: 600; margin-bottom: 8px;">
            📊 ${dailyData.length}일간의 패턴 분석
        </p>
        <p style="font-size: 0.9rem; opacity: 0.9;">
            일 평균 <strong>${avgCompleted}개</strong> 완료 ·
            최고 기록 <strong>${bestDay.completed}개</strong>
        </p>
    `;
}

// ============================================
// 하루 마무리 - 미완료/감정 연결 기능
// ============================================

// 미완료 목표 렌더링
function renderIncompleteTasks() {
    const sectionEl = document.getElementById('incomplete-tasks-section');
    const listEl = document.getElementById('incomplete-tasks-list');

    if (!sectionEl || !listEl) return;

    const todayDate = new Date().toISOString().split('T')[0];
    const todayDay = new Date().getDay(); // 0-6 요일

    // 오늘 생성된 미완료 할일만 찾기
    const incompleteTasks = state.tasks.filter(t =>
        !t.completed && t.createdAt && t.createdAt.startsWith(todayDate)
    );

    // 오늘 요일의 미완료 일일 목표만 찾기 (완료된 것은 제외)
    const incompleteGoals = (state.goals?.daily || []).filter(g => {
        if (g.day !== todayDay) return false;
        // 완료된 목표는 제외
        if (g.completed) return false;
        return true;
    });

    const allIncomplete = [
        ...incompleteTasks.map(t => ({ type: 'task', title: t.title })),
        ...incompleteGoals.map(g => ({ type: 'goal', title: g.title }))
    ].filter(item => item.title); // undefined 필터링

    if (allIncomplete.length === 0) {
        sectionEl.style.display = 'none';
        return;
    }

    // 모든 항목 표시
    listEl.innerHTML = allIncomplete.map((item, idx) =>
        `<div class="incomplete-item" data-idx="${idx}" onclick="openInlineReflection(${idx}, '${item.title.replace(/'/g, "\\'")}')">
            ${item.title}
        </div>`
    ).join('');

    sectionEl.style.display = 'block';

    // 인라인 회고 폼 숨기기
    const reflectionEl = document.getElementById('inline-reflection');
    if (reflectionEl) reflectionEl.style.display = 'none';
}

// 부정적 감정 체크 및 도움말 표시
function checkNegativeMoods() {
    const negativeMoods = ['anxious', 'angry', 'sad', 'exhausted', 'frustrated', 'lonely', 'stressed', 'overwhelmed'];
    const helpEl = document.getElementById('negative-mood-help');

    if (!helpEl) return;

    const hasNegative = selectedMoods.some(mood => negativeMoods.includes(mood));

    if (hasNegative) {
        helpEl.style.display = 'block';
    } else {
        helpEl.style.display = 'none';
    }
}

// 인라인 미루기 회고 열기
let currentReflectionTarget = null;

function openInlineReflection(idx, title) {
    const reflectionEl = document.getElementById('inline-reflection');
    const targetTextEl = document.getElementById('reflection-target-text');

    if (!reflectionEl || !targetTextEl) return;

    // 선택 상태 업데이트
    document.querySelectorAll('.incomplete-item').forEach(item => {
        item.classList.remove('selected');
    });
    const selectedItem = document.querySelector(`.incomplete-item[data-idx="${idx}"]`);
    if (selectedItem) selectedItem.classList.add('selected');

    currentReflectionTarget = title;
    targetTextEl.textContent = `"${title}"`;

    reflectionEl.style.display = 'block';
}

function cancelInlineReflection() {
    const reflectionEl = document.getElementById('inline-reflection');
    if (reflectionEl) reflectionEl.style.display = 'none';

    document.querySelectorAll('.incomplete-item').forEach(item => {
        item.classList.remove('selected');
    });

    currentReflectionTarget = null;
}

// ============================================
// 미루기 대처 인지치료 모달
// ============================================

let procrastinationStep = 1;
let procrastinationData = {
    acceptance: null,
    confidence: null
};

// 미루기 대처 통계 업데이트
function updateProcrastinationStats() {
    const records = state.procrastinationReflections || [];

    // 총 기록 수
    const totalEl = document.getElementById('proc-stat-total');
    if (totalEl) totalEl.textContent = records.length;

    // 이번 주 기록 수
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekRecords = records.filter(r => new Date(r.date) >= weekStart);
    const weekEl = document.getElementById('proc-stat-week');
    if (weekEl) weekEl.textContent = weekRecords.length;

    // 연속일 계산
    let streak = 0;
    const today = new Date().toDateString();
    const dates = [...new Set(records.map(r => new Date(r.date).toDateString()))].sort((a, b) => new Date(b) - new Date(a));

    for (let i = 0; i < dates.length; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - i);
        if (dates.includes(checkDate.toDateString())) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }
    const streakEl = document.getElementById('proc-stat-streak');
    if (streakEl) streakEl.textContent = streak;

    // 수용률 (YES 비율)
    const acceptanceRecords = records.filter(r => r.acceptance);
    const yesCount = acceptanceRecords.filter(r => r.acceptance === 'yes').length;
    const acceptanceRate = acceptanceRecords.length > 0 ? Math.round((yesCount / acceptanceRecords.length) * 100) : 0;
    const acceptanceEl = document.getElementById('proc-stat-acceptance');
    if (acceptanceEl) acceptanceEl.textContent = acceptanceRecords.length > 0 ? `${acceptanceRate}%` : '-';

    // 평균 불편함 점수
    const discomfortRecords = records.filter(r => r.discomfort !== undefined);
    const avgDiscomfort = discomfortRecords.length > 0
        ? Math.round(discomfortRecords.reduce((sum, r) => sum + r.discomfort, 0) / discomfortRecords.length)
        : 0;
    const discomfortEl = document.getElementById('proc-stat-discomfort');
    if (discomfortEl) discomfortEl.textContent = discomfortRecords.length > 0 ? `${avgDiscomfort}점` : '- 점';

    // 실행 자신감 분포
    const confidenceRecords = records.filter(r => r.confidence);
    const confidentCount = confidenceRecords.filter(r => r.confidence === 'yes' || r.confidence === 'maybe').length;
    const confidenceRate = confidenceRecords.length > 0 ? Math.round((confidentCount / confidenceRecords.length) * 100) : 0;
    const confidenceEl = document.getElementById('proc-stat-confidence');
    if (confidenceEl) confidenceEl.textContent = confidenceRecords.length > 0 ? `${confidenceRate}%` : '-';
}

function updateEmotionTherapyStats() {
    const sessions = state.emotionTherapySessions || [];

    // 총 기록 수
    const totalEl = document.getElementById('emo-stat-total');
    if (totalEl) totalEl.textContent = sessions.length;

    // 이번 주 기록 수
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekSessions = sessions.filter(s => new Date(s.date) >= weekStart);
    const weekEl = document.getElementById('emo-stat-week');
    if (weekEl) weekEl.textContent = weekSessions.length;

    // 연속일 계산
    let streak = 0;
    const dates = [...new Set(sessions.map(s => new Date(s.date).toDateString()))].sort((a, b) => new Date(b) - new Date(a));

    for (let i = 0; i < dates.length; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - i);
        if (dates.includes(checkDate.toDateString())) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }
    const streakEl = document.getElementById('emo-stat-streak');
    if (streakEl) streakEl.textContent = streak;

    // 감정 수용률 (tolerance 'yes' 비율)
    const toleranceSessions = sessions.filter(s => s.tolerance);
    const toleranceYes = toleranceSessions.filter(s => s.tolerance === 'yes').length;
    const toleranceRate = toleranceSessions.length > 0 ? Math.round((toleranceYes / toleranceSessions.length) * 100) : 0;
    const toleranceEl = document.getElementById('emo-stat-tolerance');
    if (toleranceEl) toleranceEl.textContent = toleranceSessions.length > 0 ? `${toleranceRate}%` : '-';

    // 가장 많이 느낀 감정 (Top emotion)
    const moodCounts = {};
    sessions.forEach(s => {
        if (s.moods && Array.isArray(s.moods)) {
            s.moods.forEach(mood => {
                moodCounts[mood] = (moodCounts[mood] || 0) + 1;
            });
        }
    });
    const topEmotion = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    const topEmotionEl = document.getElementById('emo-stat-top-emotion');
    if (topEmotionEl) topEmotionEl.textContent = topEmotion ? topEmotion[0] : '-';

    // 평균 불편함 점수
    const discomfortSessions = sessions.filter(s => s.discomfort !== undefined);
    const avgDiscomfort = discomfortSessions.length > 0
        ? Math.round(discomfortSessions.reduce((sum, s) => sum + s.discomfort, 0) / discomfortSessions.length)
        : 0;
    const discomfortEl = document.getElementById('emo-stat-discomfort');
    if (discomfortEl) discomfortEl.textContent = discomfortSessions.length > 0 ? `${avgDiscomfort}점` : '- 점';

    // 재구성 성공률 (rethink 'yes' 비율)
    const rethinkSessions = sessions.filter(s => s.rethink);
    const rethinkYes = rethinkSessions.filter(s => s.rethink === 'yes').length;
    const rethinkRate = rethinkSessions.length > 0 ? Math.round((rethinkYes / rethinkSessions.length) * 100) : 0;
    const rethinkEl = document.getElementById('emo-stat-rethink');
    if (rethinkEl) rethinkEl.textContent = rethinkSessions.length > 0 ? `${rethinkRate}%` : '-';
}

function openProcrastinationModal() {
    const modal = document.getElementById('procrastination-modal');
    const titleEl = document.getElementById('procrastination-task-title');

    if (!modal) return;

    // 과제명 설정
    if (titleEl && currentReflectionTarget) {
        titleEl.textContent = currentReflectionTarget;
    }

    // 초기화
    procrastinationStep = 1;
    procrastinationData = { acceptance: null, confidence: null };
    resetProcrastinationForm();
    updateProcrastinationUI();

    // 통계 업데이트
    updateProcrastinationStats();

    modal.style.display = 'flex';

    // 하루 마무리 모달 닫기
    const dayEndModal = document.getElementById('day-end-modal');
    if (dayEndModal) dayEndModal.style.display = 'none';
}

function closeProcrastinationModal() {
    const modal = document.getElementById('procrastination-modal');
    if (modal) modal.style.display = 'none';

    // 하루 마무리 모달 다시 열기
    const dayEndModal = document.getElementById('day-end-modal');
    if (dayEndModal) dayEndModal.style.display = 'flex';
}

function resetProcrastinationForm() {
    // Step 1
    const thought = document.getElementById('proc-thought');
    const discomfort = document.getElementById('proc-discomfort');
    const reframe = document.getElementById('proc-reframe');
    if (thought) thought.value = '';
    if (discomfort) discomfort.value = 50;
    if (reframe) reframe.value = '';
    updateDiscomfortDisplay(50);

    // 수용 버튼 초기화
    document.querySelectorAll('.proc-yesno-btn').forEach(btn => btn.classList.remove('selected'));

    // Step 2
    const goalPoint = document.getElementById('proc-goal-point');
    const midPoint = document.getElementById('proc-mid-point');
    const startPoint = document.getElementById('proc-start-point');
    const when = document.getElementById('proc-when');
    const where = document.getElementById('proc-where');
    const duration = document.getElementById('proc-duration');

    if (goalPoint) goalPoint.value = currentReflectionTarget || '';
    if (midPoint) midPoint.value = '';
    if (startPoint) startPoint.value = '';
    if (when) when.value = '';
    if (where) where.value = '';
    if (duration) duration.value = '';

    // 확신 버튼 초기화
    document.querySelectorAll('.confidence-btn').forEach(btn => btn.classList.remove('selected'));

    // Step 3
    const ifDistraction = document.getElementById('proc-if-distraction');
    const ifCustom = document.getElementById('proc-if-custom');
    const thenAction = document.getElementById('proc-then-action');
    const reward = document.getElementById('proc-reward');

    if (ifDistraction) ifDistraction.value = '';
    if (ifCustom) { ifCustom.value = ''; ifCustom.style.display = 'none'; }
    if (thenAction) thenAction.value = '';
    if (reward) reward.value = '';
}

function updateProcrastinationUI() {
    // 단계 표시 업데이트
    document.querySelectorAll('.proc-step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.toggle('active', stepNum === procrastinationStep);
        step.classList.toggle('completed', stepNum < procrastinationStep);
    });

    // 컨텐츠 표시
    for (let i = 1; i <= 4; i++) {
        const content = document.getElementById(`proc-step-${i}`);
        if (content) content.style.display = i === procrastinationStep ? 'block' : 'none';
    }

    // 버튼 표시
    const prevBtn = document.getElementById('proc-btn-prev');
    const nextBtn = document.getElementById('proc-btn-next');
    const finishBtn = document.getElementById('proc-btn-finish');

    if (prevBtn) prevBtn.style.visibility = procrastinationStep > 1 ? 'visible' : 'hidden';
    if (nextBtn) nextBtn.style.display = procrastinationStep < 4 ? 'inline-flex' : 'none';
    if (finishBtn) finishBtn.style.display = procrastinationStep === 4 ? 'inline-flex' : 'none';

    // Step 4에서 요약 업데이트
    if (procrastinationStep === 4) {
        updateProcSummary();
    }
}

// 각 단계별 validation
function validateProcStep(step) {
    if (step === 1) {
        const thought = document.getElementById('proc-thought')?.value.trim();
        const reframe = document.getElementById('proc-reframe')?.value.trim();

        if (!thought) {
            showToast('회피하게 만드는 생각을 적어주세요', 'warning');
            document.getElementById('proc-thought')?.focus();
            return false;
        }
        if (procrastinationData.acceptance === null) {
            showToast('감정을 참을 수 있는지 선택해주세요', 'warning');
            return false;
        }
        if (!reframe) {
            showToast('긍정적인 생각을 적어주세요', 'warning');
            document.getElementById('proc-reframe')?.focus();
            return false;
        }
        return true;
    }

    if (step === 2) {
        const goalPoint = document.getElementById('proc-goal-point')?.value.trim();
        const midPoint = document.getElementById('proc-mid-point')?.value.trim();
        const startPoint = document.getElementById('proc-start-point')?.value.trim();
        const when = document.getElementById('proc-when')?.value.trim();
        const where = document.getElementById('proc-where')?.value.trim();
        const duration = document.getElementById('proc-duration')?.value.trim();

        if (!goalPoint) {
            showToast('목표 지점을 적어주세요', 'warning');
            document.getElementById('proc-goal-point')?.focus();
            return false;
        }
        if (!midPoint) {
            showToast('중간 지점을 적어주세요', 'warning');
            document.getElementById('proc-mid-point')?.focus();
            return false;
        }
        if (!startPoint) {
            showToast('시작 지점을 적어주세요 (가장 작은 첫 단계)', 'warning');
            document.getElementById('proc-start-point')?.focus();
            return false;
        }
        if (!when) {
            showToast('언제 할 건지 적어주세요', 'warning');
            document.getElementById('proc-when')?.focus();
            return false;
        }
        if (!where) {
            showToast('어디서 할 건지 적어주세요', 'warning');
            document.getElementById('proc-where')?.focus();
            return false;
        }
        if (!duration) {
            showToast('얼마나 할 건지 적어주세요', 'warning');
            document.getElementById('proc-duration')?.focus();
            return false;
        }
        if (procrastinationData.confidence === null) {
            showToast('방해가 되지 않는 시간/장소인지 선택해주세요', 'warning');
            return false;
        }
        return true;
    }

    if (step === 3) {
        const ifDistraction = document.getElementById('proc-if-distraction')?.value;
        const ifCustom = document.getElementById('proc-if-custom')?.value.trim();
        const thenAction = document.getElementById('proc-then-action')?.value.trim();
        const reward = document.getElementById('proc-reward')?.value.trim();

        if (!ifDistraction) {
            showToast('방해 요소를 선택해주세요', 'warning');
            return false;
        }
        if (ifDistraction === 'other' && !ifCustom) {
            showToast('방해 요소를 직접 입력해주세요', 'warning');
            document.getElementById('proc-if-custom')?.focus();
            return false;
        }
        if (!thenAction) {
            showToast('대처 방법을 적어주세요', 'warning');
            document.getElementById('proc-then-action')?.focus();
            return false;
        }
        if (!reward) {
            showToast('보상을 적어주세요', 'warning');
            document.getElementById('proc-reward')?.focus();
            return false;
        }
        return true;
    }

    return true;
}

function nextProcStep() {
    // 현재 단계 validation
    if (!validateProcStep(procrastinationStep)) {
        return;
    }

    if (procrastinationStep < 4) {
        procrastinationStep++;
        updateProcrastinationUI();
        scrollProcModalToTop();
    }
}

function prevProcStep() {
    if (procrastinationStep > 1) {
        procrastinationStep--;
        updateProcrastinationUI();
        scrollProcModalToTop();
    }
}

function scrollProcModalToTop() {
    const modalContent = document.querySelector('.procrastination-content');
    if (modalContent) {
        modalContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updateDiscomfortDisplay(value) {
    const display = document.getElementById('proc-discomfort-value');
    if (display) display.textContent = value;
}

function selectAcceptance(value) {
    procrastinationData.acceptance = value;
    document.querySelectorAll('.proc-yesno-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.value === value);
    });
}

function selectConfidence(value) {
    procrastinationData.confidence = value;
    document.querySelectorAll('.confidence-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.value === value);
    });
}

function setProcExample(field, text) {
    if (field === 'thought') {
        const el = document.getElementById('proc-thought');
        if (el) el.value = text;
    } else if (field === 'reframe') {
        const el = document.getElementById('proc-reframe');
        if (el) el.value = text;
    } else if (field === 'then') {
        const el = document.getElementById('proc-then-action');
        if (el) el.value = text;
    } else if (field === 'reward') {
        const el = document.getElementById('proc-reward');
        if (el) el.value = text;
    }
}

function updateProcSummary() {
    // Step 1 데이터
    const thought = document.getElementById('proc-thought')?.value || '-';
    const reframe = document.getElementById('proc-reframe')?.value || '-';

    // Step 2 데이터
    const startPoint = document.getElementById('proc-start-point')?.value || '-';
    const when = document.getElementById('proc-when')?.value || '-';
    const where = document.getElementById('proc-where')?.value || '-';
    const duration = document.getElementById('proc-duration')?.value || '-';

    // Step 3 데이터
    const ifDistraction = document.getElementById('proc-if-distraction');
    const ifCustom = document.getElementById('proc-if-custom')?.value || '';
    const thenAction = document.getElementById('proc-then-action')?.value || '-';
    const reward = document.getElementById('proc-reward')?.value || '-';

    // 요약 업데이트
    const summaryThought = document.getElementById('summary-thought');
    const summaryReframe = document.getElementById('summary-reframe');
    const summaryStart = document.getElementById('summary-start');
    const summaryWhen = document.getElementById('summary-when');
    const summaryWhere = document.getElementById('summary-where');
    const summaryDuration = document.getElementById('summary-duration');
    const summaryIf = document.getElementById('summary-if');
    const summaryThen = document.getElementById('summary-then');
    const summaryReward = document.getElementById('summary-reward');

    if (summaryThought) summaryThought.textContent = thought;
    if (summaryReframe) summaryReframe.textContent = reframe;
    if (summaryStart) summaryStart.textContent = startPoint;
    if (summaryWhen) summaryWhen.textContent = when;
    if (summaryWhere) summaryWhere.textContent = where;
    if (summaryDuration) summaryDuration.textContent = duration;

    // if 텍스트 처리
    let ifText = '-';
    if (ifDistraction && ifDistraction.value) {
        if (ifDistraction.value === 'other') {
            ifText = ifCustom || '-';
        } else {
            ifText = ifDistraction.options[ifDistraction.selectedIndex]?.text || '-';
        }
    }
    if (summaryIf) summaryIf.textContent = ifText;
    if (summaryThen) summaryThen.textContent = thenAction;
    if (summaryReward) summaryReward.textContent = reward;
}

function saveProcrastinationReflection() {
    // 데이터 수집
    const data = {
        date: new Date().toISOString(),
        target: currentReflectionTarget,
        // Step 1
        thought: document.getElementById('proc-thought')?.value || '',
        discomfort: parseInt(document.getElementById('proc-discomfort')?.value || 50),
        acceptance: procrastinationData.acceptance,
        reframe: document.getElementById('proc-reframe')?.value || '',
        // Step 2
        goalPoint: document.getElementById('proc-goal-point')?.value || '',
        midPoint: document.getElementById('proc-mid-point')?.value || '',
        startPoint: document.getElementById('proc-start-point')?.value || '',
        when: document.getElementById('proc-when')?.value || '',
        where: document.getElementById('proc-where')?.value || '',
        duration: document.getElementById('proc-duration')?.value || '',
        confidence: procrastinationData.confidence,
        // Step 3
        ifDistraction: document.getElementById('proc-if-distraction')?.value || '',
        thenAction: document.getElementById('proc-then-action')?.value || '',
        reward: document.getElementById('proc-reward')?.value || ''
    };

    // 저장
    if (!state.procrastinationReflections) state.procrastinationReflections = [];
    state.procrastinationReflections.push(data);
    saveState();

    // 모달 닫기
    closeProcrastinationModal();
    cancelInlineReflection();

    showToast('미루기 대처 계획이 저장되었어요! 내일 다시 도전해봐요 💪', 'success');
}

// if-then 기타 선택 시 직접 입력 표시
document.addEventListener('change', function(e) {
    if (e.target.id === 'proc-if-distraction') {
        const customInput = document.getElementById('proc-if-custom');
        if (customInput) {
            customInput.style.display = e.target.value === 'other' ? 'block' : 'none';
        }
    }
});

// ============================================
// 감정 인지치료 모달
// ============================================

let emotionTherapyStep = 1;
let emotionTherapyData = {
    tolerance: null,
    rethink: null
};

function openEmotionTherapyModal() {
    const modal = document.getElementById('emotion-therapy-modal');
    if (!modal) return;

    // 초기화
    emotionTherapyStep = 1;
    emotionTherapyData = { tolerance: null, rethink: null };
    resetEmotionTherapyForm();
    updateEmotionTherapyUI();

    // 통계 업데이트
    updateEmotionTherapyStats();

    modal.style.display = 'flex';

    // 하루 마무리 모달 닫기
    const dayEndModal = document.getElementById('day-end-modal');
    if (dayEndModal) dayEndModal.style.display = 'none';
}

function closeEmotionTherapyModal() {
    const modal = document.getElementById('emotion-therapy-modal');
    if (modal) modal.style.display = 'none';

    // 하루 마무리 모달 다시 열기
    const dayEndModal = document.getElementById('day-end-modal');
    if (dayEndModal) dayEndModal.style.display = 'flex';
}

function resetEmotionTherapyForm() {
    // Step 1
    const situation = document.getElementById('emo-situation');
    const autoThought = document.getElementById('emo-auto-thought');
    const action = document.getElementById('emo-action');
    const resultGood = document.getElementById('emo-result-good');
    const resultBad = document.getElementById('emo-result-bad');
    const reactionOther = document.getElementById('emo-reaction-other');

    if (situation) situation.value = '';
    if (autoThought) autoThought.value = '';
    if (action) action.value = '';
    if (resultGood) resultGood.value = '';
    if (resultBad) resultBad.value = '';
    if (reactionOther) reactionOther.value = '';

    // 체크박스 초기화
    document.querySelectorAll('.emo-checkbox input').forEach(cb => cb.checked = false);

    // Step 2
    const discomfort = document.getElementById('emo-discomfort');
    if (discomfort) discomfort.value = 50;
    updateEmoDiscomfortDisplay(50);
    document.querySelectorAll('.emo-tolerance-btn').forEach(btn => btn.classList.remove('selected'));

    // Step 3
    const evidence = document.getElementById('emo-evidence');
    const alternative = document.getElementById('emo-alternative');
    const friendAdvice = document.getElementById('emo-friend-advice');
    if (evidence) evidence.value = '';
    if (alternative) alternative.value = '';
    if (friendAdvice) friendAdvice.value = '';
    document.querySelectorAll('.emo-rethink-btn').forEach(btn => btn.classList.remove('selected'));

    // Step 4
    const oldScript = document.getElementById('emo-old-script');
    const newScript = document.getElementById('emo-new-script');
    if (oldScript) oldScript.value = '';
    if (newScript) newScript.value = '';

    // Step 5
    const ifTrigger = document.getElementById('emo-if-trigger');
    const thenAction = document.getElementById('emo-then-action');
    const reward = document.getElementById('emo-reward');
    if (ifTrigger) ifTrigger.value = '';
    if (thenAction) thenAction.value = '';
    if (reward) reward.value = '';
}

function updateEmotionTherapyUI() {
    // 단계 표시 업데이트
    document.querySelectorAll('.emo-step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.toggle('active', stepNum === emotionTherapyStep);
        step.classList.toggle('completed', stepNum < emotionTherapyStep);
    });

    // 컨텐츠 표시
    for (let i = 1; i <= 6; i++) {
        const content = document.getElementById(`emo-step-${i}`);
        if (content) content.style.display = i === emotionTherapyStep ? 'block' : 'none';
    }

    // 버튼 표시
    const prevBtn = document.getElementById('emo-btn-prev');
    const nextBtn = document.getElementById('emo-btn-next');
    const finishBtn = document.getElementById('emo-btn-finish');

    if (prevBtn) prevBtn.style.visibility = emotionTherapyStep > 1 ? 'visible' : 'hidden';
    if (nextBtn) nextBtn.style.display = emotionTherapyStep < 6 ? 'inline-flex' : 'none';
    if (finishBtn) finishBtn.style.display = emotionTherapyStep === 6 ? 'inline-flex' : 'none';

    // Step 3에서 자동사고 표시
    if (emotionTherapyStep === 3) {
        const thoughtDisplay = document.getElementById('emo-thought-display');
        const autoThought = document.getElementById('emo-auto-thought')?.value || '-';
        if (thoughtDisplay) thoughtDisplay.textContent = autoThought;
    }

    // Step 6에서 요약 업데이트
    if (emotionTherapyStep === 6) {
        updateEmoSummary();
    }
}

function validateEmoStep(step) {
    if (step === 1) {
        const situation = document.getElementById('emo-situation')?.value.trim();
        const autoThought = document.getElementById('emo-auto-thought')?.value.trim();
        const checkedReactions = document.querySelectorAll('.emo-checkbox input:checked');
        const action = document.getElementById('emo-action')?.value.trim();

        if (!situation) {
            showToast('무슨 일이 있었는지 적어주세요', 'warning');
            document.getElementById('emo-situation')?.focus();
            return false;
        }
        if (!autoThought) {
            showToast('그 순간 떠오른 생각을 적어주세요', 'warning');
            document.getElementById('emo-auto-thought')?.focus();
            return false;
        }
        if (checkedReactions.length === 0) {
            showToast('감정/신체 반응을 하나 이상 선택해주세요', 'warning');
            return false;
        }
        if (!action) {
            showToast('어떤 행동을 했는지 적어주세요', 'warning');
            document.getElementById('emo-action')?.focus();
            return false;
        }
        return true;
    }

    if (step === 2) {
        if (emotionTherapyData.tolerance === null) {
            showToast('감정을 견딜 수 있는지 선택해주세요', 'warning');
            return false;
        }
        return true;
    }

    if (step === 3) {
        const friendAdvice = document.getElementById('emo-friend-advice')?.value.trim();
        if (!friendAdvice) {
            showToast('친구라면 뭐라고 말해줄지 적어주세요', 'warning');
            document.getElementById('emo-friend-advice')?.focus();
            return false;
        }
        if (emotionTherapyData.rethink === null) {
            showToast('다시 생각해보니 어떤지 선택해주세요', 'warning');
            return false;
        }
        return true;
    }

    if (step === 4) {
        const newScript = document.getElementById('emo-new-script')?.value.trim();
        if (!newScript) {
            showToast('새로운 대본을 적어주세요', 'warning');
            document.getElementById('emo-new-script')?.focus();
            return false;
        }
        return true;
    }

    return true;
}

function nextEmoStep() {
    if (!validateEmoStep(emotionTherapyStep)) {
        return;
    }

    if (emotionTherapyStep < 6) {
        emotionTherapyStep++;
        updateEmotionTherapyUI();
        scrollEmoModalToTop();
    }
}

function prevEmoStep() {
    if (emotionTherapyStep > 1) {
        emotionTherapyStep--;
        updateEmotionTherapyUI();
        scrollEmoModalToTop();
    }
}

function scrollEmoModalToTop() {
    const modalContent = document.querySelector('.emotion-therapy-content');
    if (modalContent) {
        modalContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updateEmoDiscomfortDisplay(value) {
    const display = document.getElementById('emo-discomfort-value');
    if (display) display.textContent = value;
}

function selectEmoTolerance(value) {
    emotionTherapyData.tolerance = value;
    document.querySelectorAll('.emo-tolerance-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.value === value);
    });
}

function selectEmoRethink(value) {
    emotionTherapyData.rethink = value;
    document.querySelectorAll('.emo-rethink-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.value === value);
    });
}

function setEmoExample(field, text) {
    if (field === 'new-script') {
        const el = document.getElementById('emo-new-script');
        if (el) el.value = text;
    } else if (field === 'reward') {
        const el = document.getElementById('emo-reward');
        if (el) el.value = text;
    }
}

function updateEmoSummary() {
    const situation = document.getElementById('emo-situation')?.value || '-';
    const autoThought = document.getElementById('emo-auto-thought')?.value || '-';
    const friendAdvice = document.getElementById('emo-friend-advice')?.value || '-';
    const oldScript = document.getElementById('emo-old-script')?.value || '-';
    const newScript = document.getElementById('emo-new-script')?.value || '-';
    const ifTrigger = document.getElementById('emo-if-trigger')?.value || '';
    const thenAction = document.getElementById('emo-then-action')?.value || '';
    const reward = document.getElementById('emo-reward')?.value || '-';

    const sumSituation = document.getElementById('emo-sum-situation');
    const sumThought = document.getElementById('emo-sum-thought');
    const sumFriend = document.getElementById('emo-sum-friend');
    const sumOldScript = document.getElementById('emo-sum-old-script');
    const sumNewScript = document.getElementById('emo-sum-new-script');
    const sumIfthen = document.getElementById('emo-sum-ifthen');
    const sumReward = document.getElementById('emo-sum-reward');

    if (sumSituation) sumSituation.textContent = situation;
    if (sumThought) sumThought.textContent = autoThought;
    if (sumFriend) sumFriend.textContent = friendAdvice;
    if (sumOldScript) sumOldScript.textContent = oldScript;
    if (sumNewScript) sumNewScript.textContent = newScript;
    if (sumIfthen) sumIfthen.textContent = (ifTrigger && thenAction) ? `만일 ${ifTrigger} → 그렇다면 ${thenAction}` : '-';
    if (sumReward) sumReward.textContent = reward;
}

function saveEmotionTherapy() {
    // 마지막 단계 validation
    const ifTrigger = document.getElementById('emo-if-trigger')?.value.trim();
    const thenAction = document.getElementById('emo-then-action')?.value.trim();
    const reward = document.getElementById('emo-reward')?.value.trim();

    if (!ifTrigger) {
        showToast('만일 어떤 상황인지 적어주세요', 'warning');
        document.getElementById('emo-if-trigger')?.focus();
        return;
    }
    if (!thenAction) {
        showToast('그렇다면 어떻게 할 건지 적어주세요', 'warning');
        document.getElementById('emo-then-action')?.focus();
        return;
    }
    if (!reward) {
        showToast('보상을 적어주세요', 'warning');
        document.getElementById('emo-reward')?.focus();
        return;
    }

    // 체크된 감정/신체 반응 수집
    const reactions = [];
    document.querySelectorAll('.emo-checkbox input:checked').forEach(cb => {
        reactions.push(cb.value);
    });
    const reactionOther = document.getElementById('emo-reaction-other')?.value.trim();
    if (reactionOther) reactions.push(reactionOther);

    // 데이터 수집
    const data = {
        date: new Date().toISOString(),
        moods: [...selectedMoods],
        // Step 1
        situation: document.getElementById('emo-situation')?.value || '',
        autoThought: document.getElementById('emo-auto-thought')?.value || '',
        reactions: reactions,
        action: document.getElementById('emo-action')?.value || '',
        resultGood: document.getElementById('emo-result-good')?.value || '',
        resultBad: document.getElementById('emo-result-bad')?.value || '',
        // Step 2
        discomfort: parseInt(document.getElementById('emo-discomfort')?.value || 50),
        tolerance: emotionTherapyData.tolerance,
        // Step 3
        evidence: document.getElementById('emo-evidence')?.value || '',
        alternative: document.getElementById('emo-alternative')?.value || '',
        friendAdvice: document.getElementById('emo-friend-advice')?.value || '',
        rethink: emotionTherapyData.rethink,
        // Step 4
        oldScript: document.getElementById('emo-old-script')?.value || '',
        newScript: document.getElementById('emo-new-script')?.value || '',
        // Step 5
        ifTrigger: ifTrigger,
        thenAction: thenAction,
        reward: reward
    };

    // 저장
    if (!state.emotionTherapySessions) state.emotionTherapySessions = [];
    state.emotionTherapySessions.push(data);
    saveState();

    // 모달 닫기
    closeEmotionTherapyModal();

    // 힘든 감정 섹션 업데이트
    const helpEl = document.getElementById('negative-mood-help');
    if (helpEl) {
        helpEl.innerHTML = `
            <div class="negative-mood-header">
                <span>&#128154;</span> 감정 정리 완료!
            </div>
            <p class="negative-mood-desc">잘했어요. 충동이 와도 다른 선택을 할 수 있어요.</p>
        `;
    }

    showToast('감정 인지치료 기록이 저장되었어요! 💚', 'success');
}

// ============================================
// 시작 도우미 시스템
// ============================================

let currentHelperTask = null;
let currentHelperStep = 1;

// 부정적 생각 뒤집기 매핑
const thoughtReframes = {
    'too-hard': '첫 단계만 하면 돼요. 어려운 건 나중에 생각해도 늦지 않아요. 지금은 시작만!',
    'too-long': '10분만 해보고 결정해요. 생각보다 금방 끝날 수도 있어요!',
    'no-mood': '"하고 싶은 기분"은 필요 없어요. 시작할 에너지만 있으면 충분해요!',
    'fail': '못해도 괜찮아요. 시작한 것 자체가 성공이에요. 완벽할 필요 없어요!',
    'boring': '10분만 버텨보세요. 의외로 몰입하게 될 수도 있어요!',
    'overwhelming': '그래서 가장 작은 첫 단계를 정한 거예요. 그것만 하면 돼요!'
};

function openStartHelper(task) {
    currentHelperTask = task;
    currentHelperStep = 1;

    const modal = document.getElementById('start-helper-modal');
    const titleEl = document.getElementById('helper-task-title');

    if (titleEl) titleEl.textContent = task.title;

    // 모든 입력 초기화
    const inputs = ['helper-first-step', 'helper-if-custom', 'helper-then-action', 'helper-commitment'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const selects = ['helper-if-distraction', 'helper-negative-thought'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // 단계 초기화
    showHelperStep(1);
    updateHelperProgress(1);

    // 생각 뒤집기 숨기기
    const reframeEl = document.getElementById('thought-reframe');
    if (reframeEl) reframeEl.style.display = 'none';

    // 커스텀 입력 숨기기
    const customInput = document.getElementById('helper-if-custom');
    if (customInput) customInput.style.display = 'none';

    modal.style.display = 'flex';

    // 이벤트 리스너 설정
    setupHelperEventListeners();
}

function setupHelperEventListeners() {
    // 방해요소 선택 변경 시
    const distractionSelect = document.getElementById('helper-if-distraction');
    if (distractionSelect) {
        distractionSelect.onchange = function() {
            const customInput = document.getElementById('helper-if-custom');
            if (this.value === 'other') {
                customInput.style.display = 'block';
                customInput.focus();
            } else {
                customInput.style.display = 'none';
            }
        };
    }

    // 부정적 생각 선택 변경 시
    const negativeSelect = document.getElementById('helper-negative-thought');
    if (negativeSelect) {
        negativeSelect.onchange = function() {
            const reframeEl = document.getElementById('thought-reframe');
            const reframeText = document.getElementById('reframe-text');

            if (this.value && thoughtReframes[this.value]) {
                reframeText.textContent = thoughtReframes[this.value];
                reframeEl.style.display = 'block';
            } else {
                reframeEl.style.display = 'none';
            }
        };
    }
}

function closeStartHelper() {
    document.getElementById('start-helper-modal').style.display = 'none';
    currentHelperTask = null;
    currentHelperStep = 1;
}

function openNowStartHelper() {
    const task = getRecommendedTask();
    if (task) {
        openStartHelper(task);
    } else {
        showToast('현재 진행 중인 할 일이 없습니다', 'warning');
    }
}

function showHelperStep(step) {
    // 모든 단계 숨기기
    for (let i = 1; i <= 4; i++) {
        const stepEl = document.getElementById(`helper-step-${i}`);
        if (stepEl) stepEl.style.display = 'none';
    }

    // 현재 단계 표시
    const currentStepEl = document.getElementById(`helper-step-${step}`);
    if (currentStepEl) currentStepEl.style.display = 'block';

    currentHelperStep = step;

    // 마지막 단계면 요약 업데이트
    if (step === 4) {
        updateHelperSummary();
    }
}

function updateHelperProgress(step) {
    const progressSteps = document.querySelectorAll('.helper-progress-step');
    progressSteps.forEach((el, index) => {
        if (index + 1 <= step) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

function nextHelperStep(step) {
    // 현재 단계 검증
    if (currentHelperStep === 1) {
        const firstStep = document.getElementById('helper-first-step').value.trim();
        if (!firstStep) {
            showToast('가장 작은 첫 단계를 입력해주세요', 'warning');
            document.getElementById('helper-first-step').focus();
            return;
        }
    }

    showHelperStep(step);
    updateHelperProgress(step);
}

function prevHelperStep(step) {
    showHelperStep(step);
    updateHelperProgress(step);
}

function setHelperExample(field, value) {
    const fieldMap = {
        'first-step': 'helper-first-step',
        'then-action': 'helper-then-action'
    };

    const el = document.getElementById(fieldMap[field]);
    if (el) {
        el.value = value;
        el.focus();
    }
}

function updateHelperSummary() {
    const firstStep = document.getElementById('helper-first-step')?.value.trim() || '-';
    const ifDistraction = document.getElementById('helper-if-distraction')?.value;
    const ifCustom = document.getElementById('helper-if-custom')?.value.trim();
    const thenAction = document.getElementById('helper-then-action')?.value.trim();

    document.getElementById('summary-first-step').textContent = firstStep;

    // 만일-그렇다면 요약
    let ifThenSummary = '-';
    if (ifDistraction && thenAction) {
        const distractionText = ifDistraction === 'other' ? ifCustom :
            document.getElementById('helper-if-distraction')?.options[document.getElementById('helper-if-distraction').selectedIndex]?.text;
        ifThenSummary = `${distractionText} → ${thenAction}`;
    }
    document.getElementById('summary-if-then').textContent = ifThenSummary;
}

function startWithHelper() {
    const firstStep = document.getElementById('helper-first-step')?.value.trim();

    if (!firstStep) {
        showToast('가장 작은 첫 단계를 입력해주세요', 'warning');
        nextHelperStep(1);
        return;
    }

    // 시작 계획 저장
    if (!state.startPlans) state.startPlans = [];

    const ifDistraction = document.getElementById('helper-if-distraction')?.value;
    const ifCustom = document.getElementById('helper-if-custom')?.value.trim();
    const thenAction = document.getElementById('helper-then-action')?.value.trim();
    const negativeThought = document.getElementById('helper-negative-thought')?.value;
    const commitment = document.getElementById('helper-commitment')?.value.trim();

    const plan = {
        taskId: currentHelperTask.id,
        taskTitle: currentHelperTask.title,
        firstStep: firstStep,
        ifDistraction: ifDistraction === 'other' ? ifCustom : ifDistraction,
        thenAction: thenAction,
        negativeThought: negativeThought,
        reframe: thoughtReframes[negativeThought] || '',
        commitment: commitment,
        createdAt: new Date().toISOString()
    };

    state.startPlans.push(plan);
    saveState();

    // 모달 닫기
    closeStartHelper();

    // 첫 행동을 강조하는 토스트
    showToast(`지금 바로: "${firstStep}"`, 'success');

    // 10분 타이머로 집중 모드 시작
    setTimeout(() => {
        if (currentHelperTask) {
            startFocusMode(currentHelperTask);
        }
    }, 1500);
}

// 모달 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
    const modal = document.getElementById('start-helper-modal');
    if (e.target === modal) {
        closeStartHelper();
    }
});
