(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var aside=$('#aside'),scroll=$('#scroll'),tb=$('#tb'),ftslot=$('#ftslot'),overlay=$('#overlay'),phone=$('#phone');

/* ---------- fictional data ---------- */
var DEALS=[
 {id:'newark',type:'deal',role:'Developer',mkt:'NJ',size:'1-5',asset:'Multifamily',title:'18-unit multifamily, Newark NJ',who:'Marcus Hale',ini:'MH',org:'Hale Row Partners',pct:96,raise:'$2.5M',irr:'17.4%',min:'$100K',mult:'1.8x',blurb:'Value-add, 92% occupied. Closing in 45 days.',tier:'cf',time:'2h'},
 {id:'edison',type:'deal',role:'Developer',mkt:'NJ',size:'1-5',asset:'Storage',title:'Self-storage portfolio, Edison NJ',who:'Priya Anand',ini:'PA',org:'Anand Storage Co.',pct:91,raise:'$4.0M',irr:'15.1%',min:'$250K',mult:'1.6x',blurb:'Three stabilized facilities, one lease-up. 6-year hold.',tier:'cf',time:'1d'},
 {id:'hoboken',type:'seek',role:'GC',mkt:'NJ',size:'5+',asset:'Mixed-use',title:'Mixed-use, 40k sf — Hoboken NJ',who:'Elena Voss',ini:'EV',org:'Voss & Reed',pct:88,raise:'40k sf',irr:'Ground-up',min:'Bids Nov 15',mult:'',blurb:'Ground-up mixed-use, entitled. Union-friendly, bid by Nov 15.',tier:'v',time:'5h'},
 {id:'brooklyn',type:'deal',role:'Developer',mkt:'NY',size:'5+',asset:'Multifamily',title:'64-unit adaptive reuse, Brooklyn NY',who:'Dana Whitfield',ini:'DW',org:'Whitfield Urban',pct:84,raise:'$9.5M',irr:'16.2%',min:'$500K',mult:'1.9x',blurb:'Former warehouse conversion with 421-a style incentives (fictional).',tier:'v',time:'3d'},
 {id:'jc',type:'deal',role:'Developer',mkt:'NJ',size:'1-5',asset:'Mixed-use',title:'Retail/office condo, Jersey City NJ',who:'Marcus Hale',ini:'MH',org:'Hale Row Partners',pct:79,raise:'$1.8M',irr:'13.8%',min:'$50K',mult:'1.5x',blurb:'Street-level retail with two floors of creative office.',tier:'cf',time:'4d'}
];
var PEOPLE=[
 {id:'mh',ini:'MH',name:'Marcus Hale',role:'Developer',org:'Hale Row Partners',loc:'Newark, NJ',tier:'cf'},
 {id:'pa',ini:'PA',name:'Priya Anand',role:'Developer',org:'Edison NJ',loc:'Edison, NJ',tier:'cf'},
 {id:'rk',ini:'RK',name:'Rachel Kim',role:'Investor',org:'Kim Family Office',loc:'New York, NY',tier:'v'},
 {id:'ev',ini:'EV',name:'Elena Voss',role:'GC',org:'Voss & Reed',loc:'Hoboken, NJ',tier:'v'},
 {id:'ls',ini:'LS',name:'Leo Sandoval',role:'Lender',org:'Garden State Bridge',loc:'Princeton, NJ',tier:'inv'},
 {id:'tn',ini:'TN',name:'Tara Nguyen',role:'Investor',org:'Nguyen Capital',loc:'Jersey City, NJ',tier:'v'},
 {id:'dp',ini:'DP',name:'Daniel Park',role:'Broker',org:'Park Atlantic',loc:'Hackensack, NJ',tier:'v'},
 {id:'dw',ini:'DW',name:'Dana Whitfield',role:'Developer',org:'Whitfield Urban',loc:'Brooklyn, NY',tier:'v'}
];
var TIERNAME={cf:'Confirmed',v:'Verified',inv:'Invited'};
var THREADS={
 rk:[['l','Happy to review the deck. Can you send the latest numbers?']],
 pa:[['l','Hi Priya, I\'m interested in your self-storage portfolio raise.',1],['r','Thanks Marcus. Happy to share more once we\'re connected.'],['gate'],['l','I\'ll approve once your accreditation check clears.']],
 ev:[['l','Bids are due Nov 15, see the scope.']],
 ls:[['l','Thanks for the intro!']],
 tn:[['l','Sounds good, let\'s talk Thursday.']]
};
var INBOX=[
 {p:'rk',pv:'Happy to review the deck. Can you send...',t:'2m',un:1,sub:'Investor · Verified'},
 {p:'pa',pv:'Request intro accepted — deal room opens after NDA',t:'1h',un:1,sub:'Developer · Confirmed'},
 {p:'ev',pv:'Bids are due Nov 15, see the scope.',t:'Yesterday',sub:'GC · Verified'},
 {p:'ls',pv:'Thanks for the intro!',t:'Mon',sub:'Lender · Invited'},
 {p:'tn',pv:'Sounds good, let\'s talk Thursday.',t:'Sun',sub:'Investor · Verified'}
];
var POSTS=[{id:'p1',likes:24,comments:9,ini:'DP',name:'Daniel Park',sub:'Broker · Park Atlantic · 1d',text:'Cap rates in NJ garden-apartment holding steady while lenders get pickier on DSCR. Anyone seeing different bridge terms this quarter?'}];

/* ---------- state ---------- */
var S={liked:{},commented:{},saved:{},requested:{},intro:{},connected:{},filters:{role:'Any',mkt:'Any',size:'Any'},feedTab:'For you',q:'',ob:{step:1,code:'FD-7K2M-91QX',role:'Developer / Sponsor',lic:'',ref:''},obDone:false,unread:{rk:1,pa:1},extra:{}};
var CYCLE={role:['Any','Developer','GC'],mkt:['Any','NJ','NY'],size:['Any','1-5','5+']};
var LBL={role:'Role',mkt:'Market',size:'Size'};
function sizeLbl(v){return v==='1-5'?'$1–5M':v==='5+'?'$5M+':v}

/* ---------- helpers ---------- */
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function ver(t){return '<span class="ver'+(t==='cf'?' cf':t==='inv'?' inv':'')+'">'+TIERNAME[t]+'</span>'}
function deal(id){return DEALS.filter(function(d){return d.id===id})[0]}
function person(id){return PEOPLE.filter(function(d){return d.id===id})[0]}
function go(h){location.hash=h}
function toast(m){var t=document.createElement('div');t.className='toast';t.textContent=m;phone.appendChild(t);setTimeout(function(){t.remove()},1800)}
function tag(d){return d.type==='deal'?'<span class="tag t-deal">Deal</span>':'<span class="tag t-seek">Seeking GC</span>'}
function unreadCount(){var n=0;for(var k in S.unread)n+=S.unread[k];return n}

/* ---------- modal ---------- */
function modal(html){overlay.innerHTML='<div class="modalbg" data-act="closemodal"><div class="modal" data-stop="1">'+html+'</div></div>'}
function closeModal(){overlay.innerHTML=''}
function introModal(pid,dealId,kind){
 var p=person(pid),d=dealId&&deal(dealId);
 var what=kind==='access'?'Request access':'Request intro';
 modal('<h3>'+what+(d?' — '+esc(d.title):' to '+esc(p.name))+'</h3>'+
 '<p>'+(kind==='access'?'Your request goes to <b>'+esc(p.name)+'</b>. If approved, you\'ll sign a mutual NDA and your accredited status will be checked before the data room opens.':'<b>'+esc(p.name)+'</b> will see your verified profile with this intro. Deal details stay NDA-gated until they accept.')+'</p>'+
 '<div class="row"><div class="btn o" data-act="closemodal">Cancel</div><div class="btn" id="confirmReq" data-act="confirmreq" data-p="'+pid+'" data-d="'+(dealId||'')+'" data-k="'+kind+'">Send request</div></div>');
}

/* ---------- tab bar ---------- */
var TABS=[['feed','⌂','Feed'],['deals','◈','Deals'],['network','⚇','Network'],['messages','✉','Messages'],['profile','☺','Profile']];
function renderTb(active){
 tb.style.display='';
 tb.innerHTML='<div class="brand" data-go="feed"><i></i><b>FrontDoor</b></div>'+TABS.map(function(t){var n=t[0]==='messages'&&unreadCount()>0;return '<div class="'+(t[0]===active?'on':'')+(n?' nb':'')+'" data-tab="'+t[0]+'" data-testid="tab-'+t[0]+'"><span>'+t[1]+'</span><em>'+t[2]+'</em></div>'}).join('')+'<div class="me" data-go="profile"><div class="av">MH</div><div><b>Marcus Hale</b><small>Confirmed member</small></div></div>';
}
function n0(){return 0}
function style(){var c=document.querySelector('style#nbcount');if(!c){c=document.createElement('style');c.id='nbcount';document.head.appendChild(c)}c.textContent='.nb:after{content:"'+unreadCount()+'"}'}

/* ---------- views ---------- */
function hdr(title,right){return '<div class="hdr"><div class="logo" style="font-size:20px">'+title+'</div><div class="row">'+(right||'')+'</div></div>'}
function sub(title,right,extra){return '<div class="hdr" style="padding:10px 16px"><div class="row"><span class="back" data-act="back">‹</span>'+(extra||'<div class="logo" style="font-size:18px">'+title+'</div>')+'</div>'+(right||'')+'</div>'}

function dealCard(d){
 var liked=S.liked[d.id];
 if(d.type==='seek')return '<div class="card" data-go="deal/'+d.id+'"><div class="who"><div class="av">'+d.ini+'</div><div><div class="nm">'+d.who+' '+ver(d.tier)+'</div><div class="sub">GC wanted · '+esc(d.org)+' · '+d.time+'</div></div>'+tag(d)+'</div><h3>'+esc(d.title.replace(/^Mixed-use, 40k sf — Hoboken NJ/,'Seeking GC — NJ, 40k sf'))+'</h3><p>'+esc(d.blurb)+'</p><div class="chips"><span class="chip">◎ New Jersey</span><span class="chip">40,000 sf</span><span class="chip">Ground-up</span></div><div class="row" style="margin-top:12px"><div class="btn" data-act="intro" data-p="ev" data-d="'+d.id+'">'+(S.intro['ev']?'Intro requested ✓':'Request intro')+'</div><div class="btn o" data-go="deal/'+d.id+'">View details</div></div></div>';
 return '<div class="card deal" data-go="deal/'+d.id+'"><div class="who"><div class="av">'+d.ini+'</div><div><div class="nm">'+d.who+' '+ver(d.tier)+'</div><div class="sub">Developer · '+esc(d.org)+' · '+d.time+'</div></div>'+tag(d)+'</div><h3>Raising '+d.raise+' — '+esc(d.title)+'</h3><p>'+esc(d.blurb)+'</p><div class="stats"><div><b>'+d.mult+'</b><small>Equity mult.</small></div><div><b>'+d.irr+'</b><small>Target IRR</small></div><div><b>'+d.min+'</b><small>Min. invest</small></div></div><div class="row"><div class="btn'+(S.intro[personId(d)]?' done':'')+'" data-act="intro" data-p="'+personId(d)+'" data-d="'+d.id+'">'+(S.intro[personId(d)]?'Intro requested ✓':'Request intro')+'</div><div class="btn o" data-go="deal/'+d.id+'">View deal</div><div class="btn s'+(liked?' on':'')+'" data-act="like" data-id="'+d.id+'" aria-label="like">'+(liked?'♥':'♡')+'</div></div></div>';
}
function personId(d){return {MH:'mh',PA:'pa',EV:'ev',DW:'dw'}[d.ini]}

function vFeed(){
 var tabs=['For you','Deals','Seeking','My circle'];
 var list=DEALS.filter(function(d){return S.feedTab==='For you'||(S.feedTab==='Deals'&&d.type==='deal')||(S.feedTab==='Seeking'&&d.type==='seek')||(S.feedTab==='My circle'&&S.connected[personId(d)||'']) });
 var posts=(S.feedTab==='For you'||S.feedTab==='My circle')?POSTS:[];
 var h='<div class="hdr"><div class="logo"><i></i>FrontDoor</div><div class="row"><div class="ic" data-go="deals">⌕</div><div class="ic" data-act="toast" data-m="No new notifications">🔔</div></div></div>'+
 '<div class="tabs">'+tabs.map(function(t){return '<span class="'+(t===S.feedTab?'on':'')+'" data-act="feedtab" data-t="'+t+'">'+t+'</span>'}).join('')+'</div>';
 h+=list.slice(0,S.feedTab==='For you'?3:9).map(dealCard).join('');
 h+=posts.map(function(p){var l=S.liked[p.id],c=S.commented[p.id];return '<div class="card"><div class="who"><div class="av">'+p.ini+'</div><div><div class="nm">'+p.name+' '+ver('v')+'</div><div class="sub">'+p.sub+'</div></div></div><p style="margin-top:10px">'+esc(p.text)+'</p><div class="act"><span class="'+(l?'on':'')+'" data-act="like" data-id="'+p.id+'">'+(l?'♥':'♡')+' '+(p.likes+(l?1:0))+'</span><span class="'+(c?'on':'')+'" data-act="comment" data-id="'+p.id+'">💬 '+(p.comments+(c?1:0))+'</span><span data-act="toast" data-m="Link copied">↗ Share</span></div></div>'}).join('');
 if(!list.length&&!posts.length)h+='<div class="empty">Nothing here yet. Connect with members in Network.</div>';
 h+='<div style="height:20px"></div>';
 return h;
}

function filtered(){
 return DEALS.filter(function(d){
  var f=S.filters;
  if(f.role!=='Any'&&d.role!==f.role)return false;
  if(f.mkt!=='Any'&&d.mkt!==f.mkt)return false;
  if(f.size!=='Any'&&d.size!==f.size)return false;
  if(S.q&&(d.title+d.who+d.asset+d.mkt).toLowerCase().indexOf(S.q.toLowerCase())<0)return false;
  return true});
}
function dealsList(sel){
 var l=filtered();
 return '<div class="dealcount">'+l.length+' result'+(l.length===1?'':'s')+'</div>'+(l.map(function(d){return '<div class="mini'+(sel===d.id?' sel':'')+'" data-go="deal/'+d.id+'"><div class="r1">'+tag(d).replace(' class="tag',' style="margin:0" class="tag')+'<span class="pct">'+d.pct+'% match</span></div><h5>'+esc(d.title)+'</h5><div class="sub">'+d.who+' · '+ver(d.tier==='cf'?'v':d.tier)+'</div><div class="m"><span><b>'+d.raise+'</b>'+(d.type==='deal'?' raise':'')+'</span><span><b>'+d.irr+'</b>'+(d.type==='deal'?' IRR':'')+'</span><span><b>'+d.min+'</b>'+(d.type==='deal'?' min':'')+'</span></div><p class="bl">'+esc(d.blurb)+'</p></div>'}).join('')||'<div class="empty">No deals match these filters.<br><br><div class="btn o" data-act="clearfilters" style="display:inline-block;padding:9px 18px">Clear filters</div></div>')+'<div style="height:20px"></div>';
}
function vDeals(){
 return hdr('Deals','<div class="ic" data-act="toast" data-m="Post a deal — not in prototype">＋</div>')+
 '<div class="search"><input class="in" id="q" placeholder="⌕  Search deals, markets, members" value="'+esc(S.q)+'" style="border:0;padding:0;background:none"></div>'+
 '<div class="filters">'+['role','mkt','size'].map(function(k){var v=S.filters[k];return '<span class="f'+(v!=='Any'?' on':'')+'" data-act="filter" data-k="'+k+'" data-testid="f-'+k+'">'+LBL[k]+': '+(k==='size'?sizeLbl(v):v)+' ▾</span>'}).join('')+'</div>'+
 '<div class="match"><div class="k">◆ Match suggestions</div><div class="big">3 investors match your raise</div><div class="row"><div class="stack"><div class="av">RK</div><div class="av">LS</div><div class="av">TN</div></div><span class="sub" style="margin-left:18px">$100K–$500K · Multifamily · NJ/NY</span></div><div class="row" style="margin-top:12px"><div class="btn" data-go="network">Review matches</div></div></div>'+
 '<div id="dlist">'+dealsList()+'</div>';
}

function vDeal(id){
 var d=deal(id);if(!d)return vDeals();
 var p=person(personId(d)),req=S.requested[d.id];
 var h=sub('Deal','<div class="ic" data-act="save" data-id="'+d.id+'">'+(S.saved[d.id]?'★':'⚑')+'</div>')+
 '<div style="padding:14px 20px 0">'+tag(d).replace(' class="tag',' style="margin:0" class="tag')+' <span class="pct" style="float:right">'+d.pct+'% match</span><h3 style="font-size:21px">'+esc(d.title)+'</h3><div class="sub" data-go="person/'+p.id+'" style="cursor:pointer">Sponsor: '+d.who+' '+ver(d.tier)+'</div></div>'+
 '<div class="sec"><div class="stats" style="margin-top:14px"><div><b>'+d.raise+'</b><small>'+(d.type==='deal'?'Raise':'Size')+'</small></div><div><b>'+d.irr+'</b><small>'+(d.type==='deal'?'Target IRR':'Type')+'</small></div><div><b>'+d.min+'</b><small>'+(d.type==='deal'?'Minimum':'Deadline')+'</small></div></div>'+
 '<p style="font-size:12.5px">'+esc(d.blurb)+' Full underwriting is in the data room.</p>'+
 '<h4 style="margin-top:14px">Sponsor\'s Confirmed track record</h4>'+
 '<div class="proj"><div class="pt">▦</div><div><b>Ironbound Lofts</b><div class="sub">42 units · 2025 · 4 counterparties confirmed</div></div><span class="v">$24M</span></div><div class="proj" style="border:0"><div class="pt">▥</div><div><b>Halsey Commons</b><div class="sub">Mixed-use · 2023 · 3 counterparties confirmed</div></div><span class="v">$38M</span></div>'+
 (req?'<div class="gate" style="margin:8px 0 0"><b>✓ Request sent</b><p style="margin-bottom:0">'+esc(d.who)+' will respond soon. You\'ll be notified in Messages.</p></div>':'<div class="gate" style="margin:8px 0 0"><b>🔒 NDA required</b><p style="margin-bottom:0">Data room opens after the sponsor approves your request and you sign the mutual NDA. Accredited status is checked at this step.</p></div>')+'<div style="height:16px"></div></div>';
 return {html:h,ft:'<div class="ft"><div class="row"><div class="btn o" style="flex:none;padding:11px 16px" data-go="thread/'+p.id+'">Message</div><div class="btn'+(req?' done':'')+'" data-act="access" data-p="'+p.id+'" data-d="'+d.id+'">'+(req?'Access requested ✓':'Request access')+'</div></div></div>'};
}

function vNetwork(){
 return hdr('Network','<div class="ic" data-act="toast" data-m="Invite sent (prototype)">＋</div>')+
 '<div class="filters" style="padding-bottom:0">'+['All','Developer','Investor','GC','Lender','Broker'].map(function(r){return '<span class="f'+((S.netRole||'All')===r?' on':'')+'" data-act="netrole" data-r="'+r+'">'+r+'</span>'}).join('')+'</div>'+
 '<div class="netgrid">'+PEOPLE.filter(function(p){return !S.netRole||S.netRole==='All'||p.role===S.netRole}).map(function(p){var c=S.connected[p.id];return '<div class="ncard" data-go="person/'+p.id+'"><div class="av">'+p.ini+'</div><div class="nm">'+p.name+'</div><div class="sub">'+p.role+' · '+esc(p.org)+'</div>'+ver(p.tier)+'<div class="btn'+(c?' o':'')+'" style="margin-top:10px" data-act="connect" data-id="'+p.id+'">'+(c?'Connected ✓':'Connect')+'</div></div>'}).join('')+'</div>';
}

function vMessages(sel){
 return hdr('Messages','<div class="ic" data-act="toast" data-m="New message — pick a member in Network">✎</div>')+
 INBOX.map(function(i){var p=person(i.p),u=S.unread[i.p];return '<div class="inb'+(sel===i.p?' sel':'')+'" data-go="thread/'+i.p+'"><div class="av">'+p.ini+'</div><div><div class="nm">'+p.name+'</div><div class="sub">'+i.sub+'</div><div class="pv">'+esc(i.pv)+'</div></div><div class="t">'+i.t+'<br>'+(u?'<span class="un">'+u+'</span>':'')+'</div></div>'}).join('');
}

function vThread(pid){
 var p=person(pid)||person('pa');pid=p.id;S.cur=pid;
 if(!THREADS[pid])THREADS[pid]=[];
 if(!INBOX.some(function(i){return i.p===pid}))INBOX.unshift({p:pid,pv:'New conversation',t:'now',sub:p.role+' · '+TIERNAME[p.tier]});
 delete S.unread[pid];
 var h=sub('', '', '<div class="av" style="background:#fff">'+p.ini+'</div><div><div class="nm" style="color:#fff">'+p.name+' '+ver(p.tier).replace('ver','ver cf')+'</div><div class="sub" style="color:#C4CCDD">'+p.role+' · '+esc(p.loc)+'</div></div>');
 h+='<div class="thread" id="thr">'+threadBody(pid)+'</div>';
 return {html:h,ft:'<div class="ft"><div class="row"><input class="in" id="msg" placeholder="Message '+p.name.split(' ')[0]+'…" style="border-radius:20px" autocomplete="off"><div class="btn send" data-act="send" data-p="'+pid+'">➤</div></div></div>'};
}
function threadBody(pid){
 var msgs=THREADS[pid].slice();
 var h=msgs.length?'':'<div class="empty">Say hello to '+person(pid).name+'.</div>';
 msgs.forEach(function(m,i){
  if(m[0]==='gate'){var sent=S.intro[pid];var dl=pid==='pa'?'edison':null;h+='<div class="gate"><b>'+(sent?'✓ Intro requested':'🔒 Deal room is NDA-gated')+'</b><p>'+(sent?'Waiting for approval. You\'ll sign the mutual NDA once accepted.':'Financials, underwriting and the data room open only after you request an intro and sign the mutual NDA.')+'</p><div class="row"><div class="btn'+(sent?' done':'')+'" data-act="intro" data-p="'+pid+'" data-d="'+(dl||'')+'">'+(sent?'Requested ✓':'Request intro')+'</div>'+(dl?'<div class="btn o" data-go="deal/'+dl+'">View deal</div>':'')+'</div></div>';return}
  h+='<div class="bub '+m[0]+'" '+(i===0?'style="margin-top:12px"':'')+'>'+(m[2]?'<div class="sub" style="margin:0 0 3px">Today 9:12</div>':'')+esc(m[1])+'</div>';
 });
 return h;
}

function vProfile(pid){
 var me=!pid, p=pid?person(pid):{id:'mh',ini:'MH',name:'Marcus Hale',role:'Developer',org:'Hale Row Partners',loc:'Newark, NJ',tier:'cf'};
 var pp=pid?p:p; var tier=p.tier;
 var h='<div class="cover"></div>'+(pid?'<span class="back" data-act="back" style="position:absolute;top:12px;left:14px;color:#fff;z-index:3;font-size:26px">‹</span>':'')+
 '<div style="display:flex;justify-content:space-between;align-items:flex-start"><div class="pav">'+p.ini+'</div><div class="row" style="margin:10px 20px 0"><div class="btn o" style="padding:9px 16px;flex:none" data-go="thread/'+p.id+'">Message</div><div class="btn'+(S.intro[p.id]?' done':'')+'" style="padding:9px 16px;flex:none" data-act="intro" data-p="'+p.id+'" data-d="">'+(S.intro[p.id]?'Requested ✓':'Request intro')+'</div></div></div>'+
 '<div class="sec"><div class="nm" style="font-size:22px;font-family:Georgia,serif;font-weight:400;margin-top:12px">'+p.name+' '+ver(tier)+'</div><div class="sub" style="font-size:13px;margin:4px 0 8px">'+esc(p.org)+' · '+esc(p.loc)+'</div><span class="tag t-deal" style="margin:0">'+p.role+'</span> <span class="chip" style="margin-left:4px">Member since 2024</span>'+
 '<div class="stats" style="margin-top:16px"><div><b>14</b><small>Projects done</small></div><div><b>$186M</b><small>Total value</small></div><div><b>23</b><small>References</small></div></div>'+
 '<h4 style="margin-top:12px">Verification tier</h4><div class="tiers">'+
 [['inv','Invited by a member; light checks at application.'],['v','Public records + references checked.'],['cf','Counterparties vouched for completed deals.']].map(function(t){return '<div class="tier'+(t[0]===tier?' cur':'')+'">'+ver(t[0])+'<small>'+(t[0]===tier?'<b>Current tier.</b> ':'')+t[1]+'</small></div>'}).join('')+'</div>'+
 '<div class="how"><b>How verification works</b><ol><li>Invite code from an existing member.</li><li>Public records: permits, deeds, license lookups.</li><li>Two or more references are contacted.</li><li>Past partners confirm deals by email.</li></ol></div>'+
 '<h4 style="margin-top:14px">Confirmed track record</h4><div class="proj"><div class="pt">▦</div><div><b>Ironbound Lofts</b><div class="sub">42-unit multifamily · Newark NJ · 2025</div></div><span class="v">$24M</span></div><div class="proj" style="border:0"><div class="pt">▥</div><div><b>Halsey Commons</b><div class="sub">Mixed-use · Jersey City NJ · 2023</div></div><span class="v">$38M</span></div>'+
 (me?'<div class="row" style="margin-top:16px"><div class="btn o" data-act="restart">Restart onboarding demo</div></div>':'')+'<div style="height:24px"></div></div>';
 return h;
}

/* onboarding */
var ROLES=[['Developer / Sponsor','Raising capital or seeking partners'],['Investor','Accredited individual, family office, fund'],['Lender · GC · Broker · Other','']];
function vOnboard(){
 var o=S.ob,st=o.step,h='';
 if(st===5)st=4;
 h+='<div class="hdr"><div class="logo" style="font-size:20px">Apply</div><span class="sub" style="color:#C4CCDD">Step '+st+' of 4</span></div><div class="steps">'+[1,2,3,4].map(function(i){return '<i class="'+(i<=st?'on':'')+'"></i>'}).join('')+'</div>';
 if(st===1){
  h+='<div class="pg"><h3>Welcome to FrontDoor</h3><p>FrontDoor is invite-only. Enter the code a member shared with you.</p></div><div class="fld"><label>Invite code</label><input class="in" id="code" value="'+esc(o.code)+'" placeholder="FD-XXXX-XXXX" autocomplete="off"><div class="sub" id="codeerr" style="color:#D9683F;margin-top:6px;min-height:14px"></div></div><div class="fld"><div class="btn" data-act="obnext" data-testid="next">Continue</div></div><div class="fld"><div class="sub" style="text-align:center">Try the demo code <b>FD-7K2M-91QX</b></div></div>';
 }else if(st===2){
  h+='<div class="pg"><h3>I am a…</h3><p>Pick the role that best describes you.</p></div>'+ROLES.map(function(r,i){return '<div class="role'+(o.role===r[0]?' sel':'')+'" data-act="role" data-r="'+r[0]+'"><i></i><div>'+r[0]+(r[1]?'<small>'+r[1]+'</small>':'')+'</div></div>'}).join('')+'<div class="fld" style="margin-top:14px"><div class="row"><div class="btn o" data-act="obback">Back</div><div class="btn" data-act="obnext" data-testid="next">Continue</div></div></div>';
 }else if(st===3){
  h+='<div class="pg"><h3>Credentials &amp; references</h3><p>Light checks now. Deeper checks happen only when you access a deal.</p></div><div class="fld"><label>Invite code</label><div class="in" style="border-color:#D9683F">'+esc(o.code)+' <span style="float:right;color:#D9683F">✓ Accepted</span></div></div><div class="role sel"><i></i><div>'+esc(o.role)+'</div></div><div class="fld" style="margin-top:12px"><label>License / entity number</label><input class="in" id="lic" value="'+esc(o.lic)+'" placeholder="NJ-GC-000000 · Hale Row Partners LLC"></div><div class="fld"><label>Reference 1 (email)</label><input class="in" id="ref" type="email" value="'+esc(o.ref)+'" placeholder="reference@example.com"><div class="sub" id="referr" style="color:#D9683F;margin-top:6px;min-height:14px"></div></div><div class="fld" style="margin-bottom:0"><div class="row"><div class="btn o" data-act="obback">Back</div><div class="btn" data-act="obnext" data-testid="next">Submit application</div></div></div><div style="height:20px"></div>';
 }else{
  h+='<div class="pg" style="text-align:center;padding-top:50px"><div class="pav" style="margin:0 auto 18px;border-color:#D9683F;font-size:34px;color:#D9683F">⏳</div><h3>Application under review</h3><p>Our committee reviews applications within 3 business days. We\'ll run light checks and email your references.</p></div><div class="gate"><b>What happens next</b><p style="margin-bottom:0">1. Light identity + entity checks<br>2. Reference emails sent<br>3. Badge issued: <span class="ver inv">Invited</span> → <span class="ver">Verified</span></p></div><div class="fld" style="margin-top:16px"><div class="btn" data-act="enter" data-testid="enter">Enter the app (demo)</div></div>';
 }
 return h;
}


/* ---------- desktop helpers ---------- */
var mqDesk=window.matchMedia('(min-width:1024px)');
function isDesk(){return mqDesk.matches}
function sc(){return $('.dscroll')||scroll}
function splitHtml(lst,det,ft){return '<div class="split"><div class="pane lst">'+lst+'</div><div class="pane det"><div class="dscroll">'+det+'</div>'+ft+'</div></div>'}
function asideHtml(){
 var sug=PEOPLE.filter(function(p){return p.id!=='mh'}).slice(0,5).map(function(p){var c=S.connected[p.id];return '<div class="sg" data-go="person/'+p.id+'"><div class="av">'+p.ini+'</div><div class="si"><div class="nm">'+p.name+'</div><div class="sub">'+p.role+' · '+esc(p.org)+'</div></div><div class="btn o sm" data-act="connect" data-id="'+p.id+'">'+(c?'✓':'Connect')+'</div></div>'}).join('');
 return '<div class="match"><div class="k">◆ Match suggestions</div><div class="big">3 investors match your raise</div><div class="row"><div class="stack"><div class="av">RK</div><div class="av">LS</div><div class="av">TN</div></div><span class="sub" style="margin-left:18px">$100K–$500K · NJ/NY</span></div><div class="row" style="margin-top:12px"><div class="btn" data-go="network">Review matches</div></div></div>'+
 '<div class="apanel"><h6>Suggested connections</h6>'+sug+'<div class="alink" data-go="network">See all members →</div></div>'+
 '<div class="apanel"><h6>Your verification</h6><div class="row" style="margin-bottom:10px">'+ver('cf')+'<span class="sub" style="margin:0">Top tier</span></div><div class="vstep done">Invite code accepted</div><div class="vstep done">Public records checked</div><div class="vstep done">2 references contacted</div><div class="vstep done">4 past partners confirmed</div><div class="alink" data-go="profile">View profile →</div></div>'+
 '<div class="apanel"><h6>Invite a colleague</h6><p class="sub" style="margin:0 0 10px;line-height:1.45">You have 3 invite codes left. Every member is vouched for by another.</p><div class="btn o" data-act="toast" data-m="Invite code copied (prototype)">Copy invite code</div></div>';
}

/* ---------- router ---------- */
var stack=[];
function render(){
 var h=(location.hash||'').replace(/^#\/?/,'')||'onboarding';
 if(h==='onboarding'&&S.obDone)h='feed';
 var parts=h.split('/'),r=parts[0],arg=parts[1],out,active=null,ft='',noTab=false,split=0,desk=isDesk();
 closeModal();
 if(r==='onboarding'){out=vOnboard();noTab=true}
 else if(r==='feed'){out=vFeed();active='feed'}
 else if(r==='deals'){out=vDeals();active='deals'}
 else if(r==='deal'){var x=vDeal(arg);if(typeof x==='string'){out=x}else{out=x.html;ft=x.ft;if(desk){out=splitHtml('<div class="lhead" data-go="deals">‹ All deals</div><div id="dlist">'+dealsList(arg)+'</div>',x.html,x.ft);ft='';split=1}}active='deals'}
 else if(r==='network'){out=vNetwork();active='network'}
 else if(r==='messages'){if(desk){var t0=vThread(INBOX[0].p);out=splitHtml(vMessages(S.cur),t0.html,t0.ft);split=1}else out=vMessages();active='messages'}
 else if(r==='thread'){var t=vThread(arg);out=t.html;ft=t.ft;if(desk){out=splitHtml(vMessages(S.cur),t.html,t.ft);ft='';split=1}active='messages'}
 else if(r==='person'){out=vProfile(arg);active='network'}
 else if(r==='profile'){out=vProfile();active='profile'}
 else{out=vFeed();active='feed'}
 scroll.className='scroll view'+(ft?' hasFt':'')+(split?' isplit':'');
 scroll.innerHTML='<div class="wrap w-'+r+(split?' w-split':'')+'">'+out+'</div>';ftslot.innerHTML=ft;
 phone.classList.toggle('onb',noTab);phone.classList.toggle('hassplit',!!split);
 aside.innerHTML=noTab?'':asideHtml();
 if(noTab){tb.style.display='none';scroll.className='scroll view noTab'}else renderTb(active);
 scroll.scrollTop=0;style();
 if(r==='thread'||(r==='messages'&&desk)){var d2=sc();d2.scrollTop=d2.scrollHeight}
}
window.addEventListener('hashchange',render);

/* ---------- actions ---------- */
function refresh(){var els=[scroll,$('.lst'),$('.dscroll')],ys=els.map(function(e){return e?e.scrollTop:0}),was=!!$('.dscroll');render();[scroll,$('.lst'),$('.dscroll')].forEach(function(e,i){if(e&&(i<2||was))e.scrollTop=ys[i]})}
mqDesk.addEventListener('change',function(){render()});

document.addEventListener('input',function(e){
 if(e.target.id==='q'){S.q=e.target.value;$('#dlist').innerHTML=dealsList()}
 if(e.target.id==='code')S.ob.code=e.target.value;
 if(e.target.id==='lic')S.ob.lic=e.target.value;
 if(e.target.id==='ref')S.ob.ref=e.target.value;
});
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.id==='msg')doSend(S.cur)});
function doSend(){
 var inp=$('#msg');if(!inp)return;var v=inp.value.trim();if(!v)return;
 var pid=S.cur;
 THREADS[pid].push(['r',v]);inp.value='';
 var it=INBOX.filter(function(i){return i.p===pid})[0];if(it){it.pv='You: '+v;it.t='now'}
 $('#thr').innerHTML=threadBody(pid);sc().scrollTop=sc().scrollHeight;
 setTimeout(function(){if(S.cur!==pid)return;THREADS[pid].push(['l','Thanks for the note — let\'s connect this week.']);var t=$('#thr');if(t){t.innerHTML=threadBody(pid);sc().scrollTop=sc().scrollHeight}},900);
}

document.addEventListener('click',function(e){
 var t=e.target;
 if(t.closest('[data-stop]')&&!t.closest('[data-act]'))return;
 var a=t.closest('[data-act]'),g=t.closest('[data-go]'),tabEl=t.closest('[data-tab]');
 if(tabEl){go(tabEl.dataset.tab);return}
 if(a){
  var d=a.dataset;e.stopPropagation();
  switch(d.act){
   case 'closemodal':closeModal();break;
   case 'back':if(history.length>1)history.back();else go('feed');break;
   case 'like':S.liked[d.id]=!S.liked[d.id];refresh();break;
   case 'comment':S.commented[d.id]=!S.commented[d.id];refresh();toast(S.commented[d.id]?'Comment added (demo)':'Comment removed');break;
   case 'save':S.saved[d.id]=!S.saved[d.id];refresh();toast(S.saved[d.id]?'Saved':'Removed from saved');break;
   case 'toast':toast(d.m);break;
   case 'feedtab':S.feedTab=d.t;refresh();break;
   case 'filter':var c=CYCLE[d.k];S.filters[d.k]=c[(c.indexOf(S.filters[d.k])+1)%c.length];refresh();break;
   case 'clearfilters':S.filters={role:'Any',mkt:'Any',size:'Any'};S.q='';refresh();break;
   case 'netrole':S.netRole=d.r;refresh();break;
   case 'connect':S.connected[d.id]=!S.connected[d.id];refresh();toast(S.connected[d.id]?'Connection request sent':'Disconnected');break;
   case 'intro':if(S.intro[d.p]){toast('Already requested');break}introModal(d.p,d.d,'intro');break;
   case 'access':if(S.requested[d.d]){toast('Already requested');break}introModal(d.p,d.d,'access');break;
   case 'confirmreq':
     if(d.k==='access'){S.requested[d.d]=true;S.intro[d.p]=true}else S.intro[d.p]=true;
     closeModal();toast('Request sent ✓');
     if(d.k==='intro'){ if(!THREADS[d.p]||!THREADS[d.p].length){THREADS[d.p]=[['l','Thanks for reaching out — I\'ve received your intro request.']]} if(location.hash==='#thread/'+d.p)refresh();else go('thread/'+d.p)}
     else refresh();
     break;
   case 'send':doSend();break;
   case 'role':S.ob.role=d.r;refresh();break;
   case 'obnext':
     var o=S.ob;
     if(o.step===1){var code=($('#code').value||'').trim().toUpperCase();o.code=code;if(!/^FD-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)){$('#codeerr').textContent='Enter a valid invite code (FD-XXXX-XXXX).';break}}
     if(o.step===3){o.lic=$('#lic').value;o.ref=$('#ref').value;if(!/^\S+@\S+\.\S+$/.test(o.ref)){$('#referr').textContent='Add a valid reference email.';break}}
     o.step++;refresh();break;
   case 'obback':S.ob.step=Math.max(1,S.ob.step-1);refresh();break;
   case 'enter':S.obDone=true;go('feed');break;
   case 'restart':S.obDone=false;S.ob.step=1;go('onboarding');render();break;
  }
  return;
 }
 if(g){stack.push(1);go(g.dataset.go)}
});
window.addEventListener('hashchange',function(){});
if(!location.hash)history.replaceState(null,'','#onboarding');
render();
})();
