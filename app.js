'use strict';
const $=id=>document.getElementById(id), db=supabase.createClient(GOLF_CONFIG.url,GOLF_CONFIG.key);
let me=null,members=[],rounds=[],answers=[],busy=false;
const statuses=['仮予約','参加募集中','開催確定','開催終了','中止'];
function msg(s,error=false){$('message').textContent=s;$('message').className=error?'error':'';}
function check(r){if(r.error)throw r.error;return r.data;}
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function button(text,fn,cls='secondary'){const b=node('button',text,cls);b.type='button';b.onclick=()=>run(fn);return b;}
async function run(fn){if(busy)return;busy=true;try{await fn();}catch(e){msg(e.message||String(e),true);}finally{busy=false;}}
function today(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date());}
function dateLabel(d){return new Date(d+'T12:00:00+09:00').toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',month:'long',day:'numeric',weekday:'short'});}
function time(t){return t?t.slice(0,5):'';}
function answerFor(r,m){return answers.find(a=>a.round_id===r.id&&a.member_id===m.id);}
function count(r){return answers.filter(a=>a.round_id===r.id&&a.answer==='○').reduce((n,a)=>n+1+a.guests,0);}
function visibleRounds(){return rounds.filter(r=>$('month').value==='all'||r.play_date.startsWith($('month').value));}
async function load(){const [m,r,a]=await Promise.all([db.from('members').select('*'),db.from('rounds').select('*').order('play_date').order('time1'),db.from('attendance').select('*')]);members=check(m);rounds=check(r);answers=check(a);const old=$('month').value;const months=[...new Set(rounds.map(r=>r.play_date.slice(0,7)))];$('month').replaceChildren(new Option('すべて','all'),...months.map(m=>new Option(m.replace('-','年')+'月',m)));$('month').value=months.includes(old)||old==='all'?old:(months.find(m=>m>=today().slice(0,7))||months[0]||'all');render();}
async function session(){const s=check(await db.auth.getSession()).session;$('club').hidden=true;$('login').hidden=false;me=null;members=[];rounds=[];answers=[];$('rounds').replaceChildren();if(!s)return;const m=check(await db.from('members').select('*').eq('id',s.user.id).maybeSingle());if(!m){await db.auth.signOut();throw Error('会員登録がありません。管理者へご連絡ください。');}me=m;$('who').textContent=m.name+' さん'+(m.admin?'（管理者）':'');$('admin').hidden=!m.admin;$('login').hidden=true;$('club').hidden=false;await load();}
function render(){const root=$('rounds');root.replaceChildren();for(const r of visibleRounds()){const card=node('article');const head=node('div',undefined,'toolbar');head.append(node('h2',dateLabel(r.play_date)),node('span',r.status,'status'));card.append(head,node('p',r.course+' '+time(r.time1)+(r.time2?' ／ '+time(r.time2):'')+'　'+(r.time2?2:1)+'組'),node('p','参加予定 '+count(r)+' / '+r.capacity+'名'+(count(r)>r.capacity?'（定員超過・要調整）':'')));const p=node('progress');p.max=r.capacity;p.value=count(r);card.append(p);if(r.deadline)card.append(node('p','回答期限：'+r.deadline));if(r.notes)card.append(node('p',r.notes));for(const m of [...members].sort((a,b)=>['谷中さん','森山','青木さん','遠藤さん'].indexOf(a.name)-['谷中さん','森山','青木さん','遠藤さん'].indexOf(b.name))){const a=answerFor(r,m), row=node('div',undefined,'member');row.append(node('span',m.name),node('strong',(a?.answer||'－')+(a?.guests?' ＋ゲスト'+a.guests+'名':'')+(a?.comment?'　'+a.comment:''),a?.answer==='○'?'yes':a?.answer==='△'?'maybe':'no'));card.append(row);}const mine=answerFor(r,me);if(!['中止','開催終了'].includes(r.status)&&(!r.deadline||today()<=r.deadline)&&r.play_date>=today()){const controls=node('div',undefined,'answer');const guest=node('input');guest.type='number';guest.min='0';guest.max='7';guest.value=mine?.guests||0;const comment=node('input');comment.maxLength=200;comment.value=mine?.comment||'';const gl=node('label','ゲスト人数（本人以外）');gl.append(guest);const cl=node('label','コメント（任意）');cl.append(comment);card.append(gl,cl);for(const [v,label] of [['○','参加'],['△','調整中'],['×','不参加']]){controls.append(button(v+' '+label,async()=>{const n=Number(guest.value);if(!Number.isInteger(n)||n<0||n>7)throw Error('ゲスト人数は0〜7名で入力してください。');check(await db.from('attendance').upsert({round_id:r.id,member_id:me.id,answer:v,guests:v==='○'?n:0,comment:comment.value,updated_at:new Date().toISOString()}));await load();msg('参加回答を保存しました。');},'secondary'+(mine?.answer===v?' selected':'')));}card.append(controls);if(mine)card.append(button('回答を取り消す',async()=>{check(await db.from('attendance').delete().eq('round_id',r.id).eq('member_id',me.id));await load();msg('回答を取り消しました。');}));}if(me.admin)card.append(button('予約を編集',async()=>{edit(r);$('admin').scrollIntoView({behavior:'smooth'});}));root.append(card);}if(!root.children.length)root.append(node('p','表示する予約はありません。'));}
function edit(r){for(const [k,v] of Object.entries({rid:r.id,date:r.play_date,course:r.course,time1:time(r.time1),time2:time(r.time2),capacity:r.capacity,status:r.status,deadline:r.deadline||'',notes:r.notes||''}))$(k).value=v;}
function clearForm(){$('roundForm').reset();$('rid').value='';}
function validate(r){if(!/^[A-Za-z0-9_-]{1,80}$/.test(r.id)||!/^\d{4}-\d{2}-\d{2}$/.test(r.play_date)||!['OUT','IN'].includes(r.course)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time1)||r.time2&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time2)||!Number.isInteger(r.capacity)||r.capacity<1||r.capacity>(r.time2?8:4)||!statuses.includes(r.status)||r.deadline&&(!/^\d{4}-\d{2}-\d{2}$/.test(r.deadline)||r.deadline>r.play_date))throw Error('予約形式を確認してください：'+r.id);return r;}
function parseCSV(s){s=s.replace(/^\uFEFF/,'');let rows=[],row=[],cell='',q=false;for(let i=0;i<s.length;i++){let c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){cell+='"';i++;}else if(c==='"')q=false;else cell+=c;}else if(c==='"'&&cell==='')q=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}else cell+=c;}if(q)throw Error('CSVの引用符が閉じていません。');row.push(cell);if(row.some(x=>x!==''))rows.push(row);return rows;}
const headers=['予約ID','プレー日','コース','1組目','2組目','定員','状態','回答期限','備考'];
function csvRows(text){const [h,...rs]=parseCSV(text);if(!h||h.length<7||h.length>9||h.some((v,i)=>v.trim()!==headers[i])||!rs.length)throw Error('CSVの見出しまたはデータが不正です。');const seen=new Set();return rs.map(v=>{if(v.length!==h.length)throw Error('CSVの列数が不正です。');const [id,date,course,t1,t2,cap,status,deadline,notes]=v;const normalize=d=>d.trim().replaceAll('/','-').replace(/^(\d{4})-(\d{1,2})-(\d{1,2})$/,(_,y,m,d)=>y+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0'));const r={id:id.trim(),play_date:normalize(date),course:course.trim(),time1:t1.trim().slice(0,5).padStart(5,'0'),time2:t2.trim()?t2.trim().slice(0,5).padStart(5,'0'):null,capacity:Number(cap),status:status.trim()};if(h.length>=8)r.deadline=deadline.trim()?normalize(deadline):null;if(h.length>=9)r.notes=notes;if(seen.has(r.id))throw Error('予約IDが重複しています：'+r.id);seen.add(r.id);return validate(r);});}
function download(name,text){const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/csv;charset=utf-8'}));const a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function quote(v){let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
$('loginForm').onsubmit=e=>{e.preventDefault();run(async()=>{check(await db.auth.signInWithPassword({email:$('loginMember').value+'@ys-toyo.example',password:$('password').value}));$('password').value='';await session();msg('ログインしました。');});};
$('logout').onclick=()=>run(async()=>{check(await db.auth.signOut());await session();msg('ログアウトしました。');});$('reload').onclick=()=>run(load);$('month').onchange=render;$('clearForm').onclick=clearForm;
$('roundForm').onsubmit=e=>{e.preventDefault();run(async()=>{if(!me?.admin)throw Error('管理者専用です。');const r=validate({id:$('rid').value||crypto.randomUUID(),play_date:$('date').value,course:$('course').value,time1:$('time1').value,time2:$('time2').value||null,capacity:Number($('capacity').value),status:$('status').value,deadline:$('deadline').value||null,notes:$('notes').value});check(await db.from('rounds').upsert(r));clearForm();await load();msg('予約を保存しました。');});};
// CSV import: show progress and results beside the file picker.
const csvNotice=node('p');csvNotice.id='csvNotice';csvNotice.setAttribute('role','status');csvNotice.setAttribute('aria-live','polite');$('importCsv').parentNode.append(csvNotice);
function csvMsg(text,error=false){csvNotice.textContent=text;csvNotice.className=error?'error':'';}
$('importCsv').onclick=async()=>{
 if(busy){csvMsg('別の処理が実行中です。完了後に再実行してください。',true);return;}
 busy=true;$('importCsv').disabled=true;
 let saved=false;
 try{
  if(!me?.admin)throw Error('管理者専用です。');
  const f=$('csvFile').files[0];if(!f)throw Error('CSVファイルを選択してください。');
  csvMsg('CSVを確認中…');
  const rs=csvRows(await f.text());
  const current=check(await db.from('rounds').select('*'));
  const existing=rs.filter(r=>current.some(x=>x.id===r.id)).length;
  if(!confirm(`${rs.length}件を取り込みます（既存ID更新 ${existing}件、新規 ${rs.length-existing}件）。実行しますか？`)){csvMsg('取り込みを中止しました。');return;}
  csvMsg('データベースに保存中…');
  const merged=rs.map(r=>{const old=current.find(x=>x.id===r.id);return {deadline:old?.deadline??null,notes:old?.notes??'',...r};});
  check(await db.from('rounds').upsert(merged,{onConflict:'id'}));saved=true;
  await load();$('month').value='all';render();
  csvMsg(`取り込み完了：${rs.length}件（既存更新 ${existing}件、新規 ${rs.length-existing}件）。全日程を表示しています。`);
  msg('CSV取り込みが完了しました。');$('csvFile').value='';
 }catch(e){const detail=[e.message,e.details,e.hint,e.code].filter(Boolean).join(' / ')||String(e);csvMsg((saved?'保存済みですが画面更新に失敗しました：':'取り込みエラー：')+detail,true);}
 finally{busy=false;$('importCsv').disabled=false;}
};
$('exportCsv').onclick=()=>run(async()=>{await load();download('reservations.csv',[headers,...rounds.map(r=>[r.id,r.play_date,r.course,time(r.time1),time(r.time2),r.capacity,r.status,r.deadline,r.notes])].map(r=>r.map(quote).join(',')).join('\r\n'));});
$('share').onclick=()=>run(async()=>{const text='【トーヨーCC 参加予定】\n'+visibleRounds().map(r=>dateLabel(r.play_date)+' '+r.course+' '+time(r.time1)+(r.time2?'／'+time(r.time2):'')+' '+r.status+'\n'+members.map(m=>{const a=answerFor(r,m);return m.name+'：'+(a?.answer||'－')+(a?.guests?' ＋ゲスト'+a.guests:'');}).join('\n')).join('\n\n');await navigator.clipboard.writeText(text);msg('LINE共有用テキストをコピーしました。');});
run(session);
