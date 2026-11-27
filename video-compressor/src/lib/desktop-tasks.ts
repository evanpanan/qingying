import {useEffect,useSyncExternalStore} from 'react'
const tasks=new Set<symbol>(),listeners=new Set<()=>void>()
const notify=()=>listeners.forEach(fn=>fn())
export const desktopBusy=()=>tasks.size>0
export function useDesktopTask(busy:boolean){useEffect(()=>{if(!busy)return;const token=Symbol();tasks.add(token);notify();return()=>{tasks.delete(token);notify()}},[busy])}
export function useDesktopBusy(){return useSyncExternalStore(callback=>{listeners.add(callback);return()=>{listeners.delete(callback)}},desktopBusy,()=>false)}
