"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Heart, Loader2, SearchX, Zap, ArrowRight } from "lucide-react";
import { StationCard } from "@/components/stations/station-card";
import { StationDetailDialog } from "@/components/stations/station-detail-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import type { StationWithMeta } from "@/lib/types";

interface FavoritesViewProps {
  onExplore: () => void;
  onRequireAuth: () => void;
}

export function FavoritesView({ onExplore, onRequireAuth }: FavoritesViewProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [detailStationId, setDetailStationId] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: () =>
      apiFetch<{ stations: StationWithMeta[]; total: number }>(
        "/api/favorites"
      ),
    enabled: !!session?.user,
  });

  const removeMutation = useMutation({
    mutationFn: (stationId: string) =>
      apiFetch(`/api/favorites/${stationId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Removed from favorites");
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    },
    onError: () => toast.error("Failed to remove favorite"),
  });

  function handleToggleFavorite(stationId: string) {
    // In favorites view, clicking always removes
    removeMutation.mutate(stationId);
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto max-w-3xl py-16 px-4">
        <EmptyState
          icon={Heart}
          title="Sign in to view your favorites"
          desc="Save EV charging stations you love and access them anytime from any device."
          action={
            <Button onClick={onRequireAuth} size="lg">
              Sign In
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <FavoritesHeader count={0} loading />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const stations = data?.stations ?? [];

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <FavoritesHeader count={stations.length} />

      {stations.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          desc="Tap the heart icon on any charging station to save it here for quick access later."
          action={
            <Button onClick={onExplore} size="lg">
              <Zap className="w-4 h-4 mr-2" />
              Find Stations
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          }
        />
      ) : (
        <motion.div
          layout
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6"
        >
          {stations.map((station, idx) => (
            <StationCard
              key={station.id}
              station={station}
              index={idx}
              onOpen={(id) => setDetailStationId(id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </motion.div>
      )}

      <StationDetailDialog
        stationId={detailStationId}
        onClose={() => setDetailStationId(null)}
      />
    </div>
  );
}

function FavoritesHeader({ count, loading }: { count: number; loading?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          Your Favorites
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading
            ? "Loading your saved stations..."
            : `${count} station${count !== 1 ? "s" : ""} saved`}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center mb-4">
        <Icon className="w-9 h-9 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
