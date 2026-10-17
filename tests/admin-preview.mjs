/** Lokale Beispieldaten-Vorschau; keine echte Mutation oder externen Nachrichten. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
export async function servePreview(handler) {
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'};
  const root=resolve('dist');
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://127.0.0.1:4330');
      if(url.pathname.startsWith('/api/admin/')){
        const chunks=[];for await(const chunk of req)chunks.push(chunk);
        const request=new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
        const r=await handler(url.pathname+url.search,request);
        res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;
      }
      let path=resolve(root,'.'+decodeURIComponent(url.pathname));
      if(!path.startsWith(root+'/')){res.writeHead(403);res.end();return;}
      if(url.pathname.endsWith('/'))path+='/index.html';
      const bytes=await readFile(path);res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream'});res.end(bytes);
    }catch{res.writeHead(404);res.end('Nicht gefunden');}
  });
  server.listen(4330,'127.0.0.1');console.log('Admin-Beispielvorschau: http://127.0.0.1:4330/admin/');
  await new Promise(()=>{});
}
