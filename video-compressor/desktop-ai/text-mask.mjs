// Fixed light text: top-hat isolates narrow bright strokes, rather than erasing the entire rectangle.
export function textMask(rgb,width,height,region){
 if(rgb.length!==width*height*3)throw Error('画面像素不完整')
 const x0=Math.max(0,Math.floor(region.x*width)),y0=Math.max(0,Math.floor(region.y*height)),x1=Math.min(width,Math.ceil((region.x+region.width)*width)),y1=Math.min(height,Math.ceil((region.y+region.height)*height)),r=7,pad=12,left=Math.max(0,x0-pad),top=Math.max(0,y0-pad),w=Math.min(width,x1+pad)-left,h=Math.min(height,y1+pad)-top,gray=new Uint8Array(w*h)
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=((y+top)*width+x+left)*3;gray[y*w+x]=Math.round(rgb[i]*.299+rgb[i+1]*.587+rgb[i+2]*.114)}
 function morph(src,max){const tmp=new Uint8Array(w*h),out=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=max?0:255;for(let k=Math.max(0,x-r);k<=Math.min(w-1,x+r);k++)v=max?Math.max(v,src[y*w+k]):Math.min(v,src[y*w+k]);tmp[y*w+x]=v}for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=max?0:255;for(let k=Math.max(0,y-r);k<=Math.min(h-1,y+r);k++)v=max?Math.max(v,tmp[k*w+x]):Math.min(v,tmp[k*w+x]);out[y*w+x]=v}return out}
 const opened=morph(morph(gray,false),true),seed=new Uint8Array(width*height),mask=new Uint8Array(width*height)
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*width+x)*3,hi=Math.max(rgb[i],rgb[i+1],rgb[i+2]),lo=Math.min(rgb[i],rgb[i+1],rgb[i+2]),j=(y-top)*w+x-left;if(gray[j]-opened[j]>16&&hi>155&&(hi-lo)*255<110*hi)seed[y*width+x]=255}
 const light=seed.slice(),seen=new Uint8Array(width*height),color=new Uint8Array(width*height)
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const j=(y*width+x)*3,hi=Math.max(rgb[j],rgb[j+1],rgb[j+2]),lo=Math.min(rgb[j],rgb[j+1],rgb[j+2]);if(hi>=140&&hi-lo>=60)color[y*width+x]=1}
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const first=y*width+x;if(!color[first]||seen[first])continue;const component=[first];seen[first]=1;let near=false;for(let n=0;n<component.length;n++){const i=component[n],a=i%width,b=Math.floor(i/width);for(let dy=-2;dy<=2&&!near;dy++)for(let dx=-2;dx<=2;dx++){const xx=a+dx,yy=b+dy;if(xx>=x0&&xx<x1&&yy>=y0&&yy<y1&&light[yy*width+xx]){near=true;break}}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=a+dx,yy=b+dy;if(xx<x0||xx>=x1||yy<y0||yy>=y1)continue;const next=yy*width+xx;if(color[next]&&!seen[next]){seen[next]=1;component.push(next)}}}if(near&&component.length<=Math.max(36,(x1-x0)*(y1-y0)*.18))for(const i of component)seed[i]=255}
 let pixels=0
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(seed[y*width+x])for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const a=x+dx,b=y+dy;if(a>=x0&&a<x1&&b>=y0&&b<y1){const i=b*width+a;if(!mask[i]){mask[i]=255;pixels++}}}
 return {mask,pixels,coverage:pixels/Math.max(1,(x1-x0)*(y1-y0))}
}
export function hasTextMask(r){return r.fill==='text'}
export function maskReferenceTime(r){return (r.start??0)+Math.min(.1,r.end===undefined?.1:(r.end-r.start)/2)}
