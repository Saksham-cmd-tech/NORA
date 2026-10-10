# NORA — Personal Train Wallet

> **An offline-first, privacy-focused digital travel wallet and companion for Indian Railways.**

NORA automatically captures train tickets from SMS and app notifications (IRCTC & redRail), aggregates PNR and passenger updates, renders interactive digital boarding passes, provides exact coach layouts & seat maps, and delivers live train status with pre-journey alert notifications.

---

## Highlights & Features

- **Automatic Ticket Ingestion**: Instant local parsing of IRCTC and redRail booking & confirmation messages from device notifications and SMS without cloud round-trips.
- **Smart PNR Reconciliation & Merging**: Automatically tracks PNR status transitions (RAC/WL $\rightarrow$ CNF) and chart preparation updates, updating coach and berth allocations seamlessly.
- **Digital Boarding Pass**: Tactile, travel-inspired pass design with station schedules, platform indicators, passenger lists, and high-contrast night mode.
- **Coach Position & Seat Maps**: Complete rake compositions (e.g., Vande Bharat, Rajdhani, Shatabdi, Superfast) with interactive cabin blueprints (Window Seat, Middle Seat, Aisle Seat highlighting).
- **CRIS / NTES Live Radar**: Native Web Crypto Cloudflare Worker proxy connecting directly to official National Train Enquiry System (NTES) endpoints for real-time train running status, station halts, delays, and official train names.
- **Pre-Journey Native Notifications**: Native Android AlarmManager reminders scheduled for 24h, 4h, 1h, and 30m prior to departure with platform updates and quick ticket access.
- **Ticket Sharing**: Generate clean, shareable journey cards or copy formatted travel summaries directly to clipboard/messaging apps.
- **100% Offline Resilience**: All tickets and journey data are persisted locally using SQLite (`op-sqlite`). The app stays fully functional underground or in low-connectivity areas.

---

## Architecture & Tech Stack

- **Frontend**: [React Native 0.87](https://reactnative.dev) + [TypeScript](https://www.typescriptlang.org)
- **Database**: [@op-engineering/op-sqlite](https://github.com/OP-Engineering/op-sqlite) (high-performance native SQLite)
- **Icons & UI**: [Lucide Icons](https://lucide.dev) + Custom SVG Blueprints
- **Backend Proxy**: [Cloudflare Workers](https://workers.cloudflare.com) (100% standard Web Crypto AES-128-CBC + JS MD5 querying NTES)
- **Android Native Modules**: Custom notification listener, alarm scheduler, and share sheet bridge in Kotlin

---

## Project Structure

```
NORA/
├── android/                 # Native Android project (Kotlin, AlarmManager, bridges)
├── ios/                     # Native iOS project (Swift, Podfile)
├── cloudflare-worker/       # Standalone Cloudflare Worker NTES proxy
│   ├── worker.js            # Pure Web Crypto NTES proxy script
│   └── wrangler.toml        # Wrangler configuration
├── src/
│   ├── components/          # Reusable UI widgets, tickets, and modals
│   ├── database/            # SQLite schema, migrations, and ticket repository
│   ├── parsers/             # IRCTC & redRail notification and SMS regex parsers
│   ├── screens/             # Wallet, Ticket Details, Train Status, Add Ticket
│   ├── services/            # RailRadar / NTES client, Notification & Alarm services
│   ├── theme/               # Dark-mode design tokens and typography
│   └── utils/               # Station codes dictionary, train names, date helpers
├── __tests__/               # Jest test suites (34 unit & integration tests)
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js $\ge$ 18
- JDK 17 (or Android Studio bundled JBR)
- Android SDK (API 34+)
- React Native CLI

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Saksham-cmd-tech/NORA.git
   cd NORA
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Deploy the Cloudflare Worker** (Optional but recommended for live telemetry):
   - Go to `cloudflare-worker/`
   - Deploy `worker.js` to your Cloudflare account using Wrangler or paste it into the Cloudflare Workers dashboard.
   - Set your worker URL in [src/services/railRadarService.ts](src/services/railRadarService.ts):
     ```typescript
     export const CLOUDFLARE_PROXY_URL = 'https://nora-rail-proxy.YOUR_SUBDOMAIN.workers.dev';
     ```

4. **Run on Android**:
   ```bash
   npm run android
   ```

5. **Run Tests**:
   ```bash
   npm test
   ```

---

## Privacy & Security

NORA is strictly local-first. Your travel itineraries, PNR numbers, passenger names, and booking messages remain on your device and are never sent to third-party advertising or telemetry trackers.

---

## License

MIT License. Built for seamless travel across Indian Railways.
