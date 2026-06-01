# Fitora Fuels Tracker

Offline-ready order and expense tracker for Fitora Fuels.

## Open Locally

From this folder, run:

```powershell
python -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

## Install On Android Or iPhone

For mobile installation and offline loading, publish the folder to an HTTPS static host such as
GitHub Pages, Netlify, Vercel, Cloudflare Pages, or your own HTTPS website.

Upload these files and folders together:

```text
index.html
styles.css
app.js
manifest.webmanifest
sw.js
offline.html
favicon-32.png
icons/
```

Android Chrome:

1. Open the HTTPS app link.
2. Tap the browser menu.
3. Tap `Install app` or `Add to Home screen`.

iPhone Safari:

1. Open the HTTPS app link in Safari.
2. Tap Share.
3. Tap `Add to Home Screen`.

The tracker saves orders and expenses in the browser on that device. Use `Backup` and
`Reports > Import backup` to move data between devices.
