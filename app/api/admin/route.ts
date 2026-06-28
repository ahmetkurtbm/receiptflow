import { NextRequest, NextResponse } from "next/server";
import { databaseConfigured, query } from "@/lib/db";
import { requireUser } from "@/lib/auth-user";

export async function GET() {
  await requireUser();
  if (!databaseConfigured) return NextResponse.json({ configured: false, users: [], groups: [] });
  try {
    const [users, groups] = await Promise.all([
      query<{ id: string; external_user_id: string; display_name: string; email: string | null; active: boolean; group_ids: string[] }>(
        `SELECT u.id, u.external_user_id, u.display_name, u.email, u.active,
                COALESCE(array_agg(urg.group_id) FILTER (WHERE urg.group_id IS NOT NULL), '{}') AS group_ids
         FROM users u LEFT JOIN user_receipt_type_groups urg ON urg.user_id = u.id
         GROUP BY u.id ORDER BY u.display_name`,
      ),
      query<{ id: string; code: string; name: string; description: string; active: boolean }>(
        "SELECT id, code, name, description, active FROM receipt_type_groups ORDER BY name",
      ),
    ]);
    return NextResponse.json({ configured: true, users: users.rows, groups: groups.rows });
  } catch (error) {
    console.error("Admin data error:", error);
    return NextResponse.json({ error: "Admin verileri okunamadi." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await requireUser();
  if (!databaseConfigured) return NextResponse.json({ configured: false }, { status: 503 });
  try {
    const body = await request.json();
    if (body.action === "createUser") {
      await query(
        `INSERT INTO users(external_user_id, display_name, email) VALUES($1, $2, $3)
         ON CONFLICT(external_user_id) DO UPDATE SET display_name = EXCLUDED.display_name, email = EXCLUDED.email, updated_at = NOW()`,
        [body.externalUserId, body.displayName, body.email || null],
      );
    } else if (body.action === "createGroup") {
      await query(
        "INSERT INTO receipt_type_groups(code, name, description) VALUES($1, $2, $3)",
        [String(body.code).toUpperCase(), body.name, body.description || ""],
      );
    } else if (body.action === "assignGroups") {
      await query("DELETE FROM user_receipt_type_groups WHERE user_id = $1", [body.userId]);
      for (const groupId of body.groupIds as string[]) {
        await query("INSERT INTO user_receipt_type_groups(user_id, group_id) VALUES($1, $2) ON CONFLICT DO NOTHING", [body.userId, groupId]);
      }
    } else {
      return NextResponse.json({ error: "Gecersiz admin islemi." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin update error:", error);
    return NextResponse.json({ error: "Admin islemi tamamlanamadi." }, { status: 500 });
  }
}
