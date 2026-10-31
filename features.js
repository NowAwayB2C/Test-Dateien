(function(){
"use strict";
// Preserve meaningful product variants in brackets: salted and unsalted are not interchangeable.
function canonical(value){
 const n=String(value||"").toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[()]/g," ").replace(/[^a-z0-9äöüß ]/g," ").replace(/\s+/g," ").trim();
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
  if(!l.checkedKeys||typeof l.checkedKeys!=="object"){
   l.checkedKeys={};
   for(const i of l.manualItems){if(i.checked){const q=amount(i.quantity);if(q)l.checkedKeys["sum:"+canonical(i.name)+"|"+q.dim]=true;}}
  }
 }
 function freshAll(){for(const l of state.lists)sync(l);save();ctx.renderItems();ctx.renderSidebar();render();}
 function sync(l){
  ensure(l);
  const groups=new Map(),unparsed=[],previous=new Map(arr(l.items).map(i=>[i.id,i]));
  function group(name,parsed,manualId,recipeTitle,recipeId){
   const label=uniqueName(name),key=canonical(label)+"|"+parsed.dim;
   if(!label)return;
   let g=groups.get(key);
   if(!g){g={key,name:label,dim:parsed.dim,unit:parsed.unit,total:0,manualIds:[],recipes:[],recipeUsage:[],manualCount:0};groups.set(key,g);}
   g.total+=parsed.value;
   if(manualId){g.manualIds.push(manualId);g.manualCount++;}
   if(recipeTitle){g.recipes.push(recipeTitle);g.recipeUsage.push({id:recipeId||'',title:recipeTitle,amount:parsed.value});}
  }
  for(const item of l.manualItems){
   if(!item||!uniqueName(item.name))continue;
   const p=parseManualQty(item.quantity);
   if(p)group(item.name,p,item.id,null);
   else unparsed.push({...item,id:String(item.id||makeId()),name:uniqueName(item.name),source:"manual",manualIds:[item.id],recipeCount:0,recipeUsage:[]});
  }
  for(const selection of l.selectedRecipes){
   const recipe=state.recipes.find(r=>r.id===selection.recipeId);
   if(!recipe)continue;
   const portions=Math.max(.1,Math.min(100,Number(selection.portions)||Number(recipe.portions)||2));
   const scale=portions/Math.max(.1,Number(recipe.portions)||2);
   for(const ing of arr(recipe.ingredients)){
    const p=amount(ing.amount,ing.unit);
    if(!p||p.value<=0){unparsed.push({id:"free:"+recipe.id+":"+canonical(ing.name),name:uniqueName(ing.name),quantity:String(ing.amount||"")+" "+String(ing.unit||""),checked:false,source:"recipe",manualIds:[],recipeCount:1,recipes:[recipe.title],recipeUsage:[{id:recipe.id,title:recipe.title,amount:null,quantity:"Menge prüfen"}],breakdown:"Menge im Rezept überprüfen: "+recipe.title});continue;}
    group(ing.name,{...p,value:p.value*scale},null,recipe.title,recipe.id);
   }
  }
  const unknownByName=new Map(),remainingUnknown=[];
  for(const item of unparsed){
   if(item.source!=="manual"){remainingUnknown.push(item);continue;}
   const key=canonical(item.name);
   const known=[...groups.values()].filter(g=>canonical(g.name)===key);
   if(known.length===1){
    known[0].manualIds.push(...item.manualIds);
    known[0].hasUnknownAmount=true;
    continue;
   }
   if(unknownByName.has(key)){
    const original=unknownByName.get(key);
    original.manualIds.push(...item.manualIds);
    original.breakdown="Dieser Artikel wurde mehrfach ohne Menge eingegeben. Bitte Menge ergänzen.";
   }else unknownByName.set(key,{...item});
  }
  const result=[...remainingUnknown,...unknownByName.values()];
  const fullyCovered=[];
  for(const g of groups.values()){
   let stock=0;
   for(const p of state.pantry){
    if(canonical(p.name)!==canonical(g.name))continue;
    const quantity=amount(p.amount,p.unit);
    if(quantity?.dim===g.dim)stock+=quantity.value;
   }
   const usedStock=Math.min(g.total,stock);
   const remaining=Math.max(0,Math.round((g.total-stock)*10000)/10000);
   const uniqueRecipes=[...new Map(g.recipeUsage.map(u=>[u.id,u.title])).entries()].map(([id,title])=>({id,title}));
   const usages=g.recipeUsage.map(u=>({...u,quantity:formatQty(u.amount,g.dim,g.unit)}));
   const id="sum:"+g.key;
   const quantity=remaining>0?formatQty(remaining,g.dim,g.unit):"Menge prüfen";
   if(previous.has(id)&&previous.get(id).quantity!==quantity)delete l.checkedKeys[id];
   const metadata={
    id,name:g.name,source:"combined",manualIds:g.manualIds,
    recipeCount:uniqueRecipes.length,recipes:uniqueRecipes,recipeUsage:usages,
    manualCount:g.manualCount,hasUnknownAmount:!!g.hasUnknownAmount,
    neededText:formatQty(g.total,g.dim,g.unit),
    availableText:stock>0?formatQty(usedStock,g.dim,g.unit):"",
    stockText:stock>0?formatQty(stock,g.dim,g.unit):"",
    buyText:formatQty(remaining,g.dim,g.unit),
    stockRatio:g.total>0?Math.max(0,Math.min(1,usedStock/g.total)):0,
    stockPartial:usedStock>0&&remaining>0,
    stockCovered:stock>=g.total&&g.total>0,
    hasStock:stock>0,
    dim:g.dim,
    breakdown:"Gesamt "+formatQty(g.total,g.dim,g.unit)+(stock?" · Zuhause "+formatQty(usedStock,g.dim,g.unit):"")+(uniqueRecipes.length?" · Gerichte: "+uniqueRecipes.map(r=>r.title).join(", "):"")+(g.hasUnknownAmount?" · Zusätzlich ohne Mengenangabe notiert":"")
   };
   if(remaining<=0&&!g.hasUnknownAmount){
    fullyCovered.push({...metadata,quantity:"0 "+g.unit,checked:false});
    continue;
   }
   result.push({...metadata,quantity,checked:!!l.checkedKeys[id]});
  }
  l.coveredItems=fullyCovered;
  const seen=new Set();
  l.items=result.filter(x=>{if(!x||seen.has(x.id))return false;seen.add(x.id);return true;});
  return l.items;
 }
 function sections(l){
  ensure(l);
  const selected=l.selectedRecipes.map(selection=>{
   const recipe=state.recipes.find(r=>r.id===selection.recipeId);
   if(!recipe)return null;
   return {key:"recipe:"+recipe.id,title:recipe.title,type:"recipe",recipeId:recipe.id,
    portions:selection.portions||recipe.portions,items:[]};
  }).filter(Boolean);
  const byId=new Map(selected.map(x=>[x.recipeId,x]));
  const shared={key:"shared",title:"Für mehrere Gerichte",type:"shared",items:[]};
  const additional={key:"manual",title:"Weitere Einkäufe",type:"manual",items:[]};
  const covered={key:"covered",title:"Schon zuhause",type:"covered",items:[]};
  for(const item of arr(l.items)){
   const involved=arr(item.recipes);
   if(involved.length>1){shared.items.push(item);continue;}
   if(involved.length===1&&byId.has(involved[0].id)){
    byId.get(involved[0].id).items.push(item);
    continue;
   }
   additional.items.push(item);
  }
  covered.items=arr(l.coveredItems);
  return [shared,...selected,additional,covered].filter(s=>s.type==="recipe"||s.items.length>0);
 }
 function onCheck(item,checked){const l=active();l.checkedKeys[item.id]=checked;item.checked=checked;l.updated=now();save();ctx.renderItems();}
 function applyAI(response){
  const l=active();
  l.manualItems=response.items.map(x=>({...x,source:"manual"}));

  // Plan and update several meals in one AI request.
  // All quantities are computed locally after the edits.
  const changes=Array.isArray(response.recipeChanges)?response.recipeChanges:
    (response.recipeAction&&response.recipeAction!=="none"?[{action:response.recipeAction,recipe:response.recipe,addToList:response.addRecipeToList}]:[]);
  for(const instruction of changes.slice(0,12)){
   if(!instruction||typeof instruction!=="object")continue;
   const operation=String(instruction.action||"").toLowerCase();
   const incoming=instruction.recipe&&typeof instruction.recipe==="object"?instruction.recipe:instruction;
   const id=String(incoming.id||instruction.id||"");
   const title=uniqueName(incoming.title||instruction.title||"");
   const existing=state.recipes.find(x=>x.id===id)||(title?state.recipes.find(x=>canonical(x.title)===canonical(title)):null);
   const recipeId=existing?.id||"";
   if(operation==="delete"){
    if(!recipeId)continue;
    state.recipes=state.recipes.filter(x=>x.id!==recipeId);
    for(const a of state.lists)a.selectedRecipes=arr(a.selectedRecipes).filter(s=>s.recipeId!==recipeId);
    continue;
   }
   if(operation==="unselect"){
    if(recipeId)l.selectedRecipes=l.selectedRecipes.filter(s=>s.recipeId!==recipeId);
    continue;
   }
   if(operation==="select"){
    if(!recipeId)continue;
    const portions=Number(instruction.selectedPortions||instruction.portions)||existing.portions;
    if(portions>0&&portions<=100){
     const selection=l.selectedRecipes.find(s=>s.recipeId===recipeId);
     if(selection)selection.portions=portions;
     else l.selectedRecipes.push({recipeId,portions});
    }
    continue;
   }
   if(operation!=="upsert")continue;
   const ingredients=arr(incoming.ingredients).slice(0,65).map(i=>({name:uniqueName(i.name),amount:number(i.amount),unit:String(i.unit||"Stück").slice(0,30)})).filter(i=>i.name&&i.amount!==null&&i.amount>0);
   if(!title||!ingredients.length)continue;
   const portions=Math.max(1,Math.min(40,Number(incoming.portions)||2));
   const recipe={id:recipeId||makeId(),title,portions,ingredients,steps:arr(incoming.steps).slice(0,10).map(s=>String(s).slice(0,500))};
   if(existing)state.recipes=state.recipes.map(x=>x.id===existing.id?recipe:x);
   else state.recipes.unshift(recipe);
   // Plan new meals by default; a recipe idea can opt out.
   if(instruction.addToList!==false){
    const desired=Number(instruction.selectedPortions||instruction.portions)||portions;
    const selectedPortions=Math.max(1,Math.min(100,desired));
    const selection=l.selectedRecipes.find(s=>s.recipeId===recipe.id);
    if(selection)selection.portions=selectedPortions;
    else l.selectedRecipes.push({recipeId:recipe.id,portions:selectedPortions});
   }
  }
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
 function render(){
  const pantry=$("pantryRows");
  pantry.replaceChildren();
  if(!state.pantry.length){
   pantry.append(element("p","helper-note","Noch keine Vorräte erfasst. Sage der KI, welche Lebensmittel du zuhause hast."));
  }
  for(const product of state.pantry){
   const line=element("div","data-line pantry-readonly");
   line.append(element("strong","data-name",product.name));
   const amountText=niceNumber(number(product.amount)??0)+" "+String(product.unit||"Stück");
   line.append(element("span","pantry-amount",amountText));
   pantry.append(line);
  }
  const count=active().selectedRecipes.length;
  const pantryCount=document.getElementById("pantryCount");
  if(pantryCount)pantryCount.textContent=state.pantry.length
   ?state.pantry.length+" Produkt"+(state.pantry.length===1?"":"e")+" zuhause"
   :"Noch keine Vorräte";
 }
 state.lists.forEach(sync);
 return {ensure,sync,sections,render,onCheck,applyAI,number,amount,canonical};
}
window.ZettelFeatures={init};
})();
