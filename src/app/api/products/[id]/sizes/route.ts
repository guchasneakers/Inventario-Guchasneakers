import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const { number, quantity } = body;

    if (!number?.toString().trim()) {
      return NextResponse.json({ error: "El número de talla es requerido" }, { status: 400 });
    }

    const size = await prisma.size.create({
      data: {
        number:    String(number).trim(),
        quantity:  Number(quantity) || 1,
        sold:      0,
        productId: Number(id),
      },
    });

    return NextResponse.json(size, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al agregar talla" }, { status: 500 });
  }
}
