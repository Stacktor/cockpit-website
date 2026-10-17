import { h } from './dom';

/** Tastaturbedienbare Reiter, jeweils nur ein Detailbereich im DOM. */
export function reiter(items: {titel: string; inhalt: () => Node}[]) {
  const id=crypto.randomUUID(), panel=h('div',{role:'tabpanel',id:`p-${id}`,tabindex:0});
  const buttons=items.map((item,i)=>h('button',{type:'button',role:'tab',id:`t-${id}-${i}`,'aria-controls':`p-${id}`,onclick:()=>select(i)},item.titel));
  const bar=h('div',{class:'a-tabs',role:'tablist'},...buttons);
  let active=0;
  function select(i:number) {
    active=i;
    buttons.forEach((b,j)=>{b.setAttribute('aria-selected',String(i===j));b.tabIndex=i===j?0:-1;});
    panel.setAttribute('aria-labelledby',`t-${id}-${i}`);
    panel.replaceChildren(items[i].inhalt());
  }
  bar.addEventListener('keydown',e=>{
    const next=e.key==='ArrowRight'?(active+1)%items.length:e.key==='ArrowLeft'?(active+items.length-1)%items.length:e.key==='Home'?0:e.key==='End'?items.length-1:null;
    if(next!==null){e.preventDefault();select(next);buttons[next].focus();}
  });
  select(0);
  return h('div',{},bar,panel);
}
