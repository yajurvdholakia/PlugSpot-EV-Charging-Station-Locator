# PlugSpot — Windows-ready package

1. Extract the entire ZIP to a normal folder, preferably `C:\PlugSpot` (avoid running from inside the ZIP).
2. Install Node.js 20.9 or newer if needed.
3. Close any other running PlugSpot/Next.js/Prisma terminals.
4. Double-click `START_PLUGSPOT.bat`. On first run it installs dependencies and generates Prisma Client, then starts the server.
5. Open http://localhost:3000. To verify the API, visit http://localhost:3000/api/stations (should return `total: 37` if no filters are applied).

Included `db/custom.db` already contains 37 demo station records, 3 user records and 61 reviews. The launcher makes a database backup if one does not already exist. No `prisma db push` or seeding is required.

If the station API returns an error, inspect the terminal output. If `EPERM` occurs, close all Node/Prisma processes and retry. If port 3000 is occupied, stop the other Next.js instance.

**Caution:** Station names and operational details are sample/project data, not guaranteed real-time verified charger availability.

Changes: fixed SQLite `DATABASE_URL`, pinned Prisma and Client to 6.19.3, fixed `npm run seed` to execute TypeScript, replaced the original broken/destructive seed script with a non-destructive station-only seed. The seed script skips insertion when stations already exist. Existing SQLite data preserved.
