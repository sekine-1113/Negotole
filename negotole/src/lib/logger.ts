type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  try {
    const entry = { ts: new Date().toISOString(), level, event, ...data };
    console[level](JSON.stringify(entry));
  } catch {
    // サイレント失敗
  }
}
