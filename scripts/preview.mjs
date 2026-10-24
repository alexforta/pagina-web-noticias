import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {createWorker,findArticle} from '../worker/index.js';
import {accountStatus} from './chatgpt.mjs';
import {createSummaryService} from './summaries.mjs';
import {createProjectImageService} from './project-images.mjs';
import {createTitleTranslator} from './title-translations.mjs';
import '../news-library.js';
const page=new URL('../index.html',import.meta.url);
const port=3210;
const origin='http://127.0.0.1:'+port;
const token=randomBytes(32).toString('hex');
const titleTranslator=createTitleTranslator();
const summaries=createSummaryService({resolveArticle:async(url,category)=>{const article=await findArticle(url,category);if(!article)return null;try{return (await titleTranslator.translate([article]))[0];}catch{return article;}}});
const projectImage=createProjectImageService({resolveArticle:findArticle});
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
http.createServer(async(req,res)=>{
 try{
  if(req.headers.host!=='127.0.0.1:'+port){json(res,403,{error:'Dirección local no válida.'});return;}
  const url=new URL(req.url,origin);
  if(url.pathname==='/api/project-image'&&req.method==='GET'){
   const image=await projectImage(url.searchParams.get('url'));
   if(image){res.writeHead(302,{Location:image,'Cache-Control':'public, max-age=86400','Referrer-Policy':'no-referrer'});res.end();}
   else {res.writeHead(404,{'Cache-Control':'public, max-age=300'});res.end();}return;
  }
  if(url.pathname==='/api/summary'){
   if(req.method==='GET'){json(res,200,summaries.status(url.searchParams.get('url')));return;}
   if(req.method!=='POST'){json(res,405,{error:'Método no permitido.'});return;}
   if(req.headers.origin!==origin||req.headers['x-local-token']!==token){json(res,403,{error:'Recarga la página para preparar el resumen.'});return;}
   let body='';for await(const chunk of req){body+=chunk;if(body.length>4096){json(res,413,{error:'Solicitud demasiado grande.'});return;}}
   try{const data=JSON.parse(body);if(typeof data.url!=='string'||data.url.length>3000)throw Error('Enlace no válido.');const saved=globalThis.NewsLibrary.savedArticle(data.savedArticle);summaries.start(data.url,data.category,saved);json(res,202,{state:'running'});}catch(error){json(res,400,{error:error.message});}return;
  }
  if(url.pathname==='/api/ai/status'&&req.method==='GET'){json(res,200,{...await accountStatus(),token});return;}
  const worker=createWorker(await readFile(page,'utf8'),await readFile(new URL('../summary.html',import.meta.url),'utf8'),await readFile(new URL('../news-library.js',import.meta.url),'utf8'));
  const response=await worker.fetch(new Request(origin+req.url,{method:req.method}));
  if(url.pathname==='/api/news'&&response.ok){
   const data=await response.json();
   try{data.articles=await titleTranslator.translate(data.articles);}catch{data.warning=[data.warning,'No se han podido traducir algunos titulares. Se muestran los originales; vuelve a actualizar para intentarlo de nuevo.'].filter(Boolean).join(' ');}
   json(res,200,data);return;
  }
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{json(res,500,{error:'Error al cargar la página.'});}
}).listen(port,'127.0.0.1',()=>console.log('Local: '+origin+'/index.html'));
