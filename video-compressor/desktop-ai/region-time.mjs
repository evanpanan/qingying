// All region intervals use source-video seconds, [start,end). Missing endpoints mean full video.
export function validRegionTime(r){return r.start===undefined&&r.end===undefined||Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.start>=0&&r.end>r.start}
export function regionActive(r,time){if(!validRegionTime(r))throw Error('选区生效时间无效');return r.start===undefined||time>=r.start&&time<r.end}
export function regionEnable(r,offset=0){if(!validRegionTime(r)||!Number.isFinite(offset))throw Error('选区生效时间无效');return r.start===undefined?'':`:enable='gte(t,${(r.start-offset).toFixed(6)})*lt(t,${(r.end-offset).toFixed(6)})'`}
