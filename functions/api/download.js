// Öffentliche signierte Alpha-Dateien; die App selbst bleibt lizenzpflichtig.
const FORMATE={windows:n=>/_x64-setup\.exe$/i.test(n),msi:n=>/_x64_.+\.msi$/i.test(n),mac:n=>/^cockpit-mac-.+\.zip$/.test(n),linux:n=>/_amd64\.AppImage$/.test(n),deb:n=>/_amd64\.deb$/.test(n),erweiterung:n=>n==='cockpit-extension.zip'};
export async function onRequestGet({request}){
 const system=new URL(request.url).searchParams.get('system');
 if(!Object.hasOwn(FORMATE,system))return new Response('Bitte ein unterstütztes System wählen.',{status:400});
 try{
  const response=await fetch('https://api.github.com/repos/Stacktor/cockpit-releases/releases/latest',{headers:{Accept:'application/vnd.github+json','User-Agent':'cockpit-download'},cf:{cacheTtl:300,cacheEverything:true},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Release nicht erreichbar');
  const release=await response.json();
  if(release.draft||release.prerelease||!/^v\d+\.\d+\.\d+$/.test(release.tag_name)||!Array.isArray(release.assets))throw Error('Keine Alpha');
  const asset=release.assets.find(a=>typeof a.name==='string'&&FORMATE[system](a.name));
  if(!asset)throw Error('Paket fehlt');
  const url=new URL(asset.browser_download_url);
  const prefix=`/Stacktor/cockpit-releases/releases/download/${release.tag_name}/`;
  if(url.protocol!=='https:'||url.hostname!=='github.com'||url.username||url.password||url.search||url.hash||!url.pathname.startsWith(prefix))throw Error('Fremdes Ziel');
  return new Response(null,{status:302,headers:{Location:url.href,'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response('Der Alpha-Download ist gerade nicht erreichbar. Bitte versuche es in wenigen Minuten erneut.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});}
}
