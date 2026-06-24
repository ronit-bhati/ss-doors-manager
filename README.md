# SS Doors Manager

A purpose-built desktop application for **SS Doors** — a professional order management and calculation tool that replaces manual paper-based workflows with a fast, reliable, and accurate digital system.

---

## Overview

SS Doors Manager is a fully offline desktop application built for shop owners and managers at SS Doors. It streamlines the complete order lifecycle — from client registration and custom measurement entry, to cost calculation, order history, and professional print-ready receipts — all without relying on spreadsheets or handwritten records.

The application is designed for use in a busy shop or office environment where speed, accuracy, and physical readability are essential.

---

## Key Features

- **Client Management** — Register and maintain a structured client database with full order history per client.
- **Custom Order Entry** — Input door and chaukhat measurements with support for mixed units; the app handles all unit conversions and calculations automatically.
- **Live Cost Calculation** — Rates, subtotals, and grand totals are computed in real time as measurements are entered, eliminating manual arithmetic and reducing errors.
- **Order History** — Browse, search, and review all past orders with full measurement and pricing breakdowns.
- **Print-Ready Receipts** — Generate clean, high-contrast order sheets formatted for physical printing — suitable for handing to the workshop or the client.
- **PDF Export** — Export order summaries as PDF documents directly from the application.
- **Settings & Rate Management** — Update material rates and preferences from a centralized settings panel; all calculations reflect changes immediately.
- **Fully Offline** — All data is stored locally using SQLite. No internet connection, cloud account, or subscription required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 + TypeScript |
| Desktop Shell | Electron 30 |
| Build Tool | Vite 5 |
| Database | SQLite via `better-sqlite3` |
| Routing | React Router v7 |
| Icons | Lucide React |
| Packaging | Electron Builder |

---

## Platform Support

| Platform | Format |
|---|---|
| Windows (x64) | NSIS Installer (`.exe`) |
| Linux | AppImage (`.AppImage`) |
| macOS | DMG Installer (`.dmg`) |

---

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

This starts the Vite dev server alongside the Electron shell with Hot Module Replacement (HMR) enabled.

---

## Building for Production

### Windows (x64 NSIS Installer)

```bash
npm run build:win
```

### Linux (AppImage)

```bash
npm run build:linux
```

### All Platforms (default)

```bash
npm run build
```

Built artifacts are output to `release/<version>/`.

---

## Project Structure

```
ss-doors-manager/
├── electron/           # Electron main process (main.ts, preload.ts, db.ts, pdf.ts)
│   └── ipc/            # IPC handlers for renderer ↔ main communication
├── src/
│   ├── pages/          # Application views (Clients, New Order, Order Detail, Print, Settings)
│   ├── components/     # Reusable UI components
│   └── lib/            # Utility functions and type definitions
├── build/              # Build resources (icons)
├── release/            # Packaged installers output directory
├── electron-builder.json5
├── vite.config.ts
└── package.json
```

---

## Data & Privacy

All application data — clients, orders, measurements, and rates — is stored in a local SQLite database on the user's machine. No data is transmitted over the internet. Uninstalling the application does not delete the local database unless explicitly configured to do so.

---

## License

This software is proprietary and developed exclusively for **SS Doors**. Unauthorized copying, distribution, or modification is not permitted.

© 2025 SS Doors. All rights reserved.
