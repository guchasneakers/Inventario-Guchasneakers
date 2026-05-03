import { NextRequest, NextResponse } from "next/server";
import { makeSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || !password || password !== adminPassword) {
    await new Promise((r) => setTimeout(r, 600)); // throttle brute force
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const token = makeSessionToken(password);
  const res   = NextResponse.json({ ok: true });

  res.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 7, // 7 días
    path:     "/",
    secure:   process.env.NODE_ENV === "production",
  });

  return res;
}
