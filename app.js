'use strict';
const $=id=>document.getElementById(id), db=supabase.createClient(GOLF_CONFIG.url,GOLF_CONFIG.key);
let me=null,members=[],rounds=[],answers=[],busy=false,lastLoaded=null;
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
function upcoming(){return rounds.filter(r=>r.play_date>=today());}
function bookerName(r){return members.find(m=>m.id===r.booker_id)?.name||'未設定';}
function cancelDate(r){const d=new Date(r.play_date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-3);return d.toISOString().slice(0,10);}
function needsCancelCheck(r){return ['仮予約','参加募集中','中止'].includes(r.status);}
function warningText(r){if(!needsCancelCheck(r))return '';const d=cancelDate(r);return (today()>d?'期限経過：':today()===d?'本日が確認期限：':'キャンセル確認期限：')+d+'（ラウンドしない場合は予約サイトでキャンセル）';}
const overviewPage=location.pathname.endsWith('/overview.html');
const adminPage=location.pathname.endsWith('/admin.html');
const activityPage=location.pathname.endsWith('/activity.html');
$('schedulePage').hidden=overviewPage||adminPage||activityPage;$('overview').hidden=!overviewPage;
$('share').hidden=adminPage;$('answerLegend').hidden=adminPage;
const activeLink=document.querySelector('.page-nav a[href="'+(activityPage?'activity.html':adminPage?'admin.html':overviewPage?'overview.html':'index.html')+'"]');activeLink?.setAttribute('aria-current','page');
function visibleRounds(){return upcoming().filter(r=>$('month').value==='all'||r.play_date.startsWith($('month').value));}
async function load(){const [m,r,a]=await Promise.all([db.from('members').select('*'),db.from('rounds').select('*').order('play_date').order('time1'),db.from('attendance').select('*')]);members=check(m).map(x=>({...x,name:x.name.replace(/さん$/,'')}));rounds=check(r);answers=check(a);lastLoaded=new Date();const booker=$('booker').value;$('booker').replaceChildren(new Option('選択してください',''),...sortedMembers().map(m=>new Option(m.name,m.id)));$('booker').value=booker;const old=$('month').value;const months=[...new Set(upcoming().map(r=>r.play_date.slice(0,7)))];$('month').replaceChildren(new Option('すべて','all'),...months.map(m=>new Option(m.replace('-','年')+'月',m)));$('month').value=months.includes(old)||old==='all'?old:(months.find(m=>m>=today().slice(0,7))||months[0]||'all');const target=new URLSearchParams(location.search).get('round');if(target&&!overviewPage&&upcoming().some(r=>r.id===target)){const r=upcoming().find(r=>r.id===target);$('month').value=r.play_date.slice(0,7);history.replaceState(null,'',location.pathname);render();document.getElementById('round-'+target)?.scrollIntoView();}else render();}
async function session(){const s=check(await db.auth.getSession()).session;$('club').hidden=true;$('login').hidden=false;me=null;clearActivity();$('adminMenu').hidden=true;$('activityMenu').hidden=true;$('admin').hidden=true;$('schedulePage').hidden=overviewPage||adminPage||activityPage;members=[];rounds=[];answers=[];$('rounds').replaceChildren();$('overviewTable').replaceChildren();$('overviewUpdated').textContent='';$('csvNotice').textContent='';$('saveNotice').textContent='';$('deleteNotice').textContent='';lastLoaded=null;if(!s)return;const m=check(await db.from('members').select('*').eq('id',s.user.id).maybeSingle());if(!m){await db.auth.signOut();throw Error('会員登録がありません。管理者へご連絡ください。');}me=m;$('who').textContent=m.name.replace(/さん$/,'')+(m.admin?'（管理者）':'');$('adminMenu').hidden=!m.admin;$('activityMenu').hidden=!m.admin;$('admin').hidden=!m.admin||!adminPage;$('schedulePage').hidden=overviewPage||activityPage||(adminPage&&!m.admin);$('login').hidden=true;$('club').hidden=false;if((adminPage||activityPage)&&!m.admin){msg('管理者専用ページです。',true);return;}if(activityPage){members=check(await db.from('members').select('*')).map(x=>({...x,name:x.name.replace(/さん$/,'')}));await recordActivity();await showActivity();return;}await load();$('booker').value=me.id;await recordActivity();}
function sortedMembers(){const order=['谷中','森山','青木','遠藤'];return [...members].sort((a,b)=>(order.includes(a.name)?order.indexOf(a.name):99)-(order.includes(b.name)?order.indexOf(b.name):99)||a.name.localeCompare(b.name,'ja'));}
function renderOverview(){
 const root=$('overviewTable');root.replaceChildren();
 const people=sortedMembers();const table=node('table',undefined,'overview-table');
 const caption=node('caption','本日以降の参加回答一覧');table.append(caption);
 const head=node('thead'),hr=node('tr');
 for(const label of ['日程','予約者',...people.map(m=>m.name),'参加人数']){const th=node('th',label);th.scope='col';hr.append(th);}head.append(hr);table.append(head);
 const body=node('tbody');
 for(const r of upcoming()){const row=node('tr');if(r.status==='中止')row.className='cancelled';
  const day=node('th');day.scope='row';const link=node('a',r.play_date.slice(0,4)+'年 '+dateLabel(r.play_date),'date-link');link.href='index.html?round='+encodeURIComponent(r.id);day.append(link,node('small',r.course+' '+time(r.time1)+(r.time2?' / '+time(r.time2):'')),node('small',r.status));if(needsCancelCheck(r))day.append(node('small',warningText(r),today()>=cancelDate(r)?'no':'muted'));row.append(day,node('td',bookerName(r)));
  for(const m of people){const a=answerFor(r,m);const v=a?.answer||'－';const td=node('td',v,v==='○'?'yes':v==='△'?'maybe':v==='×'?'no':'unanswered');td.title=v==='○'?'参加可能':v==='△'?'調整中':v==='×'?'不参加':'未回答';if(a?.guests)td.append(node('small','＋'+a.guests+'名'));row.append(td);}
  const n=count(r);row.append(node('td',n+' / '+r.capacity,n>r.capacity?'no':'total'));body.append(row);
 }table.append(body);root.append(table);if(!upcoming().length)root.append(node('p','登録された予約はありません。'));
 $('overviewUpdated').textContent=lastLoaded?'最終取得：'+lastLoaded.toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'';
}
function renderAdmin(){const root=$('rounds');root.replaceChildren();if(!me?.admin)return;for(const r of visibleRounds()){const card=node('article');card.id='round-'+r.id;const head=node('div',undefined,'toolbar');head.append(node('h2',dateLabel(r.play_date)),node('span',r.status,'status'));card.append(head,node('p',r.course+' '+time(r.time1)+(r.time2?' ／ '+time(r.time2):'')+'　定員 '+r.capacity+'名'),node('p','予約者：'+bookerName(r)),node('p','参加予定 '+count(r)+' / '+r.capacity+'名'));if(needsCancelCheck(r))card.append(node('p',warningText(r),'cancel-reminder'));if(r.notes)card.append(node('p',r.notes));const actions=node('div',undefined,'round-admin-actions');actions.append(button('予約を編集',async()=>{edit(r);$('admin').scrollIntoView({behavior:'smooth'});}),button('予約を削除',async()=>{await deleteRound(r);},'danger-button'));card.append(actions);root.append(card);}if(!root.children.length)root.append(node('p','表示する予約はありません。'));}
function render(){if(adminPage){renderAdmin();return;}renderOverview();const root=$('rounds');root.replaceChildren();for(const r of visibleRounds()){const card=node('article');card.id='round-'+r.id;const head=node('div',undefined,'toolbar');head.append(node('h2',dateLabel(r.play_date)),node('span',r.status,'status'));card.append(head,node('p',r.course+' '+time(r.time1)+(r.time2?' ／ '+time(r.time2):'')+'　'+(r.time2?2:1)+'組'),node('p','参加予定 '+count(r)+' / '+r.capacity+'名'+(count(r)>r.capacity?'（定員超過・要調整）':'')));card.append(node('p','予約者：'+bookerName(r)));if(needsCancelCheck(r)){const notice=node('div',warningText(r),'cancel-reminder'+(today()>=cancelDate(r)?' urgent':''));const link=node('a','予約サイトを開く ↗');link.href='https://grain-players.net/toyo/reservation';link.target='_blank';link.rel='noopener noreferrer';notice.append(document.createElement('br'),link);card.append(notice);}const p=node('progress');p.max=r.capacity;p.value=count(r);card.append(p);if(r.deadline)card.append(node('p','回答期限：'+r.deadline));if(r.notes)card.append(node('p',r.notes));for(const m of [...members].sort((a,b)=>['谷中','森山','青木','遠藤'].indexOf(a.name)-['谷中','森山','青木','遠藤'].indexOf(b.name))){const a=answerFor(r,m), row=node('div',undefined,'member');row.append(node('span',m.name),node('strong',(a?.answer||'－')+(a?.guests?' ＋ゲスト'+a.guests+'名':'')+(a?.comment?'　'+a.comment:''),a?.answer==='○'?'yes':a?.answer==='△'?'maybe':a?.answer==='×'?'no':'unanswered'));card.append(row);}const mine=answerFor(r,me);if(!['中止','開催終了'].includes(r.status)&&(!r.deadline||today()<=r.deadline)&&r.play_date>=today()){const controls=node('div',undefined,'answer');const guest=node('input');guest.type='number';guest.min='0';guest.max='7';guest.value=mine?.guests||0;const comment=node('input');comment.maxLength=200;comment.value=mine?.comment||'';const gl=node('label','ゲスト人数（本人以外）');gl.append(guest);const cl=node('label','コメント（任意）');cl.append(comment);card.append(gl,cl);for(const [v,label] of [['○','参加'],['△','調整中'],['×','不参加']]){controls.append(button(v+' '+label,async()=>{const n=Number(guest.value);if(!Number.isInteger(n)||n<0||n>7)throw Error('ゲスト人数は0〜7名で入力してください。');check(await db.from('attendance').upsert({round_id:r.id,member_id:me.id,answer:v,guests:v==='○'?n:0,comment:comment.value,updated_at:new Date().toISOString()}));await load();msg('参加回答を保存しました。');},'secondary'+(mine?.answer===v?' selected':'')));}card.append(controls);if(mine)card.append(button('回答を取り消す',async()=>{check(await db.from('attendance').delete().eq('round_id',r.id).eq('member_id',me.id));await load();msg('回答を取り消しました。');}));}root.append(card);}if(!root.children.length)root.append(node('p','表示する予約はありません。'));}
async function deleteRound(r){
 if(!me?.admin)throw Error('管理者専用です。');
 const label=r.play_date+' '+r.course+' '+time(r.time1)+(r.time2?' / '+time(r.time2):'');
 if(!confirm(label+' の予約を完全に削除しますか？\nこの日程の全員の参加回答・コメントも削除され、元に戻せません。\nゴルフ場側のキャンセルは別途必要です。'))return;
 const notice=$('deleteNotice');notice.textContent='削除処理中…';notice.className='csv-success';
 let deleted=false;
 try{
  const data=check(await db.from('rounds').delete().eq('id',r.id).select('id'));
  if(data.length!==1)throw Error('削除できませんでした。管理者権限または予約の存在を確認してください。');
  deleted=true;
  if($('rid').value===r.id)clearForm();
  rounds=rounds.filter(x=>x.id!==r.id);answers=answers.filter(x=>x.round_id!==r.id);render();
  await load();notice.textContent=label+' の予約を削除しました。';
 }catch(e){notice.className='csv-error';notice.textContent=(deleted?'削除済みですが画面更新に失敗しました：':'削除エラー：')+[e.message,e.details,e.hint,e.code].filter(Boolean).join(' / ');}
 notice.scrollIntoView({block:'nearest'});
}
function edit(r){$('saveNotice').textContent='';for(const [k,v] of Object.entries({rid:r.id,booker:r.booker_id||'',date:r.play_date,course:r.course,time1:time(r.time1),time2:time(r.time2),capacity:r.capacity,status:r.status,deadline:r.deadline||'',notes:r.notes||''}))$(k).value=v;}
function clearForm(){$('roundForm').reset();$('rid').value='';$('booker').value=me?.id||'';}
function validate(r){
 const fail=t=>{throw Error(t+'（予約ID：'+r.id+'）');};
 const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 const validTime=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
 if(!/^[A-Za-z0-9_-]{1,80}$/.test(r.id))fail('予約IDが不正です。');
 if(!validDate(r.play_date))fail('プレー日を正しく指定してください。');
 if(!['OUT','IN'].includes(r.course))fail('コースを指定してください。');
 if(!validTime(r.time1))fail('1組目の時刻を正しく指定してください。');
 if(r.time2&&!validTime(r.time2))fail('2組目の時刻を正しく指定してください。');
 if(!Number.isInteger(r.capacity)||r.capacity<1||r.capacity>(r.time2?8:4))fail('定員は'+(r.time2?'1〜8':'1〜4')+'名で指定してください。');
 if(r.booker_id&&!members.some(m=>m.id===r.booker_id))fail('予約者を確認してください。');
 if(!statuses.includes(r.status))fail('予約状態を確認してください。');
 if(r.deadline&&(!validDate(r.deadline)||r.deadline>r.play_date))fail('回答期限はプレー日以前の日付を指定してください。');
 return r;
}
function parseCSV(s,delimiter=','){s=s.replace(/^\uFEFF/,'');let rows=[],row=[],cell='',q=false;for(let i=0;i<s.length;i++){let c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){cell+='"';i++;}else if(c==='"')q=false;else cell+=c;}else if(c==='"'&&cell==='')q=true;else if(c===delimiter){row.push(cell);cell='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}else cell+=c;}if(q)throw Error('CSVの引用符が閉じていません。');row.push(cell);if(row.some(x=>x!==''))rows.push(row);return rows;}
const headers=['予約ID','プレー日','コース','1組目','2組目','定員','状態','回答期限','備考','予約者'];
async function readCSV(file){
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(bytes[0]===255&&bytes[1]===254)return new TextDecoder('utf-16le',{fatal:true}).decode(bytes);
 if(bytes[0]===254&&bytes[1]===255)return new TextDecoder('utf-16be',{fatal:true}).decode(bytes);
 try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch(e){try{return new TextDecoder('shift_jis',{fatal:true}).decode(bytes);}catch(e){throw Error('文字コードを判定できません。ExcelでCSV UTF-8として保存してください。');}}
}
function csvRows(text){
 const candidates=[',','\t',';'].map(delimiter=>{try{const rows=parseCSV(text,delimiter).filter(row=>row.some(v=>v.trim()!==''));const h=(rows[0]||[]).map(v=>v.trim().normalize('NFKC'));return {rows,score:headers.slice(0,7).filter(k=>h.includes(k)).length};}catch(error){return {error,score:-1};}}).sort((a,b)=>b.score-a.score);
 const best=candidates[0];if(best.error)throw best.error;const rows=best.rows;
 const [raw,...rs]=rows;if(!raw)throw Error('CSVが空です。');
 const h=raw.map(v=>v.replace(/^\uFEFF/,'').trim().normalize('NFKC'));
 const required=headers.slice(0,7);const missing=required.filter(v=>!h.includes(v));
 if(missing.length)throw Error('不足している見出し：'+missing.join('、')+'。読み取った見出し：'+h.join(' / '));
 if(new Set(h.filter(Boolean)).size!==h.filter(Boolean).length)throw Error('見出しが重複しています。');
 if(!rs.length)throw Error('予約データがありません。');
 const seen=new Set();
 const normalize=d=>d.trim().normalize('NFKC').replaceAll('/','-').replace(/^(\d{4})-(\d{1,2})-(\d{1,2})$/,(_,y,m,d)=>y+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0'));
 const normalizeTime=t=>t.trim().normalize('NFKC').replace(/^(\d{1,2}):(\d{2})(?::00)?$/,(_,h,m)=>h.padStart(2,'0')+':'+m);
 return rs.map((v,i)=>{try{
  if(v.length>h.length&&v.slice(h.length).some(x=>x.trim()))throw Error('見出しのない追加列にデータがあります。');
  const get=k=>v[h.indexOf(k)]??'';
  const id=get('予約ID').trim();
  const r={id,play_date:normalize(get('プレー日')),course:get('コース').trim().normalize('NFKC').toUpperCase(),time1:normalizeTime(get('1組目')),time2:normalizeTime(get('2組目'))||null,capacity:Number(get('定員').trim().normalize('NFKC')),status:get('状態').trim()};
  if(h.includes('回答期限'))r.deadline=normalize(get('回答期限'))||null;
  if(h.includes('備考'))r.notes=get('備考');
  if(h.includes('予約者')&&get('予約者').trim()){const name=get('予約者').trim();const m=members.find(m=>m.name.replace(/さん$/,'')===name.replace(/さん$/,''));if(!m)throw Error('予約者が不明です：'+name);r.booker_id=m.id;}
  if(seen.has(id))throw Error('予約IDが重複しています：'+id);seen.add(id);return validate(r);
 }catch(e){throw Error('データ行 '+(i+1)+'：'+e.message);}});
}
function download(name,text){const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/csv;charset=utf-8'}));const a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function quote(v){let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
$('loginForm').onsubmit=e=>{e.preventDefault();run(async()=>{check(await db.auth.signInWithPassword({email:$('loginMember').value+'@ys-toyo.example',password:$('password').value}));$('password').value='';await session();msg('ログインしました。');});};
$('logout').onclick=()=>run(async()=>{check(await db.auth.signOut());await session();msg('ログアウトしました。');});$('reload').onclick=()=>run(load);$('overviewReload').onclick=()=>run(load);$('month').onchange=render;$('clearForm').onclick=()=>{clearForm();$('saveNotice').textContent='';};
function saveMsg(text,error=false){const n=$('saveNotice');n.textContent=text;n.className=error?'csv-error':'csv-success';}
$('roundForm').onsubmit=async e=>{
 e.preventDefault();
 if(busy){saveMsg('別の処理が実行中です。完了後に再実行してください。',true);return;}
 busy=true;$('saveRound').disabled=true;let saved=false;
 try{
  if(!me?.admin)throw Error('管理者専用です。');
  saveMsg('入力内容を確認中…');
  const r=validate({id:$('rid').value||crypto.randomUUID(),booker_id:$('booker').value,play_date:$('date').value,course:$('course').value,time1:$('time1').value,time2:$('time2').value||null,capacity:Number($('capacity').value),status:$('status').value,deadline:$('deadline').value||null,notes:$('notes').value});
  saveMsg('予約を保存中…');
  check(await db.from('rounds').upsert(r));saved=true;
  clearForm();await load();
  $('month').value=r.play_date.slice(0,7);render();
  saveMsg(r.play_date+' の予約を保存しました。参加状況一覧も更新しました。');
 }catch(e){saveMsg((saved?'保存済みですが画面更新に失敗しました：':'予約を保存できませんでした：')+([e.message,e.details,e.hint,e.code].filter(Boolean).join(' / ')||String(e)),true);}
 finally{busy=false;$('saveRound').disabled=false;$('saveNotice').scrollIntoView({block:'nearest'});}
};
// CSV import: show progress and results beside the file picker.
const csvNotice=$('csvNotice');
function csvMsg(text,error=false){csvNotice.textContent=text;csvNotice.className=error?'csv-error':'csv-success';}
$('importCsv').onclick=async()=>{
 if(busy){csvMsg('別の処理が実行中です。完了後に再実行してください。',true);return;}
 busy=true;$('importCsv').disabled=true;
 let saved=false;
 try{
  if(!me?.admin)throw Error('管理者専用です。');
  const f=$('csvFile').files[0];if(!f)throw Error('CSVファイルを選択してください。');
  csvMsg('CSVを確認中…');
  const rs=csvRows(await readCSV(f));
  const current=check(await db.from('rounds').select('*'));
  const existing=rs.filter(r=>current.some(x=>x.id===r.id)).length;
  if(!confirm(`${rs.length}件を取り込みます（既存ID更新 ${existing}件、新規 ${rs.length-existing}件）。実行しますか？`)){csvMsg('取り込みを中止しました。');return;}
  csvMsg('データベースに保存中…');
  const merged=rs.map(r=>{const old=current.find(x=>x.id===r.id);if(!old&&!r.booker_id)throw Error('新規予約の予約者を指定してください：'+r.id);return {deadline:old?.deadline??null,notes:old?.notes??'',booker_id:old?.booker_id??null,...r};});
  check(await db.from('rounds').upsert(merged,{onConflict:'id'}));saved=true;
  await load();$('month').value='all';render();
  csvMsg(`取り込み完了：${rs.length}件（既存更新 ${existing}件、新規 ${rs.length-existing}件）。本日以降の日程を表示しています。`);
  $('csvFile').value='';
 }catch(e){const detail=[e.message,e.details,e.hint,e.code].filter(Boolean).join(' / ')||String(e);csvMsg((saved?'保存済みですが画面更新に失敗しました：':'取り込みエラー：')+detail,true);}
 finally{busy=false;$('importCsv').disabled=false;csvNotice.scrollIntoView({block:'nearest'});}
};
$('exportCsv').onclick=()=>run(async()=>{await load();download('reservations.csv',[headers,...rounds.map(r=>[r.id,r.play_date,r.course,time(r.time1),time(r.time2),r.capacity,r.status,r.deadline,r.notes,r.booker_id?bookerName(r):''])].map(r=>r.map(quote).join(',')).join('\r\n'));});
$('share').onclick=()=>run(async()=>{const text='【トーヨーCC 参加予定】\n'+visibleRounds().map(r=>dateLabel(r.play_date)+' '+r.course+' '+time(r.time1)+(r.time2?'／'+time(r.time2):'')+' '+r.status+'\n予約者：'+bookerName(r)+(needsCancelCheck(r)?'\n'+warningText(r):'')+'\n'+members.map(m=>{const a=answerFor(r,m);return m.name+'：'+(a?.answer||'－')+(a?.guests?' ＋ゲスト'+a.guests:'');}).join('\n')).join('\n\n');await navigator.clipboard.writeText(text);msg('LINE共有用テキストをコピーしました。');});
let displayedDay=today();function refreshDay(){if(me&&!activityPage&&today()!==displayedDay){displayedDay=today();run(load);}}document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDay();});setInterval(refreshDay,60000);
let activityPending=false;
function clearActivity(){const el=$('activityList');if(el)el.replaceChildren();if($('activitySection'))$('activitySection').hidden=true;}
function deviceType(){const u=navigator.userAgent;return /Android/i.test(u)?'Android':/iPhone|iPad|iPod/i.test(u)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)?'iPhone/iPad':/Windows|Macintosh|Linux|CrOS/i.test(u)?'PC':'その他';}
async function recordActivity(){if(!me||document.hidden||activityPending)return;activityPending=true;try{check(await db.rpc('record_member_activity',{p_device:deviceType()}));}catch(e){console.warn('利用状況記録:',e.message);}finally{activityPending=false;}}
function activityDate(v){return v?new Date(v).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'未記録';}
async function showActivity(){if(!activityPage||!me?.admin)return;const uid=me.id, root=$('activityList');$('activitySection').hidden=false;try{const rows=check(await db.rpc('get_member_activity'));if(me?.id!==uid)return;root.replaceChildren();for(const m of sortedMembers()){const r=rows.find(x=>x.member_id===m.id);const card=node('div',undefined,'activity-card');card.append(node('strong',m.name),node('span',r?.recent?'直近5分以内にアクセス':r?.last_access?'アクセス記録あり':'アクセス未記録','muted'),node('div','最終ログイン：'+activityDate(r?.last_sign_in)),node('div','最終アクセス：'+activityDate(r?.last_access)),node('div','確認したログイン回数：'+(r?.login_count??0)+' 回'),node('div','最終利用端末：'+(r?.device||'未記録')));root.append(card);}$('activityNotice').textContent='取得：'+activityDate(new Date());}catch(e){if(me?.id===uid)$('activityNotice').textContent='利用状況を取得できません：'+e.message;}}
$('activityReload')?.addEventListener('click',async()=>{await recordActivity();await showActivity();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)recordActivity();});
setInterval(()=>{if(!document.hidden)recordActivity();},120000);
run(session);
