import { Router } from "express";
import { asyncHandler as h } from "../middleware/errorHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import { getTraders, getDetailedTraders, addTrader, deleteTrader } from "../controllers/traderController.js";

const router = Router();
router.get("/", h(getTraders));
router.get("/detailed", h(getDetailedTraders));
router.post("/", requireAdmin, h(addTrader));
router.delete("/:name", requireAdmin, h(deleteTrader));

export default router;
