/**
 * Structured Request Logger — tracks API route timing, token usage, and errors.
 * Provides structured JSON logs for debugging and performance monitoring.
 */

interface RequestLog {
  route: string;
  method: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'success' | 'error';
  statusCode?: number;
  errorMessage?: string;
  meta?: Record<string, unknown>;
}

const MAX_LOG_HISTORY = 200;
const logs: RequestLog[] = [];

/** Start tracking a request — returns a finish function */
export function startRequestLog(route: string, method = 'POST', meta?: Record<string, unknown>) {
  const entry: RequestLog = {
    route,
    method,
    startTime: Date.now(),
    status: 'success',
    meta,
  };

  return {
    /** Mark request as successful */
    success(statusCode = 200, extraMeta?: Record<string, unknown>) {
      entry.endTime = Date.now();
      entry.durationMs = entry.endTime - entry.startTime;
      entry.status = 'success';
      entry.statusCode = statusCode;
      if (extraMeta) entry.meta = { ...entry.meta, ...extraMeta };
      pushLog(entry);
      logToConsole(entry);
    },

    /** Mark request as failed */
    error(error: unknown, statusCode = 500) {
      entry.endTime = Date.now();
      entry.durationMs = entry.endTime - entry.startTime;
      entry.status = 'error';
      entry.statusCode = statusCode;
      entry.errorMessage = error instanceof Error ? error.message : String(error);
      pushLog(entry);
      logToConsole(entry);
    },
  };
}

function pushLog(entry: RequestLog) {
  logs.push(entry);
  if (logs.length > MAX_LOG_HISTORY) {
    logs.splice(0, logs.length - MAX_LOG_HISTORY);
  }
}

function logToConsole(entry: RequestLog) {
  const icon = entry.status === 'success' ? '✓' : '✗';
  const duration = entry.durationMs ? `${entry.durationMs}ms` : '?ms';
  const metaStr = entry.meta ? ` ${JSON.stringify(entry.meta)}` : '';

  if (entry.status === 'error') {
    console.error(`[API ${icon}] ${entry.route} ${entry.statusCode} ${duration} — ${entry.errorMessage}${metaStr}`);
  } else {
    console.log(`[API ${icon}] ${entry.route} ${entry.statusCode} ${duration}${metaStr}`);
  }
}

/** Get recent logs for the key-pool-stats or debugging endpoint */
export function getRecentLogs(limit = 50): RequestLog[] {
  return logs.slice(-limit);
}

/** Get aggregate stats */
export function getRouteStats(): Record<string, { calls: number; avgMs: number; errors: number }> {
  const stats: Record<string, { calls: number; totalMs: number; errors: number }> = {};
  for (const log of logs) {
    if (!stats[log.route]) {
      stats[log.route] = { calls: 0, totalMs: 0, errors: 0 };
    }
    stats[log.route].calls++;
    stats[log.route].totalMs += log.durationMs || 0;
    if (log.status === 'error') stats[log.route].errors++;
  }

  const result: Record<string, { calls: number; avgMs: number; errors: number }> = {};
  for (const [route, s] of Object.entries(stats)) {
    result[route] = {
      calls: s.calls,
      avgMs: s.calls > 0 ? Math.round(s.totalMs / s.calls) : 0,
      errors: s.errors,
    };
  }
  return result;
}
