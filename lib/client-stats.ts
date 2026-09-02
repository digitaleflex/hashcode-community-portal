export type CommunityStats = {
  total: number;
  imported: number;
  active: number;
  verified: number;
  updated: number;
  countries: number;
  polesCovered: number;
  poleBreakdown: { slug: string; count: number }[];
};

let cache: { data: CommunityStats; ts: number } | null = null;
const TTL_MS = 60_000;
const inFlight: Map<string, Promise<CommunityStats>> = new Map();

export async function fetchCommunityStats(): Promise<CommunityStats> {
  if (cache && Date.now() - cache.ts < TTL_MS) {
    return cache.data;
  }

  const existing = inFlight.get('stats');
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      if (!res.ok) throw new Error('stats fetch failed');
      const data = (await res.json()) as CommunityStats;
      cache = { data, ts: Date.now() };
      return data;
    } finally {
      inFlight.delete('stats');
    }
  })();

  inFlight.set('stats', promise);
  return promise;
}
