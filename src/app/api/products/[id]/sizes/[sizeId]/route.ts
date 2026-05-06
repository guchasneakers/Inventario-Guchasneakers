import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";

type Params = { params: Promise<{ id: string; sizeId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { sizeId } = await params;
    const body = await req.json();

    const existing = await prisma.size.findUnique({ where: { id: Number(sizeId) } });
    if (!existing) {
      return NextResponse.json({ error: "Talla no encontrada" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.number   !== undefined) data.number   = String(body.number).trim();
    if (body.quantity !== undefined) data.quantity = Math.max(1, Number(body.quantity));
    if (body.sold     !== undefined) data.sold     = Math.min(Math.max(0, Number(body.sold)), body.quantity !== undefined ? Math.max(1, Number(body.quantity)) : existing.quantity);
    if (body.revenue  !== undefined) data.revenue  = Math.max(0, Number(body.revenue));
    if (body.hidden   !== undefined) data.hidden   = Boolean(body.hidden);

    const size = await prisma.size.update({
      where: { id: Number(sizeId) },
      data,
    });

    return NextResponse.json(size);
  } catch {
    return NextResponse.json({ error: "Error al actualizar talla" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { sizeId } = await params;
    await prisma.size.delete({ where: { id: Number(sizeId) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar talla" }, { status: 500 });
  }
}
