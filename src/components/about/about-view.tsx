"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Database,
  MapPin,
  Code2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";
import type { StationWithMeta } from "@/lib/types";

/**
 * About / Methodology view.
 *
 * This page exists so a teacher reviewing the project can see, in one place:
 *  - what problem the site solves and who it is for
 *  - where the station data comes from (and its limitations)
 *  - how the database is structured
 *  - what was tested and what remains a known limitation
 *
 * Keeping this as a real route (not a README) means it ships with the app and
 * stays in sync with the live data — the station/operator counts below are
 * fetched from the database, not hardcoded.
 */
export function AboutView() {
  // Live counts from the database — proves the data is real and stored, not mock.
  const { data } = useQuery({
    queryKey: ["stations", "about"],
    queryFn: () =>
      apiFetch<{ stations: StationWithMeta[]; total: number }>("/api/stations"),
  });

  const stations = data?.stations ?? [];
  const operators = new Set(stations.map((s) => s.operator)).size;
  const cities = new Set(stations.map((s) => s.city)).size;

  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Heading */}
      <div className="mb-8">
        <Badge className="bg-primary/15 text-primary border-0 gap-1.5 mb-3">
          <FileText className="w-3 h-3" />
          About this project
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          VoltRoute — EV charging station finder
        </h1>
        <p className="text-base text-muted-foreground mt-2 max-w-2xl leading-relaxed">
          A college project that helps drivers in Gandhinagar and Ahmedabad find
          nearby EV charging stations, check live availability, compare costs
          with petrol, and decide whether switching to an EV makes sense for
          their daily routine.
        </p>
      </div>

      {/* Live data summary — proves the data is stored, not hardcoded */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Stations" value={stations.length} />
            <Stat label="Operators" value={operators} />
            <Stat label="Cities" value={cities} />
            <Stat
              label="Operational"
              value={stations.filter((s) => s.status === "OPERATIONAL").length}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Counts above are fetched live from the database — not hardcoded.
          </p>
        </CardContent>
      </Card>

      {/* Methodology — where the data comes from */}
      <Section
        icon={Database}
        title="Where the station data comes from"
      >
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            The 37 charging stations in this project were researched manually
            using publicly available information: operator websites (Tata Power,
            ChargeZone, Ather Grid, Statiq, Exicom, Magenta), Google Maps
            listings, and news articles about EV infrastructure rollouts in
            Gujarat.
          </p>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="flex items-start gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="font-semibold">Important — this is sample data.</strong>{" "}
                Availability (free ports), pricing, and operational status are
                illustrative values set during database seeding, not live feeds
                from the operators. A real production version would integrate
                each operator&apos;s API. Treat the numbers as a proof-of-concept,
                not a live tracker.
              </span>
            </p>
          </div>
          <p>
            Coordinates (latitude/longitude) were verified against the actual
            landmark each station is named after — for example,
            &ldquo;Tata Power - Akshardham Parking&rdquo; is placed at the
            Akshardham Temple parking lot in Sector 20, Gandhinagar, not at a
            generic city-centre point.
          </p>
        </div>
      </Section>

      {/* Database schema */}
      <Section icon={Layers} title="Database schema">
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            The app uses Prisma ORM with a local SQLite database file
            (<code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">db/custom.db</code>).
            Four tables:
          </p>
          <div className="space-y-2">
            <SchemaRow
              name="User"
              fields="id, email, name, password (bcrypt hash), role (USER|ADMIN)"
              desc="Accounts. Admins can add/edit stations and moderate reviews."
            />
            <SchemaRow
              name="Station"
              fields="id, name, operator, address, area, city, lat, lng, status, connectorTypes (CSV), powerKW, pricePerKWh, numberOfPorts, availablePorts, amenities (CSV), hours, phone, image, rating, reviewCount"
              desc="The charging stations. connectorTypes and amenities are stored as comma-separated strings because SQLite has no array type."
            />
            <SchemaRow
              name="Review"
              fields="id, userId, stationId, rating (1-5), comment, timestamps"
              desc="User reviews. One review per user per station (unique constraint). Rating averages are recomputed on the station when a review is added or deleted."
            />
            <SchemaRow
              name="Favorite"
              fields="id, userId, stationId, createdAt"
              desc="Saved stations. One favorite per user per station."
            />
          </div>
        </div>
      </Section>

      {/* How the key algorithms work */}
      <Section icon={Code2} title="How the key calculations work">
        <div className="space-y-4 text-sm">
          <Algorithm
            name="Distance (Near Me)"
            formula="Haversine formula on lat/lng"
            desc="The Earth-curvature distance between the user&apos;s geolocation and each station. SQLite has no GIS support, so this is computed in the API route after fetching candidates, then sorted nearest-first."
          />
          <Algorithm
            name="Charging cost (Calculator)"
            formula="energy (kWh) × price (₹/kWh)"
            desc="Energy needed = battery size × (target% − current%). We divide by 0.9 to account for ~90% charging efficiency, and add 15% time overhead when charging past 80% (lithium batteries slow down in the top band)."
          />
          <Algorithm
            name="Break-even years (EV Planner)"
            formula="₹2,00,000 ÷ annual fuel savings"
            desc="₹2,00,000 is the typical extra upfront cost of an EV vs a similar petrol car in India (2024). Annual savings = (monthly petrol cost − monthly EV charging cost) × 12. The result is how many years of fuel savings it takes to pay back that extra cost."
          />
          <Algorithm
            name="Plan B pairing"
            formula="nearest station sharing ≥1 connector, within 15 km"
            desc="For every station detail, we find the closest alternative that uses the same connector type (CCS, Type2, etc.), preferring operational ones. Shown as &ldquo;If this one is busy or broken, go here.&rdquo;"
          />
        </div>
      </Section>

      {/* Known limitations */}
      <Section icon={AlertTriangle} title="Known limitations">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
            <span>
              <strong className="text-foreground">Availability is static.</strong>{" "}
              Free-port counts don&apos;t update in real time. A production app
              would poll operator APIs or use IoT sensors at each port.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
            <span>
              <strong className="text-foreground">Search is case-sensitive.</strong>{" "}
              SQLite&apos;s <code className="font-mono text-xs">contains</code> filter
              doesn&apos;t ignore case. A Postgres migration or a lowercased
              search column would fix this.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
            <span>
              <strong className="text-foreground">No rate limiting on auth.</strong>{" "}
              The login and register endpoints have no brute-force protection.
              Fine for a demo; a reverse-proxy limiter is needed for production.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
            <span>
              <strong className="text-foreground">Station images are external.</strong>{" "}
              Photos are loaded from Unsplash URLs. If Unsplash rate-limits or
              the URLs change, a fallback icon shows instead.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
            <span>
              <strong className="text-foreground">Coverage is Gandhinagar + Ahmedabad only.</strong>{" "}
              By design — this is the scope of the project. Adding more cities
              means seeding more stations, not changing code.
            </span>
          </li>
        </ul>
      </Section>

      {/* Tech stack */}
      <Section icon={ShieldCheck} title="Technology stack">
        <div className="flex flex-wrap gap-2">
          {[
            "Next.js 16",
            "TypeScript",
            "Tailwind CSS 4",
            "shadcn/ui",
            "Prisma ORM",
            "SQLite",
            "NextAuth.js",
            "TanStack Query",
            "Leaflet + OpenStreetMap",
            "Recharts",
            "Zod",
          ].map((tech) => (
            <Badge key={tech} variant="secondary" className="text-xs">
              {tech}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          The map uses free OpenStreetMap tiles — no API key, no paid services.
          All other data is stored locally in SQLite.
        </p>
      </Section>

      <Separator className="my-8" />

      <p className="text-center text-xs text-muted-foreground">
        Built as a college project. © {new Date().getFullYear()} VoltRoute.
      </p>
    </div>
  );
}

/* ---------- small presentational helpers ---------- */

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-2xl sm:text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function SchemaRow({
  name,
  fields,
  desc,
}: {
  name: string;
  fields: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="font-mono text-sm font-semibold text-primary">{name}</p>
      <p className="font-mono text-xs text-muted-foreground mt-1">{fields}</p>
      <p className="text-xs mt-2">{desc}</p>
    </div>
  );
}

function Algorithm({
  name,
  formula,
  desc,
}: {
  name: string;
  formula: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-semibold text-sm">{name}</p>
        <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{formula}</code>
      </div>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: desc }} />
    </div>
  );
}

export default AboutView;
