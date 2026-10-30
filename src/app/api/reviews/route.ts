import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const stationId = url.searchParams.get("stationId");

    const reviews = await db.review.findMany({
      where: stationId ? { stationId } : undefined,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        stationId: r.stationId,
        user: r.user,
      })),
    });
  } catch (error) {
    console.error("[REVIEWS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in to leave a review" }, { status: 401 });
    }

    const { stationId, rating, comment } = await req.json();
    if (!stationId || !rating) {
      return NextResponse.json({ error: "stationId and rating are required" }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const existing = await db.review.findUnique({
      where: { userId_stationId: { userId: user.id, stationId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You have already reviewed this station. Edit it instead." },
        { status: 400 }
      );
    }

    const review = await db.review.create({
      data: {
        userId: user.id,
        stationId,
        rating: Number(rating),
        comment: comment?.trim() || "",
      },
    });

    // Recompute station rating
    const agg = await db.review.aggregate({
      where: { stationId },
      _avg: { rating: true },
      _count: true,
    });
    await db.station.update({
      where: { id: stationId },
      data: {
        rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count,
      },
    });

    return NextResponse.json({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("[REVIEWS_POST]", error);
    return NextResponse.json({ error: "Failed to post review" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const reviewId = url.searchParams.get("id");
    if (!reviewId) {
      return NextResponse.json({ error: "Review id is required" }, { status: 400 });
    }

    const review = await db.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const isAdmin = user.role === "ADMIN";
    if (review.userId !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stationId = review.stationId;
    await db.review.delete({ where: { id: reviewId } });

    // Recompute station rating
    const agg = await db.review.aggregate({
      where: { stationId },
      _avg: { rating: true },
      _count: true,
    });
    await db.station.update({
      where: { id: stationId },
      data: {
        rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REVIEWS_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
