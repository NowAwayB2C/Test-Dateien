(function(){
"use strict";
function canonical(value){
 const n=String(value||"").toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\([^)]*\)/g,"").replace(/[^a-z0-9äöüß ]/g," ").replace(/\s+/g," ").trim();
 const a={"eier":"ei","huhnereier":"ei","huhnerei":"ei","tomaten":"tomate","paradeiser":"tomate","paradeisern":"tomate","erdapfel":"kartoffel","erdapfeln":"kartoffel","kartoffeln":"kartoffel","zwiebeln":"zwiebel","karotten":"karotte","mohren":"karotte","moehren":"karotte","mozzarellakase":"mozzarella","butterpackung":"butter","milchpackung":"milch","apfel":"apfel","apfeln":"apfel","aepfel":"apfel","apfeln":"apfel"};
 return a[n]||n;
}
function number(v){
 if(typeof v==="number")return Number.isFinite(v)?v:null;
 let s=String(v??"").trim().replace(/½/g,"0,5").replace(/¼/g,"0,25").replace(/¾/g,"0,75").toLowerCase();
 if(/^(ein(?:e|en|em|er)?\s+)?halb(?:e|en|es|er)?$/.test(s))return .5;
 const f=s.match(/^(\d+)\s*\/\s*(\d+)$/);if(f)return +f[2] ? +f[1]/+f[2]:null;
 const n=Number(s.replace(",","."));return Number.isFinite(n)&&s!==""?n:null;
}
function unitInfo(unit){
 const u=String(unit||"").trim().toLowerCase().replace(/\./g,"");
 if(["g","gramm","gram","gr"].includes(u))return {unit:"g",factor:1,dim:"mass"};
 if(["kg","kilogramm"].includes(u))return {unit:"g",factor:1000,dim:"mass"};
 if(["ml","milliliter"].includes(u))return {unit:"ml",factor:1,dim:"volume"};
 if(["l","liter"].includes(u))return {unit:"ml",factor:1000,dim:"volume"};
 if(["stk","stück","stueck","stück(e)","st","x","ei","eier",""].includes(u))return {unit:"Stück",factor:1,dim:"count"};
 if(["packung","packungen","pack","pkg","pck","pk","päckchen","paeckchen"].includes(u))return {unit:"Packung",factor:1,dim:"pack"};
 if(["dose","dosen"].includes(u))return {unit:"Dose",factor:1,dim:"dose"};
 if(["el","esslöffel","essloeffel"].includes(u))return {unit:"EL",factor:1,dim:"EL"};
 if(["tl","teelöffel","teeloeffel"].includes(u))return {unit:"TL",factor:1,dim:"TL"};
 return {unit:String(unit||"Stück").trim(),factor:1,dim:"custom:"+u};
}
function amount(raw,explicitUnit){
 if(typeof raw==="number"){const u=unitInfo(explicitUnit);return raw>=0&&Number.isFinite(raw)?{value:raw*u.factor,dim:u.dim,unit:u.unit}:null;}
 const s=String(raw??"").trim();if(!s)return null;
 const match=s.match(/^(0[.,]\d+|\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+|½|¼|¾|halb(?:e|en|es|er)?)(?:\s*x)?\s*(.*)$/i);
 if(!match)return null;
 const n=number(match[1]);if(n===null||n<0)return null;
 const u=unitInfo(explicitUnit||match[2]||"Stück");
 return {value:n*u.factor,dim:u.dim,unit:u.unit};
}
function niceNumber(v){return Number((Math.round(v*10000)/10000).toFixed(4)).toLocaleString("de-AT",{maximumFractionDigits:3});}
function formatQty(value,dim,unit){
 if(dim==="mass"&&value>=1000&&value%1000===0)return niceNumber(value/1000)+" kg";
 if(dim==="volume"&&value>=1000&&value%1000===0)return niceNumber(value/1000)+" l";
 return niceNumber(value)+" "+unit;
}
function parseManualQty(q){return amount(q||"");}
function arr(a){return Array.isArray(a)?a:[];}
function uniqueName(name){return String(name||"").trim().slice(0,110);}
function init(ctx){
 const {state,active,save,toast,makeId,now,$}=ctx;
 state.pantry=arr(state.pantry);
 state.recipes=arr(state.recipes);
 state.lists.forEach(ensure);
 function ensure(l){
  if(!Array.isArray(l.manualItems))l.manualItems=arr(l.items).filter(x=>x.source!=="recipe"&&x.source!=="combined").map(x=>({...x}));
  l.selectedRecipes=arr(l.selectedRecipes);
  if(!l.checkedKeys||typeof l.checkedKeys!=="object")l.checkedKeys={};
 }
 function freshAll(){for(const l of state.lists)sync(l);save();ctx.renderItems();ctx.renderSidebar();render();}
 function sync(l){
  ensure(l);
  const groups=new Map(),unparsed=[];
  function group(name,parsed,manualId,recipeTitle){
   const label=uniqueName(name),key=canonical(label)+"|"+parsed.dim;
   if(!label)return;
   let g=groups.get(key);
   if(!g){g={key,name:label,dim:parsed.dim,unit:parsed.unit,total:0,manualIds:[],recipes:[],manualCount:0};groups.set(key,g);}
   g.total+=parsed.value;
   if(manualId){g.manualIds.push(manualId);g.manualCount++;}
   if(recipeTitle)g.recipes.push(recipeTitle);
  }
  for(const item of l.manualItems){
   if(!item||!uniqueName(item.name))continue;
   const p=parseManualQty(item.quantity);
   if(p)group(item.name,p,item.id,null);
   else unparsed.push({...item,id:String(item.id||makeId()),name:uniqueName(item.name),source:"manual",manualIds:[item.id],recipeCount:0});
  }
  for(const selection of l.selectedRecipes){
   const recipe=state.recipes.find(r=>r.id===selection.recipeId);
   if(!recipe)continue;
   const portions=Math.max(.1,Math.min(100,Number(selection.portions)||Number(recipe.portions)||2));
   const scale=portions/Math.max(.1,Number(recipe.portions)||2);
   for(const ing of arr(recipe.ingredients)){
    const p=amount(ing.amount,ing.unit);
    if(!p||p.value<=0){unparsed.push({id:"free:"+recipe.id+":"+canonical(ing.name),name:uniqueName(ing.name),quantity:String(ing.amount||"")+" "+String(ing.unit||""),checked:false,source:"recipe",manualIds:[],recipeCount:1,breakdown:"Menge im Rezept überprüfen: "+recipe.title});continue;}
    group(ing.name,{...p,value:p.value*scale},null,recipe.title);
   }
  }
  const result=[...unparsed];
  for(const g of groups.values()){
   let stock=0;
   for(const p of state.pantry){
    if(canonical(p.name)!==canonical(g.name))continue;
    const quantity=amount(p.amount,p.unit);
    if(quantity?.dim===g.dim)stock+=quantity.value;
   }
   const remaining=Math.max(0,Math.round((g.total-stock)*10000)/10000);
   if(remaining<=0)continue;
   const id="sum:"+g.key;
   result.push({id,name:g.name,quantity:formatQty(remaining,g.dim,g.unit),checked:!!l.checkedKeys[id],source:"combined",manualIds:g.manualIds,recipeCount:g.recipes.length,breakdown:"Gesamt "+formatQty(g.total,g.dim,g.unit)+(stock?" · Zuhause "+formatQty(stock,g.dim,g.unit):"")+(g.recipes.length?" · Gerichte: "+[...new Set(g.recipes)].join(", "):""),dim:g.dim});
  }
  const seen=new Set();
  l.items=result.filter(x=>{if(!x||seen.has(x.id))return false;seen.add(x.id);return true;});
  return l.items;
 }
 function replaceManual(item,name,quantity){
  const l=active();ensure(l);
  const ids=new Set(item.manualIds||[item.id]);
  l.manualItems=l.manualItems.filter(x=>!ids.has(x.id));
  l.manualItems.push({id:makeId(),name:uniqueName(name),quantity:String(quantity||"").trim().slice(0,50),checked:false});
  delete l.checkedKeys[item.id];
  l.updated=now();freshAll();
 }
 function onEdit(item,field,value){
  if(item.recipeCount>0){toast("Diese Position stammt aus einem Gericht. Passe das Gericht per KI an oder ändere die Vorräte.");ctx.renderItems();return;}
  replaceManual(item,field==="name"?value:item.name,field==="quantity"?value:item.quantity);
 }
 function onRemove(item){
  if(item.recipeCount>0){toast("Diese Zutat wird für ein Gericht benötigt. Entferne das Gericht oder ändere es zuerst.");return;}
  const l=active();const ids=new Set(item.manualIds||[item.id]);
  l.manualItems=l.manualItems.filter(x=>!ids.has(x.id));delete l.checkedKeys[item.id];l.updated=now();freshAll();
 }
 function onCheck(item,checked){const l=active();l.checkedKeys[item.id]=checked;item.checked=checked;l.updated=now();save();ctx.renderItems();}
 function addManual(name,quantity=""){const l=active();l.manualItems.push({id:makeId(),name:uniqueName(name),quantity:String(quantity||""),checked:false});l.updated=now();freshAll();}
 function applyAI(response){
  const l=active();
  l.manualItems=response.items.map(x=>({...x,source:"manual"}));
  const change=String(response.recipeAction||"none");
  if(change==="upsert"&&response.recipe){
   const r=response.recipe;
   const title=uniqueName(r.title);
   const ingredients=arr(r.ingredients).slice(0,65).map(i=>({name:uniqueName(i.name),amount:number(i.amount),unit:String(i.unit||"Stück").slice(0,30)})).filter(i=>i.name&&i.amount!==null&&i.amount>0);
   if(title&&ingredients.length){
    const identified=state.recipes.find(x=>x.id===r.id)||state.recipes.find(x=>canonical(x.title)===canonical(title));
    const recipe={id:identified?.id||makeId(),title,portions:Math.max(1,Math.min(40,Number(r.portions)||2)),ingredients,steps:arr(r.steps).slice(0,10).map(s=>String(s).slice(0,500))};
    if(identified)state.recipes=state.recipes.map(x=>x.id===identified.id?recipe:x);
    else state.recipes.unshift(recipe);
   }
  }
  if(change==="delete"&&response.recipe?.id){state.recipes=state.recipes.filter(x=>x.id!==response.recipe.id);for(const a of state.lists)a.selectedRecipes=a.selectedRecipes.filter(s=>s.recipeId!==response.recipe.id);}
  for(const p of arr(response.pantryChanges).slice(0,30)){
   const n=uniqueName(p.name),v=number(p.amount),u=String(p.unit||"Stück").slice(0,30);if(!n)continue;
   const idx=state.pantry.findIndex(x=>canonical(x.name)===canonical(n)&&unitInfo(x.unit).dim===unitInfo(u).dim);
   if(p.operation==="remove"){if(idx>=0)state.pantry.splice(idx,1);continue;}
   if(v===null||v<0)continue;
   const d=unitInfo(u),current=idx>=0?amount(state.pantry[idx].amount,state.pantry[idx].unit)?.value||0:0;
   let base=v*d.factor;
   if(p.operation==="add")base+=current;
   if(p.operation==="subtract")base=Math.max(0,current-base);
   if(idx>=0)state.pantry[idx]={id:state.pantry[idx].id,name:n,amount:Number((base/d.factor).toFixed(4)),unit:u};
   else state.pantry.push({id:makeId(),name:n,amount:v,unit:u});
  }
  l.updated=now();for(const list of state.lists)sync(list);save();render();
 }
 function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
 function action(text,fn){const b=element("button","btn-quiet",text);b.type="button";b.addEventListener("click",fn);return b;}
 function render(){
  const pantry=$("pantryRows");pantry.replaceChildren();
  if(!state.pantry.length)pantry.append(element("p","helper-note","Noch keine Vorräte erfasst."));
  for(const p of state.pantry){
   const line=element("div","data-line");
   const name=element("strong","data-name",p.name);
   const qty=element("input","data-number");qty.type="number";qty.min="0";qty.step="any";qty.value=String(p.amount);qty.setAttribute("aria-label","Vorrat "+p.name);
   const unit=element("select","data-unit");
   for(const u of ["g","kg","ml","l","Stück","Packung","Dose","EL","TL"]){const o=element("option","",u);o.value=u;if(p.unit===u)o.selected=true;unit.append(o);}
   const changed=()=>{p.amount=Math.max(0,Number(qty.value)||0);p.unit=unit.value;freshAll();};
   qty.addEventListener("change",changed);unit.addEventListener("change",changed);
   line.append(name,qty,unit,action("×",()=>{state.pantry=state.pantry.filter(x=>x.id!==p.id);freshAll();}));
   pantry.append(line);
  }
  const recipes=$("recipeCards");recipes.replaceChildren();
  if(!state.recipes.length)recipes.append(element("p","helper-note","Frag die KI zum Beispiel: Erstelle ein Rezept für Lasagne für 4 Personen."));
  const l=active();
  for(const r of state.recipes){
   const card=element("article","recipe-card");
   card.append(element("h3","",r.title));
   const subtitle=element("p","helper-note","Grundrezept für "+r.portions+" Portionen");
   card.append(subtitle);
   const list=element("div","recipe-ingredients");
   for(const i of arr(r.ingredients))list.append(element("span","",i.name+" · "+niceNumber(i.amount)+" "+i.unit));
   card.append(list);
   if(r.steps?.length){const details=element("details","recipe-steps");details.append(element("summary","","Zubereitung"));const steps=element("ol");for(const s of r.steps)steps.append(element("li","",s));details.append(steps);card.append(details);}
   const form=element("div","recipe-actions");
   const servings=element("input","data-number");servings.type="number";servings.min="1";servings.max="100";servings.step="1";servings.value=String(l.selectedRecipes.find(s=>s.recipeId===r.id)?.portions||r.portions);servings.setAttribute("aria-label","Portionen für "+r.title);
   const selected=l.selectedRecipes.some(s=>s.recipeId===r.id);
   const add=action(selected?"Portionen aktualisieren":"Zur Liste hinzufügen",()=>{const portions=Number(servings.value);if(!Number.isFinite(portions)||portions<=0||portions>100){toast("Bitte 1 bis 100 Portionen eingeben.",true);return;}const old=l.selectedRecipes.find(s=>s.recipeId===r.id);if(old)old.portions=portions;else l.selectedRecipes.push({recipeId:r.id,portions});l.updated=now();freshAll();toast("Zutaten zusammengeführt und Vorräte abgezogen.");});
   form.append(servings,add);
   if(selected)form.append(action("Aus Liste entfernen",()=>{l.selectedRecipes=l.selectedRecipes.filter(s=>s.recipeId!==r.id);l.updated=now();freshAll();}));
   form.append(action("Mit KI anpassen",()=>{const box=$("chatInput");box.value="Passe das Gericht "+r.title+" an: ";box.focus();box.scrollIntoView({behavior:"smooth",block:"center"});}));
   form.append(action("Rezept löschen",()=>{if(!confirm("Gericht wirklich löschen?"))return;state.recipes=state.recipes.filter(x=>x.id!==r.id);for(const li of state.lists)li.selectedRecipes=li.selectedRecipes.filter(s=>s.recipeId!==r.id);freshAll();}));
   card.append(form);recipes.append(card);
  }
  const count=l.selectedRecipes.length;
  $("recipeSummary").textContent=count?count+" Gericht"+(count===1?"":"e")+" in dieser Einkaufsliste aktiv. Zutaten werden zusammengezählt und vorhandene Mengen einmal abgezogen.":"Füge ein Gericht hinzu, um seine Zutaten automatisch zu verrechnen.";
 }
 $("pantryForm").addEventListener("submit",e=>{
  e.preventDefault();const name=uniqueName($("pantryName").value);const v=Number($("pantryAmount").value),unit=$("pantryUnit").value;
  if(!name||!Number.isFinite(v)||v<0){toast("Bitte Produkt und gültige vorhandene Menge eingeben.",true);return;}
  const dim=unitInfo(unit).dim,ix=state.pantry.findIndex(p=>canonical(p.name)===canonical(name)&&unitInfo(p.unit).dim===dim);
  if(ix>=0)state.pantry[ix]={...state.pantry[ix],name,amount:v,unit};
  else state.pantry.push({id:makeId(),name,amount:v,unit});
  $("pantryName").value="";$("pantryAmount").value="";freshAll();toast("Vorrat gespeichert");
 });
 $("exampleFiles").addEventListener("change",async e=>{
  const files=Array.from(e.target.files||[]).slice(0,20);let added=0;const invalid=[];
  for(const file of files){
   if(!/\.txt$/i.test(file.name)||file.size>300000){invalid.push(file.name);continue;}
   try{const text=(await file.text()).replace(/^\uFEFF/,"").trim();if(!text)continue;state.examples.unshift({id:makeId(),title:file.name.slice(0,100),text:text.slice(0,30000)});added++;}catch{invalid.push(file.name);}
  }
  e.target.value="";if(added){state.styleInsight="";save();ctx.renderExamples();ctx.renderStyle();toast(added+" Textdatei"+(added===1?"":"en")+" als Referenz gespeichert.");}
  if(invalid.length)toast("Nicht importiert: "+invalid.slice(0,3).join(", ")+". Nur .txt bis 300 KB.",true);
 });
 $("recipeStart").addEventListener("click",()=>{const box=$("chatInput");box.value="Erstelle mir ein Gericht für 2 Personen mit einer Zutatenliste und kurzer Zubereitung.";box.focus();box.scrollIntoView({behavior:"smooth",block:"center"});});
 state.lists.forEach(sync);
 return {ensure,sync,render,addManual,onCheck,onEdit,onRemove,applyAI,number,amount,canonical};
}
window.ZettelFeatures={init};
})();
