import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(brands);
  } catch {
    return NextResponse.json({ error: "Error al obtener marcas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest()))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { name } = await req.json();
    if (!name?.trim())
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    const brand = await prisma.brand.create({ data: { name: name.trim() } });
    return NextResponse.json(brand, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Marca ya existe o error al crear" }, { status: 500 });
  }
}
