import { NextResponse } from 'next/server';
import { apiKeyPool } from '@/lib/api-key-pool';
import { getRouteStats, getRecentLogs } from '@/lib/request-logger';

// D11-4: API Key Pool Status endpoint
export async function GET() {
  try {
    const stats = apiKeyPool.getStats();
    const totalCalls = stats.reduce((sum, k) => sum + k.callCount, 0);
    const totalErrors = stats.reduce((sum, k) => sum + k.errors429, 0);
    const activeCooling = stats.filter(k => k.isCooling).length;
    const dailyExhausted = stats.filter(k => k.dailyExhausted).length;
    const allExhausted = apiKeyPool.allDailyExhausted;

    return NextResponse.json({
      poolSize: stats.length,
      totalCalls,
      totalErrors,
      activeCooling,
      dailyExhausted,
      allExhausted,
      keys: stats,
      routeStats: getRouteStats(),
      recentLogs: getRecentLogs(20),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
