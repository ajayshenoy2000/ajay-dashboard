// Time & Greeting
function updateGreeting() {
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('greeting');

    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    if (hour >= 17 || hour < 5) greeting = 'Good evening';

    greetingEl.innerHTML = `${greeting}, <span class="accent">Ajay</span>`;
}

function updateDateTime() {
    const now = new Date();
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    document.getElementById('eyebrow').textContent = `${weekday} · ${timeStr}`;
    document.getElementById('quickTime').textContent = timeStr;
}

// ---- Work Schedule (Google Sheet) ----
const MONTH_NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const WORK_SCHEDULE_CSV_URL = () => {
    const month = MONTH_NAMES[new Date().getMonth()];
    return `https://docs.google.com/spreadsheets/d/${window.AJAY_CONFIG.WORK_SCHEDULE_SHEET_ID}/export?format=csv&sheet=${month}`;
};

function parseScheduleCSV(text) {
    return text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => {
            const cells = [];
            let cur = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') {
                    if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
                    else inQuotes = !inQuotes;
                } else if (ch === ',' && !inQuotes) {
                    cells.push(cur);
                    cur = '';
                } else {
                    cur += ch;
                }
            }
            cells.push(cur);
            return cells;
        });
}

async function getWeekWorkStatus() {
    const res = await fetch(WORK_SCHEDULE_CSV_URL(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Network response was not ok');
    const rows = parseScheduleCSV(await res.text());

    const today = new Date();
    // Build a map of dayOfMonth → status for this month
    const dayStatusMap = {};

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if ((row[1] || '').trim() === '職種' && (row[2] || '').trim() === '名前') {
            const dayNumRow = row;
            for (let j = i + 1; j < rows.length; j++) {
                const r = rows[j];
                if ((r[1] || '').trim() === '職種' && (r[2] || '').trim() === '名前') break;
                if ((r[2] || '').trim() === 'アジャイ') {
                    for (let c = 3; c < dayNumRow.length; c++) {
                        const dayNum = parseInt((dayNumRow[c] || '').trim(), 10);
                        if (!isNaN(dayNum)) {
                            const val = (r[c] || '').trim();
                            dayStatusMap[dayNum] = val === '公休' ? 'off' : 'work';
                        }
                    }
                    break;
                }
            }
        }
    }

    // Build this week Mon–Sun
    const week = [];
    const dow = today.getDay(); // 0=Sun
    const monOffset = dow === 0 ? -6 : 1 - dow;
    for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() + monOffset + d);
        const dayNum = date.getDate();
        const isToday = date.toDateString() === today.toDateString();
        const status = date.getMonth() === today.getMonth()
            ? (dayStatusMap[dayNum] || 'unknown')
            : 'unknown';
        week.push({ date, dayNum, isToday, status });
    }

    const todayStatus = dayStatusMap[today.getDate()] || 'unknown';
    return { todayStatus: todayStatus === '公休' ? 'off' : todayStatus === 'unknown' ? 'unknown' : 'work', week };
}

async function getTodayWorkStatus() {
    const { todayStatus } = await getWeekWorkStatus();
    return todayStatus;
}

function renderWorkPill(state, week) {
    const icon = document.getElementById('workPillIcon');
    const value = document.getElementById('workPillValue');

    if (state === 'off') {
        icon.className = 'today-pill-icon today-pill-icon--off';
        icon.innerHTML = '<i data-lucide="palm-tree"></i>';
        value.textContent = 'Day Off — enjoy!';
        value.classList.remove('muted');
    } else if (state === 'work') {
        icon.className = 'today-pill-icon';
        icon.innerHTML = '<i data-lucide="briefcase"></i>';
        value.textContent = "Work — L'or Clinic";
        value.classList.remove('muted');
    } else {
        icon.className = 'today-pill-icon';
        icon.innerHTML = '<i data-lucide="briefcase"></i>';
        value.textContent = 'Unavailable';
        value.classList.add('muted');
    }

    if (week) renderWeekStrip(week);
    if (window.lucide) lucide.createIcons();
}

function renderWeekStrip(week) {
    const strip = document.getElementById('weekStrip');
    if (!strip) return;
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    strip.innerHTML = week.map((day, i) => {
        const cls = ['week-day',
            day.isToday ? 'week-day--today' : '',
            `week-day--${day.status}`
        ].filter(Boolean).join(' ');
        const dot = day.status === 'off' ? '✦' : day.status === 'work' ? '●' : '·';
        return `<div class="${cls}">
            <span class="week-day-label">${dayLabels[i]}</span>
            <span class="week-day-num">${day.date.getDate()}</span>
            <span class="week-day-dot">${dot}</span>
        </div>`;
    }).join('');
}

function updateDateDisplay() {
    const now = new Date();
    const dayEl = document.getElementById('dateDay');
    const fullEl = document.getElementById('dateFull');
    if (dayEl) dayEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
    if (fullEl) fullEl.textContent = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

// ---- Calendar (Google Calendar) ----
function formatEventTime(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function renderScheduleList(events) {
    const scheduleList = document.getElementById('scheduleList');

    if (!events || events.length === 0) {
        scheduleList.innerHTML = '<div class="empty-state">No events scheduled today</div>';
        return;
    }

    scheduleList.innerHTML = events.slice(0, 4).map(ev => `
        <div class="schedule-item">
            <div class="schedule-time">${ev.allDay ? 'All day' : formatEventTime(ev.start)}</div>
            <div class="schedule-event">
                <div class="schedule-title">${escapeHtml(ev.title)}</div>
                <div class="schedule-desc">${escapeHtml(ev.location || 'No location')}</div>
            </div>
        </div>
    `).join('');
}

function renderCalPill(events) {
    // cal pill removed — no-op kept for hero text compatibility
}

async function loadTodaySummary() {
    // Work schedule
    let workState = 'unknown';
    let week = null;
    try {
        const result = await getWeekWorkStatus();
        workState = result.todayStatus;
        week = result.week;
    } catch (e) {
        console.error('Work schedule fetch failed', e);
    }
    renderWorkPill(workState, week);

    // Calendar
    let events = [];
    if (window.GCal && window.GCal.isConfigured() && window.GCal.isSignedIn()) {
        try {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const endOfToday = new Date(startOfToday);
            endOfToday.setDate(endOfToday.getDate() + 1);
            events = await window.GCal.fetchEvents({ timeMin: startOfToday, timeMax: endOfToday, interactive: false });
        } catch (e) {
            console.error('Calendar fetch failed', e);
        }
    }
    renderCalPill(events);
    renderScheduleList(events);

    // Hero summary
    const heroText = document.getElementById('heroText');
    const workPhrase = workState === 'off' ? "it's your <strong>day off</strong>" : "you're <strong>working</strong> today";
    const eventWord = events.length === 1 ? 'event' : 'events';
    const eventPhrase = window.GCal && window.GCal.isConfigured() && window.GCal.isSignedIn()
        ? `<strong>${events.length} ${eventWord}</strong>`
        : 'an unconnected calendar';
    heroText.innerHTML = `Today ${workPhrase}, with ${eventPhrase} and <strong id="heroTaskCount">0 tasks</strong> on your list. Let's make it count.`;

    const heroTaskCount = document.getElementById('heroTaskCount');
    if (heroTaskCount && window.todoManager) {
        const activeTodos = window.todoManager.todos.filter(t => !t.done).length;
        heroTaskCount.textContent = `${activeTodos} task${activeTodos === 1 ? '' : 's'}`;
    }
}

// Todos
class TodoManager {
    constructor() {
        this.todos = this.loadTodos();
        this.setupEventListeners();
        this.render();
    }

    loadTodos() {
        return JSON.parse(localStorage.getItem('todos') || '[]');
    }

    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    addTodo(text) {
        if (text.trim()) {
            this.todos.push({
                id: Date.now(),
                text: text.trim(),
                done: false
            });
            this.saveTodos();
            this.render();
        }
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.done = !todo.done;
            this.saveTodos();
            this.render();
        }
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.render();
    }

    setupEventListeners() {
        const input = document.getElementById('todoInput');
        const btn = document.getElementById('addTodoBtn');

        btn.addEventListener('click', () => {
            this.addTodo(input.value);
            input.value = '';
            input.focus();
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTodo(input.value);
                input.value = '';
            }
        });
    }

    render() {
        const todoList = document.getElementById('todoList');

        const activeTodos = this.todos.filter(t => !t.done).length;
        document.getElementById('taskCount').textContent = activeTodos;
        const heroTaskCount = document.getElementById('heroTaskCount');
        if (heroTaskCount) {
            heroTaskCount.textContent = `${activeTodos} task${activeTodos === 1 ? '' : 's'}`;
        }

        if (this.todos.length === 0) {
            todoList.innerHTML = '<div class="empty-state">No tasks yet. Add one to get started!</div>';
            return;
        }

        todoList.innerHTML = this.todos.map(todo => `
            <div class="todo-item ${todo.done ? 'done' : ''}">
                <input type="checkbox" class="todo-checkbox" ${todo.done ? 'checked' : ''}
                    onchange="todoManager.toggleTodo(${todo.id})">
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <button class="todo-delete" onclick="todoManager.deleteTodo(${todo.id})"><i data-lucide="x"></i></button>
            </div>
        `).join('');

        if (window.lucide) lucide.createIcons();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    updateGreeting();
    updateDateTime();
    updateDateDisplay();
    setInterval(updateDateTime, 1000);

    window.todoManager = new TodoManager();
    loadTodaySummary();
});
