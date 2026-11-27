declare module '*translation-core.mjs' {
 export interface SpeechRow {text:string;start:number;end:number}
 export const WHISPER:{id:string;revision:string}
 export const KOKORO:{id:string;revision:string}
 export const VOICES:Record<string,string>
 export function wav(samples:Float32Array,rate?:number):Uint8Array
 export function timedText(output:unknown,duration:number):SpeechRow[]
 export function wrapCaption(text:string,max?:number):string[]
 export function subtitles(rows:SpeechRow[]):string
 export function translateSpeech(samples:Float32Array,duration:number,options?:{dub?:boolean;allowEmpty?:boolean;node?:boolean;cacheDir?:string;voice?:string;progress?:(text:string)=>void;check?:()=>void}):Promise<{rows:SpeechRow[];audio:{samples:Float32Array;rate:number}[]}>
}
declare module '*translation-render.mjs' {
 export function tempoFilter(ratio:number):string
 export function compositeFilter(width:number,height:number,regions:import('./cleanup-geometry').RepairRegion[],cues:import('*translation-core.mjs').SpeechRow[]):{filter:string;label:string}
 export function captionLayout(text:string,width:number):{font:number;lines:string[];height:number}
}
