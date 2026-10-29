const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function environment(Hybrid){
  const elements=new Map();
  const element=()=>({hidden:true,textContent:'',addEventListener(){},focus(){},classList:{add(){},remove(){}}});
  const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},addEventListener(){},body:element(),activeElement:element()};
  const stored=new Map();
  const context=vm.createContext({Hybrid,document,location:{href:''},localStorage:{getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value)},setTimeout,clearTimeout});
  for(const name of ['model.js','adapter.js'])vm.runInContext(readFileSync(path.join(__dirname,'../src/main',name),'utf8'),context);
  return {model:context.DemoModel,bridge:context.DemoBridge,context};
}
test('logged-out and masked views never render asset values',()=>{
  const {model}=environment();
  assert.equal(model.amount('total',false,false),'--');
  assert.equal(model.amount('total',true,true),'****');
  assert.equal(model.amount('total',true,false),'128,650.38');
  assert.equal(model.snapshot.total,model.snapshot.stockValue+model.snapshot.fundValue+model.snapshot.cash);
});
test('orders reject arbitrary products, fractional lots and non-finite quantities',()=>{
  const {model}=environment();
  for(const quantity of ['',0,-100,1,150,100.5,Infinity,'NaN',10100])assert.throws(()=>model.validateOrder('buy','DEMO01',quantity));
  assert.throws(()=>model.validateOrder('transfer','DEMO01',100));
  assert.throws(()=>model.validateOrder('buy','REAL',100));
  assert.equal(model.validateOrder('buy','DEMO01',100).amount,4520);
  assert.equal(model.validateOrder('sell','DEMO02',10000).amount,206100);
});
test('native login uses empty parameters and preserves cancellation',async()=>{
  const calls=[];const {bridge}=environment({call:async(api,args)=>{calls.push([api,args]);return {status:'cancelled'};}});
  assert.equal((await bridge.login()).status,'cancelled');
  assert.equal(calls[0][0],'host.presentLogin');assert.deepEqual(Object.keys(calls[0][1]),[]);
});
test('native login failure never becomes browser preview success',async()=>{
  const {bridge}=environment({call:async()=>{throw new Error('api_denied');}});
  await assert.rejects(bridge.login(),/api_denied/);
});
test('navigation saves selection before opening the declared subpackage',async()=>{
  const calls=[];const {bridge}=environment({call:async(api,args)=>{calls.push([api,args]);return null;}});
  await bridge.navigate('buy');
  assert.equal(calls[0][0],'storage.set');assert.equal(calls[0][1].value,'buy');
  assert.equal(calls[1][0],'page.navigate');assert.equal(calls[1][1].page,'details');
  await assert.rejects(bridge.navigate('__proto__'));assert.equal(calls.length,2);
});
test('failed storage does not navigate with an older selection',async()=>{
  const calls=[];const {bridge}=environment({call:async api=>{calls.push(api);throw new Error('quota');}});
  await assert.rejects(bridge.navigate('records'),/quota/);assert.deepEqual(calls,['storage.set']);
});
test('browser preview requires explicit confirmation and stores no authentication',async()=>{
  const {bridge,context}=environment();
  assert.equal((await bridge.login()).status,'preview_required');
  await bridge.set('orders',[{id:'test'}]);assert.equal((await bridge.get('orders'))[0].id,'test');
  await bridge.navigate('repo');assert.equal(context.location.href,'../details/details.html?service=repo');
});
