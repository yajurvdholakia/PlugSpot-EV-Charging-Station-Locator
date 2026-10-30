"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator,
  Battery,
  Fuel,
  IndianRupee,
  Zap,
  Route,
  TrendingUp,
  TrendingDown,
  Home,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Car,
  MapPin,
  ChevronRight,
  Loader2,
  Sparkles,
  Wallet,
  CalendarClock,
  Info,
  Lightbulb,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { haversineKm, type StationWithMeta } from "@/lib/types";
import { GANDHINAGAR_SECTORS, AHMEDABAD_AREAS } from "@/lib/seed-data";
import { cn } from "@/lib/utils";

interface PlannerViewProps {
  onExplore: () => void;
}

/* ----------------------------- constants ----------------------------- */

const EFFICIENCY_PRESETS = [
  { label: "Efficient — Tata Nexon EV", sub: "0.13 kWh/km", value: 0.13 },
  { label: "Average — mixed driving", sub: "0.15 kWh/km", value: 0.15 },
  { label: "Heavy — SUV / highway", sub: "0.18 kWh/km", value: 0.18 },
] as const;

const BATTERY_OPTIONS = [30, 40, 55, 75] as const;

const WEEKS_PER_MONTH = 4.33;
const EV_PREMIUM_INR = 200_000;
const DEFAULT_AVG_PRICE = 22;
const NEARBY_KM = 3;
const OWNERSHIP_HORIZON_YEARS = 8; // for break-even progress visualization

// Combined coordinate lookup, tagged with city for optgroups.
const ALL_AREAS = [
  ...GANDHINAGAR_SECTORS.map((a) => ({ ...a, city: "Gandhinagar" })),
  ...AHMEDABAD_AREAS.map((a) => ({ ...a, city: "Ahmedabad" })),
];

function findArea(name: string) {
  return ALL_AREAS.find((a) => a.name === name);
}

/** Format a number as Indian rupees (no decimals). */
function inr(n: number): string {
  const rounded = Math.round(n);
  return `₹${Math.abs(rounded).toLocaleString("en-IN")}`;
}

/** Format a number with up to 1 decimal place. */
function fmt1(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

/* --------------------------- animated number -------------------------- */

function AnimatedNumber({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className={cn("inline-block tabular-nums", className)}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

/* ------------------------------ verdict ------------------------------- */

type Verdict = "ready" | "tight" | "challenging";

const VERDICT_META: Record<
  Verdict,
  {
    title: string;
    desc: string;
    icon: React.ReactNode;
    wrap: string;
    iconWrap: string;
    titleCls: string;
  }
> = {
  ready: {
    title: "EV Ready",
    desc: "Public charging fits your weekly routine comfortably. Going electric looks like a smart move.",
    icon: <CheckCircle2 className="h-7 w-7" />,
    wrap: "bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-400/30",
    iconWrap: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    titleCls: "text-emerald-700 dark:text-emerald-400",
  },
  tight: {
    title: "Tight but doable",
    desc: "You'd be charging 4–5 times a week. Workable, but plan your top-ups — especially near your workplace.",
    icon: <AlertTriangle className="h-7 w-7" />,
    wrap: "bg-amber-500/10 border-amber-500/30 dark:border-amber-400/30",
    iconWrap: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    titleCls: "text-amber-700 dark:text-amber-400",
  },
  challenging: {
    title: "Challenging — consider home charging",
    desc: "Either you'd need to charge too often, or there aren't enough public stations near your home/work. Home or workplace charging would change the math.",
    icon: <AlertTriangle className="h-7 w-7" />,
    wrap: "bg-rose-500/10 border-rose-500/30 dark:border-rose-400/30",
    iconWrap: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    titleCls: "text-rose-700 dark:text-rose-400",
  },
};

/* ------------------------------ component ----------------------------- */

export function PlannerView({ onExplore }: PlannerViewProps) {
  // ---- inputs ----
  const [weeklyKm, setWeeklyKm] = React.useState(250);
  const [homeSectorName, setHomeSectorName] = React.useState<string>("Sector 28");
  const [workSectorName, setWorkSectorName] = React.useState<string>("Satellite");
  const [efficiency, setEfficiency] = React.useState<number>(0.15);
  const [battery, setBattery] = React.useState<number>(40);
  const [petrolMileage, setPetrolMileage] = React.useState(15);
  const [petrolPrice, setPetrolPrice] = React.useState(105);

  const resultsRef = React.useRef<HTMLDivElement>(null);

  // ---- fetch all stations once ----
  const { data, isLoading } = useQuery({
    queryKey: ["planner-stations"],
    queryFn: () =>
      apiFetch<{ stations: StationWithMeta[]; total: number }>(
        "/api/stations"
      ),
    staleTime: 60_000,
  });
  const stations = data?.stations ?? [];

  // ---- live computation ----
  const results = React.useMemo(() => {
    const home = findArea(homeSectorName);
    const work = findArea(workSectorName);

    const weeklyEnergy = weeklyKm * efficiency; // kWh / week
    const sessionsPerWeek = Math.max(1, Math.ceil(weeklyEnergy / battery));
    const monthlyEnergy = weeklyEnergy * WEEKS_PER_MONTH;

    // Suitable stations: within NEARBY_Km of home OR work.
    const scored = stations
      .map((s) => {
        const dHome = home
          ? haversineKm(home.lat, home.lng, s.lat, s.lng)
          : Infinity;
        const dWork = work
          ? haversineKm(work.lat, work.lng, s.lat, s.lng)
          : Infinity;
        const nearest = Math.min(dHome, dWork);
        return { station: s, dHome, dWork, nearest };
      })
      .filter((x) => x.nearest <= NEARBY_KM)
      .sort((a, b) => a.nearest - b.nearest);

    const suitable = scored.slice(0, 5);

    const priceSource =
      suitable.length > 0
        ? suitable.map((x) => x.station.pricePerKWh)
        : stations.map((s) => s.pricePerKWh);
    const avgPrice =
      priceSource.length > 0
        ? priceSource.reduce((a, b) => a + b, 0) / priceSource.length
        : DEFAULT_AVG_PRICE;

    const monthlyEV = monthlyEnergy * avgPrice;
    const monthlyPetrol =
      ((weeklyKm * WEEKS_PER_MONTH) / Math.max(1, petrolMileage)) * petrolPrice;
    const monthlySavings = monthlyPetrol - monthlyEV;
    const annualSavings = monthlySavings * 12;
    const breakEvenYears =
      annualSavings > 0 ? EV_PREMIUM_INR / annualSavings : Infinity;

    let verdict: Verdict;
    if (suitable.length === 0 || sessionsPerWeek > 5) verdict = "challenging";
    else if (sessionsPerWeek >= 4) verdict = "tight";
    else if (monthlySavings > 0) verdict = "ready";
    else verdict = "challenging";
    return {
      weeklyEnergy,
      sessionsPerWeek,
      monthlyEnergy,
      monthlyEV,
      monthlyPetrol,
      monthlySavings,
      annualSavings,
      breakEvenYears,
      avgPrice,
      suitable,
      home,
      work,
      hasNearby: suitable.length > 0,
      verdict,
    };
  }, [
    weeklyKm,
    efficiency,
    battery,
    homeSectorName,
    workSectorName,
    petrolMileage,
    petrolPrice,
    stations,
  ]);

  function handleCalculate() {
    resultsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  // Helpers for cost-comparison bars.
  const costMax = Math.max(results.monthlyEV, results.monthlyPetrol, 1);
  const evBarPct = Math.round((results.monthlyEV / costMax) * 100);
  const petrolBarPct = Math.round((results.monthlyPetrol / costMax) * 100);

  // Break-even progress (capped at ownership horizon).
  const breakEvenCapped = Math.min(results.breakEvenYears, OWNERSHIP_HORIZON_YEARS);
  const breakEvenPct =
    isFinite(results.breakEvenYears)
      ? Math.min(100, Math.round((breakEvenCapped / OWNERSHIP_HORIZON_YEARS) * 100))
      : 100;

  const finalVerdict = results.hasNearby ? results.verdict : "challenging";
  const finalMeta = VERDICT_META[finalVerdict];

  return (
    <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* ---------- header ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-3">
          <Badge className="bg-primary/15 text-primary border-primary/20 hover:bg-primary/20">
            <Calculator className="h-3 w-3" />
            Decision Tool
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          EV Readiness Planner
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-3xl">
          Thinking of buying an EV? Tell us how much you drive and where — we&apos;ll
          show you whether public charging in Gandhinagar &amp; Ahmedabad works for
          you, and how long it takes for the fuel savings to pay off the extra cost
          of an EV.
        </p>

        {/* Plain-language explainer so users understand the result */}
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3 max-w-3xl">
          <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">What is the &ldquo;EV premium&rdquo;?</span>{" "}
            Electric cars cost more to buy than petrol cars — about{" "}
            <span className="font-semibold text-primary">₹2,00,000 extra</span> for a
            similar model. But electricity is much cheaper than petrol, so you save
            money every month on fuel. This tool tells you how many months of those
            savings it takes to earn back that extra ₹2 lakh.
          </p>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ===================== FORM (left, 1/3) ===================== */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="lg:col-span-1"
        >
          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5 text-primary" />
                Your driving profile
              </CardTitle>
              <CardDescription>
                Adjust the inputs — results update live.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* weekly km */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="weekly-km">Weekly distance</Label>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Route className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="weekly-km"
                      type="number"
                      min={50}
                      max={2000}
                      value={weeklyKm}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isNaN(v)) {
                          setWeeklyKm(Math.min(2000, Math.max(50, v)));
                        }
                      }}
                      className="h-7 w-20 text-right px-2"
                    />
                    <span className="text-muted-foreground text-xs">km</span>
                  </div>
                </div>
                <Slider
                  min={50}
                  max={2000}
                  step={10}
                  value={[weeklyKm]}
                  onValueChange={(v) => setWeeklyKm(v[0])}
                />
                <p className="text-xs text-muted-foreground">
                  Range 50–2000 km/week. Default 250.
                </p>
              </div>

              <Separator />

              {/* home sector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" />
                  Home sector
                </Label>
                <Select value={homeSectorName} onValueChange={setHomeSectorName}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select home area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Gandhinagar</SelectLabel>
                      {GANDHINAGAR_SECTORS.map((s) => (
                        <SelectItem key={`g-${s.name}`} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Ahmedabad</SelectLabel>
                      {AHMEDABAD_AREAS.map((s) => (
                        <SelectItem key={`a-${s.name}`} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* work sector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Work sector
                </Label>
                <Select value={workSectorName} onValueChange={setWorkSectorName}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select work area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Gandhinagar</SelectLabel>
                      {GANDHINAGAR_SECTORS.map((s) => (
                        <SelectItem key={`g2-${s.name}`} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Ahmedabad</SelectLabel>
                      {AHMEDABAD_AREAS.map((s) => (
                        <SelectItem key={`a2-${s.name}`} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* EV efficiency */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  EV efficiency
                </Label>
                <Select
                  value={String(efficiency)}
                  onValueChange={(v) => setEfficiency(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EFFICIENCY_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={String(p.value)}>
                        <span className="flex flex-col">
                          <span>{p.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.sub}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* battery capacity */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Battery className="h-4 w-4 text-primary" />
                  Battery capacity
                </Label>
                <Select
                  value={String(battery)}
                  onValueChange={(v) => setBattery(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BATTERY_OPTIONS.map((b) => (
                      <SelectItem key={b} value={String(b)}>
                        {b} kWh
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* petrol mileage */}
              <div className="space-y-2">
                <Label htmlFor="petrol-mileage" className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-rose-500" />
                  Petrol car mileage
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="petrol-mileage"
                    type="number"
                    min={1}
                    max={40}
                    value={petrolMileage}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isNaN(v)) setPetrolMileage(v);
                    }}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    km/liter
                  </span>
                </div>
              </div>

              {/* petrol price */}
              <div className="space-y-2">
                <Label htmlFor="petrol-price" className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-rose-500" />
                  Petrol price
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="petrol-price"
                    type="number"
                    min={1}
                    max={300}
                    value={petrolPrice}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isNaN(v)) setPetrolPrice(v);
                    }}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    ₹/liter
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCalculate}
              >
                <Sparkles className="h-4 w-4" />
                See my results
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* ===================== RESULTS (right, 2/3) ===================== */}
        <div
          ref={resultsRef}
          className="lg:col-span-2 space-y-6 scroll-mt-6"
        >
          {isLoading ? (
            <Card>
              <CardContent className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm">Loading charging network…</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ---------- verdict ---------- */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={finalVerdict}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className={cn("border-2", finalMeta.wrap)}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "flex h-14 w-14 shrink-0 items-center justify-center rounded-lg",
                            finalMeta.iconWrap
                          )}
                        >
                          {finalMeta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className={cn("text-2xl font-bold", finalMeta.titleCls)}>
                              {finalMeta.title}
                            </h2>
                            {finalVerdict === "ready" && (
                              <span className="text-2xl">✓</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            {finalMeta.desc}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="outline" className="bg-background/60">
                              <Zap className="h-3 w-3 text-primary" />
                              {results.sessionsPerWeek}{" "}
                              {results.sessionsPerWeek === 1 ? "session" : "sessions"}/week
                            </Badge>
                            <Badge variant="outline" className="bg-background/60">
                              <MapPin className="h-3 w-3 text-primary" />
                              {results.suitable.length} station
                              {results.suitable.length === 1 ? "" : "s"} on your route
                            </Badge>
                            {results.monthlySavings > 0 ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              >
                                <TrendingUp className="h-3 w-3" />
                                Save {inr(results.monthlySavings)}/mo
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                              >
                                <TrendingDown className="h-3 w-3" />
                                EV costs more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>

              {/* ---------- big sessions number ---------- */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          Charging sessions / week
                        </p>
                        <div className="mt-2 flex items-baseline gap-2">
                          <AnimatedNumber
                            value={String(results.sessionsPerWeek)}
                            className="text-5xl font-bold text-primary"
                          />
                          <span className="text-sm text-muted-foreground">
                            {results.sessionsPerWeek === 1 ? "top-up" : "top-ups"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {fmt1(results.weeklyEnergy)} kWh/week ÷ {battery} kWh battery
                        </p>
                      </div>
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Battery className="h-7 w-7" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* break-even */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          When fuel savings pay off the extra EV cost
                        </p>
                        <div className="mt-2 flex items-baseline gap-2">
                          {isFinite(results.breakEvenYears) ? (
                            <AnimatedNumber
                              value={fmt1(results.breakEvenYears)}
                              className="text-5xl font-bold text-emerald-600 dark:text-emerald-400"
                            />
                          ) : (
                            <span className="text-3xl font-bold text-rose-500">
                              Never
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground">
                            years
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Time for fuel savings to cover the ₹2L extra you paid for an EV
                        </p>
                      </div>
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <CalendarClock className="h-7 w-7" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ---------- cost comparison bars ---------- */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wallet className="h-5 w-5 text-primary" />
                    Monthly cost comparison
                  </CardTitle>
                  <CardDescription>
                    Based on {fmt1(results.monthlyEnergy)} kWh/month EV energy &amp;{" "}
                    {fmt1(
                      (weeklyKm * WEEKS_PER_MONTH) / Math.max(1, petrolMileage)
                    )}{" "}
                    liters/month petrol.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* EV bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <Zap className="h-4 w-4 text-primary" />
                        EV charging
                      </span>
                      <AnimatedNumber
                        value={inr(results.monthlyEV)}
                        className="font-semibold text-primary"
                      />
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={false}
                        animate={{ width: `${evBarPct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmt1(results.monthlyEnergy)} kWh × ₹{fmt1(results.avgPrice)}/kWh
                    </p>
                  </div>

                  {/* Petrol bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <Fuel className="h-4 w-4 text-rose-500" />
                        Petrol
                      </span>
                      <AnimatedNumber
                        value={inr(results.monthlyPetrol)}
                        className="font-semibold text-rose-600 dark:text-rose-400"
                      />
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-rose-500"
                        initial={false}
                        animate={{ width: `${petrolBarPct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmt1(
                        (weeklyKm * WEEKS_PER_MONTH) / Math.max(1, petrolMileage)
                      )}{" "}
                      liters × ₹{petrolPrice}/liter
                    </p>
                  </div>

                  <Separator />

                  {/* savings row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Monthly savings
                      </p>
                      <AnimatedNumber
                        value={inr(Math.max(0, results.monthlySavings))}
                        className="text-2xl font-bold text-emerald-700 dark:text-emerald-400"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {results.monthlySavings > 0
                          ? "You save this every month vs petrol"
                          : "EV currently costs more than petrol"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Annual savings
                      </p>
                      <AnimatedNumber
                        value={inr(Math.max(0, results.annualSavings))}
                        className="text-2xl font-bold text-emerald-700 dark:text-emerald-400"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Over a year of driving {weeklyKm} km/week
                      </p>
                    </div>
                  </div>

                  {/* break-even progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-2">
                        <Car className="h-4 w-4 text-primary" />
                        When your EV starts saving you money
                      </span>
                      <span className="text-muted-foreground">
                        {isFinite(results.breakEvenYears)
                          ? `${fmt1(results.breakEvenYears)} years`
                          : `Beyond ${OWNERSHIP_HORIZON_YEARS} years`}
                      </span>
                    </div>
                    <Progress
                      value={breakEvenPct}
                      className="h-2.5 bg-muted [&>div]:bg-emerald-500"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Day 1 (you paid extra)</span>
                      <span>{OWNERSHIP_HORIZON_YEARS} years</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isFinite(results.breakEvenYears) &&
                      results.breakEvenYears <= OWNERSHIP_HORIZON_YEARS ? (
                        <>
                          You pay about{" "}
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            ₹2,00,000 extra
                          </span>{" "}
                          upfront for an EV. At your driving rate, your fuel savings
                          will pay that back in{" "}
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {fmt1(results.breakEvenYears)} years
                          </span>
                          . After that, every kilometre you drive is money in your pocket.
                        </>
                      ) : (
                        <>
                          At your current driving, it would take more than{" "}
                          <span className="font-semibold">{OWNERSHIP_HORIZON_YEARS} years</span>{" "}
                          for fuel savings to cover the ₹2,00,000 extra cost of an EV.
                          Driving more, or charging at cheaper stations, would tip the
                          math in your favour.
                        </>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* ---------- stations on your route ---------- */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Route className="h-5 w-5 text-primary" />
                    Stations on your route
                  </CardTitle>
                  <CardDescription>
                    Within {NEARBY_KM} km of your home ({homeSectorName}) or work
                    ({workSectorName}) — ranked by nearest distance.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {results.suitable.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
                      <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">
                        No public stations within {NEARBY_KM} km of your home or
                        work.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This is the biggest blocker for EV adoption without home
                        charging. Try different sectors, or explore the full
                        network on the map.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={onExplore}
                      >
                        <MapPin className="h-4 w-4" />
                        Open the map
                      </Button>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {results.suitable.map((x, i) => (
                        <StationRouteRow key={x.station.id} rank={i + 1} {...x} />
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* ---------- home charging note ---------- */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Home className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">
                        A note on home charging
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        Since you may not have home charging, you&apos;ll rely on
                        public stations. Consider stations near your workplace for
                        daytime top-ups while you work — a full {battery} kWh fill
                        from empty takes roughly{" "}
                        <span className="font-medium text-foreground">
                          {fmt1(battery / 30)}–{fmt1(battery / 7.4)} hours
                        </span>{" "}
                        on a typical 7.4–30 kW charger. Plan to plug in once or
                        twice during your workday.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ---------- CTA ---------- */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
                <div>
                  <p className="font-medium text-sm">Want to see these stations on the map?</p>
                  <p className="text-xs text-muted-foreground">
                    Open the live map to check availability, connectors &amp; reviews.
                  </p>
                </div>
                <Button onClick={onExplore}>
                  Explore stations
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------- helper: verdict from results -------------------- */

/* ------------------------- station route row -------------------------- */

function StationRouteRow({
  rank,
  station,
  dHome,
  dWork,
  nearest,
}: {
  rank: number;
  station: StationWithMeta;
  dHome: number;
  dWork: number;
  nearest: number;
}) {
  const isNearHome = dHome <= dWork;
  const nearLabel = isNearHome ? "Near home" : "Near work";
  const dist = Math.min(dHome, dWork);

  const statusColor =
    station.status === "OPERATIONAL"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
      : station.status === "MAINTENANCE"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(rank * 0.05, 0.3) }}
      className="flex items-center gap-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all p-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-semibold">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{station.name}</p>
          <Badge variant="outline" className={cn("h-5", statusColor)}>
            {station.status === "OPERATIONAL"
              ? "Live"
              : station.status === "MAINTENANCE"
                ? "Maint."
                : "Offline"}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {station.operator}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-primary" />
            {station.powerKW} kW
          </span>
          <span className="flex items-center gap-1">
            <IndianRupee className="h-3 w-3" />
            {station.pricePerKWh}/kWh
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <Badge variant="secondary" className="mb-1">
          {isNearHome ? (
            <Home className="h-3 w-3" />
          ) : (
            <Building2 className="h-3 w-3" />
          )}
          {nearLabel}
        </Badge>
        <p className="text-sm font-semibold text-primary">
          {fmt1(dist)} km
        </p>
      </div>
    </motion.li>
  );
}

export default PlannerView;
