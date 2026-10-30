import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const [
      totalStations,
      totalUsers,
      totalReviews,
      totalFavorites,
      stationsByCity,
      stationsByOperator,
      stationsByStatus,
      recentStations,
      recentUsers,
      recentReviews,
    ] = await Promise.all([
      db.station.count(),
      db.user.count(),
      db.review.count(),
      db.favorite.count(),
      db.station.groupBy({
        by: ["city"],
        _count: true,
      }),
      db.station.groupBy({
        by: ["operator"],
        _count: true,
      }),
      db.station.groupBy({
        by: ["status"],
        _count: true,
      }),
      db.station.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      db.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      db.review.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          station: { select: { name: true } },
        },
      }),
    ]);

    const totalPower = await db.station.aggregate({ _sum: { powerKW: true } });
    const avgRating = await db.station.aggregate({ _avg: { rating: true } });

    return NextResponse.json({
      totals: {
        stations: totalStations,
        users: totalUsers,
        reviews: totalReviews,
        favorites: totalFavorites,
        totalPowerKW: totalPower._sum.powerKW ?? 0,
        avgRating: Math.round((avgRating._avg.rating ?? 0) * 10) / 10,
      },
      byCity: stationsByCity.map((c) => ({ city: c.city, count: c._count })),
      byOperator: stationsByOperator.map((o) => ({ operator: o.operator, count: o._count })),
      byStatus: stationsByStatus.map((s) => ({ status: s.status, count: s._count })),
      recentStations: recentStations.map((s) => ({
        id: s.id,
        name: s.name,
        city: s.city,
        operator: s.operator,
        createdAt: s.createdAt.toISOString(),
      })),
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      })),
      recentReviews: recentReviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        stationName: r.station.name,
        userName: r.user.name,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[ADMIN_STATS]", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
