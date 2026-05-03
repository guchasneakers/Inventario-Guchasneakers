import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  try {
    const { id } = await params;
    const body = await req.json();
    const { modelNum, name, description, price, imageUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        modelNum:    modelNum?.trim() ?? "",
        name:        name.trim(),
        description: description?.trim() || null,
        price:       price != null && price !== "" ? Number(price) : null,
        imageUrl:    imageUrl?.trim() || null,
      },
      include: { sizes: { orderBy: { number: "asc" } } },
    });

    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    await prisma.product.delete({ where: { id: Number(id) } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}
