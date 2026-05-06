import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: { sizes: { orderBy: { number: "asc" } } },
    });

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Error al obtener producto" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const { brandId, name, description, price, imageUrl, hidden } = body;

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    // Allow partial update (e.g. only toggling hidden)
    const data: Record<string, unknown> = {};
    if (brandId     !== undefined) data.brandId     = brandId ? Number(brandId) : null;
    if (name        !== undefined) data.name        = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (price       !== undefined) data.price       = price != null && price !== "" ? Number(price) : null;
    if (imageUrl    !== undefined) data.imageUrl    = imageUrl?.trim() || null;
    if (hidden      !== undefined) data.hidden      = Boolean(hidden);

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data,
      include: { brand: true, sizes: { orderBy: { number: "asc" } } },
    });

    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { id } = await params;
    await prisma.product.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}
