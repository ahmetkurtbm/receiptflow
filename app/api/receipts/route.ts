import { NextRequest, NextResponse } from "next/server";
import { databaseConfigured, ensureUser, query } from "@/lib/db";
import { requireUser } from "@/lib/auth-user";

type ReceiptRow = {
  id: string; file_name: string; total_amount: string; currency: string; created_at: string;
  group_id: string | null; group_name: string | null; analysis: Record<string, unknown>;
};

export async function GET(request: NextRequest) {
  if (!databaseConfigured) return NextResponse.json({ configured: false, records: [] });
  try {
    const identity = await requireUser();
    const user = await ensureUser(identity.id, identity.name, identity.email);
    const result = await query<ReceiptRow>(
      `SELECT r.id, r.file_name, r.total_amount, r.currency, r.created_at, r.group_id,
              g.name AS group_name, r.analysis
       FROM receipts r
       LEFT JOIN receipt_type_groups g ON g.id = r.group_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [user.id],
    );
    const records = result.rows.map((row) => ({
      ...row.analysis,
      id: row.id,
      fileName: row.file_name,
      totalAmount: Number(row.total_amount),
      savedCurrency: row.currency.trim(),
      createdAt: row.created_at,
      groupId: row.group_id,
      groupName: row.group_name,
    }));
    return NextResponse.json({ configured: true, records });
  } catch (error) {
    console.error("Receipt list error:", error);
    return NextResponse.json({ configured: true, error: "Veritabani kayitlari okunamadi." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!databaseConfigured) return NextResponse.json({ configured: false }, { status: 503 });
  try {
    const body = await request.json();
    const identity = await requireUser();
    const user = await ensureUser(identity.id, identity.name, identity.email);
    const result = await query<{ id: string; created_at: string }>(
      `INSERT INTO receipts(user_id, group_id, document_type, file_name, summary, total_amount, currency, analysis)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING id, created_at`,
      [user.id, body.groupId || null, body.documentType || "Fis", body.fileName, body.summary || "", body.totalAmount, body.savedCurrency || "TRY", JSON.stringify(body)],
    );
    return NextResponse.json({ configured: true, id: result.rows[0].id, createdAt: result.rows[0].created_at });
  } catch (error) {
    console.error("Receipt save error:", error);
    return NextResponse.json({ error: "Fis veritabanina kaydedilemedi." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!databaseConfigured) return NextResponse.json({ configured: false }, { status: 503 });
  try {
    const id = request.nextUrl.searchParams.get("id");
    const identity = await requireUser();
    const user = await ensureUser(identity.id, identity.name, identity.email);
    if (!id) return NextResponse.json({ error: "Kayit kimligi gerekli." }, { status: 400 });
    await query("DELETE FROM receipts WHERE id = $1 AND user_id = $2", [id, user.id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Receipt delete error:", error);
    return NextResponse.json({ error: "Fis silinemedi." }, { status: 500 });
  }
}
