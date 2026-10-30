"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MapPin, List, LayoutGrid, Zap, SearchX, AlertCircle, RotateCw } from "lucide-react";
import { FilterBar } from "@/components/stations/filter-bar";
import { StationCard } from "@/components/stations/station-card";
import { StationDetailDialog } from "@/components/stations/station-detail-dialog";
import { EvMapWrapper } from "@/components/map/ev-map-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import type { StationFilters, StationWithMeta } from "@/lib/types";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface ExploreViewProps {
  onRequireAuth: () => void;
}

type DisplayMode = "split" | "map" | "list";

export function ExploreView({ onRequireAuth }: ExploreViewProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [filters, setFilters] = React.useState<StationFilters>({});
  const [activeStationId, setActiveStationId] = React.useState<string | null>(null);
  const [detailStationId, setDetailStationId] = React.useState<string | null>(null);
  const [userLocation, setUserLocation] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locating, setLocating] = React.useState(false);
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>("split");

  // Build query string
  const queryString = React.useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && v !== null) {
        params.set(k, String(v));
      }
    });
    return params.toString();
  }, [filters]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["stations", queryString],
    queryFn: () =>
      apiFetch<{ stations: StationWithMeta[]; total: number }>(
        `/api/stations?${queryString}`
      ),
  });

  const stations = data?.stations ?? [];

  const favMutation = useMutation({
    mutationFn: async ({
      stationId,
      isFav,
    }: {
      stationId: string;
      isFav: boolean;
    }) => {
      if (isFav) {
        return apiFetch(`/api/favorites/${stationId}`, { method: "DELETE" });
      }
      return apiFetch("/api/favorites", {
        method: "POST",
        body: JSON.stringify({ stationId }),
      });
    },
    onMutate: ({ stationId, isFav }) => {
      // Optimistic update
      queryClient.setQueryData<{ stations: StationWithMeta[]; total: number }>(
        ["stations", queryString],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            stations: old.stations.map((s) =>
              s.id === stationId ? { ...s, isFavorite: !isFav } : s
            ),
          };
        }
      );
    },
    onError: (_e, { isFav }) => {
      toast.error(isFav ? "Failed to remove favorite" : "Failed to add favorite");
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    },
    onSuccess: (_d, { isFav }) => {
      toast.success(isFav ? "Removed from favorites" : "Added to favorites");
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    },
  });

  function handleToggleFavorite(stationId: string) {
    if (!session?.user) {
      onRequireAuth();
      return;
    }
    const station = stations.find((s) => s.id === stationId);
    if (!station) return;
    favMutation.mutate({ stationId, isFav: !!station.isFavorite });
  }

  function handleLocateMe() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(loc);
        setFilters((f) => ({
          ...f,
          lat: loc.lat,
          lng: loc.lng,
          radiusKm: 20,
        }));
        setLocating(false);
        toast.success("Showing stations within 20 km of your location");
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Please enable location services."
            : "Failed to get your location"
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleClearLocation() {
    setUserLocation(null);
    const { lat, lng, radiusKm, ...rest } = filters;
    void lat;
    void lng;
    void radiusKm;
    setFilters(rest);
  }

  const showMap = displayMode === "split" || displayMode === "map";
  const showList = displayMode === "split" || displayMode === "list";

  return (
    <div className="space-y-4">
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onLocateMe={handleLocateMe}
        locating={locating}
        resultCount={stations.length}
      />

      {userLocation && (
        <div className="flex items-center gap-2 text-xs">
          <Badge className="bg-primary/15 text-primary border-0 gap-1">
            <MapPin className="w-3 h-3" />
            Showing stations within {(filters.radiusKm ?? 20)} km of your location
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={handleClearLocation}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Display mode toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading stations...
            </span>
          ) : (
            <span>
              <span className="font-semibold text-foreground">{stations.length}</span>{" "}
              station{stations.length !== 1 ? "s" : ""} found
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/40">
          <ModeBtn
            active={displayMode === "split"}
            onClick={() => setDisplayMode("split")}
            icon={LayoutGrid}
            label="Split"
          />
          <ModeBtn
            active={displayMode === "map"}
            onClick={() => setDisplayMode("map")}
            icon={MapPin}
            label="Map"
          />
          <ModeBtn
            active={displayMode === "list"}
            onClick={() => setDisplayMode("list")}
            icon={List}
            label="List"
          />
        </div>
      </div>

      {/* Main content */}
      <div
        className={cn(
          "grid gap-4",
          displayMode === "split" && "lg:grid-cols-[1fr_1.3fr]",
          displayMode === "map" && "grid-cols-1",
          displayMode === "list" && "grid-cols-1"
        )}
      >
        {/* List */}
        {showList && (
          <div
            className={cn(
              "order-2 lg:order-1",
              displayMode === "split" && "lg:max-h-[70vh] lg:overflow-y-auto custom-scroll lg:pr-2",
              displayMode === "list" && ""
            )}
          >
            {isLoading ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 rounded-lg" />
                ))}
              </div>
            ) : isError ? (
              <ErrorState onRetry={() => refetch()} />
            ) : stations.length === 0 ? (
              <EmptyState />
            ) : (
              <div
                className={cn(
                  "grid gap-3",
                  displayMode === "list"
                    ? "sm:grid-cols-2 xl:grid-cols-3"
                    : "sm:grid-cols-2"
                )}
              >
                <AnimatePresence mode="popLayout">
                  {stations.map((station) => (
                    <StationCard
                      key={station.id}
                      station={station}
                      onOpen={(id) => setDetailStationId(id)}
                      onToggleFavorite={handleToggleFavorite}
                      isActive={activeStationId === station.id}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Map */}
        {showMap && (
          <motion.div
            layout
            className={cn(
              "order-1 lg:order-2 rounded-lg overflow-hidden border border-border bg-card relative",
              displayMode === "map" ? "h-[75vh]" : "h-[55vh] lg:h-[70vh]"
            )}
          >
            <EvMapWrapper
              stations={stations}
              activeStationId={activeStationId}
              onStationClick={(id) => {
                setActiveStationId(id);
                setDetailStationId(id);
              }}
              userLocation={userLocation}
              radiusKm={userLocation ? filters.radiusKm : undefined}
            />
          </motion.div>
        )}
      </div>

      <StationDetailDialog
        stationId={detailStationId}
        onClose={() => setDetailStationId(null)}
      />
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
        <SearchX className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="font-semibold">No stations found</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        Try adjusting your filters or search query. The current selection did not
        match any EV charging stations.
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
        <AlertCircle className="w-7 h-7 text-destructive" />
      </div>
      <p className="font-semibold">Couldn’t load stations</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        Something went wrong while fetching charging stations. Check your
        connection and try again.
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        <RotateCw className="w-3.5 h-3.5 mr-1.5" />
        Retry
      </Button>
    </div>
  );
}
