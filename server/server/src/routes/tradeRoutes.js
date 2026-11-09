import { Router } from "express";
import { asyncHandler as h } from "../middleware/errorHandler.js";
import {
  getTrades,
  createTrade,
  bulkCreateTrades,
  updateTrade,
  deleteTrade,
  getRecycleBin,
  restoreTrade,
  restoreAllTrades,
  permanentDeleteTrade,
  emptyRecycleBin,
} from "../controllers/tradeController.js";

const router = Router();

// Recycle Bin routes (must be defined BEFORE /:id parameters!)
router.get("/recycle-bin", h(getRecycleBin));
router.post("/recycle-bin/restore-all", h(restoreAllTrades));
router.delete("/recycle-bin/empty", h(emptyRecycleBin));

router.get("/", h(getTrades));
router.post("/bulk", h(bulkCreateTrades));
router.post("/", h(createTrade));
router.put("/:id", h(updateTrade));
router.delete("/:id", h(deleteTrade)); // Soft delete (moves to recycle bin)

// Specific trade recycle bin actions
router.post("/:id/restore", h(restoreTrade));
router.delete("/:id/permanent", h(permanentDeleteTrade));

export default router;
