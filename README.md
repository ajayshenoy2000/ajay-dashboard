# AJay's Personal Assistant Dashboard

A lightweight, mobile-first dashboard hub for your apps and daily workflow. Built with vanilla HTML, CSS, and JavaScript.

## Features

- **Personalized Greeting** — Time-aware greeting (Good morning/afternoon/evening, AJay)
- **Quick Stats** — Task counter and current time at a glance
- **Today's Schedule** — Display your daily events and meetings
- **App Launcher** — Quick access to your apps (Beauty Trends linked, expandable for more)
- **Task Management** — Add, complete, and delete tasks with local persistence
- **Premium Design** — Off-white + chalky orange theme with light/dark mode support
- **Mobile-First** — Fully responsive design optimized for all screen sizes
- **Zero Dependencies** — Pure vanilla JavaScript, no build process needed

## Quick Start

1. Open `index.html` in your browser
2. Start adding tasks using the input field
3. Check off tasks when complete
4. Click "Beauty Trends" to access the LOR Trend Engine

## How It Works

- **Tasks** are saved to `localStorage` — they persist across sessions
- **Schedule** can be customized by editing the `schedule` array in `script.js`
- **Apps** are added as cards in the app grid — edit the `app-grid` section in `index.html`

## Customization

### Edit Your Schedule
In `script.js`, modify the schedule array:
```javascript
const schedule = [
    { time: '09:00', title: 'Team Standup', desc: 'Weekly sync' },
    { time: '14:00', title: 'Review Session', desc: 'Project check-in' },
];
```

### Add More Apps
In `index.html`, add new app cards to the `.app-grid` section:
```html
<a href="https://your-app-url.com" target="_blank" class="app-card">
    <div class="app-icon">⚙️</div>
    <div class="app-name">Your App</div>
    <div class="app-desc">Description</div>
</a>
```

### Theme Colors
Edit the CSS variables at the top of `style.css`:
```css
:root {
    --off-white: #f9f7f4;
    --orange: #ff9f1c;
    /* ... more colors ... */
}
```

## File Structure

```
ajay-dashboard/
├── index.html       # Main dashboard markup
├── style.css        # All styling (mobile-first)
├── script.js        # Task management logic
└── README.md        # This file
```

## Browser Support

Works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Powered by Claude

Built with ❤️ using Claude AI.
