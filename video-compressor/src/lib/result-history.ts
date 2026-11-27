export interface ResultRecord {id:string;title:string;kind:string;created_at:number;bytes:number;exists:boolean;path?:string;saved_path?:string|null}
interface StoredResult extends ResultRecord {blob:Blob}
function database(){return new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('lightvid-results',1);request.onupgradeneeded=()=>request.result.createObjectStore('results',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
export async function browserResults():Promise<ResultRecord[]>{const db=await database();try{return await new Promise((resolve,reject)=>{const request=db.transaction('results').objectStore('results').getAll();request.onsuccess=()=>resolve((request.result as StoredResult[]).sort((a,b)=>b.created_at-a.created_at).map(item=>({id:item.id,title:item.title,kind:item.kind,created_at:item.created_at,bytes:item.bytes,exists:item.exists})));request.onerror=()=>reject(request.error)})}finally{db.close()}}
export async function rememberBrowserResult(title:string,kind:string,blob:Blob){
 if(blob.size>200*1024*1024)throw new Error('结果超过浏览器历史容量，请立即下载')
 const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('results','readwrite'),store=tx.objectStore('results'),request=store.getAll();request.onsuccess=()=>{const all=(request.result as StoredResult[]).sort((a,b)=>b.created_at-a.created_at);let bytes=blob.size,count=1;for(const item of all){if(count>=10||bytes+item.bytes>200*1024*1024)store.delete(item.id);else{bytes+=item.bytes;count++}}store.put({id:crypto.randomUUID(),title,kind,blob,created_at:Date.now()/1000,bytes:blob.size,exists:true})};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}
}
export async function browserResultAction(record:ResultRecord,action:'open'|'save'){
 const db=await database();let item:StoredResult
 try{item=await new Promise((resolve,reject)=>{const request=db.transaction('results').objectStore('results').get(record.id);request.onsuccess=()=>request.result?resolve(request.result):reject(new Error('浏览器记录已清除，请重新处理'));request.onerror=()=>reject(request.error)})}finally{db.close()}
 const url=URL.createObjectURL(item.blob)
 if(action==='open'){const anchor=document.createElement('a');anchor.href=url;anchor.target='_blank';anchor.rel='noopener';anchor.click()}
 else{const anchor=document.createElement('a');anchor.href=url;anchor.download=record.title.replace(/\.[^.]+$/,'')+(record.kind.startsWith('translate')?'_english':'_repaired')+'.mp4';anchor.click()}
 setTimeout(()=>URL.revokeObjectURL(url),60000)
}
