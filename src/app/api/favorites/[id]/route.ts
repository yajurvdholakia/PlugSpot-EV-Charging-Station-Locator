import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// NOTE: the [id] dynamic param here is the STATION id (not the Favorite row id).
// This is intentional — the client always knows the station id, never the favorite row id.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await db.favorite.deleteMany({
      where: { stationId: id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FAVORITE_DELETE]", error);
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
}
