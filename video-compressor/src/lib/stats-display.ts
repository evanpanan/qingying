// This disclosed presentation baseline must never be written to the stats store.
export const STATS_INITIAL_BASE = 1000

export function displayedDownloadTotal(downloads = 0) {
  return Math.min(Number.MAX_SAFE_INTEGER, STATS_INITIAL_BASE + downloads)
}
