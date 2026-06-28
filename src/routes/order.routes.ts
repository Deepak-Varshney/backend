import { Router } from "express";
import { placeOrder, getOrders, getOrder, cancelOrder } from "../controllers/order.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticate, placeOrder);
router.get("/", authenticate, getOrders);
router.get("/:id", authenticate, getOrder);
router.post("/:id/cancel", authenticate, cancelOrder);

export default router;
