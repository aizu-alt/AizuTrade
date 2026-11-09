import { Router } from "express";
import { asyncHandler as h } from "../middleware/errorHandler.js";
import { getTraders, getDetailedTraders, addTrader, deleteTrader } from "../controllers/traderController.js";

const router = Router();
router.get("/", h(getTraders));
router.get("/detailed", h(getDetailedTraders));
router.post("/", h(addTrader));
router.delete("/:name", h(deleteTrader));

export default router;
