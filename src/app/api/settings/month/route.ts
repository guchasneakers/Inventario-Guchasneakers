import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";

export async function GET() {
  const setting = await prisma.setting.findUnique({ where: { key: "inventoryMonth" } });
  return NextResponse.json({ value: setting?.value ?? "Mayo 2026" });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { value } = await req.json();
  if (!value?.trim()) {
    return NextResponse.json({ error: "Valor requerido" }, { status: 400 });
  }

  const setting = await prisma.setting.upsert({
    where:  { key: "inventoryMonth" },
    update: { value: value.trim() },
    create: { key: "inventoryMonth", value: value.trim() },
  });

  return NextResponse.json({ value: setting.value });
}
