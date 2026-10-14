/**
 * Detect the runtime environment.
 * - Tauri (desktop app): has window.__TAURI__
 * - Browser (web/online): no Tauri
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__
}

/**
 * Detect if running in a web browser (not Tauri desktop).
 */
export function isWeb(): boolean {
  return !isTauri()
}
