'use strict';
Hybrid.on('page.ready',()=>Hybrid.publish('demo.ready',{mode:'demo'}));
Hybrid.on('demo.ready.request',()=>Hybrid.publish('demo.ready',{mode:'demo'}));
Hybrid.on('app.reopen',()=>Hybrid.publish('demo.ready',{mode:'demo'}));
