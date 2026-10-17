// Fest begrenzter Freigabeanschluss: keine frei wählbaren Repos, URLs oder Workflows.
export const APP_REPO='Stacktor/Bewerbungs-Cockpit';
export async function releaseGithub(env,path,init={}) {
  const token=init.method?env.GITHUB_RELEASE_TOKEN:(env.GITHUB_RELEASE_TOKEN||env.GITHUB_TOKEN);
  const r=await fetch(`https://api.github.com/repos/${APP_REPO}/${path}`,{...init,headers:{Accept:'application/vnd.github+json','User-Agent':'cockpit-admin','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:`Bearer ${token}`} : {}),...(init.body?{'Content-Type':'application/json'}:{})},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error(`Freigabeanschluss antwortet mit ${r.status}. Rechte und Verbindung prüfen.`);
  return r.status===204?null:r.json();
}
export function testedBuilds(runs,sha){
  return ['dev.yml','dev-mac.yml'].every(file=>{
    const last=runs.filter(r=>r.head_sha===sha&&r.head_branch==='dev'&&r.path===`.github/workflows/${file}`).sort((a,b)=>b.id-a.id)[0];
    return last?.status==='completed'&&last.conclusion==='success';
  });
}
export async function releaseState(env){
  const [dev,main,runs,pulls,publicResponse]=await Promise.all([
    releaseGithub(env,'git/ref/heads/dev'),releaseGithub(env,'git/ref/heads/main'),
    releaseGithub(env,'actions/runs?per_page=100'),releaseGithub(env,'pulls?state=open&base=dev&per_page=20'),
    fetch('https://api.github.com/repos/Stacktor/cockpit-releases/releases?per_page=30',{headers:{Accept:'application/vnd.github+json','User-Agent':'cockpit-admin',...(env.GITHUB_TOKEN?{Authorization:`Bearer ${env.GITHUB_TOKEN}`}:{})},signal:AbortSignal.timeout(15000)}),
  ]);
  const [devCommit,mainCommit]=await Promise.all([releaseGithub(env,`git/commits/${dev.object.sha}`),releaseGithub(env,`git/commits/${main.object.sha}`)]);
  const sameSource=devCommit.tree.sha===mainCommit.tree.sha;
  const changes=await releaseGithub(env,`compare/${main.object.sha}...${dev.object.sha}`);
  const all=runs.workflow_runs||[];
  const grouped=new Map();
  for(const r of all.filter(r=>r.head_branch==='dev'&&['.github/workflows/dev.yml','.github/workflows/dev-mac.yml'].includes(r.path))){
    if(!grouped.has(r.head_sha))grouped.set(r.head_sha,{sha:r.head_sha,nummer:r.run_number,zeit:r.created_at,titel:r.display_title||'Entwicklungsstand',systeme:[]});
    const g=grouped.get(r.head_sha);
    const system=r.path.endsWith('dev-mac.yml')?'Mac':'Windows';
    if(!g.systeme.some(s=>s.name===system))g.systeme.push({name:system,status:r.status==='completed'?(r.conclusion==='success'?'Bereit':'Fehlgeschlagen'):'Wird gebaut',url:r.html_url});
    if(system==='Windows')g.nummer=r.run_number;
  }
  const publicReleases=publicResponse.ok?await publicResponse.json():[];
  const builds=[...grouped.values()].slice(0,8).map(g=>({...g,freigabefaehig:!sameSource&&g.sha===dev.object.sha&&testedBuilds(all,g.sha)}));
  await Promise.all(builds.map(async g=>{
    const rel=Array.isArray(publicReleases)?publicReleases.find(r=>String(r.body||'').includes(`Quellstand: ${g.sha}`)&&/^dev(?:-mac)?-\d+\.\d+\.\d+-dev\.\d+$/.test(r.tag_name)):null;
    if(!rel)return;
    try{
      const r=await fetch(`https://github.com/Stacktor/cockpit-releases/releases/download/${rel.tag_name}/build-info.json`,{signal:AbortSignal.timeout(10000)});
      if(!r.ok||Number(r.headers.get('content-length')||0)>100000)return;
      const text=await r.text();if(text.length>100000)return;
      const info=JSON.parse(text);
      if(info.commit!==g.sha||!Number.isSafeInteger(info.build)||!Array.isArray(info.changes))return;
      g.nummer=info.build;g.version=String(info.version).slice(0,50);
      g.aenderungen=info.changes.slice(0,100).map(c=>({text:String(c.text).slice(0,1000),art:({new:'Neu',improved:'Verbessert',fixed:'Behoben'})[c.type]||'Änderung',platforms:Array.isArray(c.platforms)?c.platforms.filter(p=>['core','windows','mac','linux'].includes(p)):['core']}));
    }catch{ /* Ältere Metadaten fehlen: Status und technische Details bleiben lesbar. */ }
  }));
  return {dev:dev.object.sha,main:main.object.sha,runs:all,builds,
    offen:(pulls||[]).map(p=>({titel:p.title,nummer:p.number,url:p.html_url,status:p.draft?'In Arbeit':'Zur Prüfung'})),
    aenderungen:(sameSource?[]:changes.commits||[]).filter(c=>!/^docs|^chore/i.test(c.commit.message)).map(c=>({text:c.commit.message.split('\n')[0].replace(/^(feat|fix|perf)(\([^)]*\))?:\s*/,'').replace(/\s*\(#\d+\)$/,''),art:/^fix/.test(c.commit.message)?'Behoben':/^feat/.test(c.commit.message)?'Neu':'Verbessert'})),
    freigabeVerbunden:!!env.GITHUB_RELEASE_TOKEN,
    gleicherStand:sameSource,
    freigaben:all.filter(r=>['.github/workflows/admin-release.yml','.github/workflows/main-build.yml'].includes(r.path)).slice(0,10).map(r=>({titel:r.path.endsWith('admin-release.yml')?'Freigabe vorbereiten':'Alpha bauen und prüfen',status:r.status==='completed'?(r.conclusion==='success'?'Erfolgreich':'Fehlgeschlagen'):'Läuft',zeit:r.created_at,url:r.html_url})),
  };
}
