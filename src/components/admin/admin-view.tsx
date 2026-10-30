"use client";

/**
 * AdminView — full admin dashboard for VoltRoute.
 *
 * Renders four tabs:
 *   1. Overview   — KPI cards + charts (city / operator) + recent activity
 *   2. Stations   — searchable data table + create/edit dialog + delete confirm
 *   3. Users      — data table with role toggle + delete (cannot delete self)
 *   4. Reviews    — list with station name lookup + delete
 *
 * Parent renders <AdminView /> only when session.user.role === "ADMIN", but we
 * still gracefully handle the session loading state.
 */

import * as React from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Activity,
  AlertCircle,
  Battery,
  Building2,
  Cable,
  Gauge,
  Heart,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Star,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  CITIES,
  CONNECTOR_TYPES,
  OPERATORS,
  type Station,
  type StationStatus,
} from "@/lib/types";

/* ============================== Types ============================== */

interface AdminStats {
  totals: {
    stations: number;
    users: number;
    reviews: number;
    favorites: number;
    totalPowerKW: number;
    avgRating: number;
  };
  byCity: { city: string; count: number }[];
  byOperator: { operator: string; count: number }[];
  byStatus: { status: string; count: number }[];
  recentStations: {
    id: string;
    name: string;
    city: string;
    operator: string;
    createdAt: string;
  }[];
  recentUsers: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    createdAt: string;
  }[];
  recentReviews: {
    id: string;
    rating: number;
    comment: string;
    stationName: string;
    userName: string;
    createdAt: string;
  }[];
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  reviewCount: number;
  favoriteCount: number;
}

interface AdminReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  stationId: string;
  user: { id: string; name: string | null; email: string };
}

interface StationFormState {
  name: string;
  operator: string;
  address: string;
  area: string;
  city: string;
  state: string;
  lat: string;
  lng: string;
  status: StationStatus;
  connectorTypes: string[];
  powerKW: string;
  pricePerKWh: string;
  numberOfPorts: string;
  availablePorts: string;
  amenities: string[];
  hours: string;
  phone: string;
  image: string;
}

/* ============================== Constants ============================== */

const AMENITIES = ["Restroom", "Cafe", "Parking", "Wifi", "ATM"] as const;
const STATUSES: StationStatus[] = ["OPERATIONAL", "MAINTENANCE", "OFFLINE"];

const CHART_COLORS = [
  "#10b981",
  "#14b8a6",
  "#84cc16",
  "#06b6d4",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
];

const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
};

const DEFAULT_FORM: StationFormState = {
  name: "",
  operator: "",
  address: "",
  area: "",
  city: "",
  state: "Gujarat",
  lat: "",
  lng: "",
  status: "OPERATIONAL",
  connectorTypes: [],
  powerKW: "50",
  pricePerKWh: "15",
  numberOfPorts: "2",
  availablePorts: "2",
  amenities: [],
  hours: "24/7",
  phone: "",
  image: "",
};

/* ============================== Helpers ============================== */

function timeAgo(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function statusConfig(status: StationStatus) {
  switch (status) {
    case "OPERATIONAL":
      return {
        label: "Active",
        cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    case "MAINTENANCE":
      return {
        label: "Maintenance",
        cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    case "OFFLINE":
      return {
        label: "Offline",
        cls: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      };
  }
}

function StatusBadge({ status }: { status: StationStatus }) {
  const cfg = statusConfig(status);
  return (
    <Badge variant="outline" className={cn("font-medium", cfg.cls)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {cfg.label}
    </Badge>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          {description}
        </p>
      )}
    </div>
  );
}

/* ============================== Main ============================== */

interface AdminViewProps {
  onRequireAuth?: () => void;
}

export function AdminView(_props: AdminViewProps = {}) {
  const { status } = useSession();
  const [tab, setTab] = React.useState("overview");

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading admin dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage stations, users, and reviews across VoltRoute.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-primary/30 text-primary bg-primary/5 w-fit"
        >
          <Shield className="w-3 h-3" />
          Administrator
        </Badge>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-flex h-auto sm:h-9">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger value="stations" className="text-xs sm:text-sm">
              <Zap className="w-4 h-4" />
              Stations
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs sm:text-sm">
              <Star className="w-4 h-4" />
              Reviews
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="stations" className="mt-4">
          <StationsTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <ReviewsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminView;

/* ============================== Overview Tab ============================== */

function OverviewTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiFetch<AdminStats>("/api/admin/stats"),
  });

  if (isLoading) return <OverviewSkeleton />;
  if (isError || !data) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center text-center py-12">
          <AlertCircle className="w-10 h-10 text-destructive mb-3" />
          <p className="text-sm font-medium">Failed to load admin stats</p>
          <p className="text-xs text-muted-foreground mt-1">
            Please ensure you are signed in as an administrator.
          </p>
        </div>
      </Card>
    );
  }

  const stats = [
    {
      label: "Total Stations",
      value: data.totals.stations,
      icon: Zap,
      color: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
    },
    {
      label: "Total Users",
      value: data.totals.users,
      icon: Users,
      color: "text-teal-600 bg-teal-500/10 dark:text-teal-400",
    },
    {
      label: "Total Reviews",
      value: data.totals.reviews,
      icon: Star,
      color: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
    },
    {
      label: "Total Favorites",
      value: data.totals.favorites,
      icon: Heart,
      color: "text-rose-600 bg-rose-500/10 dark:text-rose-400",
    },
    {
      label: "Total Power",
      value: `${data.totals.totalPowerKW} kW`,
      icon: Gauge,
      color: "text-cyan-600 bg-cyan-500/10 dark:text-cyan-400",
    },
    {
      label: "Avg Rating",
      value: data.totals.avgRating ? data.totals.avgRating.toFixed(1) : "—",
      icon: Activity,
      color: "text-lime-600 bg-lime-500/10 dark:text-lime-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            whileHover={{ y: -3 }}
          >
            <Card className="p-4 hover-lift">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {s.label}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold mt-1 truncate">
                    {s.value}
                  </p>
                </div>
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    s.color
                  )}
                >
                  <s.icon className="w-4 h-4" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4 text-primary" />
                Stations by City
              </CardTitle>
              <CardDescription>
                Distribution of stations across cities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                {data.byCity.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    title="No stations yet"
                    description="Stations will appear here once added."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.byCity}
                      margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="city"
                        tick={{ fontSize: 12 }}
                        stroke="var(--muted-foreground)"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                        stroke="var(--muted-foreground)"
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                      />
                      <Bar
                        dataKey="count"
                        name="Stations"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={64}
                      >
                        {data.byCity.map((_, i) => (
                          <Cell
                            key={`city-${i}`}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-4 h-4 text-primary" />
                Stations by Operator
              </CardTitle>
              <CardDescription>
                Share of stations across operators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                {data.byOperator.length === 0 ? (
                  <EmptyState
                    icon={Zap}
                    title="No stations yet"
                    description="Operator breakdown will appear here once stations are added."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byOperator}
                        dataKey="count"
                        nameKey="operator"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        paddingAngle={2}
                      >
                        {data.byOperator.map((_, i) => (
                          <Cell
                            key={`op-${i}`}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                            stroke="var(--background)"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: number, name: string) => [
                          `${value} station${value === 1 ? "" : "s"}`,
                          name,
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 12 }}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RecentStationsCard stations={data.recentStations} />
        <RecentUsersCard users={data.recentUsers} />
        <RecentReviewsCard reviews={data.recentReviews} />
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-16 mt-2" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <Skeleton className="h-64 w-full" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    </div>
  );
}

function RecentStationsCard({
  stations,
}: {
  stations: AdminStats["recentStations"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="w-4 h-4 text-primary" />
          Recent Stations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {stations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No stations yet.
          </p>
        ) : (
          stations.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.operator} • {s.city}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {timeAgo(s.createdAt)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function RecentUsersCard({ users }: { users: AdminStats["recentUsers"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4 text-primary" />
          Recent Users
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No users yet.
          </p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 text-xs font-semibold">
                {(u.name || u.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {u.name || "Unnamed"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {u.email}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] shrink-0",
                  u.role === "ADMIN"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : ""
                )}
              >
                {u.role}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function RecentReviewsCard({
  reviews,
}: {
  reviews: AdminStats["recentReviews"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="w-4 h-4 text-primary" />
          Recent Reviews
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No reviews yet.
          </p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{r.userName}</p>
                  <span className="inline-flex items-center text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    {r.rating}.0
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  on {r.stationName}
                </p>
                {r.comment && (
                  <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-0.5">
                    “{r.comment}”
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {timeAgo(r.createdAt)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ============================== Stations Tab ============================== */

function StationsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [editingStation, setEditingStation] = React.useState<Station | null>(
    null
  );
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Station | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["stations", "admin"],
    queryFn: () =>
      apiFetch<{ stations: Station[]; total: number }>("/api/stations"),
  });

  const stations = data?.stations ?? [];

  const filtered = React.useMemo(() => {
    if (!search.trim()) return stations;
    const q = search.toLowerCase();
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.operator.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q)
    );
  }, [stations, search]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/stations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Station deleted");
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete station"),
  });

  const openCreate = () => {
    setEditingStation(null);
    setIsFormOpen(true);
  };
  const openEdit = (s: Station) => {
    setEditingStation(s);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, city, operator…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Add Station
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Power</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Ports</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="p-0">
                    <EmptyState
                      icon={Zap}
                      title="No stations found"
                      description={
                        search
                          ? "Try a different search term."
                          : "Add your first charging station to get started."
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-4 font-medium max-w-[180px] truncate">
                      {s.name}
                    </TableCell>
                    <TableCell>{s.city}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.operator}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <Zap className="w-3 h-3 text-primary" />
                        {s.powerKW} kW
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Battery className="w-3 h-3" />
                        ₹{s.pricePerKWh}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "font-medium",
                          s.availablePorts > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {s.availablePorts}/{s.numberOfPorts}
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.rating > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {s.rating}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(s.createdAt)}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(s)}
                          title="Edit station"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(s)}
                          title="Delete station"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {stations.length} stations
      </p>

      <StationFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        station={editingStation}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete station?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong className="text-foreground">
                {deleteTarget?.name}
              </strong>{" "}
              and all of its reviews and favorites. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ----- Station Form Dialog ----- */

function StationFormDialog({
  open,
  onOpenChange,
  station,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  station: Station | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!station;
  const [form, setForm] = React.useState<StationFormState>(DEFAULT_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Pre-fill when editing or reset on open
  React.useEffect(() => {
    if (!open) return;
    if (station) {
      setForm({
        name: station.name,
        operator: station.operator,
        address: station.address,
        area: station.area || "",
        city: station.city,
        state: station.state || "Gujarat",
        lat: String(station.lat),
        lng: String(station.lng),
        status: station.status,
        connectorTypes: station.connectorTypes || [],
        powerKW: String(station.powerKW),
        pricePerKWh: String(station.pricePerKWh),
        numberOfPorts: String(station.numberOfPorts),
        availablePorts: String(station.availablePorts),
        amenities: station.amenities || [],
        hours: station.hours || "24/7",
        phone: station.phone || "",
        image: station.image || "",
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setErrors({});
  }, [open, station]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        lat: Number(form.lat),
        lng: Number(form.lng),
        powerKW: Number(form.powerKW),
        pricePerKWh: Number(form.pricePerKWh),
        numberOfPorts: Number(form.numberOfPorts),
        availablePorts: Number(form.availablePorts),
      };
      if (isEdit) {
        return apiFetch(`/api/stations/${station!.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      return apiFetch("/api/stations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Station updated" : "Station created");
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast.error(e.message || "Failed to save station"),
  });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.operator) e.operator = "Operator is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (!form.city) e.city = "City is required";
    if (form.lat === "" || isNaN(Number(form.lat)))
      e.lat = "Valid latitude required";
    if (form.lng === "" || isNaN(Number(form.lng)))
      e.lng = "Valid longitude required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    mutation.mutate();
  };

  const toggleArrayValue = (
    key: "connectorTypes" | "amenities",
    value: string
  ) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter((v) => v !== value)
        : [...f[key], value],
    }));
  };

  const set = <K extends keyof StationFormState>(
    key: K,
    value: StationFormState[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            {isEdit ? "Edit Station" : "Add New Station"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this charging station."
              : "Create a new EV charging station entry."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <FormSection title="Basic Information">
            <Field
              label="Name"
              required
              error={errors.name}
              className="sm:col-span-2"
            >
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Tata Power — Infocity"
              />
            </Field>
            <Field label="Operator" required error={errors.operator}>
              <Select
                value={form.operator}
                onValueChange={(v) => set("operator", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="City" required error={errors.city}>
              <Select
                value={form.city}
                onValueChange={(v) => set("city", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Address"
              required
              error={errors.address}
              className="sm:col-span-2"
            >
              <Input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Street address"
              />
            </Field>
            <Field label="Area">
              <Input
                value={form.area}
                onChange={(e) => set("area", e.target.value)}
                placeholder="e.g. Infocity"
              />
            </Field>
            <Field label="State">
              <Input
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                placeholder="Gujarat"
              />
            </Field>
          </FormSection>

          {/* Location */}
          <FormSection title="Location Coordinates">
            <Field label="Latitude" required error={errors.lat}>
              <Input
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => set("lat", e.target.value)}
                placeholder="23.2156"
              />
            </Field>
            <Field label="Longitude" required error={errors.lng}>
              <Input
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => set("lng", e.target.value)}
                placeholder="72.6369"
              />
            </Field>
          </FormSection>

          {/* Charging Specs */}
          <FormSection title="Charging Specifications">
            <Field label="Status" className="sm:col-span-2">
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as StationStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Power (kW)">
              <Input
                type="number"
                step="any"
                value={form.powerKW}
                onChange={(e) => set("powerKW", e.target.value)}
              />
            </Field>
            <Field label="Price per kWh (₹)">
              <Input
                type="number"
                step="any"
                value={form.pricePerKWh}
                onChange={(e) => set("pricePerKWh", e.target.value)}
              />
            </Field>
            <Field label="Total Ports">
              <Input
                type="number"
                value={form.numberOfPorts}
                onChange={(e) => set("numberOfPorts", e.target.value)}
              />
            </Field>
            <Field label="Available Ports">
              <Input
                type="number"
                value={form.availablePorts}
                onChange={(e) => set("availablePorts", e.target.value)}
              />
            </Field>
            <Field
              label="Connector Types"
              className="sm:col-span-2"
            >
              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                {CONNECTOR_TYPES.map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={form.connectorTypes.includes(c)}
                      onCheckedChange={() => toggleArrayValue("connectorTypes", c)}
                    />
                    <span className="flex items-center gap-1">
                      <Cable className="w-3 h-3 text-muted-foreground" />
                      {c}
                    </span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Amenities" className="sm:col-span-2">
              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                {AMENITIES.map((a) => (
                  <label
                    key={a}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={form.amenities.includes(a)}
                      onCheckedChange={() => toggleArrayValue("amenities", a)}
                    />
                    {a}
                  </label>
                ))}
              </div>
            </Field>
          </FormSection>

          {/* Additional */}
          <FormSection title="Additional Details">
            <Field label="Operating Hours" className="sm:col-span-2">
              <Input
                value={form.hours}
                onChange={(e) => set("hours", e.target.value)}
                placeholder="24/7"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+91 9876543210"
              />
            </Field>
            <Field label="Image URL">
              <Input
                value={form.image}
                onChange={(e) => set("image", e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </FormSection>

          <DialogFooter className="gap-2 pt-2 border-t mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>{isEdit ? "Save Changes" : "Create Station"}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground/90 border-b pb-1.5">
        {title}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ============================== Users Tab ============================== */

function UsersTab() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = React.useState<AdminUser | null>(
    null
  );

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiFetch<{ users: AdminUser[] }>("/api/admin/users"),
  });

  const users = data?.users ?? [];
  const currentUserId = session?.user?.id;

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "USER" | "ADMIN" }) =>
      apiFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ id, role }),
      }),
    onSuccess: (_d, { role }) => {
      toast.success(`User role updated to ${role}`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update role"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete user"),
  });

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Reviews</TableHead>
                <TableHead>Favorites</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={Users}
                      title="No users yet"
                      description="Users will appear here once they sign up."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium truncate max-w-[160px]">
                            {u.name || "Unnamed"}
                            {isSelf && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            u.role === "ADMIN"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : ""
                          )}
                        >
                          {u.role === "ADMIN" ? (
                            <Shield className="w-3 h-3" />
                          ) : (
                            <Users className="w-3 h-3" />
                          )}
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell>{u.reviewCount}</TableCell>
                      <TableCell>{u.favoriteCount}</TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={roleMutation.isPending || isSelf}
                            onClick={() =>
                              roleMutation.mutate({
                                id: u.id,
                                role: u.role === "ADMIN" ? "USER" : "ADMIN",
                              })
                            }
                            title={
                              isSelf
                                ? "You cannot change your own role"
                                : u.role === "ADMIN"
                                ? "Demote to user"
                                : "Promote to admin"
                            }
                          >
                            {u.role === "ADMIN" ? (
                              <>
                                <ShieldOff className="w-4 h-4" />
                                <span className="hidden sm:inline">Demote</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-4 h-4" />
                                <span className="hidden sm:inline">Promote</span>
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(u)}
                            title={
                              isSelf
                                ? "You cannot delete your own account"
                                : "Delete user"
                            }
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong className="text-foreground">
                {deleteTarget?.name || deleteTarget?.email}
              </strong>{" "}
              along with all of their reviews and favorites. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================== Reviews Tab ============================== */

function ReviewsTab() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = React.useState<AdminReview | null>(
    null
  );

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ["reviews", "admin"],
    queryFn: () =>
      apiFetch<{ reviews: AdminReview[] }>("/api/reviews"),
  });

  // Fetch stations separately so we can show station names instead of bare IDs.
  const { data: stationsData } = useQuery({
    queryKey: ["stations", "admin-reviews-lookup"],
    queryFn: () =>
      apiFetch<{ stations: Station[]; total: number }>("/api/stations"),
  });

  const stationNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    (stationsData?.stations ?? []).forEach((s) => m.set(s.id, s.name));
    return m;
  }, [stationsData]);

  const reviews = reviewsData?.reviews ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/reviews?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Review deleted");
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["stations"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete review"),
  });

  return (
    <div className="space-y-4">
      <Card className="p-0">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-4 h-4 text-primary" />
            All Reviews
            {reviews.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {reviews.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Moderate user-submitted reviews across all stations.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No reviews yet"
              description="Reviews will appear here once users start sharing their experiences."
            />
          ) : (
            <div className="divide-y max-h-[70vh] overflow-y-auto">
              {reviews.map((r, idx) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(idx * 0.02, 0.3) }}
                  className="flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 text-xs font-semibold">
                    {(r.user?.name || r.user?.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-medium truncate">
                        {r.user?.name || "Unnamed user"}
                      </p>
                      <span className="text-xs text-muted-foreground truncate">
                        {r.user?.email}
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]"
                      >
                        <Star className="w-3 h-3 fill-current" />
                        {r.rating}.0
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      on{" "}
                      <span className="font-medium text-foreground/80">
                        {stationNameById.get(r.stationId) || (
                          <span className="font-mono">Station {r.stationId.slice(0, 8)}…</span>
                        )}
                      </span>{" "}
                      • {formatDate(r.createdAt)}
                    </p>
                    {r.comment && (
                      <p className="text-sm text-foreground/90 mt-1.5 line-clamp-3">
                        “{r.comment}”
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(r)}
                    title="Delete review"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete review?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this{" "}
              <strong className="text-foreground">{deleteTarget?.rating}-star</strong>{" "}
              review by{" "}
              <strong className="text-foreground">
                {deleteTarget?.user?.name || deleteTarget?.user?.email}
              </strong>
              . The station's rating will be recalculated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
