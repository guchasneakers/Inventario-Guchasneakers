import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest()))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const { name } = await req.json();
    if (!name?.trim())
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    const brand = await prisma.brand.update({
      where: { id: Number(id) },
      data:  { name: name.trim() },
    });
    return NextResponse.json(brand);
  } catch {
    return NextResponse.json({ error: "Error al actualizar marca" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest()))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    await prisma.brand.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar marca" }, { status: 500 });
  }
}
