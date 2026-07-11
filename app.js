'use strict';

const state = {
  models: [], market: [], macModels: [], macMarket: [], sources: [], strategies: [],
  alternatives: [], categories: [], site: {},
  view: 'cost', costProduct: 'iphone', marketProduct: 'iphone', buyProduct: 'iphone',
  trendMode: 'age', selectedBuyId: '', selectedAlternativeId: '', favoritesOnly: false,
  ui: {}, favorites: new Set(), owned: []
};

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const yuan = n => Number.isFinite(+n) ? new Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY',maximumFractionDigits:0}).format(+n) : '—';
const num = n => new Intl.NumberFormat('zh-CN').format(Math.round(+n || 0));
const median = (a,b) => Math.round(((+a||0)+(+b||0))/2);
const pct = n => Number.isFinite(+n) ? `${(+n).toFixed(1)}%` : '—';
const clamp = (n,min,max) => Math.min(max,Math.max(min,n));
const today = () => new Date().toISOString().slice(0,10);
const ageYears = release => Math.max(0,(new Date('2026-07-11')-new Date(`${release}-01`))/(365.25*864e5));
const debounce = (fn, ms=140) => { let t; return (...args) => { clearTimeout(t); t=setTimeout(()=>fn(...args),ms); }; };

function toast(message){
  const el=$('#toast'); el.textContent=message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),1800);
}
function safeStore(key,value){ try{localStorage.setItem(key,JSON.stringify(value));}catch(_){} }
function safeRead(key,fallback){ try{const v=localStorage.getItem(key); return v?JSON.parse(v):fallback}catch(_){return fallback} }
function saveState(){
  safeStore('vl.ui',{
    view:state.view,costProduct:state.costProduct,marketProduct:state.marketProduct,buyProduct:state.buyProduct,
    trendMode:state.trendMode,selectedBuyId:state.selectedBuyId,selectedAlternativeId:state.selectedAlternativeId,ui:state.ui
  });
  safeStore('vl.favorites',[...state.favorites]); safeStore('vl.owned',state.owned);
}
function loadState(){
  const s=safeRead('vl.ui',{}); Object.assign(state,s); state.ui=s.ui||{};
  state.favorites=new Set(safeRead('vl.favorites',[])); state.owned=safeRead('vl.owned',[]);
}

async function loadData(){
  const names=['models','market','macbook_models','macbook_market','sources','strategies','alternatives','categories','site'];
  const results=await Promise.all(names.map(n=>fetch(`data/${n}.json`).then(r=>{if(!r.ok)throw new Error(n);return r.json()})));
  [state.models,state.market,state.macModels,state.macMarket,state.sources,state.strategies,state.alternatives,state.categories,state.site]=results;
}

function parseStorage(s){
  const parts=String(s||'').split(/[\/–-]/).map(x=>x.trim()).filter(Boolean);
  return parts.map((part,i)=>{
    if(/^(\d+(?:\.\d+)?)(GB|TB)$/i.test(part))return part.toUpperCase();
    if(!/^\d+(?:\.\d+)?$/.test(part))return '';
    let unit='';
    for(let j=i+1;j<parts.length&&!unit;j++){const m=parts[j].match(/(GB|TB)$/i);if(m)unit=m[1].toUpperCase()}
    if(!unit){for(let j=i-1;j>=0&&!unit;j--){const m=parts[j].match(/(GB|TB)$/i);if(m)unit=m[1].toUpperCase()}}
    return unit?`${part}${unit}`:'';
  }).filter(Boolean);
}
function storageGB(s){ const m=String(s).match(/([\d.]+)\s*(TB|GB)/i); if(!m)return 0; return +m[1]*(m[2].toUpperCase()==='TB'?1024:1); }
const storagePremium = gb => {
  const map={64:0,128:500,256:1500,512:3500,1024:5500,2048:7500,4096:10500,8192:15500};
  if(map[gb]!=null)return map[gb];
  return Math.max(0,(Math.log2(Math.max(64,gb)/64))*1000);
};
function adjustedLaunch(model,storage){
  if(!storage || !model.baseStorage)return model.launchPrice||0;
  return Math.max(0,(model.launchPrice||0)+storagePremium(storageGB(storage))-storagePremium(storageGB(model.baseStorage)));
}
function adjustMarketRows(rows, storage, model){
  if(!storage || !rows.length || !model) return rows;
  const exact=rows.filter(r=>!r.storage || r.storage===storage);
  if(exact.length)return exact;
  const candidates=rows.filter(r=>r.storage);
  if(!candidates.length)return rows;
  const target=storageGB(storage);
  const nearestStorage=[...new Set(candidates.map(r=>r.storage))].sort((a,b)=>Math.abs(storageGB(a)-target)-Math.abs(storageGB(b)-target))[0];
  const delta=(storagePremium(target)-storagePremium(storageGB(nearestStorage)))*0.42;
  return candidates.filter(r=>r.storage===nearestStorage).map(r=>({...r,storage,low:Math.max(0,Math.round(r.low+delta)),high:Math.max(0,Math.round(r.high+delta)),derived:true,note:`由 ${nearestStorage} 参考区间按容量残值换算。`}));
}
function productData(product){ return product==='iphone'?{models:state.models,market:state.market}:{models:state.macModels,market:state.macMarket}; }
function getModel(product,id){ return productData(product).models.find(x=>x.id===id); }
function rowsFor(product,modelId,storage=''){
  const d=productData(product); let rows=d.market.filter(x=>x.modelId===modelId);
  if(product==='iphone') rows=adjustMarketRows(rows,storage,getModel(product,modelId));
  return rows;
}
function rowMid(r){return median(r.low,r.high)}
function confidenceText(v){return ({high:'核验',medium:'样本',low:'参考'})[v]||v||'—'}
function confidenceTag(v){return `<span class="tag ${esc(v)}">${esc(confidenceText(v))}</span>`}
function riskText(v){return v==='low'?'低风险':'有条件'}
function statusText(v){return ({recommended:'推荐',conditional:'有条件推荐',temporary:'临时替代'})[v]||v}

function curveFor(product,model){
  if(product==='iphone'){
    if(/Pro Max/.test(model.name))return [1,.76,.61,.49,.39,.31];
    if(/Pro/.test(model.name))return [1,.74,.58,.46,.36,.28];
    if(/mini|SE/.test(model.name))return [1,.66,.49,.37,.28,.21];
    if(/Plus/.test(model.name))return [1,.70,.55,.43,.33,.25];
    return [1,.70,.54,.42,.32,.24];
  }
  if(/Max/.test(model.chip))return [1,.77,.63,.52,.43,.35];
  if(/Pro/.test(model.chip))return [1,.79,.66,.55,.46,.38];
  return [1,.75,.60,.49,.40,.32];
}
function interpolateCurve(curve,year){
  if(year<=0)return 1;
  const i=Math.floor(year), f=year-i;
  if(i>=curve.length-1){
    const last=curve[curve.length-1], prev=curve[curve.length-2];
    const rate=last/prev; return last*Math.pow(rate,year-(curve.length-1));
  }
  const a=curve[i],b=curve[i+1]; return a*Math.pow(b/a,f);
}
function currentSellAnchor(product,model,storage,channel=''){
  const rows=rowsFor(product,model.id,storage).filter(r=>r.side==='sell' && (!channel||r.channel===channel));
  if(!rows.length)return 0;
  const sorted=rows.map(rowMid).sort((a,b)=>b-a); return sorted[0]||0;
}
function currentBuyAnchor(product,model,storage,channel=''){
  const rows=rowsFor(product,model.id,storage).filter(r=>r.side==='buy' && (!channel||r.channel===channel));
  if(!rows.length)return 0;
  const sorted=rows.map(rowMid).sort((a,b)=>a-b); return sorted[0]||0;
}
function calibratedValue(product,model,storage,year,side='sell',channel='',manualRate=null){
  const launch=product==='iphone'?adjustedLaunch(model,storage):model.launchPrice;
  if(manualRate!=null) return Math.max(0,Math.round(launch*Math.pow(1-manualRate,year)));
  const curve=curveFor(product,model); const base=interpolateCurve(curve,year)*launch;
  const currentAge=ageYears(model.release); const anchor=side==='buy'?currentBuyAnchor(product,model,storage,channel):currentSellAnchor(product,model,storage,channel);
  if(!anchor)return Math.round(base);
  const baseAtAge=interpolateCurve(curve,currentAge)*launch;
  const scale=clamp(anchor/Math.max(1,baseAtAge),.58,1.5);
  const fade=Math.exp(-Math.abs(year-currentAge)/6);
  return Math.max(0,Math.round(base*(1+(scale-1)*fade)));
}
function futureFromNow(product,model,storage,currentValue,holdYears,manualRate=null){
  if(manualRate!=null)return Math.round(currentValue*Math.pow(1-manualRate,holdYears));
  const curve=curveFor(product,model), age=ageYears(model.release);
  const now=interpolateCurve(curve,age), future=interpolateCurve(curve,age+holdYears);
  return Math.max(0,Math.round(currentValue*(future/Math.max(.01,now))));
}

function init(){
  loadState(); bindGlobal(); populateStaticFilters(); switchView(state.view||'cost',false);
  renderCost(); renderMarket(); renderBuy(); renderAlternatives(); renderMy(); renderInfo();
  $('#dataStatus').textContent=`${state.models.length} 款 iPhone · ${state.macModels.length} 款 MacBook Pro · ${state.alternatives.length} 条平替`;
  $('#dataDate').textContent=`数据 ${state.site.updated||'2026-07-11'}`;
}

function bindGlobal(){
  $$('.main-tab,.mobile-nav button').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
  $$('[data-product-tabs]').forEach(w=>w.addEventListener('click',e=>{
    const b=e.target.closest('button[data-product]'); if(!b)return;
    const area=w.dataset.productTabs; state[`${area}Product`]=b.dataset.product;
    $$('button',w).forEach(x=>x.classList.toggle('active',x===b));
    if(area==='cost')renderCost(); if(area==='market')renderMarket(); if(area==='buy')renderBuy(); saveState();
  }));
  $('#themeToggle').addEventListener('click',toggleTheme);
  $('#infoButton').addEventListener('click',()=>$('#infoDialog').showModal());
  $('#globalSearchButton').addEventListener('click',()=>{ $('#searchDialog').showModal(); setTimeout(()=>$('#globalSearch').focus(),20); });
  $$('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.closeDialog).close()));
  [$('#detailDialog'),$('#infoDialog'),$('#searchDialog'),$('#ownedDialog')].forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
  $('#exportButton').addEventListener('click',()=>{const m=$('#exportMenu');m.hidden=!m.hidden;$('#exportButton').setAttribute('aria-expanded',String(!m.hidden))});
  $('#exportMenu').addEventListener('click',e=>{const b=e.target.closest('[data-export]');if(b)exportData(b.dataset.export)});
  document.addEventListener('click',e=>{if(!e.target.closest('.menu-wrap')){$('#exportMenu').hidden=true;$('#exportButton').setAttribute('aria-expanded','false')}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#exportMenu').hidden=true});
  $('#resetCost').addEventListener('click',()=>{delete state.ui.cost;renderCost();saveState();toast('已恢复默认')});
  $('#globalSearch').addEventListener('input',debounce(renderGlobalSearch));
  $('#clearMyData').addEventListener('click',clearMyData);
  $('#addOwnedItem').addEventListener('click',openOwnedDialog);
  $('#saveOwned').addEventListener('click',saveOwnedItem);
  $('#ownedType').addEventListener('change',populateOwnedModels);
  $('#detailDialog').addEventListener('click',e=>{
    const fav=e.target.closest('[data-detail-fav]');
    if(fav){toggleFavorite(fav.dataset.detailFav);$('#detailDialog').close();return}
    if(e.target.closest('#detailCostButton')){const m=getModel(state.buyProduct,state.selectedBuyId);if(m){state.costProduct=state.buyProduct;getCostSettings().modelId=m.id;$('#detailDialog').close();switchView('cost');renderCost()}return}
    if(e.target.closest('#detailOwnedButton')){const m=getModel(state.buyProduct,state.selectedBuyId);if(m){$('#detailDialog').close();openOwnedDialog(state.buyProduct,m.id,currentReferencePrice(state.buyProduct,m))}}
  });
  window.addEventListener('resize',debounce(()=>{if(state.view==='alternatives')renderAlternativeList()},180));
}
function switchView(view,save=true){
  if(!['cost','market','buy','alternatives','my'].includes(view))view='cost'; state.view=view;
  $$('.view').forEach(v=>{const on=v.id===`view-${view}`;v.classList.toggle('active',on);v.hidden=!on});
  $$('.main-tab,.mobile-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const labels={cost:'持有成本',market:'市场价格',buy:'购买参考',alternatives:'生活平替',my:'我的'};$('#headerMeta').textContent=labels[view];
  history.replaceState(null,'',`#${view}`); if(save)saveState(); window.scrollTo({top:0,behavior:'instant'});
}
function toggleTheme(){
  const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('vl.theme',next)}catch(_){}toast(next==='dark'?'已切换深色':'已切换浅色');
}

function populateStaticFilters(){
  $('#marketSearch').value=state.ui.marketSearch||''; $('#marketSide').value=state.ui.marketSide||''; $('#marketConfidence').value=state.ui.marketConfidence||'';
  ['marketSearch','marketSide','marketConfidence','marketChannel'].forEach(id=>$('#'+id).addEventListener('input',()=>{state.ui[id]=$('#'+id).value;renderMarketTable();saveState()}));
  $('#buySearch').value=state.ui.buySearch||''; $('#buyBudget').value=state.ui.buyBudget||''; $('#buyUsed').checked=state.ui.buyUsed!==false;
  ['buySearch','buyYear','buyTier','buyBudget','buyUsed'].forEach(id=>$('#'+id).addEventListener('input',()=>{state.ui[id]=id==='buyUsed'?$('#'+id).checked:$('#'+id).value;renderBuyList();saveState()}));
  $('#alternativeSearch').value=state.ui.alternativeSearch||'';
  ['alternativeSearch','alternativeReliability','alternativeRisk','alternativeEvidence','alternativeType','alternativeSort'].forEach(id=>$('#'+id).addEventListener('input',()=>{state.ui[id]=$('#'+id).value;renderAlternativeList();saveState()}));
  $('#showFavorites').addEventListener('click',()=>{state.favoritesOnly=!state.favoritesOnly;$('#showFavorites').classList.toggle('active',state.favoritesOnly);$('#showFavorites').textContent=state.favoritesOnly?'显示全部':'只看收藏';renderAlternativeList()});
  $$('[data-trend-mode]').forEach(b=>b.addEventListener('click',()=>{state.trendMode=b.dataset.trendMode;$$('[data-trend-mode]').forEach(x=>x.classList.toggle('active',x===b));renderCostResults();saveState()}));
}

function costDefaults(product){
  if(product==='iphone')return {modelId:'iphone-15-pro-max',storage:'256GB',buyChannel:'闲鱼个人',sellChannel:'闲鱼个人转卖',hold:2,deprMode:'market',manualRate:16,fees:250,repair:0};
  return {modelId:'mbp-14-m3pro-2023',storage:'',buyChannel:'闲鱼个人',sellChannel:'闲鱼个人转卖',hold:3,deprMode:'market',manualRate:15,fees:300,repair:0};
}
function getCostSettings(){
  state.ui.cost=state.ui.cost||{}; const p=state.costProduct;
  state.ui.cost[p]={...costDefaults(p),...(state.ui.cost[p]||{})}; return state.ui.cost[p];
}
function renderCost(){
  const p=state.costProduct, d=productData(p), s=getCostSettings();
  if(!d.models.some(m=>m.id===s.modelId))s.modelId=d.models[0]?.id||'';
  const model=getModel(p,s.modelId); const storages=p==='iphone'?parseStorage(model.storageOptions):[];
  if(p==='iphone'&&!storages.includes(s.storage))s.storage=storages.includes(model.baseStorage)?model.baseStorage:storages[0];
  const rows=rowsFor(p,s.modelId,s.storage); const buyChannels=[...new Set(rows.filter(r=>r.side==='buy').map(r=>r.channel))]; const sellChannels=[...new Set(rows.filter(r=>r.side==='sell').map(r=>r.channel))];
  if(!buyChannels.includes(s.buyChannel))s.buyChannel=buyChannels[0]||''; if(!sellChannels.includes(s.sellChannel))s.sellChannel=sellChannels[0]||'';
  const modelOptions=d.models.map(m=>`<option value="${esc(m.id)}" ${m.id===s.modelId?'selected':''}>${esc(m.name)}${p==='macbook'?` · ${esc(m.memory)}/${esc(m.storage)}`:''}</option>`).join('');
  const storageControl=p==='iphone'?`<label>容量<select data-cost="storage">${storages.map(x=>`<option ${x===s.storage?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`:'';
  $('#costControls').innerHTML=`
    <label>机型<select data-cost="modelId">${modelOptions}</select></label>${storageControl}
    <label>买入方式<select data-cost="buyChannel">${buyChannels.map(x=>`<option ${x===s.buyChannel?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
    <label>卖出方式<select data-cost="sellChannel">${sellChannels.map(x=>`<option ${x===s.sellChannel?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
    <label>持有年限<select data-cost="hold">${[1,2,3,4,5].map(x=>`<option value="${x}" ${+s.hold===x?'selected':''}>${x} 年</option>`).join('')}</select></label>
    <label>折旧设置<select data-cost="deprMode"><option value="market" ${s.deprMode==='market'?'selected':''}>市场模型</option><option value="manual" ${s.deprMode==='manual'?'selected':''}>手动年折旧</option></select></label>
    <label>年折旧率<input data-cost="manualRate" type="number" min="0" max="60" value="${esc(s.manualRate)}" ${s.deprMode==='manual'?'':'disabled'}></label>
    <label>交易费用<input data-cost="fees" type="number" min="0" step="50" value="${esc(s.fees)}"></label>
    <label>维修 / 电池<input data-cost="repair" type="number" min="0" step="50" value="${esc(s.repair)}"></label>`;
  $$('[data-cost]').forEach(el=>el.addEventListener('input',()=>{
    const key=el.dataset.cost; s[key]=['hold','manualRate','fees','repair'].includes(key)?+el.value:el.value;
    if(key==='modelId'){const m=getModel(p,s.modelId);if(p==='iphone')s.storage=parseStorage(m.storageOptions)[0]||m.baseStorage;renderCost()}else if(key==='storage'){renderCost()}else if(key==='deprMode'){renderCost()}else renderCostResults(); saveState();
  }));
  $$('[data-product-tabs="cost"] button').forEach(b=>b.classList.toggle('active',b.dataset.product===p));
  $$('[data-trend-mode]').forEach(b=>b.classList.toggle('active',b.dataset.trendMode===state.trendMode));
  renderCostResults();
}
function selectedRows(product,settings){return rowsFor(product,settings.modelId,settings.storage)}
function selectedPrice(rows,channel,side){const r=rows.find(x=>x.channel===channel&&x.side===side);return r?rowMid(r):0}
function costAtHold(product,model,s,hold){
  const rows=selectedRows(product,s); const buy=selectedPrice(rows,s.buyChannel,'buy'); const currentSell=selectedPrice(rows,s.sellChannel,'sell');
  const rate=s.deprMode==='manual'?clamp(s.manualRate/100,0,.8):null;
  const future=futureFromNow(product,model,s.storage,currentSell,hold,rate);
  const total=Math.max(0,buy-future+(+s.fees||0)+(+s.repair||0));
  return {buy,currentSell,future,total,annual:total/hold,monthly:total/(hold*12)};
}
function renderCostResults(){
  const p=state.costProduct,s=getCostSettings(),model=getModel(p,s.modelId);if(!model)return;
  const c=costAtHold(p,model,s,+s.hold||1); const launch=p==='iphone'?adjustedLaunch(model,s.storage):model.launchPrice;
  const loss=Math.max(0,c.buy-c.future), lossPct=c.buy?loss/c.buy*100:0;
  const itemName=p==='iphone'?`${model.name} ${s.storage}`:`${model.name} ${model.memory}/${model.storage}`;
  $('#costKpis').innerHTML=[
    ['买入价格',yuan(c.buy),s.buyChannel],['预计卖出',yuan(c.future),`${s.hold} 年后 · ${s.sellChannel}`],['总持有成本',yuan(c.total),`${num(c.total/c.buy*100)}% 买入价`],
    ['年均成本',yuan(c.annual),'每年'],['月均成本',yuan(c.monthly),'每月'],['累计价值下降',yuan(loss),pct(lossPct)]
  ].map(([a,b,d])=>`<div class="kpi"><span>${esc(a)}</span><strong>${esc(b)}</strong><small>${esc(d)}</small></div>`).join('');
  $('#selectedRelease').textContent=model.release;
  renderTrend(p,model,s,c,launch,itemName); renderRoutes(p,model,s); renderConclusion(p,model,s,c,itemName);
}
function trendPoints(product,model,s,c,launch){
  const rate=s.deprMode==='manual'?clamp(s.manualRate/100,0,.8):null;
  if(state.trendMode==='holding'){
    const rows=selectedRows(product,s); const buy=selectedPrice(rows,s.buyChannel,'buy')||c.buy;
    return Array.from({length:6},(_,i)=>({label:i===0?'现在':`持有${i}年`,year:i,value:i===0?buy:futureFromNow(product,model,s.storage,buy,i,rate),actualAge:ageYears(model.release)+i}));
  }
  return Array.from({length:6},(_,i)=>({label:i===0?'首发':`第${i}年`,year:i,value:i===0?launch:calibratedValue(product,model,s.storage,i,'sell',s.sellChannel,rate),actualAge:i}));
}
function renderTrend(product,model,s,c,launch,itemName){
  const points=trendPoints(product,model,s,c,launch); const values=points.map(x=>x.value); const max=Math.max(...values)*1.08,min=Math.min(...values)*.88;
  const W=760,H=250,pad={l:58,r:28,t:34,b:42}; const x=i=>pad.l+i*(W-pad.l-pad.r)/(points.length-1); const y=v=>pad.t+(max-v)/(max-min||1)*(H-pad.t-pad.b);
  const path=points.map((p,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const grid=[0,.25,.5,.75,1].map(t=>{const val=max-(max-min)*t;const yy=pad.t+(H-pad.t-pad.b)*t;return `<line x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}" class="grid"/><text x="${pad.l-8}" y="${yy+3}" text-anchor="end" class="axis">${num(val)}</text>`}).join('');
  const segments=points.slice(1).map((p,i)=>{const prev=points[i],drop=Math.max(0,prev.value-p.value),rate=prev.value?drop/prev.value*100:0;const mx=(x(i)+x(i+1))/2,my=(y(prev.value)+y(p.value))/2-10;return `<g class="segment-label"><rect x="${mx-38}" y="${my-11}" width="76" height="22" rx="5"/><text x="${mx}" y="${my-1}" text-anchor="middle">↓${num(drop)} · ${rate.toFixed(1)}%</text></g>`}).join('');
  const nodes=points.map((p,i)=>`<g><circle cx="${x(i)}" cy="${y(p.value)}" r="4.2" class="node"/><text x="${x(i)}" y="${y(p.value)-11}" text-anchor="middle" class="price">${num(p.value)}</text><text x="${x(i)}" y="${H-17}" text-anchor="middle" class="axis">${esc(p.label)}</text></g>`).join('');
  $('#trendChart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(itemName)} 价值趋势"><style>.grid{stroke:var(--line);stroke-width:1}.axis{fill:var(--muted);font:9px var(--font)}.price{fill:var(--text);font:10px var(--mono);font-weight:600}.trendline{fill:none;stroke:var(--accent);stroke-width:2}.node{fill:var(--surface);stroke:var(--accent);stroke-width:2.5}.segment-label rect{fill:var(--surface);stroke:var(--line)}.segment-label text{fill:var(--danger);font:8.5px var(--mono)}</style>${grid}<path d="${path}" class="trendline"/>${segments}${nodes}</svg>`;
  $('#trendMeta').textContent=`${itemName} · ${state.trendMode==='holding'?'从当前买入开始':'从首发开始'}`;
  const summary=points.slice(1).map((p,i)=>{const prev=points[i],drop=Math.max(0,prev.value-p.value),rate=prev.value?drop/prev.value*100:0;return `<div class="trend-item"><span>${esc(p.label)}</span><b>${yuan(p.value)}</b><em>↓ ${yuan(drop)} / ${rate.toFixed(1)}%</em></div>`}).join('');
  $('#trendSummary').innerHTML=summary;
  $('#trendTable').innerHTML=`<table><thead><tr><th>时间</th><th class="num">参考价值</th><th class="num">本期下降金额</th><th class="num">本期下降率</th><th class="num">累计下降金额</th><th class="num">累计下降率</th><th class="num">残值率</th></tr></thead><tbody>${points.map((p,i)=>{const prev=points[i-1],drop=prev?Math.max(0,prev.value-p.value):0,period=prev&&prev.value?drop/prev.value*100:0,cum=Math.max(0,points[0].value-p.value),cumPct=points[0].value?cum/points[0].value*100:0,res=points[0].value?p.value/points[0].value*100:100;return `<tr><td>${esc(p.label)}</td><td class="num">${yuan(p.value)}</td><td class="num">${i?yuan(drop):'—'}</td><td class="num">${i?pct(period):'—'}</td><td class="num">${i?yuan(cum):'—'}</td><td class="num">${i?pct(cumPct):'—'}</td><td class="num">${pct(res)}</td></tr>`}).join('')}</tbody></table>`;
}
function renderRoutes(product,model,s){
  const rows=selectedRows(product,s), buys=rows.filter(r=>r.side==='buy'), sells=rows.filter(r=>r.side==='sell'), rate=s.deprMode==='manual'?s.manualRate/100:null;
  const routes=[]; buys.forEach(b=>sells.forEach(e=>{const buy=rowMid(b),cur=rowMid(e),future=futureFromNow(product,model,s.storage,cur,+s.hold,rate),total=Math.max(0,buy-future+(+s.fees||0)+(+s.repair||0));routes.push({b,e,buy,cur,future,total,annual:total/+s.hold,spread:buy-cur})})); routes.sort((a,b)=>a.annual-b.annual);
  $('#routeTable').innerHTML=routes.length?`<table><thead><tr><th>买入</th><th>卖出</th><th class="num">买入价</th><th class="num">当前退出</th><th class="num">${s.hold}年后</th><th class="num">年均成本</th><th>数据</th></tr></thead><tbody>${routes.slice(0,8).map((r,i)=>`<tr class="${i===0?'selected':''}"><td>${esc(r.b.channel)}</td><td>${esc(r.e.channel)}</td><td class="num">${yuan(r.buy)}</td><td class="num">${yuan(r.cur)}</td><td class="num">${yuan(r.future)}</td><td class="num"><b>${yuan(r.annual)}</b></td><td>${confidenceTag(r.b.confidence)} ${confidenceTag(r.e.confidence)}</td></tr>`).join('')}</tbody></table>`:`<div class="empty">暂无可比较路径</div>`;
}
function renderConclusion(product,model,s,c,itemName){
  const holds=[1,2,3,4,5].map(h=>({h,...costAtHold(product,model,s,h)})); const best=holds.reduce((a,b)=>a.annual<b.annual?a:b); const nextLoss=c.currentSell-futureFromNow(product,model,s.storage,c.currentSell,1,s.deprMode==='manual'?s.manualRate/100:null);
  $('#costConclusion').innerHTML=`<h3 class="detail-title">${esc(itemName)}</h3><div class="detail-sub">按当前条件，持有 ${best.h} 年的年均成本最低</div><div class="detail-grid"><div class="detail-cell"><span>推荐持有</span><b>${best.h} 年</b></div><div class="detail-cell"><span>年均成本</span><b>${yuan(best.annual)}</b></div><div class="detail-cell"><span>推荐买入</span><b>${esc(s.buyChannel)}</b></div><div class="detail-cell"><span>推荐卖出</span><b>${esc(s.sellChannel)}</b></div></div><div class="detail-section"><h3>继续持有判断</h3><p>未来一年预计再下降约 ${yuan(nextLoss)}。若维修支出明显高于这一数值，换机或出售的优先级会上升。</p></div><div class="detail-actions"><button class="primary-button" type="button" id="addCurrentToOwned">加入我的物品</button><button class="text-button" type="button" id="openSelectedInBuy">查看购买参考</button></div>`;
  $('#addCurrentToOwned').onclick=()=>openOwnedDialog(product,model.id,c.buy); $('#openSelectedInBuy').onclick=()=>{state.buyProduct=product;state.selectedBuyId=model.id;switchView('buy');renderBuy()};
}

function renderMarket(){
  $$('[data-product-tabs="market"] button').forEach(b=>b.classList.toggle('active',b.dataset.product===state.marketProduct));
  const channels=[...new Set(productData(state.marketProduct).market.map(r=>r.channel))].sort();
  $('#marketChannel').innerHTML='<option value="">全部</option>'+channels.map(x=>`<option ${state.ui.marketChannel===x?'selected':''}>${esc(x)}</option>`).join('');
  renderMarketTable();
}
function filteredMarket(){
  const p=state.marketProduct,d=productData(p), q=($('#marketSearch').value||'').trim().toLowerCase(),side=$('#marketSide').value,conf=$('#marketConfidence').value,ch=$('#marketChannel').value;
  return d.market.filter(r=>{const m=d.models.find(x=>x.id===r.modelId);const hay=JSON.stringify([m?.name,m?.chip,m?.memory,m?.storage,r.channel,r.condition,r.storage]).toLowerCase();return (!q||hay.includes(q))&&(!side||r.side===side)&&(!conf||r.confidence===conf)&&(!ch||r.channel===ch)});
}
function renderMarketTable(){
  const p=state.marketProduct,d=productData(p), rows=filteredMarket(); $('#marketCount').textContent=`${rows.length} 条`;
  const buy=rows.filter(r=>r.side==='buy').map(rowMid),sell=rows.filter(r=>r.side==='sell').map(rowMid);
  $('#marketKpis').innerHTML=[['记录',rows.length,'条'],['买入中位',buy.length?yuan(buy.sort((a,b)=>a-b)[Math.floor(buy.length/2)]):'—',''],['卖出中位',sell.length?yuan(sell.sort((a,b)=>a-b)[Math.floor(sell.length/2)]):'—',''],['覆盖平台',new Set(rows.map(r=>r.channel)).size,'个']].map(([a,b,c])=>`<div class="kpi"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`).join('');
  $('#marketTable').innerHTML=rows.length?`<table><thead><tr><th>产品</th>${p==='iphone'?'<th>容量</th>':'<th>配置</th>'}<th>平台</th><th>方向</th><th class="num">区间</th><th class="num">中位</th><th>机况</th><th>数据</th><th>日期</th></tr></thead><tbody>${rows.map(r=>{const m=d.models.find(x=>x.id===r.modelId);return `<tr><td><b>${esc(m?.name||r.modelId)}</b></td><td>${p==='iphone'?esc(r.storage||'—'):esc(`${m?.memory||''}/${m?.storage||''}`)}</td><td>${esc(r.channel)}</td><td>${r.side==='buy'?'买入':'卖出'}</td><td class="num">${yuan(r.low)}–${yuan(r.high)}</td><td class="num"><b>${yuan(rowMid(r))}</b></td><td>${esc(r.condition||'')}</td><td>${confidenceTag(r.confidence)}</td><td>${esc(r.date||'')}</td></tr>`}).join('')}</tbody></table>`:'<div class="empty">没有符合条件的价格记录</div>';
}

function renderBuy(){
  $$('[data-product-tabs="buy"] button').forEach(b=>b.classList.toggle('active',b.dataset.product===state.buyProduct));
  const d=productData(state.buyProduct); const years=[...new Set(d.models.map(m=>m.year))].sort((a,b)=>b-a); const tiers=[...new Set(d.models.map(m=>state.buyProduct==='iphone'?m.tier:m.size))];
  $('#buyYear').innerHTML='<option value="">全部</option>'+years.map(x=>`<option value="${x}" ${String(state.ui.buyYear||'')===String(x)?'selected':''}>${x}</option>`).join('');
  $('#buyTierLabel').firstChild.textContent=state.buyProduct==='iphone'?'系列':'尺寸';
  $('#buyTier').innerHTML='<option value="">全部</option>'+tiers.map(x=>`<option ${state.ui.buyTier===x?'selected':''}>${esc(x)}</option>`).join('');
  renderBuyList();
}
function currentReferencePrice(product,model){
  const rows=rowsFor(product,model.id,product==='iphone'?(parseStorage(model.storageOptions).includes('256GB')?'256GB':model.baseStorage):'').filter(r=>r.side==='buy');
  return rows.length?Math.min(...rows.map(rowMid)):model.currentOfficialPrice||model.launchPrice;
}
function filteredBuyModels(){
  const p=state.buyProduct,d=productData(p),q=($('#buySearch').value||'').toLowerCase(),year=$('#buyYear').value,tier=$('#buyTier').value,budget=+$('#buyBudget').value||Infinity,used=$('#buyUsed').checked;
  return d.models.filter(m=>{const price=used?currentReferencePrice(p,m):(m.currentOfficialPrice||m.launchPrice);const hay=JSON.stringify(m).toLowerCase();return (!q||hay.includes(q))&&(!year||String(m.year)===year)&&(!tier||(p==='iphone'?m.tier:m.size)===tier)&&price<=budget});
}
function renderBuyList(){
  const p=state.buyProduct,list=filteredBuyModels(); $('#buyCount').textContent=`${list.length} 款`;
  if(!list.some(m=>m.id===state.selectedBuyId))state.selectedBuyId=list[0]?.id||'';
  $('#buyTable').innerHTML=list.length?`<table><thead><tr><th>产品</th><th>芯片</th><th>${p==='iphone'?'内存':'配置'}</th><th>屏幕</th><th class="num">首发价</th><th class="num">当前参考</th><th>判断</th></tr></thead><tbody>${list.map(m=>`<tr class="clickable ${m.id===state.selectedBuyId?'selected':''}" data-buy-id="${esc(m.id)}"><td><b>${esc(m.name)}</b><br><span class="muted">${esc(m.release)}</span></td><td>${esc(m.chip)}</td><td>${p==='iphone'?`${esc(m.ramGB)}GB · ${esc(m.storageOptions)}`:`${esc(m.memory)} / ${esc(m.storage)}`}</td><td>${esc(m.display)}</td><td class="num">${yuan(m.launchPrice)}</td><td class="num"><b>${yuan(currentReferencePrice(p,m))}</b></td><td>${esc(m.verdict)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">没有符合条件的产品</div>';
  $$('[data-buy-id]').forEach(tr=>tr.addEventListener('click',()=>{state.selectedBuyId=tr.dataset.buyId;renderBuyList();showBuyDetail();saveState();if(innerWidth<=680)openDetail('产品详情',$('#buyDetail').innerHTML)}));
  showBuyDetail();
}
function showBuyDetail(){
  const p=state.buyProduct,m=getModel(p,state.selectedBuyId); if(!m){$('#buyDetail').innerHTML='<div class="empty">选择产品查看详情</div>';return}
  const price=currentReferencePrice(p,m); const grid=p==='iphone' ? [
    ['芯片',m.chip],['CPU / GPU',`${m.cpuCores} 核 / ${m.gpuCores} 核`],['内存',`${m.ramGB}GB`],['容量',m.storageOptions],['屏幕',m.display],['刷新率',`${m.refreshHz}Hz`],['相机',m.camera],['长焦',m.telephoto],['接口',`${m.port} · ${m.portSpeed}`],['重量',`${m.weightG}g`],['续航',`${m.videoHours} 小时视频`],['AI',m.appleIntelligence?'支持':'不支持']
  ]:[['芯片',m.chip],['CPU / GPU',`${m.cpuCores} 核 / ${m.gpuCores} 核`],['内存',m.memory],['SSD',m.storage],['最大内存',m.maxMemory],['屏幕',m.display],['重量',`${m.weightKg}kg`],['续航',`${m.batteryHours} 小时`],['接口',m.ports],['摄像头',m.camera]];
  $('#buyDetail').innerHTML=`<h3 class="detail-title">${esc(m.name)}</h3><div class="detail-sub">${esc(m.release)} · 首发 ${yuan(m.launchPrice)} · 当前参考 ${yuan(price)}</div><div class="detail-grid">${grid.map(([a,b])=>`<div class="detail-cell"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join('')}</div><div class="detail-section"><h3>关键更新</h3><p>${esc(m.keyUpdates)}</p></div><div class="detail-section"><h3>优点</h3><p>${esc(m.pros)}</p></div><div class="detail-section"><h3>缺点</h3><p>${esc(m.cons)}</p></div><div class="detail-section"><h3>购买判断</h3><p>${esc(m.verdict)}</p></div><div class="detail-actions"><button id="detailCostButton" class="primary-button" type="button">计算持有成本</button><button id="detailOwnedButton" class="text-button" type="button">加入我的物品</button></div>`;
  $('#detailCostButton').onclick=()=>{state.costProduct=p;getCostSettings().modelId=m.id;switchView('cost');renderCost()}; $('#detailOwnedButton').onclick=()=>openOwnedDialog(p,m.id,price);
}

function renderAlternatives(){
  $('#alternativeReliability').value=state.ui.alternativeReliability||'';$('#alternativeRisk').value=state.ui.alternativeRisk||'';$('#alternativeEvidence').value=state.ui.alternativeEvidence||'';$('#alternativeSort').value=state.ui.alternativeSort||'recommended';
  const types=[...new Set(state.alternatives.map(x=>x.type))].sort(); $('#alternativeType').innerHTML='<option value="">全部</option>'+types.map(x=>`<option ${state.ui.alternativeType===x?'selected':''}>${esc(x)}</option>`).join('');
  const selected=state.ui.alternativeCategory||'';
  $('#categoryChips').innerHTML=`<button data-category="" class="${!selected?'active':''}">全部</button>`+state.categories.map(c=>`<button data-category="${esc(c.id)}" class="${selected===c.id?'active':''}">${esc(c.icon)} ${esc(c.name)}</button>`).join('');
  $$('[data-category]').forEach(b=>b.addEventListener('click',()=>{state.ui.alternativeCategory=b.dataset.category;renderAlternatives();saveState()})); renderAlternativeList();
}
function filteredAlternatives(){
  const q=($('#alternativeSearch').value||'').trim().toLowerCase(),cat=state.ui.alternativeCategory||'',rel=$('#alternativeReliability').value,risk=$('#alternativeRisk').value,evidence=$('#alternativeEvidence').value,type=$('#alternativeType').value;
  let list=state.alternatives.filter(a=>{const hay=JSON.stringify([a.original,a.alternative,a.tags,a.why,a.limits,a.category,a.type]).toLowerCase();return (!q||hay.includes(q))&&(!cat||a.category===cat)&&(!rel||a.reliability===rel)&&(!risk||a.risk===risk)&&(!evidence||a.evidence===evidence)&&(!type||a.type===type)&&(!state.favoritesOnly||state.favorites.has(a.id))});
  const order={A:0,B:1,C:2},riskOrder={low:0,conditional:1};
  const sort=$('#alternativeSort').value; list.sort((a,b)=>sort==='saving'?(b.savingMax-a.savingMax):sort==='category'?a.category.localeCompare(b.category,'zh-CN'):sort==='reliability'?(order[a.reliability]-order[b.reliability]||riskOrder[a.risk]-riskOrder[b.risk]):(order[a.reliability]-order[b.reliability]||riskOrder[a.risk]-riskOrder[b.risk]||b.savingMax-a.savingMax));
  return list;
}
function renderAlternativeList(){
  const list=filteredAlternatives();$('#alternativeCount').textContent=`${list.length} 条`;
  if(!list.some(a=>a.id===state.selectedAlternativeId))state.selectedAlternativeId=list[0]?.id||'';
  const catMap=Object.fromEntries(state.categories.map(c=>[c.id,c.name]));
  const mobile=innerWidth<=680;
  if(mobile){
    const limit=state.ui.altMobileLimit||20, shown=list.slice(0,limit);
    $('#alternativeTable').innerHTML=shown.length?`<div class="alt-mobile-list">${shown.map(a=>`<article class="alt-mobile-card ${a.id===state.selectedAlternativeId?'selected':''}" data-alt-id="${a.id}" tabindex="0"><div class="alt-card-head"><b>${esc(a.original)}</b><button class="favorite-button ${state.favorites.has(a.id)?'active':''}" data-fav="${a.id}" title="收藏">${state.favorites.has(a.id)?'★':'☆'}</button></div><div class="alt-arrow">→ ${esc(a.alternative)}</div><div class="alt-card-meta"><span>${esc(catMap[a.category]||a.category)}</span><span class="saving">省 ${a.savingMin}–${a.savingMax}%</span><span class="tag ${a.reliability}">${a.reliability}</span><span class="tag ${a.risk}">${esc(riskText(a.risk))}</span></div><p>${esc(a.limits)}</p></article>`).join('')}${list.length>limit?`<button class="load-more" data-alt-more type="button">再显示 ${Math.min(20,list.length-limit)} 条</button>`:''}</div>`:'<div class="empty">没有符合条件的平替方案</div>';
  }else{
    $('#alternativeTable').innerHTML=list.length?`<table><thead><tr><th></th><th>原需求</th><th>平替方案</th><th>分类</th><th class="num">预计节省</th><th>可靠性</th><th>风险</th><th>限制</th></tr></thead><tbody>${list.map(a=>`<tr class="clickable ${a.id===state.selectedAlternativeId?'selected':''}" data-alt-id="${a.id}"><td><button class="favorite-button ${state.favorites.has(a.id)?'active':''}" data-fav="${a.id}" title="收藏">${state.favorites.has(a.id)?'★':'☆'}</button></td><td><b>${esc(a.original)}</b></td><td>${esc(a.alternative)}</td><td>${esc(catMap[a.category]||a.category)}</td><td class="num"><span class="saving">${a.savingMin}–${a.savingMax}%</span></td><td><span class="tag ${a.reliability}">${a.reliability}</span></td><td><span class="tag ${a.risk}">${esc(riskText(a.risk))}</span></td><td>${esc(a.limits)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">没有符合条件的平替方案</div>';
  }
  $$('[data-fav]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggleFavorite(b.dataset.fav)}));
  $$('[data-alt-id]').forEach(row=>{const open=()=>{state.selectedAlternativeId=row.dataset.altId;renderAlternativeList();showAlternativeDetail();saveState();if(innerWidth<=680)openDetail('平替详情',$('#alternativeDetail').innerHTML)};row.addEventListener('click',open);row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}})});
  $('[data-alt-more]')?.addEventListener('click',()=>{state.ui.altMobileLimit=(state.ui.altMobileLimit||20)+20;renderAlternativeList()});
  showAlternativeDetail();
}
function showAlternativeDetail(){
  const a=state.alternatives.find(x=>x.id===state.selectedAlternativeId);if(!a){$('#alternativeDetail').innerHTML='<div class="empty">选择方案查看详情</div>';return}
  const cat=state.categories.find(c=>c.id===a.category)?.name||a.category;$('#alternativeDetailMeta').textContent=cat;
  $('#alternativeDetail').innerHTML=`<h3 class="detail-title">${esc(a.original)} → ${esc(a.alternative)}</h3><div class="detail-sub">${esc(cat)} · ${esc(a.type)} · 预计节省 ${a.savingMin}–${a.savingMax}%</div><div class="detail-grid"><div class="detail-cell"><span>功能可靠性</span><b>${a.reliability} · ${a.reliability==='A'?'高':a.reliability==='B'?'有明确限制':'仅临时'}</b></div><div class="detail-cell"><span>安全等级</span><b>${esc(riskText(a.risk))}</b></div><div class="detail-cell"><span>证据等级</span><b>${esc(a.evidence)}</b></div><div class="detail-cell"><span>推荐状态</span><b>${esc(statusText(a.status))}</b></div></div><div class="detail-section"><h3>为什么可替代</h3><p>${esc(a.why)}</p></div><div class="detail-section"><h3>限制</h3><p>${esc(a.limits)}</p></div><div class="detail-section risk-note"><h3>安全与使用条件</h3><p>${esc(a.safety)}</p></div><div class="detail-section"><h3>标签</h3><p>${a.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join(' ')}</p></div><div class="detail-actions"><button class="primary-button" data-detail-fav="${a.id}" type="button">${state.favorites.has(a.id)?'取消收藏':'收藏方案'}</button></div>`;
  $('[data-detail-fav]')?.addEventListener('click',()=>toggleFavorite(a.id));
}
function toggleFavorite(id){state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);saveState();renderAlternativeList();renderMy();toast(state.favorites.has(id)?'已收藏':'已取消收藏')}

function estimateOwnedValue(item){
  const p=item.type,m=getModel(p,item.modelId);if(!m)return 0;
  const storage=p==='iphone'?(item.note?.match(/\d+(?:GB|TB)/i)?.[0]||m.baseStorage):'';
  return currentSellAnchor(p,m,storage)||currentReferencePrice(p,m);
}
function renderMy(){
  const purchase=state.owned.reduce((s,x)=>s+(+x.price||0),0), current=state.owned.reduce((s,x)=>s+estimateOwnedValue(x),0), loss=Math.max(0,purchase-current);
  $('#myKpis').innerHTML=[['我的物品',state.owned.length,'件'],['累计买入',yuan(purchase),''],['当前参考',yuan(current),''],['累计价值下降',yuan(loss),purchase?pct(loss/purchase*100):''],['平替收藏',state.favorites.size,'条'],['本地保存','浏览器','不上传']].map(([a,b,c])=>`<div class="kpi"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`).join('');
  $('#ownedItems').innerHTML=state.owned.length?state.owned.map((x,i)=>{const m=getModel(x.type,x.modelId),v=estimateOwnedValue(x),diff=(+x.price||0)-v;return `<div class="owned-card"><div><h3>${esc(m?.name||x.modelId)}</h3><p>${esc(x.date)} · 买入 ${yuan(x.price)} · 当前约 ${yuan(v)} · 下降 ${yuan(Math.max(0,diff))}${x.note?` · ${esc(x.note)}`:''}</p></div><div class="card-actions"><button class="danger-button" data-owned-delete="${i}" type="button">删除</button></div></div>`}).join(''):'<div class="empty">还没有添加物品</div>';
  $$('[data-owned-delete]').forEach(b=>b.addEventListener('click',()=>{if(confirm('删除这条物品记录？')){state.owned.splice(+b.dataset.ownedDelete,1);saveState();renderMy();toast('已删除')}}));
  const favs=state.alternatives.filter(a=>state.favorites.has(a.id));$('#favoriteCount').textContent=`${favs.length} 条`;
  $('#favoriteAlternatives').innerHTML=favs.length?favs.map(a=>`<div class="favorite-card"><div><h3>${esc(a.original)} → ${esc(a.alternative)}</h3><p>可靠性 ${a.reliability} · ${riskText(a.risk)} · 节省 ${a.savingMin}–${a.savingMax}%</p></div><div class="card-actions"><button class="text-button" data-fav-open="${a.id}" type="button">查看</button></div></div>`).join(''):'<div class="empty">还没有收藏平替方案</div>';
  $$('[data-fav-open]').forEach(b=>b.addEventListener('click',()=>{state.selectedAlternativeId=b.dataset.favOpen;switchView('alternatives');renderAlternatives()}));
}
function openOwnedDialog(type=state.costProduct,modelId='',price=0){
  $('#ownedType').value=type;populateOwnedModels(modelId);$('#ownedDate').value=today();$('#ownedPrice').value=Math.round(price||currentReferencePrice(type,getModel(type,$('#ownedModel').value))||0);$('#ownedNote').value='';$('#ownedDialog').showModal();
}
function populateOwnedModels(selected=''){
  const type=$('#ownedType').value,d=productData(type);$('#ownedModel').innerHTML=d.models.map(m=>`<option value="${esc(m.id)}" ${m.id===selected?'selected':''}>${esc(m.name)}${type==='macbook'?` · ${esc(m.memory)}/${esc(m.storage)}`:''}</option>`).join('');
}
function saveOwnedItem(){
  const type=$('#ownedType').value,modelId=$('#ownedModel').value,date=$('#ownedDate').value,price=+$('#ownedPrice').value,note=$('#ownedNote').value.trim();if(!modelId||!date||!price){toast('请完整填写');return}
  state.owned.push({type,modelId,date,price,note,created:Date.now()});saveState();$('#ownedDialog').close();renderMy();toast('已加入我的物品');
}
function clearMyData(){if(!confirm('清空我的物品和所有平替收藏？'))return;state.owned=[];state.favorites.clear();saveState();renderMy();renderAlternatives();toast('本地数据已清空')}

function renderGlobalSearch(){
  const q=$('#globalSearch').value.trim().toLowerCase();if(!q){$('#globalSearchResults').innerHTML='<div class="empty">输入产品、品牌、需求或平替方案</div>';return}
  const iph=state.models.filter(m=>JSON.stringify(m).toLowerCase().includes(q)).slice(0,5),mac=state.macModels.filter(m=>JSON.stringify(m).toLowerCase().includes(q)).slice(0,5),alts=state.alternatives.filter(a=>JSON.stringify(a).toLowerCase().includes(q)).slice(0,8);
  const group=(title,items,fn)=>items.length?`<div class="search-group"><h3>${title}</h3>${items.map(fn).join('')}</div>`:'';
  $('#globalSearchResults').innerHTML=group('iPhone',iph,m=>`<button class="search-result" data-global-product="iphone" data-id="${m.id}"><b>${esc(m.name)}</b> · ${esc(m.chip)}</button>`)+group('MacBook Pro',mac,m=>`<button class="search-result" data-global-product="macbook" data-id="${m.id}"><b>${esc(m.name)}</b> · ${esc(m.chip)}</button>`)+group('生活平替',alts,a=>`<button class="search-result" data-global-alt="${a.id}"><b>${esc(a.original)}</b> → ${esc(a.alternative)}</button>`)+(iph.length||mac.length||alts.length?'':'<div class="empty">没有找到相关内容</div>');
  $$('[data-global-product]').forEach(b=>b.addEventListener('click',()=>{state.buyProduct=b.dataset.globalProduct;state.selectedBuyId=b.dataset.id;$('#searchDialog').close();switchView('buy');renderBuy()}));
  $$('[data-global-alt]').forEach(b=>b.addEventListener('click',()=>{state.selectedAlternativeId=b.dataset.globalAlt;$('#searchDialog').close();switchView('alternatives');renderAlternatives()}));
}
function renderInfo(){
  $('#infoBody').innerHTML=`<div class="detail-section"><h3>数据范围</h3><p>${state.models.length} 款 iPhone、${state.macModels.length} 款 MacBook Pro、${state.alternatives.length} 条经初步去重和安全筛选的生活平替。</p></div><div class="detail-section"><h3>市场价格</h3><p>“核验”表示官方或明确价格；“样本”表示公开案例；“参考”表示根据公开行情形成的区间。成交前需按相同配置、容量、机况和日期复核。</p></div><div class="detail-section"><h3>价值趋势</h3><p>以首发价格、当前同配置二手样本和分层残值曲线计算，不是未来成交承诺。</p></div><div class="detail-section"><h3>生活平替</h3><p>功能可靠性、安全等级和证据等级分开评价。涉及婴幼儿安全、宠物用药、危险化学品、电器改装、火源或关键承重的高风险条目不会进入普通列表。</p></div><div class="detail-section"><h3>隐私</h3><p>我的物品和收藏只保存在当前浏览器，不上传服务器。清除浏览器网站数据后无法恢复，建议定期导出。</p></div>`;
}
function openDetail(title,html){$('#detailDialogTitle').textContent=title;$('#detailDialogBody').innerHTML=html;$('#detailDialog').showModal()}

function exportData(type){
  let content,name,mime='application/json';
  if(type==='json'){
    content=JSON.stringify({site:state.site,models:state.models,market:state.market,macModels:state.macModels,macMarket:state.macMarket,alternatives:state.alternatives,categories:state.categories,my:{owned:state.owned,favorites:[...state.favorites]}},null,2);name=`value-lab-${today()}.json`;
  }else{
    const rows=type==='market'?[['产品类型','产品','配置','平台','方向','最低','最高','中位','可信度','日期'],...['iphone','macbook'].flatMap(p=>productData(p).market.map(r=>{const m=getModel(p,r.modelId);return [p,m?.name||r.modelId,p==='iphone'?(r.storage||''):`${m?.memory||''}/${m?.storage||''}`,r.channel,r.side,r.low,r.high,rowMid(r),confidenceText(r.confidence),r.date]}))]:[['原需求','平替方案','分类','类型','可靠性','风险','证据','节省下限','节省上限','限制','安全条件'],...state.alternatives.map(a=>[a.original,a.alternative,state.categories.find(c=>c.id===a.category)?.name||a.category,a.type,a.reliability,riskText(a.risk),a.evidence,a.savingMin,a.savingMax,a.limits,a.safety])];
    content='\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');name=type==='market'?`value-lab-market-${today()}.csv`:`value-lab-alternatives-${today()}.csv`;mime='text/csv;charset=utf-8';
  }
  const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#exportMenu').hidden=true;toast('导出完成');
}

loadData().then(init).catch(err=>{
  console.error(err);document.body.innerHTML=`<main><section class="block"><h1>数据读取失败</h1><p class="muted">请刷新页面重试。</p><button class="primary-button" onclick="location.reload()">重新加载</button></section></main>`;
});
