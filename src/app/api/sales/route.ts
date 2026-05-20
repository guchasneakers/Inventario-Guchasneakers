import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";

const sizeInclude = {
  include: {
    size: {
      include: {
        product: {
          select: { id: true, name: true, modelNum: true, imageUrl: true, brand: { select: { name: true } } },
        },
      },
    },
  },
};

// GET /api/sales?sizeId=X   → sales for a size (revert tab)
// GET /api/sales             → all sales (register view)
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const sizeId = req.nextUrl.searchParams.get("sizeId");
    const sales = await prisma.sale.findMany({
      where:   sizeId ? { sizeId: Number(sizeId) } : undefined,
      ...sizeInclude,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sales);
  } catch {
    return NextResponse.json({ error: "Error al obtener ventas" }, { status: 500 });
  }
}

// POST /api/sales  { sizeId, quantity, pricePerPair, buyerName?, note? }
//              or  { customProduct, customBrand?, customSize, quantity, pricePerPair, buyerName?, note? }
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { sizeId, quantity, pricePerPair, buyerName, note, customProduct, customBrand, customSize, customImageUrl } = await req.json();

    if (!quantity || pricePerPair == null) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const qty   = Math.max(1, Number(quantity));
    const price = Math.max(0, Number(pricePerPair));

    // Venta vinculada a inventario
    if (sizeId) {
      const size = await prisma.size.findUnique({ where: { id: Number(sizeId) } });
      if (!size) return NextResponse.json({ error: "Talla no encontrada" }, { status: 404 });

      const newSold    = Math.min(size.sold + qty, size.quantity);
      const newRevenue = size.revenue + qty * price;

      const [sale] = await prisma.$transaction([
        prisma.sale.create({
          data: { sizeId: Number(sizeId), quantity: qty, pricePerPair: price, buyerName: buyerName?.trim() || null, note: note?.trim() || null },
          ...sizeInclude,
        }),
        prisma.size.update({ where: { id: Number(sizeId) }, data: { sold: newSold, revenue: newRevenue } }),
      ]);

      return NextResponse.json({ sale, updatedSize: { id: Number(sizeId), sold: newSold, revenue: newRevenue } }, { status: 201 });
    }

    // Venta libre (producto fuera de inventario)
    if (!customProduct?.trim() || !customSize?.trim()) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const sale = await prisma.sale.create({
      data: {
        quantity: qty,
        pricePerPair: price,
        buyerName:     buyerName?.trim()     || null,
        note:          note?.trim()          || null,
        customProduct:  customProduct.trim(),
        customBrand:    customBrand?.trim()    || null,
        customSize:     customSize.trim(),
        customImageUrl: customImageUrl?.trim() || null,
      },
      ...sizeInclude,
    });

    return NextResponse.json({ sale, updatedSize: null }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al registrar venta" }, { status: 500 });
  }
}
