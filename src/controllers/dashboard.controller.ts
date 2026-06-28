import { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const [
      totalProducts,
      totalOrders,
      pendingOrders,
      cancelledOrders,
      recentMovements,
      lowStockProducts,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.stockMovement.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { product: { select: { name: true, sku: true } } },
      }),
      prisma.product.findMany({
        where: { stockQuantity: { lte: 10 } },
        orderBy: { stockQuantity: "asc" },
        select: { id: true, name: true, sku: true, stockQuantity: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        stats: { totalProducts, totalOrders, pendingOrders, cancelledOrders },
        lowStockProducts,
        recentMovements,
      },
    });
  } catch (error) {
    console.error("getDashboard error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};
