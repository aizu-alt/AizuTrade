import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // Data stays fresh for 1 minute
      gcTime: 10 * 60 * 1000, // Keep inactive cache for 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
