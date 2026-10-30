"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Crosshair,
  X,
  Wifi,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { OPERATORS, CONNECTOR_TYPES, CITIES } from "@/lib/types";
import type { StationFilters } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface FilterBarProps {
  filters: StationFilters;
  onFiltersChange: (f: StationFilters) => void;
  onLocateMe: () => void;
  locating: boolean;
  resultCount: number;
  className?: string;
}

export function FilterBar({
  filters,
  onFiltersChange,
  onLocateMe,
  locating,
  resultCount,
  className,
}: FilterBarProps) {
  const [search, setSearch] = React.useState(filters.search || "");
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (search !== (filters.search || "")) {
        onFiltersChange({ ...filters, search: search || undefined });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function update<K extends keyof StationFilters>(key: K, value: StationFilters[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function reset() {
    setSearch("");
    onFiltersChange({});
    setAdvancedOpen(false);
  }

  const activeFilterCount = [
    filters.city,
    filters.operator,
    filters.connectorType,
    filters.status,
    filters.availableOnly,
    filters.minPower,
    filters.maxPrice,
  ].filter(Boolean).length;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, area, operator..."
            className="pl-9 pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Locate me */}
        <Button
          variant="outline"
          onClick={onLocateMe}
          disabled={locating}
          className="shrink-0"
        >
          <Crosshair className={cn("w-4 h-4 mr-2", locating && "animate-spin")} />
          <span className="hidden sm:inline">Near Me</span>
          <span className="sm:hidden">Near</span>
        </Button>

        {/* Advanced filters */}
        <Popover open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="shrink-0 relative">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center bg-primary text-primary-foreground">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">Advanced Filters</p>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    className="h-7 text-xs"
                  >
                    Reset
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> City
                </Label>
                <Select
                  value={filters.city || "all"}
                  onValueChange={(v) =>
                    update("city", v === "all" ? undefined : v)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cities</SelectItem>
                    {CITIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Operator
                </Label>
                <Select
                  value={filters.operator || "all"}
                  onValueChange={(v) =>
                    update("operator", v === "all" ? undefined : v)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All operators" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All operators</SelectItem>
                    {OPERATORS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> Connector Type
                </Label>
                <Select
                  value={filters.connectorType || "all"}
                  onValueChange={(v) =>
                    update("connectorType", v === "all" ? undefined : v)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Any connector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any connector</SelectItem>
                    {CONNECTOR_TYPES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Min Power (kW)</Label>
                <Select
                  value={filters.minPower ? String(filters.minPower) : "all"}
                  onValueChange={(v) =>
                    update("minPower", v === "all" ? undefined : Number(v))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Any power" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any power</SelectItem>
                    <SelectItem value="7">7+ kW</SelectItem>
                    <SelectItem value="30">30+ kW</SelectItem>
                    <SelectItem value="50">50+ kW</SelectItem>
                    <SelectItem value="100">100+ kW</SelectItem>
                    <SelectItem value="150">150+ kW (Ultra-fast)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Max Price (₹/kWh)</Label>
                <Select
                  value={filters.maxPrice ? String(filters.maxPrice) : "all"}
                  onValueChange={(v) =>
                    update("maxPrice", v === "all" ? undefined : Number(v))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Any price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any price</SelectItem>
                    <SelectItem value="18">≤ ₹18</SelectItem>
                    <SelectItem value="22">≤ ₹22</SelectItem>
                    <SelectItem value="25">≤ ₹25</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="available-only" className="text-xs">
                  Available only
                </Label>
                <Switch
                  id="available-only"
                  checked={!!filters.availableOnly}
                  onCheckedChange={(c) => update("availableOnly", c || undefined)}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filter chips */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap items-center gap-1.5"
          >
            <span className="text-xs text-muted-foreground mr-1">Active:</span>
            {filters.city && (
              <FilterChip label={`City: ${filters.city}`} onRemove={() => update("city", undefined)} />
            )}
            {filters.operator && (
              <FilterChip label={filters.operator} onRemove={() => update("operator", undefined)} />
            )}
            {filters.connectorType && (
              <FilterChip label={filters.connectorType} onRemove={() => update("connectorType", undefined)} />
            )}
            {filters.minPower !== undefined && (
              <FilterChip label={`${filters.minPower}+ kW`} onRemove={() => update("minPower", undefined)} />
            )}
            {filters.maxPrice !== undefined && (
              <FilterChip label={`≤ ₹${filters.maxPrice}`} onRemove={() => update("maxPrice", undefined)} />
            )}
            {filters.availableOnly && (
              <FilterChip label="Available" onRemove={() => update("availableOnly", undefined)} />
            )}
            <span className="text-xs text-muted-foreground ml-2">
              {resultCount} station{resultCount !== 1 ? "s" : ""} found
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge
      variant="secondary"
      className="gap-1 py-1 pl-2 pr-1 text-xs bg-primary/10 text-primary"
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 hover:bg-primary/20 rounded p-0.5"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </Badge>
  );
}
