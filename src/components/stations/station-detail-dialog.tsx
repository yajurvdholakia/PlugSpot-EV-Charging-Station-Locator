"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  MapPin,
  Clock,
  Star,
  Heart,
  Battery,
  Plug,
  Navigation,
  Phone,
  Building2,
  Loader2,
  Trash2,
  Send,
  Coffee,
  Car,
  Wifi,
  Banknote,
  CheckCircle2,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import type { Station, Review } from "@/lib/types";

interface StationDetailResponse extends Station {
  isFavorite: boolean;
  myReview: { id: string; rating: number; comment: string; createdAt: string } | null;
  reviews: Review[];
}

interface StationDetailDialogProps {
  stationId: string | null;
  onClose: () => void;
}

const AMENITY_ICONS: Record<string, React.ElementType> = {
  Restroom: Building2,
  Cafe: Coffee,
  Parking: Car,
  Wifi: Wifi,
  ATM: Banknote,
};

export function StationDetailDialog({
  stationId,
  onClose,
}: StationDetailDialogProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [reviewRating, setReviewRating] = React.useState(0);
  const [reviewComment, setReviewComment] = React.useState("");
  const [hoverRating, setHoverRating] = React.useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["station", stationId],
    queryFn: () =>
      apiFetch<StationDetailResponse>(`/api/stations/${stationId}`),
    enabled: !!stationId,
  });

  // Plan B Pairing — nearest compatible alternative station
  const { data: planBData } = useQuery({
    queryKey: ["plan-b", stationId],
    queryFn: () =>
      apiFetch<{
        planB: (Station & { distance: number; sharedConnectors: string[]; googleMapsUrl: string }) | null;
        reason: string;
      }>(`/api/stations/${stationId}/plan-b`),
    enabled: !!stationId,
  });

  async function handleRemoveFavorite() {
    if (!data) return;
    try {
      await apiFetch(`/api/favorites/${data.id}`, { method: "DELETE" });
      toast.success("Removed from favorites");
      queryClient.invalidateQueries({ queryKey: ["station", stationId] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    } catch {
      toast.error("Failed to remove favorite");
    }
  }

  async function handleAddFavorite() {
    if (!data) return;
    try {
      await apiFetch("/api/favorites", {
        method: "POST",
        body: JSON.stringify({ stationId: data.id }),
      });
      toast.success("Added to favorites");
      queryClient.invalidateQueries({ queryKey: ["station", stationId] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    } catch (err) {
      toast.error("Failed to add favorite");
    }
  }

  const reviewMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          stationId,
          rating: reviewRating,
          comment: reviewComment,
        }),
      }),
    onSuccess: () => {
      toast.success("Review posted!");
      setReviewRating(0);
      setReviewComment("");
      queryClient.invalidateQueries({ queryKey: ["station", stationId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to post review");
    },
  });

  function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reviewRating < 1) {
      toast.error("Please select a rating");
      return;
    }
    reviewMutation.mutate();
  }

  async function handleDeleteReview(reviewId: string) {
    try {
      await apiFetch(`/api/reviews?id=${reviewId}`, { method: "DELETE" });
      toast.success("Review deleted");
      queryClient.invalidateQueries({ queryKey: ["station", stationId] });
    } catch (err) {
      toast.error("Failed to delete review");
    }
  }

  const openInMaps = () => {
    if (!data) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={!!stationId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        {isLoading || !data ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col max-h-[90vh]">
            {/* Image header */}
            <div className="relative h-44 sm:h-52 bg-muted shrink-0">
              {data.image ? (
                <img
                  src={data.image}
                  alt={data.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Zap className="w-12 h-12 text-primary" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              <div className="absolute bottom-3 left-4 right-4 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-white/25 text-white border-0 text-[10px]">
                    {data.operator}
                  </Badge>
                  <Badge
                    className={cn(
                      "border-0 text-[10px]",
                      data.status === "OPERATIONAL"
                        ? "bg-emerald-500/80 text-white"
                        : data.status === "MAINTENANCE"
                        ? "bg-amber-500/80 text-white"
                        : "bg-red-500/80 text-white"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white mr-1" />
                    {data.status === "OPERATIONAL"
                      ? `${data.availablePorts}/${data.numberOfPorts} available`
                      : data.status === "MAINTENANCE"
                      ? "Maintenance"
                      : "Offline"}
                  </Badge>
                </div>
                <h2 className="text-lg font-bold leading-tight">{data.name}</h2>
                <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {data.address}
                </p>
              </div>

              <button
                onClick={() =>
                  data.isFavorite ? handleRemoveFavorite() : handleAddFavorite()
                }
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center hover:bg-white transition-colors"
                aria-label={data.isFavorite ? "Remove favorite" : "Add favorite"}
              >
                <Heart
                  className={cn(
                    "w-4 h-4 transition-colors",
                    data.isFavorite
                      ? "fill-red-500 text-red-500"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatBox
                  icon={Zap}
                  label="Power"
                  value={`${data.powerKW} kW`}
                />
                <StatBox
                  icon={Battery}
                  label="Price"
                  value={`₹${data.pricePerKWh}/kWh`}
                />
                <StatBox
                  icon={Clock}
                  label="Hours"
                  value={data.hours}
                />
                <StatBox
                  icon={Star}
                  label="Rating"
                  value={data.rating > 0 ? `${data.rating} (${data.reviewCount})` : "N/A"}
                />
              </div>

              {/* Connectors */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Plug className="w-3.5 h-3.5" /> Connector Types
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.connectorTypes.map((c) => (
                    <Badge key={c} variant="secondary" className="text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              {data.amenities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Amenities
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.amenities.map((a) => {
                      const Icon = AMENITY_ICONS[a] || CheckCircle2;
                      return (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium"
                        >
                          <Icon className="w-3.5 h-3.5 text-primary" />
                          {a}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Contact */}
              {data.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-primary" />
                  <a
                    href={`tel:${data.phone}`}
                    className="text-primary hover:underline"
                  >
                    {data.phone}
                  </a>
                </div>
              )}

              {/* Plan B Pairing — nearest compatible alternative */}
              {planBData && (
                <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldAlert className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold">If this one is busy or broken</p>
                  </div>
                  {planBData.planB ? (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {planBData.planB.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {planBData.planB.operator} · {planBData.planB.distance} km ·{" "}
                          {planBData.planB.sharedConnectors.join(", ")}
                        </p>
                        <p className="text-xs mt-1">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium",
                              planBData.planB.status === "OPERATIONAL"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : planBData.planB.status === "MAINTENANCE"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-red-500/15 text-red-600 dark:text-red-400"
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {planBData.planB.status === "OPERATIONAL"
                              ? `${planBData.planB.availablePorts}/${planBData.planB.numberOfPorts} free`
                              : planBData.planB.status.toLowerCase()}
                          </span>
                        </p>
                      </div>
                      <a
                        href={planBData.planB.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                      >
                        <Navigation className="w-3 h-3" />
                        Go
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{planBData.reason}</p>
                  )}
                </div>
              )}

              <Separator />

              {/* Reviews section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Reviews ({data.reviewCount})
                  </p>
                  {data.rating > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-semibold">{data.rating}</span>
                      <span className="text-muted-foreground text-xs">/ 5</span>
                    </div>
                  )}
                </div>

                {/* Review form */}
                {session?.user ? (
                  !data.myReview && (
                    <form
                      onSubmit={handleReviewSubmit}
                      className="rounded-lg border border-border p-3 space-y-2 bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Your rating:
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setReviewRating(n)}
                              onMouseEnter={() => setHoverRating(n)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="p-0.5"
                              aria-label={`Rate ${n} stars`}
                            >
                              <Star
                                className={cn(
                                  "w-4 h-4 transition-colors",
                                  n <= (hoverRating || reviewRating)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground"
                                )}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <Textarea
                        placeholder="Share your experience..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="min-h-16 resize-none text-sm"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={reviewMutation.isPending || reviewRating < 1}
                        className="ml-auto flex"
                      >
                        {reviewMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 mr-1" />
                        )}
                        Post Review
                      </Button>
                    </form>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground italic bg-muted/30 rounded-lg p-2.5 text-center">
                    Sign in to leave a review
                  </p>
                )}

                {/* Reviews list */}
                <AnimatePresence mode="popLayout">
                  {data.reviews.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No reviews yet. Be the first to review!
                    </p>
                  ) : (
                    data.reviews.map((review) => (
                      <motion.div
                        key={review.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-lg border border-border p-3 bg-card"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-semibold">
                                {(review.user?.name || review.user?.email || "U")
                                  .split(" ")
                                  .map((p) => p[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-semibold">
                                {review.user?.name || "Anonymous"}
                              </p>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <Star
                                    key={n}
                                    className={cn(
                                      "w-2.5 h-2.5",
                                      n <= review.rating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-muted-foreground/30"
                                    )}
                                  />
                                ))}
                                <span className="text-[10px] text-muted-foreground ml-1">
                                  {new Date(review.createdAt).toLocaleDateString(
                                    "en-IN",
                                    { day: "numeric", month: "short", year: "numeric" }
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          {session?.user &&
                            (session.user.id === review.userId ||
                              session.user.role === "ADMIN") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteReview(review.id)}
                                aria-label="Delete review"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                        </div>
                        {review.comment && (
                          <p className="text-sm text-foreground/90 mt-1.5">
                            {review.comment}
                          </p>
                        )}
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Sticky footer action */}
            <div className="border-t border-border bg-card p-3 shrink-0 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  data.isFavorite ? handleRemoveFavorite() : handleAddFavorite()
                }
              >
                <Heart
                  className={cn(
                    "w-4 h-4 mr-2",
                    data.isFavorite && "fill-red-500 text-red-500"
                  )}
                />
                {data.isFavorite ? "Saved" : "Save"}
              </Button>
              <Button className="flex-1" onClick={openInMaps}>
                <Navigation className="w-4 h-4 mr-2" />
                Get Directions
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border p-2.5 bg-card text-center">
      <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-xs font-semibold mt-0.5">{value}</p>
    </div>
  );
}
