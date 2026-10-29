(function (global) {
  'use strict';
  const native = typeof global.Hybrid?.call === 'function';
  if(native) document.body.classList.add('host-native');
  const memory = new Map();
  async function get(key) {
    if (native) return Hybrid.call('storage.get', {key:'holdings.'+key});
    try { return JSON.parse(localStorage.getItem('hybrid-demo.'+key) || 'null'); } catch (_) { return memory.get(key) ?? null; }
  }
  async function set(key, value) {
    if (native) return Hybrid.call('storage.set', {key:'holdings.'+key,value});
    memory.set(key,value);
    try { localStorage.setItem('hybrid-demo.'+key, JSON.stringify(value)); } catch (_) { /* Preview remains usable without persistent storage. */ }
  }
  async function navigate(service) {
    if (!Object.prototype.hasOwnProperty.call(DemoModel.services, service)) throw new Error('未知的演示服务');
    if (native) {
      await set('selection',service);
      return Hybrid.call('page.navigate', {page:'details'});
    }
    location.href = '../details/details.html?service='+encodeURIComponent(service);
  }
  async function login() {
    if (!native) return {status:'preview_required'};
    // Never fall back to a fake successful login when the native Bridge rejects a call.
    return Hybrid.call('host.presentLogin', {});
  }
  async function back() {
    if (native) return Hybrid.call('page.back');
    location.href = '../main/index.html';
  }
  let toastTimer;
  function toast(message) {
    const element = document.getElementById('toast');
    element.textContent=message; element.hidden=false;
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>{element.hidden=true;},2800);
  }
  let dismiss, priorFocus;
  function closeModal() {
    const element=document.getElementById('modal');
    if (element.hidden) return;
    element.hidden=true; document.body.classList.remove('modal-open');
    if (priorFocus?.isConnected) priorFocus.focus();
    const callback=dismiss; dismiss=null; callback?.(false);
  }
  function modal(title, message, confirm='知道了') {
    closeModal();
    const element=document.getElementById('modal');
    priorFocus=document.activeElement;
    document.getElementById('modal-title').textContent=title;
    document.getElementById('modal-description').textContent=message;
    const button=document.getElementById('modal-confirm'); button.textContent=confirm;
    element.hidden=false; document.body.classList.add('modal-open');
    document.getElementById('modal-close').focus();
    return new Promise(resolve=>{
      dismiss=resolve;
      button.onclick=()=>{ dismiss=null; closeModal(); resolve(true); };
    });
  }
  const backdrop=document.getElementById('modal');
  document.getElementById('modal-close').addEventListener('click',closeModal);
  backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeModal();});
  document.addEventListener('keydown',event=>{
    if(backdrop.hidden)return;
    if(event.key==='Escape'){event.preventDefault();closeModal();}
    if(event.key==='Tab'){
      const controls=[document.getElementById('modal-close'),document.getElementById('modal-confirm')];
      const next=event.shiftKey?controls[0]:controls[1];
      if(document.activeElement===next){event.preventDefault();(event.shiftKey?controls[1]:controls[0]).focus();}
    }
  });
  global.DemoBridge=Object.freeze({native,get,set,navigate,login,back,toast,modal});
})(globalThis);
