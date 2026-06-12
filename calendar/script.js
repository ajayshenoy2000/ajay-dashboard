function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDayTag(date) {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function renderEventList(container, events, { showDateTag = false } = {}) {
    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state">Nothing here — enjoy the free time!</div>';
        return;
    }

    container.innerHTML = events.map(ev => {
        const timeLabel = ev.allDay ? 'All day' : formatTime(ev.start);
        const timeClass = ev.allDay ? 'event-time all-day' : 'event-time';
        const locationHtml = ev.location
            ? `<div class="event-location"><i data-lucide="map-pin"></i>${escapeHtml(ev.location)}</div>`
            : '';
        const dateTag = showDateTag ? `<div class="event-date-tag">${formatDayTag(ev.start)}</div>` : '';

        return `
            <a href="${ev.link}" target="_blank" class="event-item">
                <div class="${timeClass}">${timeLabel}</div>
                <div class="event-meta">
                    <div class="event-title">${escapeHtml(ev.title)}</div>
                    ${locationHtml}
                    ${dateTag}
                </div>
            </a>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setSyncState(state) {
    const pill = document.getElementById('syncPill');
    if (!pill) return;
    if (state === 'ok') {
        pill.className = 'sync-pill';
        pill.innerHTML = '<i data-lucide="check-circle-2"></i> Synced';
    } else {
        pill.className = 'sync-pill error';
        pill.innerHTML = '<i data-lucide="alert-circle"></i> Reconnect needed';
    }
    if (window.lucide) lucide.createIcons();
}

function showSignedOut(message) {
    document.getElementById('signinCard').hidden = false;
    document.getElementById('todayCard').hidden = true;
    document.getElementById('upcomingCard').hidden = true;
    document.getElementById('actionBtn').innerHTML = '<i data-lucide="log-in"></i>';
    document.getElementById('heroText').textContent = 'Sign in to see your events for the day right here.';
    if (message) document.getElementById('signinDesc').textContent = message;
    if (window.lucide) lucide.createIcons();
}

async function loadCalendar(interactive = false) {
    const now = new Date();
    document.getElementById('todayDate').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    if (!window.GCal.isConfigured()) {
        showSignedOut('Calendar isn\'t configured yet — add your Google Client ID to config.js.');
        document.getElementById('signinBtn').disabled = true;
        return;
    }

    try {
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);

        const endOfWeek = new Date(startOfToday);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        const [todayEvents, weekEvents] = await Promise.all([
            window.GCal.fetchEvents({ timeMin: startOfToday, timeMax: endOfToday, interactive }),
            window.GCal.fetchEvents({ timeMin: endOfToday, timeMax: endOfWeek, interactive: false }),
        ]);

        document.getElementById('signinCard').hidden = true;
        document.getElementById('todayCard').hidden = false;
        document.getElementById('upcomingCard').hidden = false;
        document.getElementById('actionBtn').innerHTML = '<i data-lucide="log-out"></i>';

        renderEventList(document.getElementById('todayList'), todayEvents);
        renderEventList(document.getElementById('upcomingList'), weekEvents.slice(0, 8), { showDateTag: true });

        const heroText = document.getElementById('heroText');
        if (todayEvents.length === 0) {
            heroText.innerHTML = `Your calendar is clear today. <strong>Zero meetings</strong> — make the most of it!`;
        } else {
            const eventWord = todayEvents.length === 1 ? 'event' : 'events';
            const next = todayEvents[0];
            heroText.innerHTML = `You have <strong>${todayEvents.length} ${eventWord}</strong> today. Next up: <strong>${escapeHtml(next.title)}</strong>${next.allDay ? '' : ` at ${formatTime(next.start)}`}.`;
        }

        setSyncState('ok');
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        if (err.message === 'UNAUTHORIZED') {
            showSignedOut('Your session expired — sign in again to keep syncing.');
        } else {
            console.error('Calendar load failed', err);
            setSyncState('error');
            document.getElementById('heroText').textContent = 'Could not load your calendar right now.';
        }
    }
}

document.getElementById('signinBtn').addEventListener('click', async () => {
    try {
        await window.GCal.requestToken({ interactive: true });
        loadCalendar(true);
    } catch (err) {
        console.error(err);
        document.getElementById('signinDesc').textContent = 'Sign-in failed. Please try again.';
        document.getElementById('signinDesc').classList.add('error');
    }
});

document.getElementById('actionBtn').addEventListener('click', () => {
    if (window.GCal.isSignedIn()) {
        window.GCal.signOut();
        showSignedOut();
    } else {
        document.getElementById('signinBtn').click();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();

    const now = new Date();
    document.getElementById('todayDate').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    if (window.GCal.isSignedIn()) {
        document.getElementById('signinCard').hidden = true;
        loadCalendar(false);
    } else {
        showSignedOut();
    }
});
