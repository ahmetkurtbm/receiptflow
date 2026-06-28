import { NextResponse } from "next/server";
import { databaseConfigured, ensureUser, query } from "@/lib/db";
import { requireUser } from "@/lib/auth-user";

export async function GET() {
  if (!databaseConfigured) return NextResponse.json({ configured: false, groups: [] });
  try {
    const identity = await requireUser();
    const user = await ensureUser(identity.id, identity.name, identity.email);
    const result = await query<{ id: string; code: string; name: string; description: string }>(
      `SELECT g.id, g.code, g.name, g.description
       FROM receipt_type_groups g
       JOIN user_receipt_type_groups urg ON urg.group_id = g.id
       WHERE urg.user_id = $1 AND g.active = TRUE
       ORDER BY g.name`,
      [user.id],
    );
    return NextResponse.json({ configured: true, groups: result.rows });
  } catch (error) {
    console.error("Receipt groups error:", error);
    return NextResponse.json({ error: "Fis gruplari okunamadi." }, { status: 500 });
  }
}
