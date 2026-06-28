import "server-only";

import { auth } from "@/auth";

export async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  return {
    id: session.user.id,
    name: session.user.name ?? session.user.email ?? "ReceiptFlow kullanıcısı",
    email: session.user.email ?? null,
  };
}
