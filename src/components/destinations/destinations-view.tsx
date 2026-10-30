"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  Clock,
  Battery,
  Route,
  IndianRupee,
  Navigation,
  Zap,
  Building2,
  Car,
  Timer,
  Info,
  ExternalLink,
  Check,
  ChevronDown,
  Footprints,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import type { Station, StationStatus } from "@/lib/types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface Landmark {
  name: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  category: string;
}

interface DestinationStation extends Station {
  distance: number; // km from landmark
  chargeAddedKWh: number;
  rangeAddedKm: number;
  estimatedCost: number; // ₹
  walkTimeMin: number;
}

interface DestinationSearchResponse {
  landmark: Landmark;
  durationMinutes: number;
  stations: DestinationStation[];
  total: number;
}

interface LandmarksResponse {
  landmarks: Landmark[];
}

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const MIN_DURATION = 15;
const MAX_DURATION = 360;
const STEP_DURATION = 15;
const DEFAULT_DURATION = 90;
const CHARGE_CAP_KWH = 40;
const SEARCH_RADIUS_KM = 2;

const QUICK_DURATIONS = [
  { label: "30m", value: 30 },
  { label: "1h", value: 60 },
  { label: "2h", value: 120 },
  { label: "4h", value: 240 },
];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** 90 -> "1h 30m", 30 -> "30m", 360 -> "6h" */
function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Group landmarks by city, preserving original order within each city. */
function groupByCity(landmarks: Landmark[]): { city: string; items: Landmark[] }[] {
  const order: string[] = [];
  const map = new Map<string, Landmark[]>();
  for (const l of landmarks) {
    if (!map.has(l.city)) {
      map.set(l.city, []);
      order.push(l.city);
    }
    map.get(l.city)!.push(l);
  }
  return order.map((city) => ({ city, items: map.get(city)! }));
}

function statusBadgeClass(status: StationStatus): string {
  switch (status) {
    case "OPERATIONAL":
      return "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "MAINTENANCE":
      return "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "OFFLINE":
      return "border-transparent bg-red-500/15 text-red-700 dark:text-red-400";
    default:
      return "";
  }
}

function statusLabel(status: StationStatus): string {
  switch (status) {
    case "OPERATIONAL":
      return "Operational";
    case "MAINTENANCE":
      return "Maintenance";
    case "OFFLINE":
      return "Offline";
    default:
      return status;
  }
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------

export function DestinationsView() {
  const [selectedName, setSelectedName] = React.useState<string | null>(null);
  const [duration, setDuration] = React.useState<number>(DEFAULT_DURATION);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // Load the landmark list once.
  const { data: landmarksData, isLoading: landmarksLoading } = useQuery({
    queryKey: ["destinations-landmarks"],
    queryFn: () => apiFetch<LandmarksResponse>("/api/destinations"),
    staleTime: 5 * 60 * 1000,
  });

  const landmarks = landmarksData?.landmarks ?? [];
  const selectedLandmark = landmarks.find((l) => l.name === selectedName) ?? null;

  // Run the destination search whenever both landmark + duration are set.
  const { data: result, isLoading: searching } = useQuery({
    queryKey: ["destination-search", selectedName, duration],
    queryFn: () =>
      apiFetch<DestinationSearchResponse>("/api/destinations", {
        method: "POST",
        body: JSON.stringify({
          landmarkName: selectedName,
          durationMinutes: duration,
        }),
      }),
    enabled: !!selectedName,
  });

  const stations = result?.stations ?? [];
  const maxCharge = stations.reduce(
    (max, s) => Math.max(max, s.chargeAddedKWh),
    0
  );
  const maxRange = stations.reduce(
    (max, s) => Math.max(max, s.rangeAddedKm),
    0
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <Header />

      {/* ---------- Input panel ---------- */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="w-4 h-4 text-primary" />
            Where are you going?
          </CardTitle>
          <CardDescription>
            Pick a landmark and how long you&apos;ll be there. We&apos;ll find
            chargers within {SEARCH_RADIUS_KM} km and estimate how much charge
            you&apos;ll add.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Landmark picker */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              Destination
            </label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  className="justify-between h-11 font-normal"
                >
                  {selectedLandmark ? (
                    <span className="flex items-center gap-2 truncate">
                      <Building2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">
                        {selectedLandmark.name}
                        <span className="text-muted-foreground">
                          {" "}
                          · {selectedLandmark.area}
                        </span>
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {landmarksLoading
                        ? "Loading landmarks..."
                        : "Search a landmark (mall, temple, park, station...)"}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] min-w-[300px] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Type a landmark or area..." />
                  <CommandList>
                    <CommandEmpty>No landmark found.</CommandEmpty>
                    {groupByCity(landmarks).map((group) => (
                      <CommandGroup
                        key={group.city}
                        heading={group.city}
                      >
                        {group.items.map((l) => (
                          <CommandItem
                            key={`${l.city}-${l.name}`}
                            value={`${l.name} ${l.area} ${l.category} ${l.city}`}
                            onSelect={() => {
                              setSelectedName(l.name);
                              setPickerOpen(false);
                            }}
                          >
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="font-medium">{l.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {l.area} · {l.category}
                              </span>
                            </div>
                            {selectedName === l.name && (
                              <Check className="w-4 h-4 text-primary ml-auto" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Duration control */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-primary" />
                How long will you be there?
              </label>
              <span className="text-sm font-semibold text-primary tabular-nums flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(duration)}
              </span>
            </div>
            <Slider
              value={[duration]}
              min={MIN_DURATION}
              max={MAX_DURATION}
              step={STEP_DURATION}
              onValueChange={(v) => setDuration(v[0] ?? DEFAULT_DURATION)}
              className="py-1"
            />
            <div className="flex flex-wrap gap-2">
              {QUICK_DURATIONS.map((q) => (
                <Button
                  key={q.value}
                  type="button"
                  size="sm"
                  variant={duration === q.value ? "default" : "outline"}
                  onClick={() => setDuration(q.value)}
                  className="h-8"
                >
                  {q.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Results ---------- */}
      <div className="mt-6">
        {!selectedLandmark ? (
          <EmptyPrompt />
        ) : searching ? (
          <ResultsSkeleton />
        ) : stations.length === 0 ? (
          <NoResults landmarkName={selectedLandmark.name} />
        ) : (
          <Results
            landmarkName={selectedLandmark.name}
            durationMinutes={duration}
            stations={stations}
            maxCharge={maxCharge}
            maxRange={maxRange}
          />
        )}
      </div>

      {/* ---------- Info note ---------- */}
      <InfoNote />
    </div>
  );
}

export default DestinationsView;

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------

function Header() {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Navigation className="w-5 h-5" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Destination Search
        </h1>
      </div>
      <p className="text-sm text-muted-foreground max-w-2xl">
        Going somewhere? Find chargers near your destination and see how much
        charge you&apos;ll add while you&apos;re there.
      </p>
    </header>
  );
}

function EmptyPrompt() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-lg border border-dashed border-border bg-muted/30"
    >
      <div className="w-16 h-16 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Search className="w-7 h-7" />
      </div>
      <h2 className="text-lg font-semibold">Pick a destination above</h2>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
        Choose a landmark like Alpha One Mall, Akshardham, or Kankaria Lake,
        set your visit duration, and we&apos;ll show nearby chargers with the
        charge you&apos;d gain.
      </p>
    </motion.div>
  );
}

function NoResults({ landmarkName }: { landmarkName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-lg border border-dashed border-border bg-muted/30"
    >
      <div className="w-16 h-16 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
        <MapPin className="w-7 h-7" />
      </div>
      <h2 className="text-lg font-semibold">No chargers nearby</h2>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
        No charging stations within {SEARCH_RADIUS_KM} km of{" "}
        <span className="font-medium text-foreground">{landmarkName}</span>.
        Try a different destination.
      </p>
    </motion.div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-10 w-full rounded-lg" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-lg" />
      ))}
    </div>
  );
}

function Results({
  landmarkName,
  durationMinutes,
  stations,
  maxCharge,
  maxRange,
}: {
  landmarkName: string;
  durationMinutes: number;
  stations: DestinationStation[];
  maxCharge: number;
  maxRange: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Summary line */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3"
      >
        <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">{stations.length}</span>{" "}
          {stations.length === 1 ? "station" : "stations"} within{" "}
          {SEARCH_RADIUS_KM} km of{" "}
          <span className="font-semibold">{landmarkName}</span>. At{" "}
          <span className="font-semibold">{formatDuration(durationMinutes)}</span>
          , you could add up to{" "}
          <span className="font-semibold text-primary">
            {maxCharge.toFixed(1)} kWh
          </span>{" "}
          <span className="text-muted-foreground">
            (~{maxRange} km of range)
          </span>
          .
        </p>
      </motion.div>

      {/* Station cards (staggered) */}
      <motion.div
        className="flex flex-col gap-3"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 1 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 },
          },
        }}
      >
        {stations.map((s) => (
          <StationResultCard key={s.id} station={s} />
        ))}
      </motion.div>
    </div>
  );
}

function StationResultCard({ station }: { station: DestinationStation }) {
  const isOperational = station.status === "OPERATIONAL";
  const chargePct = Math.min(
    100,
    Math.round((station.chargeAddedKWh / CHARGE_CAP_KWH) * 100)
  );

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -2 }}
    >
      <Card className="gap-0 py-0 overflow-hidden">
        {/* Top row: identity + status */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 sm:p-5">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold leading-tight truncate">
                {station.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 flex-wrap">
                <span>{station.operator}</span>
                <span aria-hidden>·</span>
                <span>{station.area}</span>
              </div>
            </div>
          </div>
          <Badge className={statusBadgeClass(station.status)}>
            {statusLabel(station.status)}
          </Badge>
        </div>

        <Separator />

        {/* Distance + walk time strip */}
        <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-muted/40 text-xs">
          <Navigation className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium">{station.distance.toFixed(1)} km</span>
          <span className="text-muted-foreground" aria-hidden>·</span>
          <Footprints className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            {station.walkTimeMin} min walk
          </span>
        </div>

        <Separator />

        {/* The three big numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {/* Charge added */}
          <Metric
            icon={Battery}
            label="Charge added"
            value={
              isOperational ? (
                <>
                  <span className="text-primary">
                    {station.chargeAddedKWh.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground text-base font-normal ml-1">
                    kWh
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Unavailable</span>
              )
            }
            sub={
              isOperational ? (
                <Progress value={chargePct} className="mt-2 h-1.5" />
              ) : null
            }
            highlight
          />

          {/* Range added */}
          <Metric
            icon={Route}
            label="Range added"
            value={
              isOperational ? (
                <span className="inline-flex items-baseline gap-1.5">
                  <Car className="w-5 h-5 text-primary self-center" />
                  <span>
                    ~{station.rangeAddedKm}
                    <span className="text-muted-foreground text-base font-normal ml-1">
                      km
                    </span>
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />

          {/* Estimated cost */}
          <Metric
            icon={IndianRupee}
            label="Est. cost"
            value={
              isOperational ? (
                <>
                  ₹
                  {station.estimatedCost.toLocaleString("en-IN")}
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
        </div>

        <Separator />

        {/* Footer: connectors + CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-1.5">
            {station.connectorTypes.length > 0 ? (
              station.connectorTypes.map((c) => (
                <Badge key={c} variant="outline" className="font-normal">
                  {c}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">
                No connector info
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-1">
              · {station.powerKW} kW · {station.availablePorts}/
              {station.numberOfPorts} ports
            </span>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation className="w-4 h-4" />
              Get Directions
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-4 sm:px-5 py-3.5 flex flex-col gap-1",
        highlight && "bg-primary/5"
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="text-2xl font-bold leading-tight tabular-nums">
        {value}
      </div>
      {sub}
    </div>
  );
}

function InfoNote() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3"
    >
      <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground">How we calculate:</span>{" "}
        Charge added = power (kW) × time (h), capped at {CHARGE_CAP_KWH} kWh per
        session. Range estimate uses 6 km/kWh efficiency (typical EV). Actual
        results vary by vehicle and battery state.
      </p>
    </motion.div>
  );
}
