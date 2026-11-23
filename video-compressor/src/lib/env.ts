import { isTauri as detectTauri } from '@tauri-apps/api/core'

/** Use Tauri 2's runtime marker, independent of withGlobalTauri. */
export function isTauri(): boolean {
  return detectTauri()
}

/**
 * Detect if running in a web browser (not Tauri desktop).
 */
export function isWeb(): boolean {
  return !isTauri()
}
