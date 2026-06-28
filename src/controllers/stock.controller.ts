import { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";

export const addStock = async (req: Request, res: Response) => {
  const productId = req.params.productId as string;

  try {
    const { quantity, notes } = req.body;

    if (!quantity || quantity <= 0) {
      res.status(400).json({ success: false, message: "Quantity must be a positive number" });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    const beforeQuantity = product.stockQuantity;
    const afterQuantity = beforeQuantity + quantity;

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: afterQuantity },
      }),
      prisma.stockMovement.create({
        data: {
          productId: product.id,
          movementType: "STOCK_IN",
          quantityChange: quantity,
          beforeQuantity,
          afterQuantity,
          notes: notes ?? `Added ${quantity} units`,
        },
      }),
    ]);

    res.json({
      success: true,
      message: `Stock updated: ${beforeQuantity} → ${afterQuantity}`,
      data: { product: updatedProduct, movement },
    });
  } catch (error) {
    console.error("addStock error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const adjustStock = async (req: Request, res: Response) => {
  const productId = req.params.productId as string;
  try {
    const { quantity, notes } = req.body;

    if (!quantity || quantity === 0) {
      res.status(400).json({ success: false, message: "Adjustment quantity must not be zero" });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    const beforeQuantity = product.stockQuantity;
    const afterQuantity = beforeQuantity + quantity;

    if (afterQuantity < 0) {
      res.status(400).json({ success: false, message: "Stock cannot be negative" });
      return;
    }

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: afterQuantity },
      }),
      prisma.stockMovement.create({
        data: {
          productId: product.id,
          movementType: "STOCK_IN",
          quantityChange: quantity,
          beforeQuantity,
          afterQuantity,
          notes: notes ?? `Adjusted stock by ${quantity > 0 ? "+" : ""}${quantity}`,
        },
      }),
    ]);

    res.json({
      success: true,
      message: `Stock adjusted: ${beforeQuantity} → ${afterQuantity}`,
      data: { product: updatedProduct, movement },
    });
  } catch (error) {
    console.error("adjustStock error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const getStockHistory = async (req: Request, res: Response) => {
  const productId = req.params.productId as string;

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    const movements = await prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      include: { order: { select: { id: true, status: true } } },
    });

    res.json({ success: true, data: { product, movements } });
  } catch (error) {
    console.error("getStockHistory error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const getAllStockHistory = async (req: Request, res: Response) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        order: { select: { id: true, status: true } },
      },
    });

    res.json({ success: true, data: movements });
  } catch (error) {
    console.error("getAllStockHistory error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};
