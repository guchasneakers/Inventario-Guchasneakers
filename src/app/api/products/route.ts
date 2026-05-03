import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";

    const products = await prisma.product.findMany({
      where: search
        ? { name: { contains: search, mode: "insensitive" } }
        : undefined,
      include: { sizes: { orderBy: { number: "asc" } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { modelNum, name, description, price, imageUrl, sizes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        modelNum: modelNum?.trim() ?? "",
        name:        name.trim(),
        description: description?.trim() || null,
        price:       price != null && price !== "" ? Number(price) : null,
        imageUrl:    imageUrl?.trim() || null,
        sizes: {
          create: Array.isArray(sizes)
            ? sizes.map((s: { number: string; quantity: number }) => ({
                number:   String(s.number).trim(),
                quantity: Number(s.quantity) || 1,
                sold:     0,
              }))
            : [],
        },
      },
      include: { sizes: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}
