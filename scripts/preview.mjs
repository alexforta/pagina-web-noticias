import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createWorker} from '../worker/index.js';
const page=new URL('../index.html',import.meta.url);
const port=3210;
http.createServer(async(req,res)=>{try{const worker=createWorker(await readFile(page,'utf8'));const r=await worker.fetch(new Request('http://127.0.0.1:'+port+req.url));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}catch{res.writeHead(500);res.end('Error al cargar la página.');}}).listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port+'/index.html'));
