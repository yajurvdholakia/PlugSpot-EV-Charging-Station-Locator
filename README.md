
# ⚡ PlugSpot
### EV Charging Station Locator

**Discover charging stations • Compare charging options • Plan your next charge**

A full-stack academic web application built with **Next.js, React, TypeScript, Prisma, and SQLite**.
---

## 📖 Overview

**PlugSpot** is an EV charging station discovery platform designed to make it easier to find and compare charging locations. Users can browse charging stations, examine charger specifications, and use search and filtering tools to narrow down suitable options. The project brings station details, mapping, and account-related features into a single responsive interface.

The project demonstrates full-stack application development through Next.js API routes, database-backed station listings, user authentication, and data management with Prisma ORM.

> **Academic demo notice:** The included station information is demonstration/project data. Charger status, pricing, and availability are **not verified live information** and should not be relied on for actual charging trips.

## 🎯 Objectives

- Make EV charging station information easier to discover and compare.
- Present useful details such as location, charging connectors, power, pricing, ports, and amenities.
- Demonstrate practical frontend, backend, authentication, and database integration.
- Provide an accessible, responsive interface for exploring charging infrastructure.

## ✨ Key Features

| Feature | Description |
| --- | --- |
| **Charging station directory** | Browse stations and inspect their details. |
| **Search and filters** | Narrow listings based on supported station attributes. |
| **Interactive map** | Explore station locations using Leaflet-based map components. |
| **Station information** | View address, operator, connector types, power, indicative pricing, ports, amenities, and hours when present. |
| **Accounts** | Registration and authentication infrastructure. |
| **Favorites and reviews** | Backend support for saving favorite stations and submitting reviews. |
| **Admin functionality** | Administrative interface and API routes for project management features. |
| **Additional tools** | Project components include trip-planning, charging-cost calculation, and destination views. |
| **Responsive interface** | Layout designed for desktop and mobile browsers. |

> Some features require signing in or appropriate user permissions. Availability of particular screens depends on the application configuration.

## 🛠 Technology Stack

| Area | Technologies |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS, shadcn/ui-style components |
| Backend | Next.js API routes |
| Database | SQLite |
| ORM | Prisma 6.19.3 |
| Authentication | NextAuth, bcryptjs |
| Maps | Leaflet, React Leaflet |
| Validation | Zod |

## 🗂 Project Structure

```text
PlugSpot/
├── src/
│   ├── app/                # App Router pages, styles, API endpoints
│   │   └── api/            # Stations, auth, reviews, favorites, admin, etc.
│   ├── components/         # UI, map, planner, calculator, admin views
│   ├── hooks/              # React hooks
│   └── lib/                # Prisma, auth, validation, utilities
├── prisma/
│   └── schema.prisma       # Database models and relations
├── scripts/                # Database seeding / utility scripts
├── public/                 # Static assets
├── db/                     # Local SQLite database (if provided)
├── package.json
├── package-lock.json
└── README.md
```

## 🚀 Run Locally

### Prerequisites

- **Node.js 20.9+** and npm
- Git (optional, for cloning)

### 1. Get the source code

Clone the repository using its actual URL:

```bash
git clone https://github.com/YOUR_USERNAME/PlugSpot-EV-Charging-Station-Locator.git
cd PlugSpot-EV-Charging-Station-Locator
```

Alternatively, use **Code → Download ZIP** on GitHub and extract it.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="file:../db/custom.db"
```

The path above is resolved relative to `prisma/schema.prisma` and points to `db/custom.db`. Configure any additional environment variables required by the authentication setup locally; never commit real secrets.

### 4. Prepare the database

**If a safe demonstration database is supplied**, place it at `db/custom.db`. The Windows-ready project package was tested against a demo database containing **37 station records**.

If the repository **does not include a database**, create the `db` folder and initialize the schema:

```bash
npx prisma db push
```

Then populate the station table using the project's reviewed seed script:

```bash
npm run seed
```

**Important:** Database schema creation does not itself insert stations. Review seed scripts before running them; never reset a database containing information you need to keep.

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Start the development server

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

### Windows quick start (if included)

If your copy of the project includes `START_PLUGSPOT.bat` and a compatible `db/custom.db`, you can double-click the batch file to install/check dependencies, generate Prisma Client, and launch the local development server.

## 🔎 Verify the Station API

Once the server is running, open:

```text
http://localhost:3000/api/stations
```

For the supplied demonstration database, the unfiltered API is expected to expose **37 stations**. You can also inspect database records with:

```bash
npx prisma studio
```

If the station list is empty, check whether `DATABASE_URL` points to the correct SQLite file and whether that database contains station records.

## 📜 Useful Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run local development server |
| `npm run build` | Create a production build |
| `npm run start` | Start a production build |
| `npx prisma generate` | Generate Prisma Client |
| `npx prisma studio` | Open database browser |
| `npx prisma db push` | Synchronize database schema (review changes first) |
| `npm run seed` | Run the configured seed script (review first) |

## 🔐 Security and Data Notes

- **Do not commit** `.env`, `.env.local`, passwords, tokens, `node_modules/`, or `.next/`.
- Do not publish an SQLite database containing real user accounts, password hashes, or private reviews. Use a sanitized demo database or safe seed data instead.
- For production deployments, configure the environment variables on the hosting platform.
- SQLite requires suitable persistent storage if application data must survive restarts and redeployments; not all hosting environments provide this by default.
- The project is an academic prototype, **not a live charging availability or booking service**.

## 🧪 Suggested Demonstration Flow

1. Open the homepage and explain the problem PlugSpot addresses.
2. Browse the station directory and demonstrate search/filter functionality.
3. Open a station and explain its connector, power, pricing, and location information.
4. Demonstrate the map and any additional tools enabled in the deployed application.
5. Show account, favorites, reviews, or admin functionality where configured.
6. Explain the Next.js API → Prisma → SQLite data flow.

## 🌱 Future Scope

- Verified live charging station availability and operator integrations.
- Improved trip planning and route-aware charging suggestions.
- Charging slot reservations and payment integration.
- Expanded geographic coverage and community feedback.
- More advanced filtering and accessibility improvements.

## 🎓 Academic Information

**Project:** PlugSpot — EV Charging Station Locator  
**Coursework:** Computer Engineering academic project  
**IAR Number:** 15853  
**Purpose:** Project implementation, demonstration, and evaluation

---

**PlugSpot — Helping make EV charging information easier to explore.**

</div>
