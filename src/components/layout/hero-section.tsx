"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ArrowRight,
  TrendingUp,
  Plug,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { StationWithMeta } from "@/lib/types";

interface HeroSectionProps {
  onExplore: () => void;
  onSignIn: () => void;
}

export function HeroSection({ onExplore, onSignIn }: HeroSectionProps) {
  const { data: session } = useSession();

  // Live counts from the database — proves the data is real, not hardcoded.
  const { data } = useQuery({
    queryKey: ["stations", "hero"],
    queryFn: () =>
      apiFetch<{ stations: StationWithMeta[]; total: number }>("/api/stations"),
  });

  const stations = data?.stations ?? [];
  const operators = new Set(stations.map((s) => s.operator)).size;
  const cities = new Set(stations.map((s) => s.city)).size;
  const stationCount = stations.length;

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-muted/30">
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 relative py-10 sm:py-14 lg:py-16">
        <div className="max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Gandhinagar &amp; Ahmedabad
          </div>

          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-balance"
            style={{ textWrap: "balance" }}
          >
            Find an EV charging station near you in Gujarat.
          </h1>
          <p className="text-base text-muted-foreground max-w-xl leading-relaxed">
            {stationCount > 0 ? (
              <>
                Browse {stationCount} charging points across {cities} cities from{" "}
                {operators} operators — Tata Power, ChargeZone, Ather Grid, Statiq
                and more. Check availability, compare costs with petrol, and plan
                your route.
              </>
            ) : (
              <>
                Locate EV charging stations across Gandhinagar, Ahmedabad and
                nearby towns — with live availability, smart filters, reviews,
                and a cost calculator.
              </>
            )}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={onExplore} className="h-11 text-base">
              <Search className="w-4 h-4 mr-2" />
              Explore Stations
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            {!session?.user && (
              <Button
                size="lg"
                variant="outline"
                onClick={onSignIn}
                className="h-11 text-base"
              >
                Sign in to Save Favorites
              </Button>
            )}
          </div>

          {/* Trust indicators — live counts from the database */}
          <div className="grid grid-cols-3 gap-3 pt-2 max-w-md">
            <Stat value={stationCount || "—"} label="Stations" />
            <Stat value={operators || "—"} label="Operators" />
            <Stat value={cities || "—"} label="Cities" />
          </div>
        </div>

        {/* Compact feature strip — 4 pills, not 4 cards */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FeaturePill icon={Plug} title="Multiple Connectors" desc="CCS, Type2, CHAdeMO, Bharat AC" />
          <FeaturePill icon={Clock} title="24/7 Availability" desc="Many stations open round the clock" />
          <FeaturePill icon={CheckCircle2} title="Verified Locations" desc="Coordinates matched to real landmarks" />
          <FeaturePill icon={TrendingUp} title="Cost Calculator" desc="Know the price before you plug in" />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5">
      <p className="text-lg font-bold leading-none tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function FeaturePill({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors">
      <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-sm leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{desc}</p>
      </div>
    </div>
  );
}
