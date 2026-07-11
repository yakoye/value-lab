const state={models:[],market:[],strategies:[],sources:[],audit:{},selectedModel:null,dataDate:''};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const UI_KEY='ivl.ui.v3', THEME_KEY='ivl.theme';
const defaults={view:'analysis',modelId:'iphone-15-pro-max',detailModelId:'iphone-15-pro-max',storage:'256GB',holdYears:1,deprRate:14,fees:250,repair:0,marketSearch:'',marketKind:'',confidence:'',modelSearch:'',year:'',tier:'',aiOnly:false};
let ui={...defaults,...readJson(UI_KEY)};
let toastTimer=0;

const yuan=n=>new Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY',maximumFractionDigits:0}).format(Math.round(Number(n)||0));
const mid=r=>(Number(r.low)+Number(r.high))/2;
const pct=n=>`${(Number(n||0)*100).toFixed(1)}%`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const confidenceLabel={high:'核验',medium:'样本',low:'参考'};
const confidenceTitle={high:'官方页面或明确价格',medium:'公开报道或单次案例',low:'综合公开行情形成的参考区间'};

function readJson(key){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(_){return {}}}
function saveUi(){try{localStorage.setItem(UI_KEY,JSON.stringify(ui))}catch(_){}}
function clamp(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback}
function safeUrl(value){try{const url=new URL(value,location.href);return ['http:','https:'].includes(url.protocol)?url.href:'#'}catch(_){return '#'}}
function sourceMap(){return Object.fromEntries(state.sources.map(x=>[x.id,x]))}
function publicNote(value){return String(value??'').replaceAll('公开挂牌与市场折旧模型形成的参考区间','综合公开挂牌与历史折旧形成的参考区间').replaceAll('平台检测价差演示','平台检测前后价差说明').replaceAll('模型估算','参考区间')}

async function load(){
  const files=['models','market','strategies','sources','audit'];
  const data=await Promise.all(files.map(f=>fetch(`data/${f}.json`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('DATA_LOAD');return r.json()})));
  files.forEach((f,i)=>state[f]=data[i]);
  if(!Array.isArray(state.models)||!Array.isArray(state.market)||!state.models.length)throw new Error('DATA_INVALID');
  state.dataDate=state.market.map(x=>x.date).filter(Boolean).sort().at(-1)||state.sources.map(x=>x.accessed).filter(Boolean).sort().at(-1)||'';
  init();
}

function init(){
  setupTheme();
  setupTabs();
  setupMenu();
  setupFilters();
  setupDialog();
  setupExports();
  $('#headerMeta').textContent=state.dataDate?`更新 ${state.dataDate}`:'换机成本';
  $('#dataCount').textContent=`${state.models.length} 款机型 · ${state.market.length} 条价格 · 更新 ${state.dataDate||'—'}`;
  $('#footerMeta').textContent=`数据更新 ${state.dataDate||'—'} · 价格仅供比较，成交前请复核`;
  renderAll();
}

function setupTheme(){
  const current=document.documentElement.dataset.theme||'light';
  updateThemeButton(current);
  $('#themeToggle').onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
  window.addEventListener('storage',e=>{if(e.key===THEME_KEY&&e.newValue)applyTheme(e.newValue,false)});
}
function applyTheme(theme,persist=true){
  const next=theme==='dark'?'dark':'light';
  document.documentElement.dataset.theme=next;
  $('meta[name="theme-color"]')?.setAttribute('content',next==='dark'?'#111513':'#f5f6f5');
  updateThemeButton(next);
  if(persist){try{localStorage.setItem(THEME_KEY,next)}catch(_){}}
}
function updateThemeButton(theme){
  const btn=$('#themeToggle'); if(!btn)return;
  btn.innerHTML=theme==='dark'?'<span aria-hidden="true">☀</span>':'<span aria-hidden="true">◐</span>';
  btn.setAttribute('aria-label',theme==='dark'?'切换浅色主题':'切换深色主题');
  btn.title=btn.getAttribute('aria-label');
}

function setupTabs(){
  const valid=$$('.tab').map(x=>x.dataset.view);
  const hash=location.hash.replace('#','');
  if(valid.includes(hash))ui.view=hash;
  $$('.tab').forEach((btn,index)=>{
    btn.id=`tab-${btn.dataset.view}`;
    btn.tabIndex=index===0?0:-1;
    btn.onclick=()=>activateView(btn.dataset.view);
    btn.onkeydown=e=>{
      let target=-1;
      if(e.key==='ArrowRight')target=(index+1)%valid.length;
      if(e.key==='ArrowLeft')target=(index-1+valid.length)%valid.length;
      if(e.key==='Home')target=0;
      if(e.key==='End')target=valid.length-1;
      if(target>=0){e.preventDefault();const next=$$('.tab')[target];activateView(next.dataset.view);next.focus()}
    };
  });
  activateView(valid.includes(ui.view)?ui.view:'analysis',false);
  window.addEventListener('hashchange',()=>{const view=location.hash.replace('#','');if(valid.includes(view))activateView(view,false)});
}
function activateView(view,updateHash=true){
  ui.view=view;saveUi();
  $$('.tab').forEach(btn=>{const active=btn.dataset.view===view;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));btn.tabIndex=active?0:-1});
  $$('.view').forEach(panel=>{const active=panel.id===`view-${view}`;panel.classList.toggle('active',active);panel.hidden=!active});
  if(updateHash&&location.hash!==`#${view}`)history.replaceState(null,'',`#${view}`);
}

function setupMenu(){
  const toggle=$('#exportToggle'),menu=$('#exportMenu');
  const close=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false')};
  toggle.onclick=e=>{e.stopPropagation();menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)menu.querySelector('button')?.focus()};
  document.addEventListener('click',e=>{if(!e.target.closest('.menu-wrap'))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();if($('#modelDialog')?.open)$('#modelDialog').close()}});
  menu.addEventListener('keydown',e=>{const items=[...menu.querySelectorAll('button')],i=items.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();items[(i+1)%items.length].focus()}if(e.key==='ArrowUp'){e.preventDefault();items[(i-1+items.length)%items.length].focus()}});
}

function marketModels(){return state.models.filter(m=>state.market.some(r=>r.modelId===m.id)).sort((a,b)=>b.year-a.year||b.launchPrice-a.launchPrice)}
function setupFilters(){
  const ms=$('#modelSelect');
  ms.innerHTML=marketModels().map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');
  if(![...ms.options].some(x=>x.value===ui.modelId))ui.modelId=[...ms.options].some(x=>x.value===defaults.modelId)?defaults.modelId:ms.options[0]?.value;
  ms.value=ui.modelId;
  populateStorage(ui.storage);
  $('#holdYears').value=String(clamp(ui.holdYears,0,4,1));
  $('#deprRate').value=String(clamp(ui.deprRate,0,60,14));
  $('#fees').value=String(clamp(ui.fees,0,100000,250));
  $('#repair').value=String(clamp(ui.repair,0,100000,0));
  ms.onchange=()=>{ui.modelId=ms.value;populateStorage();saveUi();renderAnalysis()};
  $('#storageSelect').onchange=()=>{ui.storage=$('#storageSelect').value;saveUi();renderAnalysis()};
  ['holdYears','deprRate','fees','repair'].forEach(id=>{$('#'+id).oninput=()=>{ui[id]=Number($('#'+id).value);saveUi();renderAnalysis()}});
  $('#resetAnalysis').onclick=()=>{Object.assign(ui,{modelId:defaults.modelId,storage:defaults.storage,holdYears:1,deprRate:14,fees:250,repair:0});ms.value=[...ms.options].some(x=>x.value===ui.modelId)?ui.modelId:ms.options[0]?.value;populateStorage(ui.storage);$('#holdYears').value='1';$('#deprRate').value='14';$('#fees').value='250';$('#repair').value='0';saveUi();renderAnalysis();showToast('已恢复默认参数')};

  $('#marketSearch').value=ui.marketSearch||'';$('#marketKind').value=ui.marketKind||'';$('#confidenceFilter').value=ui.confidence||'';
  $('#marketSearch').oninput=()=>{ui.marketSearch=$('#marketSearch').value;saveUi();renderMarket()};
  $('#marketKind').onchange=()=>{ui.marketKind=$('#marketKind').value;saveUi();renderMarket()};
  $('#confidenceFilter').onchange=()=>{ui.confidence=$('#confidenceFilter').value;saveUi();renderMarket()};

  const years=[...new Set(state.models.map(m=>m.year))].sort((a,b)=>b-a);$('#yearFilter').innerHTML='<option value="">全部</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join('');
  const tiers=[...new Set(state.models.map(m=>m.tier))];$('#tierFilter').innerHTML='<option value="">全部</option>'+tiers.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  $('#modelSearch').value=ui.modelSearch||'';$('#yearFilter').value=ui.year||'';$('#tierFilter').value=ui.tier||'';$('#aiOnly').checked=Boolean(ui.aiOnly);
  $('#modelSearch').oninput=()=>{ui.modelSearch=$('#modelSearch').value;saveUi();renderModels()};
  $('#yearFilter').onchange=()=>{ui.year=$('#yearFilter').value;saveUi();renderModels()};
  $('#tierFilter').onchange=()=>{ui.tier=$('#tierFilter').value;saveUi();renderModels()};
  $('#aiOnly').onchange=()=>{ui.aiOnly=$('#aiOnly').checked;saveUi();renderModels()};
}
function populateStorage(preferred){
  const id=$('#modelSelect').value;
  const stor=[...new Set(state.market.filter(r=>r.modelId===id).map(r=>r.storage))];
  $('#storageSelect').innerHTML=stor.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
  const target=preferred||ui.storage;
  $('#storageSelect').value=stor.includes(target)?target:(stor.includes('256GB')?'256GB':stor[0]||'');
  ui.storage=$('#storageSelect').value;
}
function currentRows(){return state.market.filter(r=>r.modelId===$('#modelSelect').value&&r.storage===$('#storageSelect').value)}
function buyRows(rows){return rows.filter(r=>r.side==='buy')}
function sellRows(rows){return rows.filter(r=>r.side==='sell')}

function riskScore(b,s){
  const conf={high:0,medium:14,low:30};
  let score=(conf[b.confidence]??30)+(conf[s.confidence]??30);
  if(b.kind==='used_personal')score+=12;
  if(s.kind==='personal_sale')score+=14;
  if(['recycle_case','channel_recycle'].includes(s.kind))score+=8;
  return Math.min(100,score);
}
function riskInfo(score){if(score<=24)return {text:'低',cls:'risk-low'};if(score<=52)return {text:'中',cls:'risk-mid'};return {text:'高',cls:'risk-high'}}
function routeCombinations(rows,years,depr,fees,repair){
  const out=[];
  buyRows(rows).forEach(b=>sellRows(rows).forEach(s=>{
    const buy=mid(b),sellNow=mid(s),exit=sellNow*Math.pow(1-depr,years),spread=buy-sellNow,total=buy-exit+fees+repair,annual=years?total/years:total,risk=riskScore(b,s);
    const anomaly=sellNow>buy*1.05||total<-50;
    out.push({b,s,buy,sellNow,exit,spread,spreadPct:buy?spread/buy:0,total,annual,risk,anomaly,rank:(anomaly?100000:0)+annual+risk*6});
  }));
  return out.sort((a,b)=>a.rank-b.rank);
}
function renderAnalysis(){
  const rows=currentRows(),calcRows=rows.filter(r=>r.analysisEligible!==false),years=clamp($('#holdYears').value,0,4,1),depr=clamp($('#deprRate').value,0,60,14)/100,fees=clamp($('#fees').value,0,100000,250),repair=clamp($('#repair').value,0,100000,0);
  const routes=routeCombinations(calcRows,years,depr,fees,repair),best=routes.find(r=>!r.anomaly&&r.annual>=0)||routes[0];
  const model=state.models.find(m=>m.id===$('#modelSelect').value);
  const buys=buyRows(calcRows),sells=sellRows(calcRows),minBuy=buys.length?Math.min(...buys.map(mid)):0,maxSell=sells.length?Math.max(...sells.map(mid)):0;
  const spreadRoute=routes.filter(r=>!r.anomaly&&r.spread>=0).sort((a,b)=>a.spread-b.spread)[0];
  const risk=best?riskInfo(best.risk):{text:'—',cls:''};
  const values=[['样本最低买入',minBuy?yuan(minBuy):'—','不同渠道'],['样本最高退出',maxSell?yuan(maxSell):'—','检测条件不同'],['较优即时价差',spreadRoute?yuan(spreadRoute.spread):'—',spreadRoute?pct(spreadRoute.spreadPct):'无可比路径'],[years?'推荐年均成本':'推荐即时损失',best?yuan(best.annual):'—',years?`${years} 年持有`:'立即转卖'],['路径风险',risk.text,best?confidenceTitle[best.b.confidence]:'—',risk.cls]];
  $('#kpis').innerHTML=values.map(v=>`<div class="kpi"><small>${esc(v[0])}</small><strong class="${v[3]||''}">${esc(v[1])}</strong><em>${esc(v[2])}</em></div>`).join('');
  renderRoutes(routes,years);renderSelectedMarket(rows);renderBrief(model,best,years,fees,repair);
}
function renderRoutes(routes,years){
  if(!routes.length){$('#routeTable').innerHTML=emptyHtml('暂无可比较路径','该容量缺少买入价或退出价。');return}
  $('#routeTable').innerHTML=`<table><thead><tr><th>#</th><th>买入渠道</th><th class="num">买入中位</th><th>退出渠道</th><th class="num">当前退出</th><th class="num">即时价差</th><th class="num">${years?years+' 年后退出':'退出金额'}</th><th class="num">${years?'年均成本':'即时损失'}</th><th>风险</th><th>数据</th></tr></thead><tbody>${routes.slice(0,16).map((r,i)=>{const risk=riskInfo(r.risk);return `<tr><td>${i+1}</td><td>${esc(r.b.channel)}<br><span class="tag buy">${esc(kindLabel(r.b.kind))}</span></td><td class="num"><b>${yuan(r.buy)}</b><br><span class="muted">${yuan(r.b.low)}–${yuan(r.b.high)}</span></td><td>${esc(r.s.channel)}<br><span class="tag sell">${esc(kindLabel(r.s.kind))}</span></td><td class="num">${yuan(r.sellNow)}</td><td class="num ${r.spreadPct>.15?'negative':''}">${yuan(r.spread)}<br><span class="muted">${pct(r.spreadPct)}</span></td><td class="num">${yuan(r.exit)}</td><td class="num ${r.annual<0?'negative':''}"><b>${yuan(r.annual)}</b>${r.anomaly?'<br><span class="tag risk-high">需核验</span>':''}</td><td><span class="tag ${risk.cls}">${risk.text}</span></td><td><span class="tag ${r.b.confidence}" title="${confidenceTitle[r.b.confidence]}">${confidenceLabel[r.b.confidence]}</span> <span class="tag ${r.s.confidence}" title="${confidenceTitle[r.s.confidence]}">${confidenceLabel[r.s.confidence]}</span></td></tr>`}).join('')}</tbody></table>`;
}
function kindLabel(k){return ({new_official:'官方新机',new_campaign:'促销新机',used_personal:'个人二手',personal_sale:'个人转卖',used_retail:'平台二手',used_merchant:'商家二手',recycle:'平台回收',recycle_case:'回收案例',trade_in:'官方折抵',used_open_box:'拆封激活',channel_recycle:'渠道回收'})[k]||k}
function renderSelectedMarket(rows){
  if(!rows.length){$('#selectedMarket').innerHTML=emptyHtml('暂无价格记录','可在“市场价格”中查看其他机型。');return}
  const sm=sourceMap(),sorted=[...rows].sort((a,b)=>a.side.localeCompare(b.side)||mid(a)-mid(b));
  $('#selectedMarket').innerHTML=`<table><thead><tr><th>方向</th><th>渠道</th><th>类别</th><th class="num">价格区间</th><th class="num">中位</th><th>机况</th><th>数据</th><th>备注/来源</th></tr></thead><tbody>${sorted.map(r=>{const s=sm[r.sourceId];return `<tr><td><span class="tag ${r.side}">${r.side==='buy'?'买入':'卖出'}</span></td><td>${esc(r.channel)}</td><td>${esc(kindLabel(r.kind))}</td><td class="num">${yuan(r.low)}–${yuan(r.high)}</td><td class="num"><b>${yuan(mid(r))}</b></td><td class="wrap">${esc(r.condition)}</td><td><span class="tag ${r.confidence}" title="${confidenceTitle[r.confidence]}">${confidenceLabel[r.confidence]}</span></td><td class="wrap">${esc(publicNote(r.note))}${s?`<br><a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.publisher)}</a>`:''}</td></tr>`}).join('')}</tbody></table>`;
}
function renderBrief(m,best,years,fees,repair){
  if(!m){$('#modelBrief').innerHTML=emptyHtml('未找到机型','请选择其他机型。');$('#costBars').innerHTML='';return}
  $('#modelDate').textContent=m.release;
  $('#modelBrief').innerHTML=`<div class="brief-title"><div><h3>${esc(m.name)}</h3><span class="muted">${esc(m.baseStorage)} 起步 · ${esc(m.tier)}</span></div><div class="price">${yuan(m.launchPrice)}</div></div><div class="brief-grid">${[['芯片',`${m.chip} · ${m.cpuCores} 核 CPU / ${m.gpuCores} 核 GPU`],['内存',`${m.ramGB}GB`],['屏幕',`${m.display} · ${m.refreshHz}Hz`],['续航',`最长 ${m.videoHours} 小时视频播放`],['相机',m.camera],['接口',`${m.port} · ${m.portSpeed}`]].map(x=>`<div class="brief-item"><small>${esc(x[0])}</small>${esc(x[1])}</div>`).join('')}</div><div class="brief-text"><p><b>更新：</b>${esc(m.keyUpdates)}</p><p class="positive"><b>优点：</b>${esc(m.pros)}</p><p class="negative"><b>缺点：</b>${esc(m.cons)}</p><p><b>判断：</b>${esc(m.verdict)}</p></div>`;
  if(!best){$('#costBars').innerHTML='';return}
  const items=[['买入中位',best.buy,false],['当前退出',best.sellNow,false],[years?`${years}年后退出`:'即时价差',years?best.exit:best.spread,!years],['交易+维修',fees+repair,true],['总持有成本',best.total,true]],max=Math.max(...items.map(x=>Math.abs(x[1])),1);
  $('#costBars').innerHTML=items.map(([n,v,loss])=>`<div class="bar-row"><span>${esc(n)}</span><div class="bar-track"><div class="bar-fill ${loss?'loss':''}" style="width:${Math.max(2,Math.abs(v)/max*100)}%"></div></div><b class="${v<0?'negative':''}">${yuan(v)}</b></div>`).join('');
}

function marketCategory(r){if(r.side==='sell')return 'sell';if(r.kind.startsWith('new'))return 'new';return 'used'}
function renderMarket(){
  const q=$('#marketSearch').value.trim().toLowerCase(),kind=$('#marketKind').value,conf=$('#confidenceFilter').value,sm=sourceMap(),map=Object.fromEntries(state.models.map(m=>[m.id,m]));
  const list=state.market.filter(r=>{const hay=`${map[r.modelId]?.name} ${r.channel} ${r.note} ${r.condition}`.toLowerCase();return (!q||hay.includes(q))&&(!kind||marketCategory(r)===kind)&&(!conf||r.confidence===conf)}).sort((a,b)=>(map[b.modelId]?.year||0)-(map[a.modelId]?.year||0)||a.side.localeCompare(b.side)||mid(a)-mid(b));
  $('#marketCount').textContent=`${list.length} 条`;
  if(!list.length){$('#marketTable').innerHTML=emptyHtml('没有匹配的价格','调整搜索词或筛选条件。');return}
  $('#marketTable').innerHTML=`<table><thead><tr><th>机型</th><th>容量</th><th>方向</th><th>渠道</th><th>类别</th><th class="num">低位</th><th class="num">高位</th><th class="num">中位</th><th>机况</th><th>数据</th><th>日期</th><th>备注/来源</th></tr></thead><tbody>${list.map(r=>{const s=sm[r.sourceId];return `<tr><td><b>${esc(map[r.modelId]?.name||r.modelId)}</b></td><td>${esc(r.storage)}</td><td><span class="tag ${r.side}">${r.side==='buy'?'买入':'卖出'}</span></td><td>${esc(r.channel)}</td><td>${esc(kindLabel(r.kind))}</td><td class="num">${yuan(r.low)}</td><td class="num">${yuan(r.high)}</td><td class="num"><b>${yuan(mid(r))}</b></td><td class="wrap">${esc(r.condition)}</td><td><span class="tag ${r.confidence}" title="${confidenceTitle[r.confidence]}">${confidenceLabel[r.confidence]}</span></td><td>${esc(r.date)}</td><td class="wrap">${esc(publicNote(r.note))}${s?`<br><a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.publisher)}</a>`:''}</td></tr>`}).join('')}</tbody></table>`;
}

function renderModels(){
  const q=$('#modelSearch').value.trim().toLowerCase(),year=$('#yearFilter').value,tier=$('#tierFilter').value,ai=$('#aiOnly').checked;
  const list=state.models.filter(m=>(!q||JSON.stringify(m).toLowerCase().includes(q))&&(!year||String(m.year)===year)&&(!tier||m.tier===tier)&&(!ai||m.appleIntelligence)).sort((a,b)=>b.year-a.year||b.launchPrice-a.launchPrice);
  $('#modelCount').textContent=`${list.length} 款`;
  if(!list.length){state.selectedModel=null;$('#modelsTable').innerHTML=emptyHtml('没有匹配的机型','调整搜索词或筛选条件。');renderModelDetail();return}
  if(!state.selectedModel){state.selectedModel=state.models.find(x=>x.id===ui.detailModelId)||list[0]}
  if(!list.some(x=>x.id===state.selectedModel.id))state.selectedModel=list[0];
  $('#modelsTable').innerHTML=`<table><thead><tr><th>年份</th><th>机型</th><th>定位</th><th class="num">首发价</th><th>芯片</th><th>CPU / GPU</th><th>RAM</th><th>屏幕</th><th>续航</th><th>接口</th><th>相机</th><th>AI</th><th>购买判断</th></tr></thead><tbody>${list.map(m=>`<tr data-id="${esc(m.id)}" class="clickable ${state.selectedModel.id===m.id?'selected':''}" tabindex="0"><td>${m.year}</td><td><b>${esc(m.name)}</b><br><span class="muted">${esc(m.storageOptions)}</span></td><td>${esc(m.tier)}</td><td class="num">${yuan(m.launchPrice)}<br><span class="muted">${esc(m.baseStorage)}</span></td><td>${esc(m.chip)}</td><td>${m.cpuCores} 核 / ${m.gpuCores} 核</td><td>${m.ramGB}GB</td><td>${esc(m.display)}<br><span class="muted">${m.refreshHz}Hz · ${m.weightG}g</span></td><td>${m.videoHours}h</td><td>${esc(m.port)}<br><span class="muted">${esc(m.portSpeed)}</span></td><td class="wrap">${esc(m.camera)} · ${esc(m.telephoto)}</td><td>${m.appleIntelligence?'<span class="tag high">支持</span>':'—'}</td><td class="wrap">${esc(m.verdict)}</td></tr>`).join('')}</tbody></table>`;
  $$('#modelsTable tbody tr').forEach(tr=>{const choose=()=>selectModel(tr.dataset.id,true);tr.onclick=choose;tr.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}}});
  renderModelDetail();
}
function selectModel(id,openMobile=false){state.selectedModel=state.models.find(m=>m.id===id)||state.selectedModel;ui.detailModelId=state.selectedModel?.id||ui.detailModelId;saveUi();renderModelDetail();$$('#modelsTable tbody tr').forEach(tr=>tr.classList.toggle('selected',tr.dataset.id===id));if(openMobile&&matchMedia('(max-width:700px)').matches)openModelDialog()}
function modelDetailHtml(m){
  if(!m)return emptyHtml('未选择机型','从左侧列表选择一款 iPhone。');
  const labels=[['发布日期',m.release],['首发',`${yuan(m.launchPrice)} / ${m.baseStorage}`],['存储',m.storageOptions],['芯片',m.chip],['CPU',`${m.cpuCores} 核（${m.cpuLayout}）`],['GPU',`${m.gpuCores} 核`],['神经网络引擎',m.neuralEngine],['RAM',`${m.ramGB}GB`],['屏幕',`${m.display} / ${m.refreshHz}Hz`],['重量/厚度',`${m.weightG}g / ${m.thicknessMm}mm`],['续航',`${m.videoHours} 小时视频播放`],['接口',`${m.port} / ${m.portSpeed}`],['相机',m.camera],['长焦',m.telephoto],['首发系统',m.iosLaunch],['Apple Intelligence',m.appleIntelligence?'硬件支持；中国大陆上线时间依监管审批':'不支持完整功能']];
  return `<div class="detail"><h3>${esc(m.name)}</h3><div class="price-line"><b>${yuan(m.launchPrice)}</b><span class="tag ${m.appleIntelligence?'high':'low'}">${m.appleIntelligence?'AI 硬件支持':'无完整 AI'}</span></div><div class="spec-list">${labels.map(x=>`<div><small>${esc(x[0])}</small>${esc(x[1])}</div>`).join('')}</div><h4>关键更新</h4><p>${esc(m.keyUpdates)}</p><h4>优点</h4><p class="positive">${esc(m.pros)}</p><h4>缺点</h4><p class="negative">${esc(m.cons)}</p><h4>购买判断</h4><p>${esc(m.verdict)}</p><h4>内存口径</h4><p class="muted">${esc(m.ramBasis)}</p></div>`;
}
function renderModelDetail(){const html=modelDetailHtml(state.selectedModel);$('#modelDetail').innerHTML=html;$('#modelDetailMobile').innerHTML=html;$('#modelDialogTitle').textContent=state.selectedModel?.name||'机型详情'}
function setupDialog(){
  const dialog=$('#modelDialog');$('#closeModelDialog').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close()});
}
function openModelDialog(){const dialog=$('#modelDialog');if(!dialog.open)dialog.showModal()}

function renderStrategies(){
  const reps={'latest-yearly':'iphone-17-pro-max','lastgen-yearly':'iphone-16-pro-max','twoyear-hold2':'iphone-15-pro-max','threeyear-hold3':'iphone-14-pro-max','standard-new-hold3':'iphone-17'};
  const dep=clamp(ui.deprRate,0,60,14)/100;
  const rows=state.strategies.map(s=>{const m=state.models.find(x=>x.id===reps[s.id]);if(!m)return null;const mr=state.market.filter(x=>x.modelId===m.id&&x.storage==='256GB'),buys=buyRows(mr),sells=sellRows(mr);if(!buys.length||!sells.length)return null;let pool=buys;if(['latest-yearly','standard-new-hold3'].includes(s.id)){const preferred=buys.filter(x=>['new_campaign','new_official'].includes(x.kind));if(preferred.length)pool=preferred}else{const used=buys.filter(x=>!x.kind.startsWith('new'));if(used.length)pool=used}const buy=Math.min(...pool.map(mid)),sell=Math.max(...sells.map(mid)),exit=sell*Math.pow(1-dep,s.holdYears),total=buy-exit+s.friction+s.battery,annual=total/s.holdYears;return {...s,m,buy,exit,total,annual}}).filter(Boolean).sort((a,b)=>a.annual-b.annual);
  if(!rows.length){$('#strategyTable').innerHTML=emptyHtml('暂无策略结果','价格样本不足。');return}
  $('#strategyTable').innerHTML=`<table><thead><tr><th>#</th><th>策略</th><th>代表机型</th><th class="num">买入参考</th><th class="num">持有后退出</th><th class="num">交易/电池</th><th class="num">总成本</th><th class="num">年均成本</th><th>体验</th><th>风险</th><th>结论</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${esc(r.name)}</b><br><span class="muted">${esc(r.buyChannel)} → ${esc(r.sellChannel)}</span></td><td>${esc(r.m.name)}</td><td class="num">${yuan(r.buy)}</td><td class="num">${yuan(r.exit)}</td><td class="num">${yuan(r.friction+r.battery)}</td><td class="num">${yuan(r.total)}</td><td class="num"><b>${yuan(r.annual)}</b></td><td>${r.experience}/100</td><td>${esc(r.risk)}</td><td class="wrap">${esc(r.note)}</td></tr>`).join('')}</tbody></table>`;
  $('#strategyNotes').innerHTML=[['平台价差先于折旧','平台二手零售价与回收价之间的差额，可能在购买当天就产生。'],['旧机需要预留维修费','年均折旧虽然较低，但换电池或维修可能改变最终排序。'],['个人交易更接近市场价','价差通常较小，同时需要承担验机、议价、发货和纠纷风险。']].map(x=>`<article class="note-card"><h3>${esc(x[0])}</h3><p>${esc(x[1])}</p></article>`).join('');
}
function renderSources(){
  const typeLabel={official:'官方',secondary:'规格资料',market_report:'市场报道',single_case:'个案'};
  const list=[...state.sources].sort((a,b)=>(a.type==='official'?-1:1)-(b.type==='official'?-1:1));
  $('#sourceCount').textContent=`${list.length} 项`;
  $('#sourcesList').innerHTML=list.map(s=>`<article class="source"><a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a><p>${esc(publicNote(s.note))}</p><div class="source-meta"><span>${esc(s.publisher)}</span><span>${esc(typeLabel[s.type]||s.type)}</span><span>${esc(s.accessed)}</span></div></article>`).join('');
}

function setupExports(){
  $('#exportJson').onclick=()=>{const data={dataDate:state.dataDate,models:state.models,market:state.market,strategies:state.strategies,sources:state.sources,audit:state.audit};download(`iphone-value-lab-${state.dataDate||'data'}.json`,JSON.stringify(data,null,2),'application/json');$('#exportMenu').hidden=true;$('#exportToggle').setAttribute('aria-expanded','false');showToast('JSON 已导出')};
  $('#exportCsv').onclick=()=>{const map=Object.fromEntries(state.models.map(m=>[m.id,m]));const headers=['日期','机型','容量','方向','渠道','类别','低位','高位','中位','机况','数据等级','备注'];const lines=[headers.map(csv).join(',')];state.market.forEach(r=>lines.push([r.date,map[r.modelId]?.name,r.storage,r.side==='buy'?'买入':'卖出',r.channel,kindLabel(r.kind),r.low,r.high,mid(r),r.condition,confidenceLabel[r.confidence],publicNote(r.note)].map(csv).join(',')));download(`iphone-market-${state.dataDate||'data'}.csv`,'\ufeff'+lines.join('\n'),'text/csv;charset=utf-8');$('#exportMenu').hidden=true;$('#exportToggle').setAttribute('aria-expanded','false');showToast('CSV 已导出')};
}
function csv(v){return `"${String(v??'').replaceAll('"','""')}"`}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function showToast(message){const el=$('#toast');clearTimeout(toastTimer);el.textContent=message;el.classList.add('show');toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
function emptyHtml(title,text){return `<div class="empty"><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`}
function renderAll(){renderAnalysis();renderMarket();renderModels();renderStrategies();renderSources()}
function showLoadError(){
  $('#dataCount').textContent='数据读取失败';
  $('#appMain').innerHTML='<section class="error-shell"><h2>暂时无法读取数据</h2><p>请检查网络连接后重试。</p><button id="retryLoad" class="primary-button" type="button">重新加载</button></section>';
  $$('.tab').forEach(btn=>btn.disabled=true);
  $('#retryLoad').onclick=()=>location.reload();
}
load().catch(err=>{console.error(err);showLoadError()});
