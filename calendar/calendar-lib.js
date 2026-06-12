// Shared Google Calendar helper — Google Identity Services token client.
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const GCAL_TOKEN_KEY = 'gcalToken';

const GCal = {
    tokenClient: null,
    accessToken: null,

    isConfigured() {
        const id = window.AJAY_CONFIG && window.AJAY_CONFIG.GOOGLE_CLIENT_ID;
        return !!(id && !id.startsWith('YOUR_'));
    },

    loadStoredToken() {
        const raw = localStorage.getItem(GCAL_TOKEN_KEY);
        if (!raw) return null;
        try {
            const data = JSON.parse(raw);
            if (data.expiresAt && Date.now() < data.expiresAt) {
                this.accessToken = data.token;
                return data.token;
            }
        } catch (e) { /* ignore */ }
        localStorage.removeItem(GCAL_TOKEN_KEY);
        return null;
    },

    storeToken(token, expiresInSeconds) {
        this.accessToken = token;
        localStorage.setItem(GCAL_TOKEN_KEY, JSON.stringify({
            token,
            expiresAt: Date.now() + (expiresInSeconds * 1000) - 60000,
        }));
    },

    signOut() {
        this.accessToken = null;
        localStorage.removeItem(GCAL_TOKEN_KEY);
        if (window.google && this.tokenClient) {
            google.accounts.oauth2.revoke(this.accessToken || '', () => {});
        }
    },

    isSignedIn() {
        return !!this.loadStoredToken();
    },

    // Returns a promise resolving with an access token, prompting sign-in if needed.
    requestToken({ interactive }) {
        return new Promise((resolve, reject) => {
            const existing = this.loadStoredToken();
            if (existing && !interactive) {
                resolve(existing);
                return;
            }

            if (!window.google || !window.google.accounts) {
                reject(new Error('Google Identity Services failed to load'));
                return;
            }

            if (!this.tokenClient) {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: window.AJAY_CONFIG.GOOGLE_CLIENT_ID,
                    scope: GCAL_SCOPE,
                    callback: (resp) => {
                        if (resp.error) {
                            reject(new Error(resp.error));
                            return;
                        }
                        this.storeToken(resp.access_token, resp.expires_in);
                        resolve(resp.access_token);
                    },
                });
            }

            if (existing) {
                resolve(existing);
                return;
            }

            this.tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' });
        });
    },

    async fetchEvents({ timeMin, timeMax, interactive = false }) {
        const token = await this.requestToken({ interactive });
        const params = new URLSearchParams({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '20',
        });

        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
            localStorage.removeItem(GCAL_TOKEN_KEY);
            this.accessToken = null;
            throw new Error('UNAUTHORIZED');
        }

        if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);

        const data = await res.json();
        return (data.items || []).map(normalizeEvent);
    },
};

function normalizeEvent(item) {
    const allDay = !!item.start.date;
    const start = new Date(item.start.dateTime || item.start.date);
    const end = new Date(item.end.dateTime || item.end.date);
    return {
        id: item.id,
        title: item.summary || '(No title)',
        location: item.location || '',
        allDay,
        start,
        end,
        link: item.htmlLink,
    };
}

window.GCal = GCal;
