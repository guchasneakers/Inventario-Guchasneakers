import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";

type Params = { params: Promise<{ saleId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { saleId } = await params;
    const body = await req.json();
    const { quantity, pricePerPair, buyerName, note, customImageUrl, customProduct, customSize, sizeId: newSizeId } = body as {
      quantity: number;
      pricePerPair: number;
      buyerName?: string;
      note?: string;
      customImageUrl?: string;
      customProduct?: string;
      customSize?: string;
      sizeId?: number;
    };

    const sale = await prisma.sale.findUnique({
      where: { id: Number(saleId) },
      include: { size: true },
    });
    if (!sale) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });

    if (sale.sizeId && sale.size) {
      const sizeChanged = newSizeId !== undefined && newSizeId !== sale.sizeId;

      if (sizeChanged) {
        // Cambio de size — revertir el size viejo y aplicar al nuevo
        const newSize = await prisma.size.findUnique({ where: { id: newSizeId } });
        if (!newSize) return NextResponse.json({ error: "Size no encontrado" }, { status: 404 });

        const revertedSold    = Math.max(0, sale.size.sold    - sale.quantity);
        const revertedRevenue = Math.max(0, sale.size.revenue - sale.quantity * sale.pricePerPair);
        const updatedSold     = Math.min(newSize.sold + quantity, newSize.quantity);
        const updatedRevenue  = newSize.revenue + quantity * pricePerPair;

        await prisma.$transaction([
          prisma.sale.update({
            where: { id: Number(saleId) },
            data: {
              sizeId: newSizeId,
              quantity,
              pricePerPair,
              buyerName: buyerName !== undefined ? buyerName : sale.buyerName,
              note:      note      !== undefined ? note      : sale.note,
            },
          }),
          prisma.size.update({ where: { id: sale.sizeId }, data: { sold: revertedSold, revenue: revertedRevenue } }),
          prisma.size.update({ where: { id: newSizeId   }, data: { sold: updatedSold,  revenue: updatedRevenue  } }),
        ]);

        return NextResponse.json({
          ok: true,
          updatedSize:  { id: newSizeId,   sold: updatedSold,    revenue: updatedRevenue  },
          revertedSize: { id: sale.sizeId, sold: revertedSold,   revenue: revertedRevenue },
        });
      }

      // Mismo size — solo actualizar qty/precio
      const newSold    = Math.max(0, sale.size.sold    - sale.quantity    + quantity);
      const newRevenue = Math.max(0, sale.size.revenue - sale.quantity * sale.pricePerPair + quantity * pricePerPair);

      await prisma.$transaction([
        prisma.sale.update({
          where: { id: Number(saleId) },
          data: {
            quantity,
            pricePerPair,
            buyerName: buyerName !== undefined ? buyerName : sale.buyerName,
            note:      note      !== undefined ? note      : sale.note,
          },
        }),
        prisma.size.update({ where: { id: sale.sizeId }, data: { sold: newSold, revenue: newRevenue } }),
      ]);

      return NextResponse.json({ ok: true, updatedSize: { id: sale.sizeId, sold: newSold, revenue: newRevenue } });
    }

    // Venta libre — solo actualizar la venta
    await prisma.sale.update({
      where: { id: Number(saleId) },
      data: {
        quantity,
        pricePerPair,
        buyerName:      buyerName      !== undefined ? buyerName                        : sale.buyerName,
        note:           note           !== undefined ? note                             : sale.note,
        customImageUrl: customImageUrl !== undefined ? (customImageUrl || null)         : sale.customImageUrl,
        customProduct:  customProduct  !== undefined ? (customProduct.trim()  || null)  : sale.customProduct,
        customSize:     customSize     !== undefined ? (customSize.trim()     || null)   : sale.customSize,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al editar venta" }, { status: 500 });
  }
}

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

    if (sale.sizeId && sale.size) {
      // Venta de inventario — revertir sold/revenue en la talla
      const newSold    = Math.max(0, sale.size.sold    - sale.quantity);
      const newRevenue = Math.max(0, sale.size.revenue - sale.quantity * sale.pricePerPair);

      await prisma.$transaction([
        prisma.sale.delete({ where: { id: Number(saleId) } }),
        prisma.size.update({ where: { id: sale.sizeId }, data: { sold: newSold, revenue: newRevenue } }),
      ]);

      return NextResponse.json({ ok: true, updatedSize: { id: sale.sizeId, sold: newSold, revenue: newRevenue } });
    }

    // Venta libre — solo eliminar
    await prisma.sale.delete({ where: { id: Number(saleId) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al revertir venta" }, { status: 500 });
  }
}
