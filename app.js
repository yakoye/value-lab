const state={models:[],market:[],strategies:[],sources:[],selectedModel:null};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const yuan=n=>new Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY',maximumFractionDigits:0}).format(Math.round(Number(n)||0));
const mid=r=>(Number(r.low)+Number(r.high))/2;
const pct=n=>`${(n*100).toFixed(1)}%`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const confidenceLabel={high:'已核验',medium:'公开样本',low:'模型估算'};
const sourceMap=()=>Object.fromEntries(state.sources.map(x=>[x.id,x]));
async function load(){
  const files=['models','market','strategies','sources'];
  const data=await Promise.all(files.map(f=>fetch(`data/${f}.json`).then(r=>{if(!r.ok)throw new Error(f);return r.json()})));
  files.forEach((f,i)=>state[f]=data[i]); init();
}
function init(){
  $('#dataCount').textContent=`${state.models.length} 款机型 · ${state.market.length} 条价格记录 · ${state.sources.length} 个来源`;
  setupTabs(); setupFilters(); setupExports(); renderAll();
}
function setupTabs(){
  $$('.tab').forEach(btn=>btn.onclick=()=>{ $$('.tab').forEach(x=>x.classList.toggle('active',x===btn)); $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${btn.dataset.view}`)); });
}
function marketModels(){return state.models.filter(m=>state.market.some(r=>r.modelId===m.id)).sort((a,b)=>b.year-a.year||b.launchPrice-a.launchPrice)}
function setupFilters(){
  const ms=$('#modelSelect'); ms.innerHTML=marketModels().map(m=>`<option value="${m.id}">${m.name}</option>`).join(''); ms.value='iphone-15-pro-max';
  ms.onchange=()=>{populateStorage();renderAnalysis()}; populateStorage();
  ['holdYears','deprRate','fees','repair','storageSelect'].forEach(id=>$('#'+id).oninput=renderAnalysis);
  $('#marketSearch').oninput=renderMarket; $('#marketKind').onchange=renderMarket; $('#confidenceFilter').onchange=renderMarket;
  const years=[...new Set(state.models.map(m=>m.year))].sort((a,b)=>b-a); $('#yearFilter').innerHTML+=[...years].map(y=>`<option>${y}</option>`).join('');
  const tiers=[...new Set(state.models.map(m=>m.tier))]; $('#tierFilter').innerHTML+=tiers.map(x=>`<option>${x}</option>`).join('');
  ['modelSearch','yearFilter','tierFilter','aiOnly'].forEach(id=>$('#'+id).oninput=renderModels);
}
function populateStorage(){const id=$('#modelSelect').value;const stor=[...new Set(state.market.filter(r=>r.modelId===id).map(r=>r.storage))];$('#storageSelect').innerHTML=stor.map(s=>`<option>${s}</option>`).join('')}
function currentRows(){return state.market.filter(r=>r.modelId===$('#modelSelect').value&&r.storage===$('#storageSelect').value)}
function buyRows(rows){return rows.filter(r=>r.side==='buy')}
function sellRows(rows){return rows.filter(r=>r.side==='sell')}
function confPenalty(c){return c==='high'?0:c==='medium'?80:180}
function routeRisk(b,s){return confPenalty(b.confidence)+confPenalty(s.confidence)+(b.kind.includes('personal')?120:0)+(s.kind==='personal_sale'?160:0)}
function routeCombinations(rows,years,depr,fees,repair){
  const out=[]; buyRows(rows).forEach(b=>sellRows(rows).forEach(s=>{
    const buy=mid(b), sellNow=mid(s), exit=sellNow*Math.pow(1-depr,years), spread=Math.max(0,buy-sellNow), total=Math.max(0,buy-exit)+fees+repair;
    out.push({b,s,buy,sellNow,exit,spread,spreadPct:buy?spread/buy:0,total,annual:years?total/years:total,risk:routeRisk(b,s)});
  })); return out.sort((a,b)=>(a.annual+a.risk)-(b.annual+b.risk));
}
function renderAnalysis(){
  const rows=currentRows(), calcRows=rows.filter(r=>r.analysisEligible!==false), years=+$ ('#holdYears').value, depr=+$ ('#deprRate').value/100, fees=+$ ('#fees').value, repair=+$ ('#repair').value;
  const routes=routeCombinations(calcRows,years,depr,fees,repair), best=routes[0];
  const model=state.models.find(m=>m.id===$('#modelSelect').value); state.selectedModel=model;
  const minBuy=buyRows(calcRows).length?Math.min(...buyRows(calcRows).map(mid)):0, maxSell=sellRows(calcRows).length?Math.max(...sellRows(calcRows).map(mid)):0;
  const immediate=Math.max(0,minBuy-maxSell), immediatePct=minBuy?immediate/minBuy:0;
  const values=[['最低买入中位价',yuan(minBuy),'同日不同渠道'],['最高退出中位价',yuan(maxSell),'检测条件不同'],['最低即时价差',yuan(immediate),pct(immediatePct)],['推荐路径年成本',best?yuan(best.annual):'—',years?`${years} 年持有`:'立即转卖'],['平台摩擦提醒',best?yuan(best.risk):'—','风险代理值，非实际支出']];
  $('#kpis').innerHTML=values.map(v=>`<div class="kpi"><small>${v[0]}</small><strong>${v[1]}</strong><em>${v[2]}</em></div>`).join('');
  renderRoutes(routes,years); renderSelectedMarket(rows); renderBrief(model,best,years,depr,fees,repair);
}
function renderRoutes(routes,years){
  $('#routeTable').innerHTML=`<table><thead><tr><th>#</th><th>买入渠道</th><th class="num">买入中位</th><th>退出渠道</th><th class="num">当前退出</th><th class="num">即时价差</th><th class="num">${years?years+' 年预计退出':'退出金额'}</th><th class="num">${years?'年均成本':'即时损失'}</th><th>数据质量</th></tr></thead><tbody>${routes.slice(0,18).map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.b.channel)}<br><span class="tag buy">${kindLabel(r.b.kind)}</span></td><td class="num"><b>${yuan(r.buy)}</b><br><span class="muted">${yuan(r.b.low)}–${yuan(r.b.high)}</span></td><td>${esc(r.s.channel)}<br><span class="tag sell">${kindLabel(r.s.kind)}</span></td><td class="num">${yuan(r.sellNow)}</td><td class="num ${r.spreadPct>.15?'negative':''}">${yuan(r.spread)}<br><span class="muted">${pct(r.spreadPct)}</span></td><td class="num">${yuan(r.exit)}</td><td class="num"><b>${yuan(r.annual)}</b></td><td><span class="tag ${r.b.confidence}">${confidenceLabel[r.b.confidence]}</span> <span class="tag ${r.s.confidence}">${confidenceLabel[r.s.confidence]}</span></td></tr>`).join('')}</tbody></table>`;
}
function kindLabel(k){return ({new_official:'官方新机',new_campaign:'促销新机',used_personal:'个人二手',personal_sale:'个人转卖',used_retail:'平台二手',used_merchant:'商家二手',recycle:'平台回收',recycle_case:'回收案例',trade_in:'官方折抵',used_open_box:'拆封激活',channel_recycle:'渠道回收'})[k]||k}
function renderSelectedMarket(rows){
  const sm=sourceMap();
  $('#selectedMarket').innerHTML=`<table><thead><tr><th>方向</th><th>渠道</th><th>类别</th><th class="num">价格区间</th><th class="num">中位</th><th>机况口径</th><th>可信度</th><th>依据/备注</th></tr></thead><tbody>${rows.sort((a,b)=>a.side.localeCompare(b.side)||mid(a)-mid(b)).map(r=>`<tr><td><span class="tag ${r.side}">${r.side==='buy'?'买入':'卖出'}</span></td><td>${esc(r.channel)}</td><td>${kindLabel(r.kind)}</td><td class="num">${yuan(r.low)}–${yuan(r.high)}</td><td class="num"><b>${yuan(mid(r))}</b></td><td class="wrap">${esc(r.condition)}</td><td><span class="tag ${r.confidence}">${confidenceLabel[r.confidence]}</span></td><td class="wrap">${esc(r.note)}${sm[r.sourceId]?`<br><a href="${sm[r.sourceId].url}" target="_blank" rel="noopener">${esc(sm[r.sourceId].publisher)}</a>`:''}</td></tr>`).join('')}</tbody></table>`;
}
function renderBrief(m,best,years,depr,fees,repair){
  $('#modelDate').textContent=m.release;
  $('#modelBrief').innerHTML=`<div class="brief-title"><div><h3>${esc(m.name)}</h3><span class="muted">${m.baseStorage} 起步 · ${m.tier}</span></div><div class="price">${yuan(m.launchPrice)}</div></div><div class="brief-grid">${[['芯片',`${m.chip} · ${m.cpuCores}核 CPU / ${m.gpuCores}核 GPU`],['内存',`${m.ramGB}GB · ${m.ramBasis}`],['屏幕',`${m.display} · ${m.refreshHz}Hz`],['续航',`最长 ${m.videoHours} 小时视频播放`],['相机',m.camera],['接口',`${m.port} · ${m.portSpeed}`]].map(x=>`<div class="brief-item"><small>${x[0]}</small>${esc(x[1])}</div>`).join('')}</div><div class="brief-text"><p><b>更新：</b>${esc(m.keyUpdates)}</p><p class="positive"><b>优点：</b>${esc(m.pros)}</p><p class="negative"><b>缺点：</b>${esc(m.cons)}</p><p><b>判断：</b>${esc(m.verdict)}</p></div>`;
  if(!best){$('#costBars').innerHTML='';return} const max=Math.max(best.buy,best.sellNow,best.exit,best.total,1); const items=[['买入中位',best.buy,false],['当前退出',best.sellNow,false],[years?`${years}年后退出`:'即时价差',years?best.exit:best.spread,!years],['交易+维修',fees+repair,true],['总持有成本',best.total,true]];
  $('#costBars').innerHTML=items.map(([n,v,loss])=>`<div class="bar-row"><span>${n}</span><div class="bar-track"><div class="bar-fill ${loss?'loss':''}" style="width:${Math.max(2,v/max*100)}%"></div></div><b>${yuan(v)}</b></div>`).join('');
}
function marketCategory(r){if(r.side==='sell')return 'sell';if(r.kind.startsWith('new'))return 'new';return 'used'}
function renderMarket(){
  const q=$('#marketSearch').value.trim().toLowerCase(), kind=$('#marketKind').value, conf=$('#confidenceFilter').value, sm=sourceMap();
  const map=Object.fromEntries(state.models.map(m=>[m.id,m]));
  const list=state.market.filter(r=>{const hay=`${map[r.modelId]?.name} ${r.channel} ${r.note} ${r.condition}`.toLowerCase();return (!q||hay.includes(q))&&(!kind||marketCategory(r)===kind)&&(!conf||r.confidence===conf)}).sort((a,b)=>(map[b.modelId]?.year||0)-(map[a.modelId]?.year||0)||a.side.localeCompare(b.side));
  $('#marketCount').textContent=`${list.length} 条`;
  $('#marketTable').innerHTML=`<table><thead><tr><th>机型</th><th>容量</th><th>方向</th><th>渠道</th><th>类别</th><th class="num">低位</th><th class="num">高位</th><th class="num">中位</th><th>机况</th><th>可信度</th><th>日期</th><th>备注/来源</th></tr></thead><tbody>${list.map(r=>`<tr><td><b>${esc(map[r.modelId]?.name||r.modelId)}</b></td><td>${r.storage}</td><td><span class="tag ${r.side}">${r.side==='buy'?'买入':'卖出'}</span></td><td>${esc(r.channel)}</td><td>${kindLabel(r.kind)}</td><td class="num">${yuan(r.low)}</td><td class="num">${yuan(r.high)}</td><td class="num"><b>${yuan(mid(r))}</b></td><td class="wrap">${esc(r.condition)}</td><td><span class="tag ${r.confidence}">${confidenceLabel[r.confidence]}</span></td><td>${r.date}</td><td class="wrap">${esc(r.note)}${sm[r.sourceId]?`<br><a href="${sm[r.sourceId].url}" target="_blank" rel="noopener">${esc(sm[r.sourceId].publisher)}</a>`:''}</td></tr>`).join('')}</tbody></table>`;
}
function renderModels(){
  const q=$('#modelSearch').value.trim().toLowerCase(), year=$('#yearFilter').value, tier=$('#tierFilter').value, ai=$('#aiOnly').checked;
  const list=state.models.filter(m=>(!q||JSON.stringify(m).toLowerCase().includes(q))&&(!year||String(m.year)===year)&&(!tier||m.tier===tier)&&(!ai||m.appleIntelligence)).sort((a,b)=>b.year-a.year||b.launchPrice-a.launchPrice);
  $('#modelCount').textContent=`${list.length} 款`;
  $('#modelsTable').innerHTML=`<table><thead><tr><th>年份</th><th>机型</th><th>定位</th><th class="num">首发价</th><th>芯片</th><th>CPU / GPU</th><th>RAM</th><th>屏幕</th><th>续航</th><th>接口</th><th>相机</th><th>AI</th><th>购买判断</th></tr></thead><tbody>${list.map((m,i)=>`<tr data-id="${m.id}" class="${state.selectedModel?.id===m.id?'selected':''}"><td>${m.year}</td><td><b>${esc(m.name)}</b><br><span class="muted">${m.storageOptions}</span></td><td>${m.tier}</td><td class="num">${yuan(m.launchPrice)}<br><span class="muted">${m.baseStorage}</span></td><td>${m.chip}</td><td>${m.cpuCores} 核 / ${m.gpuCores} 核</td><td>${m.ramGB}GB</td><td>${m.display}<br><span class="muted">${m.refreshHz}Hz · ${m.weightG}g</span></td><td>${m.videoHours}h</td><td>${m.port}<br><span class="muted">${m.portSpeed}</span></td><td class="wrap">${esc(m.camera)} · ${esc(m.telephoto)}</td><td>${m.appleIntelligence?'<span class="tag high">支持</span>':'—'}</td><td class="wrap">${esc(m.verdict)}</td></tr>`).join('')}</tbody></table>`;
  $$('#modelsTable tbody tr').forEach(tr=>tr.onclick=()=>{state.selectedModel=state.models.find(m=>m.id===tr.dataset.id);renderModelDetail();renderModels()});
  if(!state.selectedModel||!list.some(x=>x.id===state.selectedModel.id))state.selectedModel=list[0]; renderModelDetail();
}
function renderModelDetail(){const m=state.selectedModel;if(!m){$('#modelDetail').innerHTML='';return} const labels=[['发布日期',m.release],['首发',`${yuan(m.launchPrice)} / ${m.baseStorage}`],['存储',m.storageOptions],['芯片',m.chip],['CPU',`${m.cpuCores} 核（${m.cpuLayout}）`],['GPU',`${m.gpuCores} 核`],['神经网络引擎',m.neuralEngine],['RAM',`${m.ramGB}GB`],['屏幕',`${m.display} / ${m.refreshHz}Hz`],['重量/厚度',`${m.weightG}g / ${m.thicknessMm}mm`],['续航',`${m.videoHours} 小时视频播放`],['接口',`${m.port} / ${m.portSpeed}`],['相机',m.camera],['长焦',m.telephoto],['首发系统',m.iosLaunch],['Apple Intelligence',m.appleIntelligence?'支持（硬件支持；截至 2026-06 中国大陆尚未上线）':'不支持完整功能']];$('#modelDetail').innerHTML=`<div class="detail"><h3>${esc(m.name)}</h3><div class="price-line"><b>${yuan(m.launchPrice)}</b><span class="tag ${m.appleIntelligence?'high':'low'}">${m.appleIntelligence?'AI 支持':'无完整 AI'}</span></div><div class="spec-list">${labels.map(x=>`<div><small>${x[0]}</small>${esc(x[1])}</div>`).join('')}</div><h4>关键更新</h4><p>${esc(m.keyUpdates)}</p><h4>优点</h4><p class="positive">${esc(m.pros)}</p><h4>缺点</h4><p class="negative">${esc(m.cons)}</p><h4>购买判断</h4><p>${esc(m.verdict)}</p><h4>RAM 说明</h4><p class="muted">${esc(m.ramBasis)}</p></div>`}
function renderStrategies(){
  // Representative generations: latest PM, 1-year-old PM, 2-year-old PM, 3-year-old PM, latest standard.
  const reps={"latest-yearly":"iphone-17-pro-max","lastgen-yearly":"iphone-16-pro-max","twoyear-hold2":"iphone-15-pro-max","threeyear-hold3":"iphone-14-pro-max","standard-new-hold3":"iphone-17"};
  const rows=state.strategies.map(s=>{const id=reps[s.id], m=state.models.find(x=>x.id===id), mr=state.market.filter(x=>x.modelId===id), buys=buyRows(mr), sells=sellRows(mr);let buy;
    if(s.id==='latest-yearly'||s.id==='standard-new-hold3'){const preferred=buys.filter(x=>x.kind==='new_campaign'||x.kind==='new_official');buy=preferred.length?Math.min(...preferred.map(mid)):Math.min(...buys.map(mid));} else buy=Math.min(...buys.filter(x=>!x.kind.startsWith('new')).map(mid));
    const sell=Math.max(...sells.map(mid)), dep=0.14, exit=sell*Math.pow(1-dep,s.holdYears), total=Math.max(0,buy-exit)+s.friction+s.battery, annual=total/s.holdYears;return {...s,m,buy,sell,exit,total,annual};
  }).sort((a,b)=>a.annual-b.annual);
  $('#strategyTable').innerHTML=`<table><thead><tr><th>#</th><th>策略</th><th>代表机型</th><th class="num">买入参考</th><th class="num">持有后退出</th><th class="num">交易/电池</th><th class="num">总成本</th><th class="num">年均成本</th><th>体验</th><th>风险</th><th>结论</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${esc(r.name)}</b><br><span class="muted">${esc(r.buyChannel)} → ${esc(r.sellChannel)}</span></td><td>${esc(r.m.name)}</td><td class="num">${yuan(r.buy)}</td><td class="num">${yuan(r.exit)}</td><td class="num">${yuan(r.friction+r.battery)}</td><td class="num">${yuan(r.total)}</td><td class="num"><b>${yuan(r.annual)}</b></td><td>${r.experience}/100</td><td>${r.risk}</td><td class="wrap">${esc(r.note)}</td></tr>`).join('')}</tbody></table>`;
  $('#strategyNotes').innerHTML=[['最低现金成本不等于最稳妥','旧机年均折旧低，但一次换屏、主板或电池就可能抹平省下的钱。'],['平台差价是一笔固定门票','从平台二手零售端买、再卖给平台回收端，刚到手就可能损失 10%–20%，这不是一年折旧。'],['个人交易降低价差但增加风险','闲鱼买卖往往更接近市场中间价，但需要承担验机、议价、发货和纠纷成本。']].map(x=>`<article class="note-card"><h3>${x[0]}</h3><p>${x[1]}</p></article>`).join('');
}
function renderSources(){const typeLabel={official:'官方',secondary:'二级资料',market_report:'市场报道',single_case:'单一案例'};$('#sourceCount').textContent=`${state.sources.length} 项`;$('#sourcesList').innerHTML=state.sources.map(s=>`<article class="source"><a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a><p>${esc(s.note)}</p><div class="source-meta"><span>${esc(s.publisher)}</span><span>${typeLabel[s.type]||s.type}</span><span>访问 ${s.accessed}</span></div></article>`).join('')}
function setupExports(){
  $('#exportJson').onclick=()=>download('iphone-value-lab-2026-07-10.json',JSON.stringify(state,null,2),'application/json');
  $('#exportCsv').onclick=()=>{const map=Object.fromEntries(state.models.map(m=>[m.id,m]));const cols=['date','model','storage','side','channel','kind','low','high','mid','condition','confidence','method','note'];const lines=[cols.join(',')];state.market.forEach(r=>{const vals=[r.date,map[r.modelId]?.name,r.storage,r.side,r.channel,r.kind,r.low,r.high,mid(r),r.condition,r.confidence,r.method,r.note].map(csv);lines.push(vals.join(','))});download('iphone-market-2026-07-10.csv','\ufeff'+lines.join('\n'),'text/csv;charset=utf-8')};
}
function csv(v){return `"${String(v??'').replaceAll('"','""')}"`}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function renderAll(){renderAnalysis();renderMarket();renderModels();renderStrategies();renderSources()}
load().catch(err=>{document.body.innerHTML=`<pre style="padding:20px">数据加载失败：${esc(err.message)}\n请使用本地 HTTP 服务器或 GitHub Pages 打开，不要直接双击 index.html。</pre>`});