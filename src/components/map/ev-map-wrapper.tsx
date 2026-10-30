"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { StationWithMeta } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const EvMap = dynamic(
  () => import("@/components/map/ev-map").then((m) => m.EvMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    ),
  }
);

export interface EvMapWrapperProps {
  stations: StationWithMeta[];
  activeStationId: string | null;
  onStationClick: (id: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  radiusKm?: number;
}

export function EvMapWrapper(props: EvMapWrapperProps) {
  return <EvMap {...props} />;
}
