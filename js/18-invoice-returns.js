/* v113 – Fatura bazlı koli/adet iadelerinde depo seçimi isteğe bağlı. */

/* Fatura satırının orijinal birimi muhasebe ve stok referansıdır. */
function returnPackCount(it){
 const p=(state.urunler||[]).find(x=>String(x.kod)===String(it.kod))||{};
 const original=String(it.birim||'Adet').toLocaleLowerCase('tr-TR');
 if(original==='koli'){
  const nested=Number(p.koliPaket)*Number(p.paketAdet);
  const single=Number(p.koli||p.koliIci||p.koliAdet);
  return Number.isFinite(nested)&&nested>1?nested:(Number.isFinite(single)&&single>1?single:0);
 }
 if(original==='paket'){
  const n=Number(p.paketAdet||p.koli||p.koliIci);
  return Number.isFinite(n)&&n>1?n:0;
 }
 return 1;
}
function returnUnitChoices(it){
 const unit=String(it.birim||'Adet'),lower=unit.toLocaleLowerCase('tr-TR');
 if(lower==='adet')return [{name:'Adet',factor:1}];
 const count=returnPackCount(it);
 if((lower==='koli'||lower==='paket')&&count>1)return [{name:unit,factor:1},{name:'Adet',factor:1/count}];
 return [{name:unit,factor:1}];
}
function returnSelectionUnit(i){return document.querySelector(`.return-unit[data-line="${i}"]`)?.value||'';}
function returnFactor(it,unit){return returnUnitChoices(it).find(x=>x.name===unit)?.factor||0;}
function returnUnitChanged(i){
 const order=returnOrder(),it=returnLines(order)[i],unit=returnSelectionUnit(i);
 if(!it)return;
 const factor=returnFactor(it,unit),available=returnAvailable(order,it,i),input=document.querySelector(`.return-qty[data-line="${i}"]`);
 if(input){input.max=factor?Math.floor((available/factor+1e-7)*1000)/1000:0;input.step=unit==='Adet'?'1':'0.001';input.value=input.max>0?Math.min(1,Number(input.max)):0;}
 returnCalculate();
}

function returnMoney(n){return Math.round((Number(n)||0)*100)/100;}
function returnCredits(firm,orderNo){
 return (state.customerReturns||[]).filter(r=>r.status==='Onaylandı'&&r.finance==='credit'&&r.financeDone===true&&(!firm||r.firm===firm)&&(!orderNo||r.orderNo===orderNo)).reduce((s,r)=>s+Number(r.amount||0),0);
}
function returnActiveRows(orderNo){return returnInit().filter(r=>r.orderNo===orderNo&&r.status!=='Reddedildi');}
function returnOrder(){return (state.orders||[]).find(o=>String(o.no)===String(document.getElementById('ret_order')?.value||'')&&o.firma===document.getElementById('ret_firm')?.value);}
function returnLines(order){return Array.isArray(order?.items)?order.items:[];}
function returnLineKey(it,i){return String(i);}
function returnAvailable(order,it,i){const prior=returnActiveRows(order.no).reduce((n,r)=>n+(Array.isArray(r.lines)?r.lines.filter(l=>Number(l.lineIndex)===i).reduce((a,l)=>a+Number(l.qty||0),0):(Number(r.lineIndex)===i?Number(r.qty||0):0)),0);return Math.max(0,Number(it.qty||0)-prior);}
function returnPrice(it){const qty=Number(it.qty)||0;return qty>0?returnMoney(Number(it.total||0)/qty):0;}
function returnUpdateOrders(){
 const firm=document.getElementById('ret_firm')?.value||'',sel=document.getElementById('ret_order');if(!sel)return;
 const previous=sel.value;
 sel.innerHTML='<option value="">Fatura / sipariş seçin</option>'+(state.orders||[]).filter(o=>o.firma===firm&&!['Taslak','İptal'].includes(o.durum)).map(o=>`<option value="${htmlEscape(o.no)}">${htmlEscape(o.no)} · ${htmlEscape(o.tarih||'')} · ${money(o.total||0)}</option>`).join('');
 sel.value=previous;returnUpdateProducts();
}
function returnUpdateProducts(){
 const order=returnOrder(),body=document.getElementById('returnProductRows');if(!body)return;
 body.innerHTML=order?returnLines(order).map((it,i)=>{
 const avail=returnAvailable(order,it,i),unit=returnPrice(it),choices=returnUnitChoices(it),selected=choices[0],max=Math.floor((avail/selected.factor+1e-7)*1000)/1000;
 const pick=choices.map(x=>`<option value="${htmlEscape(x.name)}">${htmlEscape(x.name)}</option>`).join('');
 return `<tr><td><input type="checkbox" class="return-check" data-line="${i}" ${avail<=0?'disabled':''} onchange="returnCalculate()"></td><td>${htmlEscape(it.kod||'')}</td><td>${htmlEscape(it.ad||'')}<div class="muted">${htmlEscape(it.birim||'')}</div></td><td>${Number(it.qty||0)}</td><td>${avail}</td><td>${money(unit)}</td><td><select class="return-unit" data-line="${i}" onchange="returnUnitChanged(${i})" ${avail<=0?'disabled':''}>${pick}</select><input class="return-qty" data-line="${i}" type="number" min="0" max="${max}" step="${selected.name==='Adet'?'1':'0.001'}" value="${max>0?Math.min(1,max):0}" oninput="returnCalculate()" style="max-width:100px" ${avail<=0?'disabled':''}></td><td class="return-line-total" data-line="${i}">₺0,00</td></tr>`;
 }).join(''):'<tr><td colspan="8" class="muted">Önce cari ve fatura seçin.</td></tr>';
 returnCalculate();
}
function returnSelected(){const order=returnOrder();if(!order)return [];
 return [...document.querySelectorAll('.return-check:checked')].map(cb=>{
 const i=Number(cb.dataset.line),it=returnLines(order)[i],field=document.querySelector(`.return-qty[data-line="${i}"]`);
 const qty=Number(field?.value),available=returnAvailable(order,it,i),unit=returnSelectionUnit(i),factor=returnFactor(it,unit),baseQty=qty*factor;
 return {i,it,qty,unit,baseQty,factor,available,amount:returnMoney(returnPrice(it)*baseQty)};
 });
}
function returnCalculate(){
 const order=returnOrder(),selected=returnSelected();let total=0;
 document.querySelectorAll('.return-line-total').forEach(el=>{const x=selected.find(s=>s.i===Number(el.dataset.line));el.textContent=money(x&&x.qty>0?x.amount:0)});
 selected.forEach(x=>{if(x.qty>0&&x.factor>0&&x.baseQty<=x.available+0.000001)total+=x.amount});
 const amount=document.getElementById('ret_amount');if(amount)amount.value=returnMoney(total).toFixed(2);
 const balance=document.getElementById('ret_balance');if(balance)balance.textContent=order?money(firmaOpenBalance(order.firma)):'₺0,00';
}
function renderReturns(){
 const firm=document.getElementById('ret_firm');if(!firm)return;
 const old=firm.value;firm.innerHTML='<option value="">Firma seçin</option>'+(state.firmalar||[]).map(f=>`<option value="${htmlEscape(f.ad)}">${htmlEscape(f.ad)}</option>`).join('');firm.value=old;
 returnUpdateOrders();
 const place=document.getElementById('ret_place');if(place){const oldPlace=place.value;place.innerHTML='<option value="">Depo seçmeyin (stok girişi yapılmaz)</option>'+stockInit().locations.filter(l=>l.active).map(l=>`<option value="${htmlEscape(l.id)}">${htmlEscape(l.name)}</option>`).join('');place.value=oldPlace;}
 const names={pending:'Karar bekliyor',credit:'Cari mahsup',refund:'Para iadesi (harici)',replace:'Ürün değişimi (harici)'};
 document.getElementById('returnRows').innerHTML=returnInit().slice().reverse().map(r=>{
 const actions=r.status==='Talep'?`<button class="btn" onclick="returnApprove('${r.id}')">Onayla ve Cari Borçtan Düş</button> <button class="btn danger" onclick="returnReject('${r.id}')">Reddet</button>`:(r.status==='Onaylandı'&&!r.financeDone&&r.finance!=='pending'?`<button class="btn" onclick="returnFinanceDone('${r.id}')">Finans Aksiyonu Tamamlandı</button>`:'—');
 const detail=(r.lines||[{product:r.product,qty:r.qty}]).map(l=>htmlEscape(l.ad||stockName(l.product))+' × '+Number(l.returnQty??l.qty)+' '+htmlEscape(l.returnUnit||l.unit||'')).join('<br>');
 return `<tr><td>${htmlEscape(String(r.date||'').slice(0,10))}<div>${htmlEscape(r.id)}</div></td><td>${htmlEscape(r.firm)}<div>Fatura: ${htmlEscape(r.orderNo||'')}</div><div>${detail}</div></td><td>${(r.lines||[]).map(l=>Number(l.returnQty??l.qty)+" "+htmlEscape(l.returnUnit||l.unit||"")).join(", ")||Number(r.qty||0)}</td><td>${htmlEscape(r.reason||'')}<div>${htmlEscape(r.status||'')}</div></td><td>${htmlEscape(names[r.finance]||r.finance||'')}<div>${money(r.amount||0)}</div><div>${r.financeDone?'Tamamlandı':'Bekliyor'}</div></td><td>${actions}</td></tr>`;
 }).join('')||'<tr><td colspan="6">Henüz iade kaydı yok.</td></tr>';
}
function returnCreate(){
 const order=returnOrder(),chosen=returnSelected(),condition=document.getElementById('ret_condition').value,place=document.getElementById('ret_place').value;
 if(!order)return alert('Cari ve fatura seçin.');
 if(!chosen.length)return alert('İade edilecek en az bir ürün seçin.');
 if(chosen.some(x=>!Number.isFinite(x.qty)||x.qty<=0||x.factor<=0||x.baseQty>x.available+0.000001||x.unit==='Adet'&&!Number.isInteger(x.qty)))return alert('İade miktarı 0’dan büyük ve faturadan kalan miktarı aşmamalı.');
 const lines=chosen.map(x=>({lineIndex:x.i,product:String(x.it.kod||''),ad:x.it.ad,unit:x.it.birim||'',qty:x.baseQty,returnQty:x.qty,returnUnit:x.unit,amount:x.amount}));
 const amount=returnMoney(lines.reduce((s,l)=>s+l.amount,0));
 if(amount<=0)return alert('Faturadaki ürün tutarı sıfır. Cari mahsup oluşturulamaz.');
 if(!confirm(`${order.no} faturası için ${money(amount)} iade talebi oluşturulsun mu? Cari borç onaydan sonra düşecektir.`))return;
 const r={id:uid('IAD'),date:new Date().toISOString(),firm:order.firma,orderNo:order.no,lines,product:lines[0].product,lineIndex:lines[0].lineIndex,qty:lines.reduce((s,l)=>s+l.qty,0),reason:document.getElementById('ret_reason').value,condition,place,finance:'credit',amount,note:document.getElementById('ret_note').value.trim(),status:'Talep',financeDone:false};
 returnInit().push(r);businessLog('return-request','Faturalı müşteri iadesi: '+r.orderNo+' / '+money(amount),{returnId:r.id});saveState();renderAll();
}
function returnApprove(id){
 const r=returnInit().find(x=>x.id===id);if(!r||r.status!=='Talep')return;
 const order=(state.orders||[]).find(o=>o.no===r.orderNo&&o.firma===r.firm);
 if(!order||['Taslak','İptal'].includes(order.durum))return alert('İlgili geçerli fatura bulunamadı.');
 if(r.condition==='saleable'&&r.place&&!stockInit().locations.some(l=>l.id===r.place&&l.active))return alert('Seçilen iade deposu aktif değil.');
 if(!confirm(`${money(r.amount)} cari borçtan düşülsün mü? ${r.condition==='saleable'&&r.place?'Sağlam ürünler seçilen depoya alınacak.':'Stok miktarı değişmeyecek.'}`))return;
 if(r.condition==='saleable'&&r.place){
   r.movementIds=[];
   for(const line of (r.lines||[{product:r.product,qty:r.qty}])){
    const movement={id:uid('STK'),date:new Date().toISOString(),place:r.place,product:String(line.product),type:'in',qty:Number(line.qty),note:'Müşteri iadesi '+r.id,returnId:r.id};stockInit().movements.push(movement);r.movementIds.push(movement.id);
   }
 }
 r.status='Onaylandı';r.approvedAt=new Date().toISOString();r.finance='credit';r.financeDone=true;r.financeDoneAt=r.approvedAt;
 businessLog('return-approve','Cari mahsuplu iade onayı: '+r.id+' / '+money(r.amount),{returnId:r.id});saveState();renderAll();
}
function returnReject(id){const r=returnInit().find(x=>x.id===id);if(!r||r.status!=='Talep')return;if(!confirm('İade talebi reddedilsin mi?'))return;r.status='Reddedildi';businessLog('return-reject','İade reddedildi: '+r.id,{returnId:r.id});saveState();renderAll();}
function returnFinanceDone(id){alert('Yeni iadelerde cari mahsup onay sırasında otomatik yapılır.');}
