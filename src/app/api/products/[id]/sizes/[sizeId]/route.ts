import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; sizeId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { sizeId } = await params;
    const body = await req.json();

    const existing = await prisma.size.findUnique({ where: { id: Number(sizeId) } });
    if (!existing) {
      return NextResponse.json({ error: "Talla no encontrada" }, { status: 404 });
    }

    const sold = body.sold !== undefined ? Number(body.sold) : existing.sold;
    const clamped = Math.min(Math.max(0, sold), existing.quantity);

    const size = await prisma.size.update({
      where: { id: Number(sizeId) },
      data:  { sold: clamped },
    });

    return NextResponse.json(size);
  } catch {
    return NextResponse.json({ error: "Error al actualizar talla" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { sizeId } = await params;

    await prisma.size.delete({ where: { id: Number(sizeId) } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar talla" }, { status: 500 });
  }
}
