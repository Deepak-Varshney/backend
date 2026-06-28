import { Router } from "express";
import { addStock, adjustStock, getStockHistory, getAllStockHistory } from "../controllers/stock.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/history", authenticate, getAllStockHistory);
router.post("/:productId/add", authenticate, addStock);
router.post("/:productId/adjust", authenticate, adjustStock);
router.get("/:productId/history", authenticate, getStockHistory);

export default router;
