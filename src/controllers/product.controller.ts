import { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error("getProducts error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { movements: { orderBy: { createdAt: "desc" }, take: 10 } },
    });

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error("getProduct error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { sku, name, description, price } = req.body;

    const priceNum = Number(price);

    if (!sku || !name || Number.isNaN(priceNum)) {
      res.status(400).json({
        success: false,
        message: "SKU, name and valid price are required",
      });
      return;
    }

    if (priceNum <= 0) {
      res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
      return;
    }

    const existing = await prisma.product.findUnique({
      where: { sku },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: "SKU already exists",
      });
      return;
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        price: priceNum,
      },
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("createProduct error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const { sku, name, description, price } = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    if (sku && sku !== product.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku },
      });

      if (skuExists) {
        res.status(409).json({
          success: false,
          message: "SKU already exists",
        });
        return;
      }
    }

    const data: {
      sku?: string;
      name?: string;
      description?: string;
      price?: number;
    } = {};

    if (sku !== undefined) data.sku = sku;
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;

    if (price !== undefined) {
      const priceNum = Number(price);

      if (Number.isNaN(priceNum) || priceNum <= 0) {
        res.status(400).json({
          success: false,
          message: "Price must be greater than 0",
        });
        return;
      }

      data.price = priceNum;
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("updateProduct error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }
    const orderCount = await prisma.order.count({ where: { items: { some: { productId: id } } } });
    if (orderCount > 0) {
      res.status(400).json({ success: false, message: "Cannot delete product with existing orders" });
      return;
    }
    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    console.error("deleteProduct error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};
