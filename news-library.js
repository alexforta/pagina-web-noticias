(function(root){
 const categories=new Set(['juegos','politica','baloncesto','ia','informatica','proyectos']);
 function safeUrl(value){try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}}
 function savedArticle(article){
  if(!article||typeof article!=='object'||!categories.has(article.category)||typeof article.title!=='string'||!article.title.trim())return null;
  const url=safeUrl(article.url);if(!url)return null;
  const date=Date.parse(article.publishedAt||'');
  return {url,title:article.title.slice(0,600),originalTitle:typeof article.originalTitle==='string'?article.originalTitle.slice(0,600):undefined,description:typeof article.description==='string'?article.description.slice(0,1500):'',source:typeof article.source==='string'?article.source.slice(0,150):'',category:article.category,publishedAt:Number.isFinite(date)?new Date(date).toISOString():null,image:safeUrl(article.image),points:Number.isFinite(article.points)?article.points:undefined,comments:Number.isFinite(article.comments)?article.comments:undefined,discussionUrl:safeUrl(article.discussionUrl),savedAt:typeof article.savedAt==='string'?article.savedAt:new Date().toISOString()};
 }
 function parseFavorites(serialized){try{const values=JSON.parse(serialized||'[]');if(!Array.isArray(values))return [];return [...new Map(values.map(savedArticle).filter(Boolean).map(a=>[a.url,a])).values()];}catch{return [];}}
 function sortArticles(articles,order='newest'){
  const direction=order==='oldest'?1:-1;
  return articles.map((article,index)=>({article,index,date:Date.parse(article.publishedAt||'')})).sort((a,b)=>{
   const validA=Number.isFinite(a.date),validB=Number.isFinite(b.date);
   if(validA!==validB)return validA?-1:1;
   return (validA?direction*(a.date-b.date):0)||a.index-b.index;
  }).map(entry=>entry.article);
 }
 root.NewsLibrary=Object.freeze({savedArticle,parseFavorites,sortArticles});
})(globalThis);
