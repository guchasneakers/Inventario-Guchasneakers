import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";

type Params = { params: Promise<{ saleId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { saleId } = await params;
    const sale = await prisma.sale.findUnique({
      where: { id: Number(saleId) },
      include: { size: true },
    });
    if (!sale) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });

    const newSold    = Math.max(0, sale.size.sold    - sale.quantity);
    const newRevenue = Math.max(0, sale.size.revenue - sale.quantity * sale.pricePerPair);

    await prisma.$transaction([
      prisma.sale.delete({ where: { id: Number(saleId) } }),
      prisma.size.update({ where: { id: sale.sizeId }, data: { sold: newSold, revenue: newRevenue } }),
    ]);

    return NextResponse.json({ ok: true, updatedSize: { id: sale.sizeId, sold: newSold, revenue: newRevenue } });
  } catch {
    return NextResponse.json({ error: "Error al revertir venta" }, { status: 500 });
  }
}
