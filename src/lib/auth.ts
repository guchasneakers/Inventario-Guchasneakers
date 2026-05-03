import { createHash } from "crypto";
import { cookies } from "next/headers";

export function makeSessionToken(password: string): string {
  const secret = process.env.SESSION_SECRET ?? "gucha_fallback_secret_2026";
  return createHash("sha256").update(password + secret).digest("hex");
}

export async function isAdminRequest(): Promise<boolean> {
  const store   = await cookies();
  const session = store.get("admin_session");
  if (!session?.value) return false;
  const expected = makeSessionToken(process.env.ADMIN_PASSWORD ?? "");
  return session.value === expected;
}
