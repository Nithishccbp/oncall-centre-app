# Call Centre on Android

Two ways. Do Option 1 first (2 minutes), Option 2 gives a real .apk file.

## Option 1 — Install from Chrome (no build)
1. On the Android phone open Chrome and go to https://oncall-centre-app.vercel.app
2. Tap the ⋮ menu → **Install app** (or **Add to Home screen**).
3. Open **OG Calls** from the home screen. It runs full-screen like an app.
4. First call: allow **Microphone** when asked.

## Option 2 — Real APK (built in the cloud, no Android Studio)
1. Push this project to GitHub (GitHub Desktop → Commit → Push).
2. GitHub → your repo → **Actions** → **Build Android APK** → **Run workflow**.
3. After ~5 minutes open the finished run → **Artifacts** → download **OG-Calls-apk** → unzip.
4. Send `app-debug.apk` to the phone (WhatsApp / Drive / USB) and open it.
   Allow "Install unknown apps" if Android asks.

The app opens your live site, so every Vercel deploy updates the app automatically.
To point it somewhere else, change the URL when you press **Run workflow**.

## Good to know
- Calls, Avani AI and telephony use the phone microphone: allow it when asked.
- Practice mode listens with the browser's speech recognition. It works in **Chrome (Option 1)**. Inside the APK it can be limited by Android's WebView; if so use Option 1 for Practice.
- The debug APK is for testing and sharing. A Play Store release needs a signing key (ask me and I'll add it).
