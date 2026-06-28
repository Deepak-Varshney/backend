import { Request, Response } from "express";

import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import StockMovement from "../models/stockMovement.model.js";

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
      Product.count(),
      Order.count(),
      Order.count({ where: { status: "PENDING" } }),
      Order.count({ where: { status: "CANCELLED" } }),

      StockMovement.findAll({
        order: [["createdAt", "DESC"]],
        limit: 5,
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["name", "sku"],
          },
        ],
      }),

      Product.findAll({
        where: {
          stockQuantity: {
            lte: 10,
          },
        },
        order: [["stockQuantity", "ASC"]],
        attributes: ["id", "name", "sku", "stockQuantity"],
      }),
    ]);

    return res.json({
      success: true,
      data: {
        stats: {
          totalProducts,
          totalOrders,
          pendingOrders,
          cancelledOrders,
        },
        lowStockProducts,
        recentMovements,
      },
    });
  } catch (error) {
    console.error("getDashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};