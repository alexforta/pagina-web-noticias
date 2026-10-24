import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractProjectImage,createProjectImageService} from '../scripts/project-images.mjs';
test('Las imágenes sociales admiten atributos en cualquier orden, rutas relativas y entidades',()=>{
 assert.equal(extractProjectImage('<meta content="/preview.png?a=1&amp;b=2" property="og:image">','https://project.example.com/'),'https://project.example.com/preview.png?a=1&b=2');
 assert.equal(extractProjectImage('<meta name="twitter:image" content="https://cdn.example.com/demo.jpg">','https://project.example.com/'),'https://cdn.example.com/demo.jpg');
 assert.equal(extractProjectImage('<meta property="og:image" content="http://127.0.0.1/a"><img>','https://project.example.com/'),'');
});
test('GitHub prioriza capturas del README frente a insignias, logos y la imagen social genérica',()=>{
 const html='<meta property="og:image" content="https://opengraph.githubassets.com/1/a/b"><article><img src="https://img.shields.io/badge/test"><img src="/logo.png" width="96"><img src="https://raw.githubusercontent.com/a/b/main/demo.gif" width="880" alt="Demo del producto"></article>';
 assert.equal(extractProjectImage(html,'https://github.com/a/b'),'https://raw.githubusercontent.com/a/b/main/demo.gif');
});
test('Las imágenes se consultan una vez, se reutilizan y solo se resuelven proyectos conocidos',async()=>{
 let calls=0;const service=createProjectImageService({resolveArticle:async url=>url==='https://project.example.com'?{url,category:'proyectos'}:null,read:async url=>{calls++;return {url,body:'<meta property="og:image" content="/cover.jpg">'};}});
 const [a,b]=await Promise.all([service('https://project.example.com'),service('https://project.example.com')]);assert.equal(a,b);assert.equal(calls,1);assert.equal(await service('https://project.example.com'),a);assert.equal(calls,1);assert.equal(await service('https://unknown.example.com'),'');assert.equal(calls,1);
});
