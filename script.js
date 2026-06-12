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

// ---- Work Schedule (Google Sheets gviz) ----
function sheetName() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}/${m}`;
}

function gvizUrl(sheetId) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName())}`;
}

// Parse gviz JSONP response into a flat array of string-cell rows.
// Handles all known wrapper formats: google.visualization.Query.setResponse({...});
// and the /*O_o*/ variant. Null/missing cells normalise to ''.
function parseGvizRows(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in gviz response');
    const json = JSON.parse(match[0]);
    if (!json.table?.rows) throw new Error('Unexpected gviz table structure');
    return json.table.rows.map(row =>
        (row?.c ?? []).map(cell => (cell?.v != null ? String(cell.v).trim() : ''))
    );
}

// Extract {dayNumber: shiftString} for a named person from a multi-block gviz sheet.
// Each block starts with a header row containing both '職種' and '名前'.
// Day columns are discovered dynamically from the position of '名前'.
// First-occurrence wins: a stray day '1' in block 2's header (next month's spillover)
// never overwrites the real day 1 already mapped from block 1.
function extractDayMap(rows, targetName) {
    const dayMap = {};

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const nameColIdx = row.indexOf('名前');
        if (nameColIdx === -1 || !row.includes('職種')) continue;

        // Columns to the right of '名前' hold day numbers for this block.
        const dayStartCol = nameColIdx + 1;

        for (let j = i + 1; j < rows.length; j++) {
            const r = rows[j];
            // Stop at the next block's header row.
            if (r.includes('名前') && r.includes('職種')) break;
            // Find the person by scanning the whole row, not a fixed column.
            if (!r.includes(targetName)) continue;

            for (let c = dayStartCol; c < row.length; c++) {
                const d = parseInt(row[c], 10);
                // Only accept valid day numbers; skip blanks, non-numbers, and
                // already-mapped days (guards against next-month spillover in block 2).
                if (isNaN(d) || d < 1 || d > 31 || d in dayMap) continue;
                dayMap[d] = r[c] || '';
            }
            break;
        }
    }

    return dayMap;
}

async function fetchDayMap(sheetId) {
    const res = await fetch(gvizUrl(sheetId), { cache: 'no-store' });
    if (!res.ok) throw new Error(`gviz fetch failed: HTTP ${res.status}`);
    return extractDayMap(parseGvizRows(await res.text()), 'アジャイ');
}

function shiftStatus(val) {
    if (!val || val === '') return 'work'; // blank = scheduled work
    if (val === '公休') return 'off';
    return 'work';
}

function shiftLabel(val) {
    if (!val || val === '') return "Work — L'or Clinic";
    if (val === '公休') return 'Day Off';
    // e.g. "10:00~19:00（CL）" or "10:00~19:00（Wib）"
    const loc = val.includes('CL') ? "Clinic" : val.includes('Wib') ? "Wibro" : '';
    const time = val.match(/\d+:\d+~\d+:\d+/)?.[0] || '';
    return loc ? `${loc} · ${time}` : val;
}

async function getWeekWorkStatus() {
    const sheetId = window.AJAY_CONFIG.WORK_SCHEDULE_SHEET_ID;
    const today = new Date();
    const dayMap = await fetchDayMap(sheetId);

    const dow = today.getDay();
    const monOffset = dow === 0 ? -6 : 1 - dow;
    const week = [];
    for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() + monOffset + d);
        const dayNum = date.getDate();
        const val = date.getMonth() === today.getMonth() ? (dayMap[dayNum] ?? null) : null;
        week.push({ date, dayNum, isToday: date.toDateString() === today.toDateString(), status: val === null ? 'unknown' : shiftStatus(val), shift: val });
    }

    const todayVal = dayMap[today.getDate()] ?? null;
    week._todayLabel = shiftLabel(todayVal);
    return { todayStatus: todayVal === null ? 'unknown' : shiftStatus(todayVal), todayShift: todayVal, week };
}

function renderWorkPill(state, week) {
    const icon = document.getElementById('workPillIcon');
    const value = document.getElementById('workPillValue');

    if (state === 'off') {
        icon.className = 'today-pill-icon today-pill-icon--off';
        icon.innerHTML = '<i data-lucide="sun"></i>';
        value.textContent = 'Day Off — enjoy!';
        value.classList.remove('muted');
    } else if (state === 'work') {
        icon.className = 'today-pill-icon';
        icon.innerHTML = '<i data-lucide="briefcase"></i>';
        value.textContent = week?._todayLabel || "Work — L'or Clinic";
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

// Todos — backed by Apple Reminders via local API
class TodoManager {
    constructor() {
        this.todos = [];
        this.loading = true;
        this.setupEventListeners();
        this.renderLoading();
        this.init();
    }

    // ── API helpers ──

    async _api(method, path, body) {
        const opts = { method, headers: {} };
        if (body) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        const res = await fetch(path, opts);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        return res.json();
    }

    _idParam(id) {
        return `/api/reminders?id=${encodeURIComponent(id)}`;
    }

    // ── init: migrate localStorage → Reminders, then load ──

    async init() {
        // One-time migration of any existing localStorage tasks
        const local = JSON.parse(localStorage.getItem('todos') || '[]');
        if (local.length > 0) {
            for (const t of local.filter(t => !t.done)) {
                await this._api('POST', '/api/reminders', { text: t.text }).catch(() => {});
            }
            localStorage.removeItem('todos');
        }

        await this.reload();
    }

    async reload() {
        this.loading = true;
        try {
            this.todos = await this._api('GET', '/api/reminders');
        } catch {
            this.todos = [];
        }
        this.loading = false;
        this.render();
    }

    // ── mutations ──

    async addTodo(text) {
        if (!text.trim()) return;
        const item = await this._api('POST', '/api/reminders', { text: text.trim() });
        this.todos.push(item);
        this.render();
    }

    async completeTodo(id) {
        await this._api('PATCH', this._idParam(id), { done: true });
        this.todos = this.todos.filter(t => t.id !== id);
        this.render();
    }

    async deleteTodo(id) {
        await this._api('DELETE', this._idParam(id));
        this.todos = this.todos.filter(t => t.id !== id);
        this.render();
    }

    // ── UI ──

    setupEventListeners() {
        const input = document.getElementById('todoInput');
        const btn = document.getElementById('addTodoBtn');

        btn.addEventListener('click', async () => {
            const val = input.value;
            input.value = '';
            input.focus();
            await this.addTodo(val);
        });

        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const val = input.value;
                input.value = '';
                await this.addTodo(val);
            }
        });
    }

    renderLoading() {
        const todoList = document.getElementById('todoList');
        if (todoList) todoList.innerHTML = '<div class="empty-state">Loading from Reminders…</div>';
    }

    render() {
        const todoList = document.getElementById('todoList');
        const active = this.todos.length;

        document.getElementById('taskCount').textContent = active;
        const heroCount = document.getElementById('heroTaskCount');
        if (heroCount) heroCount.textContent = `${active} task${active === 1 ? '' : 's'}`;

        if (active === 0) {
            todoList.innerHTML = '<div class="empty-state">No reminders. Add one to get started!</div>';
            return;
        }

        todoList.innerHTML = this.todos.map(todo => `
            <div class="todo-item">
                <input type="checkbox" class="todo-checkbox"
                    onchange="todoManager.completeTodo(${JSON.stringify(todo.id)})">
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <button class="todo-delete" onclick="todoManager.deleteTodo(${JSON.stringify(todo.id)})">
                    <i data-lucide="x"></i>
                </button>
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
