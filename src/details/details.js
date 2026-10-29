'use strict';
const bridge=DemoBridge,model=DemoModel,content=document.getElementById('content');
let current='more', renderRevision=0, operationPending=false;
function node(tag,text,className){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;}
function button(text,callback,className='text-button'){const item=node('button',text,className);item.type='button';item.addEventListener('click',callback);return item;}
function info(entries){const list=node('dl',undefined,'info-list');for(const [label,value] of entries){const row=node('div');row.append(node('dt',label),node('dd',value));list.append(row);}return list;}
async function orders(){const value=await bridge.get('orders');return Array.isArray(value)?value.filter(item=>item && typeof item.id==='string' && ['buy','sell'].includes(item.side) && model.stocks.some(stock=>stock.code===item.code) && Number.isFinite(item.amount) && Number.isInteger(item.quantity) && ['pending','cancelled'].includes(item.status)).slice(-100):[];}
async function show(service){
  const revision=++renderRevision;
  current=Object.prototype.hasOwnProperty.call(model.services,service)?service:'more';
  document.getElementById('page-title').textContent=model.services[current];
  if(bridge.native) Hybrid.call('page.title',{title:model.services[current]}).catch(()=>{});
  content.replaceChildren(node('h2',model.services[current]),node('p','HybridKit 模拟服务'));
  try{
    if(current==='buy'||current==='sell')renderTrade(current);
    else if(current==='records'||current==='cancel'){const records=await orders();if(revision===renderRevision)renderRecords(records,current==='cancel');}
    else if(current==='stock'||current==='fund')renderPositions(current);
    else if(current==='repo')renderRepo();
    else if(current==='transfer')renderTransfer();
    else if(current==='cash')renderCash();
    else if(current==='ipo')renderIPO();
    else renderMore();
  }catch(_){if(revision===renderRevision)content.append(node('p','读取失败，请重试。','validation-error'),button('重新加载',()=>show(current)));}
  if(revision===renderRevision){document.body.dataset.ready='true';document.getElementById('detail').textContent='subpackage ready';}
}
function renderTrade(side){
  const form=node('form');form.noValidate=true;
  const product=node('select');product.id='order-product';product.setAttribute('aria-label','模拟标的');
  model.stocks.forEach(stock=>{const option=node('option',stock.name+' · '+stock.code);option.value=stock.code;product.append(option);});
  const quantity=node('input');quantity.id='order-quantity';quantity.type='number';quantity.min='100';quantity.max='10000';quantity.step='100';quantity.value='100';quantity.inputMode='numeric';quantity.setAttribute('aria-label','委托数量');
  const total=node('p'),error=node('p','','validation-error');error.setAttribute('role','alert');
  for(const [caption,input] of [['模拟标的',product],['委托数量（100 股起，100 股整数倍）',quantity]]){const label=node('label',undefined,'field');label.append(node('span',caption),input);form.append(label);}
  function update(){try{const order=model.validateOrder(side,product.value,quantity.value);total.textContent='模拟参考价 '+model.money(order.price)+' 元 · 金额 '+model.money(order.amount)+' 元';error.textContent='';}catch(e){total.textContent='请输入有效数量';}}
  product.addEventListener('change',update);quantity.addEventListener('input',update);update();
  const submit=node('button','预览模拟委托','primary');submit.type='submit';submit.id='preview-order';
  form.append(total,node('p','仅模拟委托登记，不撮合、不冻结资金。','notice'),error,submit);content.append(form);
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(operationPending)return;error.textContent='';
    let order;try{order=model.validateOrder(side,product.value,quantity.value);}catch(e){error.textContent=e.message;return;}
    operationPending=true;submit.disabled=true;
    try{
      if(!(await bridge.modal('确认模拟'+model.services[side],order.name+'（'+order.code+'）\n数量：'+order.quantity+' 股\n模拟金额：'+model.money(order.amount)+' 元\n只保存演示记录，不发送交易指令。','保存模拟委托')))return;
      const previous=await orders();
      const record={...order,id:'DEMO-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),status:'pending',createdAt:new Date().toISOString()};
      await bridge.set('orders',[...previous,record].slice(-100));
      bridge.toast('模拟委托已保存');await show('records');
    }catch(_){error.textContent='记录未保存，请重试。';}finally{operationPending=false;submit.disabled=false;}
  });
}
function renderRecords(records,cancellable){
  const visible=cancellable?records.filter(item=>item.status==='pending'):records;
  if(!visible.length){const empty=node('div',undefined,'empty-state');empty.append(node('strong','≡'),node('p',cancellable?'暂无可撤销的模拟委托':'暂无模拟交易记录'),button('去体验模拟买入',()=>show('buy')));content.append(empty);return;}
  visible.slice().reverse().forEach(record=>{
    const row=node('div',undefined,'record-row'),heading=node('div',undefined,'record-heading');
    heading.append(node('span',model.services[record.side]+' · '+model.stocks.find(stock=>stock.code===record.code).name),node('span',record.status==='cancelled'?'已撤销':'模拟待成交',record.status==='cancelled'?'subtle':'up'));
    row.append(heading,node('p',record.quantity+' 股 · '+model.money(record.amount)+' 元'),node('small',record.id));
    if(cancellable){const cancel=button('撤销模拟委托',async()=>{
      if(operationPending)return;operationPending=true;cancel.disabled=true;
      try{
        if(!(await bridge.modal('撤销模拟委托','撤销这条本机演示记录？','确认撤销')))return;
        const updated=(await orders()).map(item=>item.id===record.id?{...item,status:'cancelled'}:item);
        await bridge.set('orders',updated);await show('cancel');bridge.toast('模拟委托已撤销');
      }catch(_){bridge.toast('撤销失败，请重试。');}finally{operationPending=false;cancel.disabled=false;}
    });row.append(cancel);}content.append(row);
  });
  if(!cancellable)content.append(button('查看可撤销委托',()=>show('cancel')));
}
function renderPositions(type){
  (type==='stock'?model.stocks:model.funds).forEach(item=>{
    const row=node('div',undefined,'record-row');row.append(node('h3',item.name),info([['代码',item.code],['持有金额',model.money(item.value)+' 元'],['持仓收益',model.money(item.profit,true)+' 元']]));content.append(row);
  });
}
function renderRepo(){
  content.append(node('p','按期限查看模拟回购产品。利率为虚构演示值，不是报价。','notice'));
  const chips=node('div',undefined,'chips'),rate=node('div'),rows=node('div');
  function select(days){chips.querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.days===String(days))));rate.replaceChildren(node('div','模拟年化参考值','detail-label'),node('div',({1:'1.50',7:'1.65',14:'1.80'})[days]+'%','detail-number up'));rows.replaceChildren(info([['期限',days+' 天'],['演示起点','1,000 元'],['回款方式','到期自动回款（示例）']]));}
  [1,7,14].forEach(days=>{const item=button(days+' 天',()=>select(days),'');item.dataset.days=days;chips.append(item);});
  content.append(chips,rate,rows,button('了解回购规则',()=>bridge.modal('通用回购演示','本页用于演示期限切换与产品展示。\n不办理回购，不提供收益承诺。'),'primary'));select(1);
}
function renderTransfer(){
  content.append(info([['模拟可用资金',model.money(model.snapshot.cash)+' 元'],['关联账户','演示银行卡 · 0000']]));
  const choices=node('div',undefined,'chips');
  for(const title of ['转入','转出'])choices.append(button('模拟'+title,()=>bridge.modal(title+'演示说明','此处展示银行与证券账户之间的'+title+'入口。\nDemo 不连接银行，不变更资金。','知道了'),''));
  content.append(choices,button('查看模拟资金明细',()=>show('cash')));
}
function renderCash(){
  content.append(info([['模拟余额',model.money(model.snapshot.cash)+' 元'],['可用资金',model.money(model.snapshot.cash)+' 元'],['冻结资金','0.00 元']]));
  [['演示初始入金','+12,000.00'],['演示资金划转','−2,000.00']].forEach(([title,amount])=>{const row=node('div',undefined,'record-row');const heading=node('div',undefined,'record-heading');heading.append(node('span',title),node('span',amount));row.append(heading,node('small','固定示例记录'));content.append(row);});
}
function renderIPO(){
  content.append(node('p','当前为演示批次，无真实发行标的。','notice'),info([['示例新股 A','DEMO-IPO-A'],['示例新股 B','DEMO-IPO-B'],['模拟可申购数量','2 只']]));
  content.append(button('体验一键打新',()=>bridge.modal('模拟申购结果','已完成两只虚构标的的交互演示。\n没有向交易系统提交申购。'),'primary'));
}
function renderMore(){
  for(const service of ['stock','fund','records','cash','repo'])content.append(button(model.services[service]+'　›',()=>show(service),'list-action'));
  content.append(button('关于演示环境　›',()=>bridge.modal('演示环境','所有数据均为虚构。模拟委托按宿主用户保存在本机，最多保留 100 条。'),'list-action'));
}
async function goBack(){try{await bridge.back();}catch(_){bridge.toast('请使用顶部返回按钮');}}
document.getElementById('back').addEventListener('click',goBack);document.getElementById('home').addEventListener('click',goBack);
(async()=>{try{const selected=bridge.native?await bridge.get('selection'):new URLSearchParams(location.search).get('service');await show(selected);}catch(_){await show('more');}})();
