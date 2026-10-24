import {readPublicPage,publicUrl} from './project-content.mjs';
import {decode} from '../worker/index.js';

function attributes(tag){const values={};for(const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g))values[match[1].toLowerCase()]=decode(match[3]);return values;}
function imageUrl(value,base){if(typeof value!=='string'||!value.trim())return '';try{const url=new URL(value,base);return publicUrl(url.href)?url.href:'';}catch{return '';}}
export function extractProjectImage(html,base){
 const meta=new Map();
 for(const tag of html.matchAll(/<meta\b[^>]*>/gi)){const attrs=attributes(tag[0]);meta.set((attrs.property||attrs.name||'').toLowerCase(),attrs.content||'');}
 const isGitHub=new URL(base).hostname==='github.com';
 const article=(html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)||[])[1];
 // Prefer a real product screenshot in a repository's README over its generic social card.
 const candidates=[];
 for(const tag of (article||html).matchAll(/<img\b[^>]*>/gi)){
  const attrs=attributes(tag[0]),src=imageUrl(attrs['data-canonical-src']||attrs.src,base),hint=src+' '+(attrs.alt||'');
  if(!src||/badge|shields\.io|avatars\.|tracking|pixel|\.svg(?:\?|$)/i.test(hint))continue;
  if(Number(attrs.width)>0&&Number(attrs.width)<120)continue;
  const score=/screenshot|screen-shot|demo|preview|hero|cover|banner/i.test(hint)?10:/logo|icon|avatar/i.test(hint)?-5:0;
  candidates.push({src,score});
 }
 candidates.sort((a,b)=>b.score-a.score);
 if(isGitHub&&candidates[0]?.score>=0)return candidates[0].src;
 for(const key of ['og:image:secure_url','og:image','twitter:image','twitter:image:src']){const image=imageUrl(meta.get(key),base);if(meta.get(key)&&image)return image;}
 return candidates[0]?.src||'';
}

export function createProjectImageService({resolveArticle,read=readPublicPage}={}){
 const cache=new Map(),pending=new Map();
 return async url=>{
  const previous=cache.get(url);if(previous&&Date.now()-previous.time<(previous.image?86400000:300000))return previous.image;
  if(pending.has(url))return pending.get(url);
  const request=(async()=>{
   const article=await resolveArticle(url,'proyectos');if(!article||article.category!=='proyectos')return '';
   let image='';
   try{const page=await read(article.url);image=extractProjectImage(page.body,page.url);}catch{}
   if(!image){try{const parsed=new URL(article.url);if(parsed.hostname.endsWith('.github.io')){const owner=parsed.hostname.split('.')[0],name=parsed.pathname.split('/').filter(Boolean)[0]||owner+'.github.io';const page=await read('https://github.com/'+owner+'/'+name);image=extractProjectImage(page.body,page.url);}}catch{}}
   if(!image){try{const parsed=new URL(article.url),repo=parsed.hostname==='github.com'?parsed.pathname.match(/^\/([\w.-]+)\/([\w.-]+)/):null;if(repo)image='https://opengraph.githubassets.com/1/'+repo[1]+'/'+repo[2];}catch{}}
   if(cache.size>=500)cache.delete(cache.keys().next().value);
   cache.set(url,{time:Date.now(),image});return image;
  })().finally(()=>pending.delete(url));
  pending.set(url,request);return request;
 };
}
