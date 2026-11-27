import { useEffect, useRef } from 'react'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { open } from '@tauri-apps/plugin-shell'
import { readText } from '@tauri-apps/plugin-clipboard-manager'
import type { CompressInput } from './compress'
import { isTauri } from './env'

export function readClipboard() {
  return isTauri() ? readText().then(text => text ?? '') : navigator.clipboard.readText()
}

/** Desktop webviews cannot navigate external links like browser tabs. */
export function useDesktopLinks() {
  useEffect(() => {
    if (!isTauri()) return
    const handle = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]')
      if (!link || !/^https?:$/.test(new URL(link.href).protocol)) return
      event.preventDefault()
      void open(link.href).catch(() => {})
    }
    document.addEventListener('click', handle)
    return () => document.removeEventListener('click', handle)
  }, [])
}

export function useDesktopVideoDrop(enabled: boolean, add: (inputs: CompressInput[]) => void, options?: {tool?:string;hover?:(value:boolean)=>void;invalid?:()=>void}) {
  const latest = useRef({ enabled, add, options })
  useEffect(() => { latest.current = { enabled, add, options } }, [enabled, add, options])
  useEffect(() => {
    if (!isTauri()) return
    let disposed = false
    let unlisten: (() => void) | undefined
    void getCurrentWebview().onDragDropEvent(event => {
      if (!latest.current.enabled) return
      const selected=document.querySelector('.desktop-sidebar nav [aria-current="page"]')?.getAttribute('data-tool')
      if(latest.current.options?.tool&&selected&&selected!==latest.current.options.tool)return
      latest.current.options?.hover?.(event.payload.type==='enter'||event.payload.type==='over')
      if(event.payload.type!=='drop')return
      const inputs = event.payload.paths.filter(path => /\.(mp4|mov|mkv|webm|avi|m4v|wmv|flv|3gp|mpg|mpeg|ts|m2ts|vob|ogv)$/i.test(path))
        .map(file => ({ file, name: file.split(/[\\/]/).pop() || file, size: 0 }))
      if (inputs.length) latest.current.add(inputs);else latest.current.options?.invalid?.()
    }).then(off => { if (disposed) off(); else unlisten = off }).catch(() => {})
    return () => { disposed = true; unlisten?.() }
  }, [])
}

