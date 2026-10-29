(function (global) {
  'use strict';
  const services = Object.freeze({buy:'买入',sell:'卖出',cancel:'撤单',records:'交易记录',transfer:'转入转出',ipo:'一键打新',repo:'通用回购',cash:'资金明细',more:'更多服务',stock:'股票持仓',fund:'基金持仓'});
  const snapshot = Object.freeze({total:128650.38,stockValue:86420,stockToday:526.8,stockProfit:3420,fundValue:32230.38,fundToday:-18.62,fundProfit:1230.38,cash:10000});
  const stocks = Object.freeze([{name:'示例科技',code:'DEMO01',value:45200,profit:2200,price:45.2},{name:'示例制造',code:'DEMO02',value:41220,profit:1220,price:20.61}]);
  const funds = Object.freeze([{name:'示例稳健基金',code:'FUND01',value:20300.18,profit:800.18},{name:'示例成长基金',code:'FUND02',value:11930.2,profit:430.2}]);
  function money(value, signed = false) { return (signed && value > 0 ? '+' : '') + value.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2}); }
  function amount(key, loggedIn, hidden) { return !loggedIn ? '--' : hidden ? '****' : money(snapshot[key], /Today|Profit/.test(key)); }
  function validateOrder(side, code, quantity) {
    const product = stocks.find(item => item.code === code);
    const count = Number(quantity);
    if (!['buy','sell'].includes(side) || !product) throw new Error('请选择有效的模拟标的');
    if (!Number.isInteger(count) || count < 100 || count > 10000 || count % 100 !== 0) throw new Error('数量需为 100 的整数倍，最多 10,000 股');
    return {side,code,name:product.name,quantity:count,price:product.price,amount:Math.round(product.price*count*100)/100};
  }
  global.DemoModel = Object.freeze({services,snapshot,stocks,funds,money,amount,validateOrder});
})(globalThis);
