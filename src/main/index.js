'use strict';
const bridge = DemoBridge, model = DemoModel;
let loggedIn=false, hidden=false, pending=false, activeTab='stock', previewName='demo';
const loginButton=document.getElementById('native-login');
const loginResult=document.getElementById('native-login-result');
function render() {
  document.body.dataset.state=loggedIn?'logged-in':'logged-out';
  loginButton.hidden=loggedIn; loginButton.disabled=pending;
  document.getElementById('account-session').hidden=!loggedIn;
  document.getElementById('total-amount').textContent=model.amount('total',loggedIn,hidden);
  document.getElementById('account-name').textContent=previewName+' · 模拟账户';
  document.querySelectorAll('[data-amount]').forEach(node=>{node.textContent=model.amount(node.dataset.amount,loggedIn,hidden);});
  document.getElementById('visibility').setAttribute('aria-pressed',String(hidden));
  document.getElementById('visibility').setAttribute('aria-label',hidden?'显示资产金额':'隐藏资产金额');
  document.getElementById('positions').hidden=!loggedIn;
  const list=document.getElementById('position-list'); list.replaceChildren();
  list.setAttribute('aria-labelledby',activeTab+'-tab');
  document.querySelectorAll('[data-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.tab===activeTab)));
  (activeTab==='stock'?model.stocks:model.funds).forEach(item=>{
    const row=document.createElement('button'); row.className='position-row';
    const info=document.createElement('div'), value=document.createElement('div');
    const title=document.createElement('strong'),code=document.createElement('small'),amount=document.createElement('strong'),profit=document.createElement('small');
    title.textContent=item.name; code.textContent=item.code+' · 模拟'; amount.textContent=hidden?'****':model.money(item.value);
    profit.textContent=hidden?'****':'持仓收益 '+model.money(item.profit,true);
    info.append(title,code);value.append(amount,profit);row.append(info,value);
    row.addEventListener('click',()=>openService(activeTab));list.append(row);
  });
}
async function login() {
  if(pending)return false;
  pending=true; render();loginResult.textContent='请在原生页面完成登录…';
  try {
    let result=await bridge.login();
    if(result.status==='preview_required'){
      const accepted=await bridge.modal('浏览器演示账户','此入口仅展示虚构资产。\n在 HybridKit App 中会打开原生登录页面。','进入演示');
      result={status:accepted?'authenticated':'cancelled',username:'demo',mode:'preview'};
    }
    if(result.status!=='authenticated') {loginResult.textContent='已取消登录，可再次打开。';return false;}
    loggedIn=true;previewName=typeof result.username==='string'?result.username:'demo';
    loginResult.textContent='模拟登录成功，用户名：'+previewName;
    return true;
  } catch(error) {
    const messages={busy:'原生页面正在使用，请稍后重试。',timeout:'登录已超时，请重新打开。',cancelled:'登录已中断，请重试。',background:'应用已中断，请重试。',api_denied:'当前资源未开放原生登录接口。'};
    loginResult.textContent=messages[error.code]||'暂时无法登录，请稍后重试。';return false;
  } finally {pending=false;render();}
}
async function openService(service) {
  if(pending)return;
  if(!loggedIn && !(await login()))return;
  pending=true;render();
  try {await bridge.navigate(service);} catch (_) {bridge.toast('暂时无法打开，请重试。');} finally {pending=false;render();}
}
loginButton.addEventListener('click',login);
document.getElementById('logout').addEventListener('click',()=>{loggedIn=false;loginResult.textContent='已退出演示，请重新登录';render();});
document.getElementById('visibility').addEventListener('click',()=>{
  hidden=!hidden;render();bridge.set('hidden',hidden).catch(()=>bridge.toast('显示偏好未保存，本次仍然生效。'));
});
document.querySelectorAll('[data-service]').forEach(button=>button.addEventListener('click',()=>openService(button.dataset.service)));
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{activeTab=button.dataset.tab;render();}));
document.getElementById('asset-help').addEventListener('click',()=>bridge.modal('总资产说明','模拟总资产 = 股票市值 + 基金资产 + 可用资金。\n本页数据固定用于界面演示，不代表真实账户。'));
document.getElementById('support').addEventListener('click',()=>bridge.modal('帮助与客服','这是 HybridKit 持仓 Demo。\nApp 内可使用 demo / Demo123! 测试原生登录。交易入口仅操作本机模拟记录。'));
document.getElementById('about').addEventListener('click',()=>bridge.modal('关于本演示','参考证券持仓首页的布局实现。\n本页与任何证券机构无业务关联，所有数据为虚构数据，不提供投资建议。'));
document.getElementById('back').addEventListener('click',async()=>{
  if(!bridge.native){bridge.toast('当前为浏览器预览首页');return;}
  try{await Hybrid.call('app.close');}catch(_){bridge.toast('请使用顶部关闭按钮');}
});
render();
bridge.get('hidden').then(value=>{hidden=value===true;render();}).catch(()=>{});
if(bridge.native){
  Hybrid.on('demo.ready',()=>{document.getElementById('status').textContent='ready';});
  Hybrid.publish('demo.ready.request').catch(()=>{document.getElementById('status').textContent='演示服务暂不可用';});
}else{document.getElementById('status').textContent='浏览器预览 · 模拟模式';}
