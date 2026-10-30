import { db } from "../src/lib/db";
import { SEED_STATIONS } from "../src/lib/seed-data";

async function main() {
  const existing = await db.station.count();
  if (existing > 0) {
    console.log(`Database already has ${existing} stations. No changes made.`);
    return;
  }
  for (const s of SEED_STATIONS) {
    await db.station.create({ data: {
      name: s.name, operator: s.operator, address: s.address,
      area: s.area, city: s.city, state: s.state,
      lat: s.lat, lng: s.lng, status: s.status,
      connectorTypes: s.connectorTypes.join(","),
      powerKW: s.powerKW, pricePerKWh: s.pricePerKWh,
      numberOfPorts: s.numberOfPorts, availablePorts: s.availablePorts,
      amenities: s.amenities.join(","), hours: s.hours,
      phone: s.phone || null, image: s.image || null,
    }});
  }
  console.log(`Inserted ${SEED_STATIONS.length} demo stations.`);
}
main().catch(e => { console.error(e); process.exitCode = 1; })
.finally(async () => { await db.$disconnect(); });
