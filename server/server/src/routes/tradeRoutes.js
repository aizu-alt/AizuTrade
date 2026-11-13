import { Router } from "express";
import { asyncHandler as h } from "../middleware/errorHandler.js";
import { requireAdmin } from "../middleware/auth.js";
import {
  getTrades,
  getAnalytics,
  getExportTrades,
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

// Dedicated aggregated analytics & export routes (must be defined BEFORE /:id parameters!)
router.get("/analytics", h(getAnalytics));
router.get("/export", h(getExportTrades));

// Recycle Bin routes (must be defined BEFORE /:id parameters!)
router.get("/recycle-bin", h(getRecycleBin));
router.post("/recycle-bin/restore-all", requireAdmin, h(restoreAllTrades));
router.delete("/recycle-bin/empty", requireAdmin, h(emptyRecycleBin));

router.get("/", h(getTrades));
router.post("/bulk", requireAdmin, h(bulkCreateTrades));
router.post("/", requireAdmin, h(createTrade));
router.put("/:id", requireAdmin, h(updateTrade));
router.delete("/:id", requireAdmin, h(deleteTrade)); // Soft delete (moves to recycle bin)

// Specific trade recycle bin actions
router.post("/:id/restore", requireAdmin, h(restoreTrade));
router.delete("/:id/permanent", requireAdmin, h(permanentDeleteTrade));

export default router;
