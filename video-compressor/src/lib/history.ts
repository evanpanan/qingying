import type { CompressionResult } from '../types'

const STORAGE_KEY = 'video-compressor-history'
const MAX_HISTORY = 50

export interface HistoryRecord {
  id: string
  name: string
  path: string
  originalSize: number
  compressedSize: number
  outputPath: string
  compressedAt: number
}

/**
 * Load compression history from localStorage.
 */
export function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const records = JSON.parse(raw) as HistoryRecord[]
    return Array.isArray(records) ? records : []
  } catch {
    return []
  }
}

/**
 * Save a compression result to history.
 */
export function saveToHistory(result: CompressionResult): void {
  const records = loadHistory()

  // Remove existing record with the same output path.
  const filtered = records.filter((r) => r.outputPath !== result.outputPath)

  const record: HistoryRecord = {
    id: result.id,
    name: result.name,
    path: result.path,
    originalSize: result.originalSize,
    compressedSize: result.compressedSize,
    outputPath: result.outputPath,
    compressedAt: Date.now(),
  }

  filtered.unshift(record)

  // Keep only the most recent MAX_HISTORY records.
  const trimmed = filtered.slice(0, MAX_HISTORY)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Ignore storage errors (e.g. quota exceeded).
  }
}

/**
 * Remove a record from history by id.
 */
export function removeFromHistory(id: string): void {
  const records = loadHistory().filter((r) => r.id !== id)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // ignore
  }
}

/**
 * Clear all history.
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
