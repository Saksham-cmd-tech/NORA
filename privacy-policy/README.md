# NORA Privacy Policy Website

This directory contains the official, standalone Privacy Policy website for **NORA (Notification Organized Rail Assistant)** (`dev.saksham.nora`).

Built with pure semantic HTML5, modern CSS3 (Apple Dark/Light aesthetic), and zero external dependencies or trackers, designed for instant deployment on **Vercel**.

---

## 🚀 Quick Deployment to Vercel

### Option 1: Deploy with Vercel CLI (Fastest, ~30 seconds)

1. Open your terminal and navigate to this directory:
   ```bash
   cd privacy-policy
   ```

2. Run Vercel CLI (no prior installation needed):
   ```bash
   npx vercel
   ```

3. Follow the interactive prompts:
   - **Set up and deploy?** → `Y`
   - **Which scope?** → Select your Vercel account
   - **Link to existing project?** → `N`
   - **What's your project's name?** → `nora-privacy-policy` (or your choice)
   - **In which directory is your code located?** → `./`
   - **Want to modify these settings?** → `N`

4. For production deployment:
   ```bash
   npx vercel --prod
   ```

Your Privacy Policy will immediately be live with a free SSL certificate (e.g., `https://nora-privacy-policy.vercel.app`).

---

### Option 2: Deploy via Vercel Web Dashboard (GitHub)

If your NORA repository is pushed to GitHub:

1. Go to [vercel.com/new](https://vercel.com/new).
2. Select and import your **NORA** repository.
3. In the **Project Configuration** screen:
   - **Project Name:** `nora-privacy-policy`
   - **Framework Preset:** `Other`
   - **Root Directory:** Click **Edit** and select `privacy-policy`
4. Click **Deploy**.

Any future git commits touching `privacy-policy/` will automatically trigger a new deployment.

---

## 💻 Local Preview

You can test the site locally using any static web server:

```bash
# Using Python
cd privacy-policy
python3 -m http.server 3000

# Or using npx serve
npx serve .
```

Then open `http://localhost:3000` in your browser.

---

## 📁 Directory Structure

```
privacy-policy/
├── index.html          # Semantic HTML5 policy page with scroll-spy & theme switcher
├── styles.css          # Apple-inspired dark/light theme, responsive layout & print styling
├── vercel.json         # Security headers and clean URLs configuration for Vercel
├── PRIVACY_POLICY.md   # Plain-text markdown copy of the full privacy policy
└── README.md           # This deployment guide
```

---

## 🎨 Features & Highlights

- **100% Tracker-Free:** No analytics, cookies, tracking pixels, or third-party CDNs.
- **Apple-Inspired Design:** Pure `#000000` dark mode with `#E53935` NORA brand accents, glassmorphic header, and SF Pro typography.
- **Dark & Light Mode:** System-aware theme toggle with smooth transitions.
- **Interactive Navigation:** Sticky Table of Contents with automatic scroll-spy highlighting active sections.
- **Print & PDF Ready:** Dedicated `@media print` stylesheet to cleanly export or print to PDF for Google Play Console compliance.
- **Responsive:** Fluid typography (`clamp()`) looking sharp across all mobile devices, tablets, and desktop displays.
