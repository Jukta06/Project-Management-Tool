# Frontend (static) — Project Management Tool

This frontend is a lightweight static rewrite (vanilla HTML/CSS/JS) that talks to the existing backend API.

Run locally (from the `frontend` folder):

```powershell
npm install
npm start
```

- `npm start` runs `node server.js` which serves files from this folder.
- `npm run build` will produce a simple `build/` directory (via `build.js`).

Config is available at `public/config.js` and injected as `window.APP_CONFIG`.

Notes:
- Backend endpoints are unchanged; the static frontend uses `window.APP_CONFIG.API_BASE`.
- This rewrite focuses on preserving styling and core behaviors (auth, projects, profile, notifications). Some advanced features (drag-and-drop, realtime presence) are not reimplemented here.
