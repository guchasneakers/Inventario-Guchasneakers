import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search  = searchParams.get("search") ?? "";
    const admin   = await isAdminRequest();

    const where: Record<string, unknown> = {};
    if (!admin) where.hidden = false;
    if (search)  where.name  = { contains: search, mode: "insensitive" };

    const products = await prisma.product.findMany({
      where,
      include: {
        brand: true,
        sizes: {
          where:   admin ? undefined : { hidden: false },
          orderBy: { number: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { brandId, name, description, price, imageUrl, sizes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        brandId:     brandId ? Number(brandId) : null,
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
      include: { brand: true, sizes: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}
