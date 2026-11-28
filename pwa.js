(() => {
 const area=document.getElementById('installArea'), btn=document.getElementById('installApp'), help=document.getElementById('installHelp');
 if(!area || !btn || !help) return;
 let promptEvent=null;
 const installed=()=>window.matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
 const mobile=()=>navigator.userAgentData?.mobile===true || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
 const refresh=()=>{area.hidden=!mobile() || installed();};
 refresh();
 window.addEventListener('beforeinstallprompt',e=>{if(!mobile()) return; e.preventDefault();promptEvent=e;refresh();});
 window.addEventListener('appinstalled',()=>{promptEvent=null;area.hidden=true;});
 btn.addEventListener('click',async()=>{
  if(promptEvent){const p=promptEvent;promptEvent=null;try{await p.prompt();await p.userChoice;}catch(e){help.hidden=false;help.textContent='ブラウザのメニューからホーム画面に追加してください。';}return;}
  help.hidden=false;help.textContent=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)?'Safariで開き、共有 → ホーム画面に追加 を選択してください。':'Chrome等のブラウザで開き、メニュー → アプリをインストール または ホーム画面に追加 を選択してください。LINE内ブラウザの場合は外部ブラウザで開いてください。';
 });
 if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', {updateViaCache:'none'}).catch(e=>console.warn('PWA registration failed',e));
})();
