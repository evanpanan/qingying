export const ENHANCEMENTS=['off','natural','ai2x']
export function validEnhancement(mode='off',size='original'){return ENHANCEMENTS.includes(mode)&&['original','1080p'].includes(size)}
export function enhancementDimensions(width,height,mode='natural',size='original'){
 if(!validEnhancement(mode,size)||![width,height].every(x=>Number.isInteger(x)&&x>=8))throw Error('高清增强参数无效')
 const scale=mode==='ai2x'?2:size==='1080p'?Math.max(1,Math.min(1920/Math.max(width,height),1080/Math.min(width,height))):1
 return {width:Math.max(2,Math.round(width*scale/2)*2),height:Math.max(2,Math.round(height*scale/2)*2)}
}
export function enhancementFilter(width,height,mode='natural',size='original'){
 if(mode==='off')return 'null'
 if(mode!=='natural')throw Error('AI 2×高清增强需要支持的 macOS 桌面设备')
 const d=enhancementDimensions(width,height,mode,size)
 return ['hqdn3d=1.2:1.2:3:3',...(d.width!==width||d.height!==height?[`scale=${d.width}:${d.height}:flags=lanczos`]:[]),'unsharp=5:5:0.45:3:3:0','setsar=1'].join(',')
}
