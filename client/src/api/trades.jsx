// client/src/api/trades.jsx
import { request } from "./http";

export const getTrades = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
  ).toString();
  return request(`/trades${qs ? `?${qs}` : ""}`);
};

export const createTrade = (trade) =>
  request("/trades", { method: "POST", body: JSON.stringify(trade) });

export const updateTrade = (id, trade) =>
  request(`/trades/${id}`, { method: "PUT", body: JSON.stringify(trade) });

// Soft delete (moves to Recycle Bin)
export const deleteTradeById = (id) => request(`/trades/${id}`, { method: "DELETE" });

// Recycle Bin API
export const getRecycleBinTrades = () => request("/trades/recycle-bin");

export const restoreTradeById = (id) =>
  request(`/trades/${id}/restore`, { method: "POST" });

export const restoreAllTrades = () =>
  request("/trades/recycle-bin/restore-all", { method: "POST" });

export const permanentDeleteTradeById = (id) =>
  request(`/trades/${id}/permanent`, { method: "DELETE" });

export const emptyRecycleBin = () =>
  request("/trades/recycle-bin/empty", { method: "DELETE" });

export const getTraders = () => request("/traders");

export const getDetailedTraders = () => request("/traders/detailed");

export const addTrader = (name) => request("/traders", { method: "POST", body: JSON.stringify({ name }) });

export const deleteTraderByName = (name, deleteTrades = false) =>
  request(`/traders/${encodeURIComponent(name)}${deleteTrades ? "?deleteTrades=true" : ""}`, {
    method: "DELETE",
  });

export const bulkCreateTrades = (trades) =>
  request("/trades/bulk", { method: "POST", body: JSON.stringify({ trades }) });
