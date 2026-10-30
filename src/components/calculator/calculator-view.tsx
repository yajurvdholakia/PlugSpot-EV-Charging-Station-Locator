"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Calculator as CalculatorIcon,
  Battery,
  Clock,
  Route,
  IndianRupee,
  Zap,
  Car,
  Gauge,
  Info,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  MapPin,
  Check,
  ChevronsUpDown,
  Plug,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import type { StationWithMeta } from "@/lib/types";

// Common EV presets
const EV_PRESETS = [
  { name: "Tata Nexon EV", battery: 40, efficiency: 0.15 },
  { name: "Tata Tigor EV", battery: 26, efficiency: 0.13 },
  { name: "MG ZS EV", battery: 50, efficiency: 0.14 },
  { name: "Hyundai Kona EV", battery: 39, efficiency: 0.13 },
  { name: "BYD Atto 3", battery: 60, efficiency: 0.16 },
  { name: "MG Comet EV", battery: 17, efficiency: 0.10 },
  { name: "Tata Tiago EV", battery: 24, efficiency: 0.12 },
  { name: "Custom", battery: 40, efficiency: 0.15 },
];

// Common charger presets
const CHARGER_PRESETS = [
  { name: "Slow (AC 3.3 kW)", power: 3.3 },
  { name: "Home (AC 7.4 kW)", power: 7.4 },
  { name: "Fast (DC 25 kW)", power: 25 },
  { name: "Fast (DC 50 kW)", power: 50 },
  { name: "Ultra (DC 100 kW)", power: 100 },
  { name: "Ultra (DC 150 kW)", power: 150 },
];

function formatDuration(hours: number): string {
  if (hours <= 0) return "0 min";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function CalculatorView() {
  // Fetch all stations so the user can pick one and auto-fill charger details
  const { data: stationsData } = useQuery({
    queryKey: ["stations", "calculator"],
    queryFn: () =>
      apiFetch<{ stations: StationWithMeta[]; total: number }>("/api/stations"),
  });
  const stations = stationsData?.stations ?? [];

  // Inputs
  const [evPreset, setEvPreset] = React.useState("Tata Nexon EV");
  const [batteryCapacity, setBatteryCapacity] = React.useState(40); // kWh
  const [efficiency, setEfficiency] = React.useState(0.15); // kWh/km
  const [currentCharge, setCurrentCharge] = React.useState(20); // %
  const [targetCharge, setTargetCharge] = React.useState(80); // %
  const [chargerPreset, setChargerPreset] = React.useState("Fast (DC 50 kW)");
  const [chargerPower, setChargerPower] = React.useState(50); // kW
  const [pricePerKWh, setPricePerKWh] = React.useState(22); // ₹/kWh
  const [petrolPrice, setPetrolPrice] = React.useState(105); // ₹/liter
  const [petrolMileage, setPetrolMileage] = React.useState(15); // km/liter

  // Station selector state
  const [selectedStationId, setSelectedStationId] = React.useState<string | null>(null);
  const [stationPickerOpen, setStationPickerOpen] = React.useState(false);

  const selectedStation = React.useMemo(
    () => stations.find((s) => s.id === selectedStationId) ?? null,
    [stations, selectedStationId]
  );

  // When a station is picked, auto-fill the charger power + price + preset label
  function applyStation(stationId: string) {
    const s = stations.find((x) => x.id === stationId);
    if (!s) return;
    setSelectedStationId(stationId);
    setChargerPower(s.powerKW);
    setPricePerKWh(s.pricePerKWh);
    // Map the station's power to the closest charger preset label, or use a custom label
    const matchPreset = CHARGER_PRESETS.find((p) => p.power === s.powerKW);
    setChargerPreset(matchPreset ? matchPreset.name : `${s.operator} — ${s.powerKW} kW`);
    setStationPickerOpen(false);
  }

  function clearStation() {
    setSelectedStationId(null);
    setChargerPreset("Fast (DC 50 kW)");
    setChargerPower(50);
    setPricePerKWh(22);
  }

  // Calculations (live via useMemo)
  const calc = React.useMemo(() => {
    const chargeNeededPct = Math.max(0, targetCharge - currentCharge);
    const energyNeeded = (batteryCapacity * chargeNeededPct) / 100; // kWh
    // Charging isn't 100% efficient — assume ~90% efficiency
    const energyFromWall = energyNeeded / 0.9;
    // Charging slows down above 80%; add 15% time overhead if target > 80
    const slowdownFactor = targetCharge > 80 ? 1.15 : 1.0;
    const chargingTimeHr = (energyNeeded / chargerPower) * slowdownFactor;
    const chargingTimeMin = chargingTimeHr * 60;

    const cost = energyFromWall * pricePerKWh;

    const rangeAddedKm = energyNeeded / efficiency;
    const fullRangeKm = batteryCapacity / efficiency;

    // Petrol comparison for the same range
    const petrolLiters = rangeAddedKm / petrolMileage;
    const petrolCost = petrolLiters * petrolPrice;
    const savings = petrolCost - cost;

    // Cost per km
    const evCostPerKm = cost / rangeAddedKm;
    const petrolCostPerKm = petrolCost / rangeAddedKm;

    return {
      chargeNeededPct,
      energyNeeded: Math.round(energyNeeded * 10) / 10,
      energyFromWall: Math.round(energyFromWall * 10) / 10,
      chargingTimeHr: Math.round(chargingTimeHr * 100) / 100,
      chargingTimeMin: Math.round(chargingTimeMin),
      cost: Math.round(cost),
      rangeAddedKm: Math.round(rangeAddedKm),
      fullRangeKm: Math.round(fullRangeKm),
      petrolCost: Math.round(petrolCost),
      petrolLiters: Math.round(petrolLiters * 10) / 10,
      savings: Math.round(savings),
      evCostPerKm: Math.round(evCostPerKm * 100) / 100,
      petrolCostPerKm: Math.round(petrolCostPerKm * 100) / 100,
      costPer100Km: Math.round(evCostPerKm * 100),
      petrolPer100Km: Math.round(petrolCostPerKm * 100),
    };
  }, [
    batteryCapacity,
    efficiency,
    currentCharge,
    targetCharge,
    chargerPower,
    pricePerKWh,
    petrolPrice,
    petrolMileage,
  ]);

  function applyEvPreset(name: string) {
    setEvPreset(name);
    const p = EV_PRESETS.find((x) => x.name === name);
    if (p && name !== "Custom") {
      setBatteryCapacity(p.battery);
      setEfficiency(p.efficiency);
    }
  }

  function applyChargerPreset(name: string) {
    setChargerPreset(name);
    const p = CHARGER_PRESETS.find((x) => x.name === name);
    if (p) setChargerPower(p.power);
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <Badge className="bg-primary/15 text-primary border-0 gap-1.5 mb-3">
          <CalculatorIcon className="w-3 h-3" />
          Charging Calculator
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          How much will it cost to charge?
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          Enter your EV battery, charger speed, and how much you want to charge.
          Get the exact cost, charging time, and distance your car can travel —
          compared with petrol in real time.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-5">
        {/* LEFT: Inputs */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-4"
        >
          {/* EV section */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">Your Electric Vehicle</p>
                <p className="text-xs text-muted-foreground">Pick a preset or customize</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">EV Model</Label>
              <Select value={evPreset} onValueChange={applyEvPreset}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EV_PRESETS.map((e) => (
                    <SelectItem key={e.name} value={e.name}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Battery (kWh)</Label>
                <Input
                  type="number"
                  min={5}
                  max={200}
                  value={batteryCapacity}
                  onChange={(e) => setBatteryCapacity(Number(e.target.value))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Efficiency (kWh/km)</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0.05}
                  max={0.4}
                  value={efficiency}
                  onChange={(e) => setEfficiency(Number(e.target.value))}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Current charge</Label>
                <span className="text-xs font-semibold text-primary">{currentCharge}%</span>
              </div>
              <Slider
                value={[currentCharge]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => setCurrentCharge(v[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Charge up to</Label>
                <span className="text-xs font-semibold text-primary">{targetCharge}%</span>
              </div>
              <Slider
                value={[targetCharge]}
                min={Math.min(currentCharge + 10, 100)}
                max={100}
                step={5}
                onValueChange={(v) => setTargetCharge(v[0])}
              />
            </div>

            {/* Visual battery */}
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Charging from {currentCharge}% → {targetCharge}%</span>
                <span className="font-semibold text-primary">+{calc.chargeNeededPct}%</span>
              </div>
              <div className="relative h-4 rounded-full bg-muted overflow-hidden border border-border">
                <div
                  className="absolute inset-y-0 left-0 bg-muted-foreground/40"
                  style={{ width: `${currentCharge}%` }}
                />
                <motion.div
                  className="absolute inset-y-0 bg-primary rounded-full"
                  initial={{ width: `${currentCharge}%` }}
                  animate={{ width: `${targetCharge}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </Card>

          {/* Charger section */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">Charger</p>
                <p className="text-xs text-muted-foreground">Pick a real station or set manually</p>
              </div>
            </div>

            {/* Station picker — searchable combobox */}
            <div className="space-y-1.5">
              <Label className="text-xs">Charging Station</Label>
              <Popover open={stationPickerOpen} onOpenChange={setStationPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={stationPickerOpen}
                    className="w-full justify-between font-normal h-9"
                  >
                    {selectedStation ? (
                      <span className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{selectedStation.name}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        Select a station to auto-fill…
                      </span>
                    )}
                    <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search stations…" />
                    <CommandList>
                      <CommandEmpty>No station found.</CommandEmpty>
                      <CommandGroup>
                        {stations.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={`${s.name} ${s.operator} ${s.area} ${s.city}`}
                            onSelect={() => applyStation(s.id)}
                          >
                            <Check
                              className={cn(
                                "w-3.5 h-3.5 mr-2",
                                selectedStationId === s.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="min-w-0">
                              <p className="text-sm truncate">{s.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {s.operator} · {s.area}, {s.city} · {s.powerKW} kW · ₹{s.pricePerKWh}/kWh
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Selected station context card */}
            <AnimatePresence>
              {selectedStation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{selectedStation.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {selectedStation.area}, {selectedStation.city}
                        </p>
                      </div>
                      <button
                        onClick={clearStation}
                        className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] py-0 px-1.5",
                          selectedStation.status === "OPERATIONAL"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : selectedStation.status === "MAINTENANCE"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-red-500/15 text-red-600 dark:text-red-400"
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1" />
                        {selectedStation.status === "OPERATIONAL"
                          ? `${selectedStation.availablePorts}/${selectedStation.numberOfPorts} ports free`
                          : selectedStation.status.toLowerCase()}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 gap-1">
                        <Zap className="w-2.5 h-2.5" />
                        {selectedStation.powerKW} kW
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 gap-1">
                        <IndianRupee className="w-2.5 h-2.5" />
                        {selectedStation.pricePerKWh}/kWh
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Plug className="w-3 h-3" />
                      {selectedStation.connectorTypes.join(", ")}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <Label className="text-xs">Charger Type</Label>
              <Select value={chargerPreset} onValueChange={applyChargerPreset}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHARGER_PRESETS.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Power (kW)</Label>
                <Input
                  type="number"
                  min={1}
                  max={350}
                  value={chargerPower}
                  onChange={(e) => setChargerPower(Number(e.target.value))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price (₹/kWh)</Label>
                <Input
                  type="number"
                  min={5}
                  max={50}
                  value={pricePerKWh}
                  onChange={(e) => setPricePerKWh(Number(e.target.value))}
                  className="h-9"
                />
              </div>
            </div>
          </Card>

          {/* Petrol comparison section */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">Petrol Comparison</p>
                <p className="text-xs text-muted-foreground">For the same distance</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Petrol mileage (km/L)</Label>
                <Input
                  type="number"
                  min={5}
                  max={30}
                  value={petrolMileage}
                  onChange={(e) => setPetrolMileage(Number(e.target.value))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Petrol price (₹/L)</Label>
                <Input
                  type="number"
                  min={50}
                  max={150}
                  value={petrolPrice}
                  onChange={(e) => setPetrolPrice(Number(e.target.value))}
                  className="h-9"
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* RIGHT: Results */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-4"
        >
          {/* Big result cards */}
          <div className="grid grid-cols-2 gap-3">
            <ResultCard
              icon={IndianRupee}
              label="Charging Cost"
              value={formatINR(calc.cost)}
              sub={`₹${pricePerKWh}/kWh × ${calc.energyFromWall} kWh`}
              accent="primary"
            />
            <ResultCard
              icon={Clock}
              label="Charging Time"
              value={formatDuration(calc.chargingTimeHr)}
              sub={`${chargerPower} kW charger`}
              accent="primary"
            />
            <ResultCard
              icon={Battery}
              label="Energy Added"
              value={`${calc.energyNeeded} kWh`}
              sub={`${currentCharge}% → ${targetCharge}% of ${batteryCapacity} kWh`}
              accent="primary"
            />
            <ResultCard
              icon={Route}
              label="Range Added"
              value={`${calc.rangeAddedKm} km`}
              sub={`Full battery: ${calc.fullRangeKm} km`}
              accent="primary"
            />
          </div>

          {/* Cost comparison */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                EV vs Petrol — for {calc.rangeAddedKm} km
              </p>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0">
                Save {formatINR(calc.savings)}
              </Badge>
            </div>

            <div className="space-y-3">
              {/* EV bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Zap className="w-3 h-3 text-primary" /> EV
                  </span>
                  <span className="font-semibold">{formatINR(calc.cost)}</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, (calc.cost / Math.max(calc.cost, calc.petrolCost, 1)) * 100)}%`,
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Petrol bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Gauge className="w-3 h-3 text-amber-500" /> Petrol
                  </span>
                  <span className="font-semibold">{formatINR(calc.petrolCost)}</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, (calc.petrolCost / Math.max(calc.cost, calc.petrolCost, 1)) * 100)}%`,
                    }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {calc.petrolLiters} liters of petrol
                </p>
              </div>
            </div>

            <Separator className="my-3" />

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-primary/5 p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">EV cost/km</p>
                <p className="text-sm font-bold text-primary">₹{calc.evCostPerKm}</p>
              </div>
              <div className="rounded-lg bg-amber-500/5 p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Petrol cost/km</p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">₹{calc.petrolCostPerKm}</p>
              </div>
            </div>
          </Card>

          {/* Breakdown */}
          <Card className="p-4 space-y-2.5">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              How we calculated this
            </p>
            <div className="space-y-1.5 text-xs">
              <BreakdownRow
                label="Energy needed"
                formula={`${batteryCapacity} kWh × ${calc.chargeNeededPct}%`}
                value={`${calc.energyNeeded} kWh`}
              />
              <BreakdownRow
                label="Energy from wall (90% efficiency)"
                formula={`${calc.energyNeeded} kWh ÷ 0.90`}
                value={`${calc.energyFromWall} kWh`}
              />
              <BreakdownRow
                label="Charging time"
                formula={`${calc.energyNeeded} kWh ÷ ${chargerPower} kW${targetCharge > 80 ? " × 1.15 (slowdown)" : ""}`}
                value={formatDuration(calc.chargingTimeHr)}
              />
              <BreakdownRow
                label="Total cost"
                formula={`${calc.energyFromWall} kWh × ₹${pricePerKWh}`}
                value={formatINR(calc.cost)}
              />
              <BreakdownRow
                label="Range added"
                formula={`${calc.energyNeeded} kWh ÷ ${efficiency} kWh/km`}
                value={`${calc.rangeAddedKm} km`}
              />
              <BreakdownRow
                label="Equivalent petrol"
                formula={`${calc.rangeAddedKm} km ÷ ${petrolMileage} km/L × ₹${petrolPrice}`}
                value={formatINR(calc.petrolCost)}
              />
            </div>
          </Card>

          {/* Quick scenario chips */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentCharge(10);
                setTargetCharge(80);
              }}
              className="text-xs"
            >
              <ChevronRight className="w-3 h-3 mr-1" />
              Quick 10% → 80%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentCharge(20);
                setTargetCharge(100);
              }}
              className="text-xs"
            >
              <ChevronRight className="w-3 h-3 mr-1" />
              Full charge 20% → 100%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setChargerPreset("Ultra (DC 150 kW)");
                setChargerPower(150);
              }}
              className="text-xs"
            >
              <ChevronRight className="w-3 h-3 mr-1" />
              Ultra-fast 150 kW
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ResultCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  accent: "primary" | "emerald" | "amber";
}) {
  const accentMap = {
    primary: "bg-primary/15 text-primary",
    emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  };
  return (
    <Card className="p-4 relative overflow-hidden hover-lift">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-2", accentMap[accent])}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
        {label}
      </p>
      <AnimatePresence mode="wait">
        <motion.p
          key={value}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="text-xl sm:text-2xl font-bold mt-0.5 leading-tight"
        >
          {value}
        </motion.p>
      </AnimatePresence>
      <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
    </Card>
  );
}

function BreakdownRow({
  label,
  formula,
  value,
}: {
  label: string;
  formula: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-muted-foreground text-[10px] font-mono">{formula}</p>
      </div>
      <span className="font-semibold text-primary shrink-0">{value}</span>
    </div>
  );
}

export default CalculatorView;
