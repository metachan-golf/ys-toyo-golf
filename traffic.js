(()=>{'use strict';
 const panel=document.getElementById('aquaTraffic');if(!panel)return;
 const output=document.getElementById('aquaWind'),refresh=document.getElementById('aquaRefresh');
 const endpoint='https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({latitude:'35.46379',longitude:'139.8749',timezone:'Asia/Tokyo',wind_speed_unit:'ms',current:'wind_speed_10m,wind_direction_10m,wind_gusts_10m'});
 let cached=null,busy=false;
 const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
 const fmt=n=>valid(n)?n.toFixed(1)+' m/s':'—';
 const direction=n=>valid(n)&&n<=360?['北','北東','東','南東','南','南西','西','北西'][Math.round(n/45)%8]:'—';
 function draw(c){const speed=c.wind_speed_10m,gust=c.wind_gusts_10m;output.replaceChildren();const line=document.createElement('strong');line.textContent='風向 '+direction(c.wind_direction_10m)+' ／ 風速 '+fmt(speed)+' ／ 突風 '+fmt(gust);output.append(line);const note=document.createElement('p');note.className='muted';note.textContent='気象モデル時刻：'+c.time.replace('T',' ')+'（日本時間）';output.append(note);if((valid(speed)&&speed>=10)||(valid(gust)&&gust>=15)){const warning=document.createElement('p');warning.className='aqua-warning';warning.textContent='強風注意：出発前に公式の交通規制情報を確認してください。';output.append(warning);}}
 async function load(force=false){if(busy)return;if(!force&&cached&&Date.now()-cached.at<15*60*1000){draw(cached.current);return;}busy=true;refresh.disabled=true;output.textContent='海ほたる周辺の気象データを取得中…';const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);try{const res=await fetch(endpoint,{signal:controller.signal,cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);const data=await res.json();const c=data.current;if(!c||typeof c.time!=='string'||!valid(c.wind_speed_10m))throw Error('missing wind');cached={at:Date.now(),current:c};draw(c);}catch(e){output.textContent='気象情報を取得できませんでした。公式交通情報をご確認ください。';}finally{clearTimeout(timer);busy=false;refresh.disabled=false;}}
 window.golfTraffic={load};refresh.addEventListener('click',()=>load(true));
})();
