const SHEET_ID = '1v7eb4olwzKJnem0oJy0N1J3y9SY5_KNqNvFsqKuYV4Q';
const NAME_MATCH = 'アジャイ';
const CACHE_KEY = 'workScheduleCache';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function gvizUrl() {
    const now = new Date();
    const sheet = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}`;
}

function parseGvizRows(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in gviz response');
    const json = JSON.parse(match[0]);
    if (!json.table?.rows) throw new Error('Unexpected gviz table structure');
    return json.table.rows.map(row =>
        (row?.c ?? []).map(cell => (cell?.v != null ? String(cell.v).trim() : ''))
    );
}

function extractDayMap(rows, targetName) {
    const raw = {}; // dayNum → shift string

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const nameColIdx = row.indexOf('名前');
        if (nameColIdx === -1 || !row.includes('職種')) continue;

        const dayStartCol = nameColIdx + 1;

        for (let j = i + 1; j < rows.length; j++) {
            const r = rows[j];
            if (r.includes('名前') && r.includes('職種')) break;
            if (!r.includes(targetName)) continue;

            for (let c = dayStartCol; c < row.length; c++) {
                const d = parseInt(row[c], 10);
                if (isNaN(d) || d < 1 || d > 31 || d in raw) continue;
                raw[d] = r[c] || '';
            }
            break;
        }
    }

    // Wrap in { status } for the calendar renderer
    const dayMap = {};
    for (const [d, shift] of Object.entries(raw)) dayMap[d] = { status: shift };
    return dayMap;
}

async function fetchDayMap() {
    const res = await fetch(gvizUrl(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`gviz fetch failed: HTTP ${res.status}`);
    return extractDayMap(parseGvizRows(await res.text()), NAME_MATCH);
}

function statusLabel(status) {
    if (status === '公休') return 'Day Off';
    if (status) return status;
    return 'Work Day';
}

function isOff(status) {
    return status === '公休';
}

function buildCalendar(dayMap, year, month, todayDate) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const leadingBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1; // Mon-first grid

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    WEEKDAY_LABELS.forEach(label => {
        const el = document.createElement('div');
        el.className = 'cal-weekday';
        el.textContent = label;
        grid.appendChild(el);
    });

    for (let b = 0; b < leadingBlanks; b++) {
        const el = document.createElement('div');
        el.className = 'cal-day empty';
        grid.appendChild(el);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const info = dayMap[day] || { status: '' };
        const off = isOff(info.status);
        const weekdayIdx = (firstWeekday === 0 ? 7 : firstWeekday) - 1; // unused, computed via date below
        const date = new Date(year, month - 1, day);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isToday = day === todayDate;

        const el = document.createElement('div');
        el.className = 'cal-day';
        if (off) el.classList.add('off');
        if (isWeekend) el.classList.add('weekend');
        if (isToday) el.classList.add('today');

        const num = document.createElement('span');
        num.textContent = day;
        el.appendChild(num);

        if (off) {
            const lab = document.createElement('span');
            lab.className = 'cal-day-label';
            lab.textContent = 'Off';
            el.appendChild(lab);
        }

        grid.appendChild(el);
    }
}

function renderUpcomingOff(dayMap, year, month, todayDate) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const container = document.getElementById('upcomingOff');
    const items = [];

    for (let day = todayDate; day <= daysInMonth; day++) {
        const info = dayMap[day];
        if (info && isOff(info.status)) {
            const date = new Date(year, month - 1, day);
            items.push({ day, date });
        }
    }

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state">No upcoming days off this month</div>';
        return;
    }

    container.innerHTML = items.map(item => {
        const weekday = item.date.toLocaleDateString('en-US', { weekday: 'long' });
        const monthName = item.date.toLocaleDateString('en-US', { month: 'short' });
        const isToday = item.day === todayDate;
        return `
            <div class="schedule-item">
                <div class="schedule-time">${monthName} ${item.day}</div>
                <div class="schedule-event">
                    <div class="schedule-title">${weekday}${isToday ? ' (Today)' : ''}</div>
                    <div class="schedule-desc">Scheduled day off</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderStats(dayMap, year, month, todayDate) {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workDays = 0;
    let offDays = 0;

    for (let day = todayDate; day <= daysInMonth; day++) {
        const info = dayMap[day];
        if (info && isOff(info.status)) offDays++;
        else workDays++;
    }

    document.getElementById('workDaysCount').textContent = workDays;
    document.getElementById('daysOffCount').textContent = offDays;
}

function renderToday(dayMap, year, month, todayDate) {
    const today = new Date(year, month - 1, todayDate);
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    document.getElementById('todayDate').textContent = dateStr;

    const info = dayMap[todayDate] || { status: '' };
    const heroText = document.getElementById('todayStatus');

    if (isOff(info.status)) {
        heroText.innerHTML = `It's your <strong>day off</strong> today — enjoy the break! 🌴`;
    } else {
        heroText.innerHTML = `You're <strong>scheduled to work</strong> today at L'or Clinic Omotesando. Have a great one!`;
    }

    const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('monthTitle').textContent = monthName;
}

function setSyncState(state) {
    const pill = document.getElementById('syncPill');
    if (state === 'ok') {
        pill.className = 'sync-pill';
        pill.innerHTML = '<i data-lucide="check-circle-2"></i> Synced';
    } else if (state === 'cached') {
        pill.className = 'sync-pill error';
        pill.innerHTML = '<i data-lucide="wifi-off"></i> Offline (cached)';
    } else {
        pill.className = 'sync-pill error';
        pill.innerHTML = '<i data-lucide="alert-circle"></i> Sync failed';
    }
    if (window.lucide) lucide.createIcons();
}

function render(dayMap) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const todayDate = now.getDate();

    renderToday(dayMap, year, month, todayDate);
    buildCalendar(dayMap, year, month, todayDate);
    renderUpcomingOff(dayMap, year, month, todayDate);
    renderStats(dayMap, year, month, todayDate);

    if (window.lucide) lucide.createIcons();
}

async function loadSchedule(forceRefresh) {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.classList.add('spinning');

    try {
        const dayMap = await fetchDayMap();
        localStorage.setItem(CACHE_KEY, JSON.stringify({ dayMap, fetchedAt: Date.now() }));
        render(dayMap);
        setSyncState('ok');
    } catch (err) {
        console.error('Failed to fetch schedule', err);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { dayMap } = JSON.parse(cached);
            render(dayMap);
            setSyncState('cached');
        } else {
            document.getElementById('todayStatus').textContent = 'Could not load schedule. Check your connection.';
            setSyncState('error');
        }
    } finally {
        refreshBtn.classList.remove('spinning');
    }
}

document.getElementById('refreshBtn').addEventListener('click', () => loadSchedule(true));

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    loadSchedule();
});
