// client/src/api/trades.jsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "./http";

export const tradesKeys = {
  all: ["trades"],
  lists: () => [...tradesKeys.all, "list"],
  list: (params) => [...tradesKeys.lists(), params],
  analytics: (params) => [...tradesKeys.all, "analytics", params],
  export: (params) => [...tradesKeys.all, "export", params],
  recycleBin: ["trades", "recycle-bin"],
  traders: ["traders"],
  detailedTraders: ["traders", "detailed"],
};

export const getTrades = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null)
  ).toString();
  return request(`/trades${qs ? `?${qs}` : ""}`);
};

export const getAnalytics = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null)
  ).toString();
  return request(`/trades/analytics${qs ? `?${qs}` : ""}`);
};

export const getExportTrades = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null)
  ).toString();
  return request(`/trades/export${qs ? `?${qs}` : ""}`);
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

// React Query Hooks with optimistic updates and caching

export function useTrades(params = {}, options = {}) {
  return useQuery({
    queryKey: tradesKeys.list(params),
    queryFn: () => getTrades(params),
    ...options,
  });
}

export function useAnalytics(params = {}, options = {}) {
  return useQuery({
    queryKey: tradesKeys.analytics(params),
    queryFn: () => getAnalytics(params),
    staleTime: 2 * 60 * 1000, // Analytics cached for 2 minutes
    ...options,
  });
}

export function useTraders(options = {}) {
  return useQuery({
    queryKey: tradesKeys.traders,
    queryFn: getTraders,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCreateTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTrade,
    onSuccess: (newTrade) => {
      // Optimistically insert new trade into active queries without refetching all trades
      qc.setQueriesData({ queryKey: tradesKeys.lists() }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return [newTrade, ...old];
        }
        if (old.trades && Array.isArray(old.trades)) {
          return {
            ...old,
            trades: [newTrade, ...old.trades],
            total: (old.total || 0) + 1,
          };
        }
        return old;
      });
      // Invalidate analytics so charts pick up the trade next time viewed
      qc.invalidateQueries({ queryKey: tradesKeys.all.concat("analytics") });
    },
  });
}

export function useUpdateTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, trade }) => updateTrade(id, trade),
    onSuccess: (updatedTrade) => {
      qc.setQueriesData({ queryKey: tradesKeys.lists() }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((t) => (t.id === updatedTrade.id ? { ...t, ...updatedTrade } : t));
        }
        if (old.trades && Array.isArray(old.trades)) {
          return {
            ...old,
            trades: old.trades.map((t) => (t.id === updatedTrade.id ? { ...t, ...updatedTrade } : t)),
          };
        }
        return old;
      });
      qc.invalidateQueries({ queryKey: tradesKeys.all.concat("analytics") });
    },
  });
}

export function useDeleteTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteTradeById(id),
    onSuccess: (_data, id) => {
      qc.setQueriesData({ queryKey: tradesKeys.lists() }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.filter((t) => t.id !== id);
        }
        if (old.trades && Array.isArray(old.trades)) {
          return {
            ...old,
            trades: old.trades.filter((t) => t.id !== id),
            total: Math.max(0, (old.total || 1) - 1),
          };
        }
        return old;
      });
      qc.invalidateQueries({ queryKey: tradesKeys.recycleBin });
      qc.invalidateQueries({ queryKey: tradesKeys.all.concat("analytics") });
    },
  });
}
