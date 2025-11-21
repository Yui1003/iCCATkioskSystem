import { QueryClient, QueryFunction } from "@tanstack/react-query";
import baselineData from "./baseline-data.json";

const DATA_CACHE_NAME = 'iccat-data-v3';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

const offlineFirstQueryFn: QueryFunction = async ({ queryKey }) => {
  const url = queryKey.join("/") as string;
  
  try {
    const res = await fetch(url, { credentials: "include" });
    if (res.ok) {
      return await res.json();
    }
  } catch (fetchError) {
    console.log(`[OFFLINE-QUERY] Fetch failed for ${url} (offline or network error), trying cache...`);
  }

  if (window.caches) {
    try {
      const cache = await window.caches.open(DATA_CACHE_NAME);
      const cachedResponse = await cache.match(url);
      if (cachedResponse) {
        console.log(`[OFFLINE-QUERY] Retrieved ${url} from CacheStorage`);
        return await cachedResponse.json();
      }
    } catch (cacheError) {
      console.error(`[OFFLINE-QUERY] CacheStorage error for ${url}:`, cacheError);
    }
  }

  const dataKey = url.replace('/api/', '') as keyof typeof baselineData;
  if (dataKey in baselineData) {
    console.log(`[OFFLINE-QUERY] Using embedded baseline data for ${dataKey}`);
    return baselineData[dataKey];
  }

  throw new Error(`No offline data available for ${url}`);
};

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: offlineFirstQueryFn,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
