"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Zap,
  MapPin,
  Clock,
  Star,
  Heart,
  Battery,
  Plug,
  Navigation,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StationWithMeta } from "@/lib/types";

export interface StationCardProps {
  station: StationWithMeta;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  isActive?: boolean;
}

export function StationCard({
  station,
  onOpen,
  onToggleFavorite,
  isActive,
}: StationCardProps) {
  const availability = station.availablePorts;
  const total = station.numberOfPorts;
  const availabilityPct = total > 0 ? (availability / total) * 100 : 0;

  const statusColor =
    station.status === "OPERATIONAL"
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
      : station.status === "MAINTENANCE"
      ? "text-amber-600 dark:text-amber-400 bg-amber-500/10"
      : "text-red-600 dark:text-red-400 bg-red-500/10";

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "p-0 overflow-hidden cursor-pointer border transition-colors",
          isActive
            ? "border-primary ring-1 ring-primary/30"
            : "border-border hover:border-primary/40"
        )}
        onClick={() => onOpen(station.id)}
      >
        {/* Image header */}
        <div className="relative h-32 bg-muted overflow-hidden">
          {station.image ? (
            <img
              src={station.image}
              alt={station.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Zap className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Operator badge */}
          <div className="absolute top-2 left-2">
            <Badge className="bg-background/95 text-foreground border-0 text-[10px] font-semibold">
              {station.operator}
            </Badge>
          </div>

          {/* Favorite button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(station.id);
            }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/95 flex items-center justify-center hover:bg-background transition-colors"
            aria-label={station.isFavorite ? "Remove favorite" : "Add favorite"}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-colors",
                station.isFavorite
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground"
              )}
            />
          </button>

          {/* Availability bar */}
          {station.status === "OPERATIONAL" && (
            <div className="absolute bottom-2 left-2 right-2">
              <div className="flex items-center justify-between text-[10px] text-white mb-1 font-medium">
                <span>{availability} of {total} ports free</span>
                <span>{Math.round(availabilityPct)}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/30 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${availabilityPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    availabilityPct > 50
                      ? "bg-emerald-400"
                      : availabilityPct > 0
                      ? "bg-amber-400"
                      : "bg-red-400"
                  )}
                />
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">
              {station.name}
            </h3>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {station.area}, {station.city}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium", statusColor)}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {station.status === "OPERATIONAL"
                ? "Available"
                : station.status === "MAINTENANCE"
                ? "Maintenance"
                : "Offline"}
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Zap className="w-3 h-3 text-primary" />
              {station.powerKW} kW
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Battery className="w-3 h-3 text-primary" />
              ₹{station.pricePerKWh}/kWh
            </span>
            {station.rating > 0 && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {station.rating}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Plug className="w-3 h-3" />
              <span className="truncate max-w-[140px]">
                {station.connectorTypes.join(", ")}
              </span>
            </div>
            {station.distance !== undefined ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                <TrendingUp className="w-3 h-3" />
                {station.distance} km
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground/70 italic">
                sample data
              </span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
