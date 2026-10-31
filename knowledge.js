(function(){
"use strict";
const DATABASE="zettelwerk_wissen_v1";
const STORES={recipe:"recipes",shopping_list:"shopping_lists"};
const STOP=new Set(["und","oder","der","die","das","den","dem","des","ein","eine","einen","einem","einer","mit","für","von","aus","nach","wie","ich","mir","bitte","kann","soll","möchte","will","habe","hab","noch","schon","mal","zum","zur","bei","auf","in","im","am","an","alle","alte","alten","früher","frühere","jetzt","neu","neue","rezept","rezepte","gericht","gerichte","einkauf","einkaufsliste","einkaufszettel","liste","listen","machen","erstellen","plane","planen","erstell","speicher","speichern","archiv","archivieren","eintragen","hinterlegen","merken","merke","zeige","was","wir","uns","heute","morgen","wieder"]);
const clean=x=>String(x??"").replace(/\s+/g," ").trim();
const cap=(x,n)=>clean(x).slice(0,n);
const arr=x=>Array.isArray(x)?x:[];
function tokenize(input){return [...new Set(clean(input).toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)))];}
function open(){
 return new Promise((resolve,reject)=>{
  if(!("indexedDB" in window))return reject(Error("Der Browser unterstützt keine lokale Datenbank."));
  const req=indexedDB.open(DATABASE,1);
  req.onupgradeneeded=()=>{
   const db=req.result;
   for(const name of Object.values(STORES)){
    if(!db.objectStoreNames.contains(name)){
     const store=db.createObjectStore(name,{keyPath:"id"});
     store.createIndex("source","source",{unique:false});
    }
   }
  };
  req.onsuccess=()=>resolve(new Knowledge(req.result));
  req.onerror=()=>reject(req.error||Error("Die Datenbank konnte nicht geöffnet werden."));
  req.onblocked=()=>reject(Error("Bitte andere geöffnete Zettelwerk Tabs schließen und erneut laden."));
 });
}
class Knowledge{
 constructor(db){this.db=db;}
 transaction(name,mode,handler){
  return new Promise((resolve,reject)=>{
   const tx=this.db.transaction(name,mode),store=tx.objectStore(name);
   let output;
   tx.oncomplete=()=>resolve(output);
   tx.onerror=()=>reject(tx.error||Error("Fehler beim Schreiben der lokalen Datenbank."));
   tx.onabort=()=>reject(tx.error||Error("Datenbankänderung abgebrochen."));
   try{handler(store,v=>{output=v;});}catch(e){tx.abort();reject(e);}
  });
 }
 all(kind){
  const name=STORES[kind];if(!name)return Promise.reject(Error("Unbekannte Datenkategorie."));
  return this.transaction(name,"readonly",(store,set)=>{const req=store.getAll();req.onsuccess=()=>set(req.result||[]);});
 }
 async snapshot(){
  const [recipes,lists]=await Promise.all([this.all("recipe"),this.all("shopping_list")]);
  return {recipes:recipes.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)),
          shoppingLists:lists.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))};
 }
 normalizeAction(raw){
  if(!raw||typeof raw!=="object")return null;
  const action=clean(raw.action||"save").toLowerCase();
  if(!["save","delete"].includes(action))return null;
  const kind=raw.kind==="recipe"?"recipe":raw.kind==="shopping_list"?"shopping_list":null;
  if(!kind)return null;
  const id=cap(raw.id,90);
  if(action==="delete")return id?{action,kind,id}:null;
  const title=cap(raw.title,120);
  if(!title)return null;
  const note=cap(raw.notes,400);
  if(kind==="shopping_list"){
   const items=arr(raw.items).slice(0,120).map(i=>({name:cap(i?.name,110),quantity:cap(i?.quantity,45)})).filter(i=>i.name);
   const rawText=String(raw.rawText||"").trim().slice(0,60000);
   if(!items.length&&!rawText)return null;
   return {action,kind,id,title,notes:note,items,rawText};
  }
  const portions=Math.max(1,Math.min(100,Number(raw.portions)||2));
  const ingredients=arr(raw.ingredients).slice(0,90).map(i=>({name:cap(i?.name,110),amount:Number(i?.amount),unit:cap(i?.unit||"Stück",25)})).filter(i=>i.name&&Number.isFinite(i.amount)&&i.amount>0);
  if(!ingredients.length)return null;
  return {action,kind,id,title,notes:note,portions,ingredients,steps:arr(raw.steps).slice(0,20).map(x=>cap(x,500)).filter(Boolean)};
 }
 async applyActions(actions){
  const normalized=arr(actions).slice(0,12).map(x=>this.normalizeAction(x)).filter(Boolean);
  if(!normalized.length)return 0;
  // Write each category in one transaction; never permit model generated IDs to replace active recipes.
  const results=[];
  for(const kind of ["shopping_list","recipe"]){
   const set=normalized.filter(x=>x.kind===kind);
   if(!set.length)continue;
   const existing=await this.all(kind);
   const byId=new Map(existing.map(x=>[x.id,x]));
   const now=Date.now();
   const ops=[];
   for(const a of set){
    const old=a.id?byId.get(a.id):null;
    if(a.action==="delete"){
     if(old&&old.source==="archive")ops.push({action:"delete",id:a.id});
     continue;
    }
    if(old&&old.source!=="archive")continue;
    const id=old?.id||"arch:"+kind+":"+(globalThis.crypto?.randomUUID?.()||String(now)+Math.random().toString(36).slice(2));
    const record={...a,id,source:"archive",createdAt:old?.createdAt||now,updatedAt:now};
    delete record.action;delete record.kind;
    ops.push({action:"put",record});
    byId.set(id,record);
   }
   if(ops.length){
    await this.transaction(STORES[kind],"readwrite",store=>{
     for(const operation of ops)operation.action==="delete"?store.delete(operation.id):store.put(operation.record);
    });
    results.push(...ops);
   }
  }
  return results.length;
 }
 async migrateLegacy(examples){
  const list=arr(examples);
  if(!list.length)return;
  await this.transaction(STORES.shopping_list,"readwrite",store=>{
   for(const old of list){
    const rawText=String(old?.text||"").trim().slice(0,60000);
    if(!rawText)continue;
    const id="legacy:"+cap(old.id||old.title,90);
    store.put({id,source:"archive",title:cap(old.title||"Früherer Einkaufszettel",120),items:[],rawText,notes:"Aus bisherigen Textbeispielen übernommen",createdAt:Date.now(),updatedAt:Date.now()});
   }
  });
 }
 async mirrorRecipes(recipes){
  const existing=await this.all("recipe");
  const active=existing.filter(x=>x.source==="active");
  const current=arr(recipes).slice(0,200).map(r=>({
   id:"active:"+cap(r.id,90),originalId:cap(r.id,90),source:"active",title:cap(r.title,120),
   portions:Number(r.portions)||2,
   ingredients:arr(r.ingredients).slice(0,90).map(i=>({name:cap(i.name,110),amount:Number(i.amount),unit:cap(i.unit,25)})),
   steps:arr(r.steps).slice(0,20).map(s=>cap(s,500)),updatedAt:Date.now()
  })).filter(r=>r.originalId&&r.title);
  const ids=new Set(current.map(x=>x.id));
  await this.transaction(STORES.recipe,"readwrite",store=>{
   for(const old of active)if(!ids.has(old.id))store.delete(old.id);
   for(const item of current)store.put(item);
  });
 }
 // Only the query and a tiny result set are transferred to the AI on an explicit generation request.
 // Search and ranking happen entirely inside the browser.
 async relevant(input,{recipes=false,shoppingLists=false,limit=3}={}){
  if(!recipes&&!shoppingLists)return {recipes:[],shoppingLists:[]};
  const terms=tokenize(input);
  const [allRecipes,allLists]=await Promise.all([
   recipes?this.all("recipe"):Promise.resolve([]),
   shoppingLists?this.all("shopping_list"):Promise.resolve([])
  ]);
  function pick(records){
   const ranked=records.map(record=>{
    const title=tokenize(record.title);
    const content=tokenize([
     ...arr(record.items).map(x=>x.name),
     ...arr(record.ingredients).map(x=>x.name),
     cap(record.rawText,2500)
    ].join(" "));
    const score=terms.reduce((acc,t)=>acc+(title.some(w=>w===t||w.startsWith(t)||t.startsWith(w))?5:0)+(content.some(w=>w===t||w.startsWith(t)||t.startsWith(w))?2:0),0);
    return {record,score};
   }).sort((a,b)=>b.score-a.score||(b.record.updatedAt||0)-(a.record.updatedAt||0));
   const positive=ranked.filter(x=>x.score>0);
   const relevant=positive.length?positive:(terms.length===0?ranked.slice(0,Math.min(2,limit)):[]);
   return relevant.slice(0,limit).map(({record})=>({
    id:record.id,title:record.title,source:record.source,
    ...(record.items?{items:record.items.slice(0,80)}:{}),
    ...(record.rawText?{rawText:record.rawText.slice(0,2500)}:{}),
    ...(record.ingredients?{portions:record.portions,ingredients:record.ingredients.slice(0,75),steps:arr(record.steps).slice(0,12)}:{})
   }));
  }
  return {recipes:pick(allRecipes),shoppingLists:pick(allLists)};
 }
}
function route(input){
 const s=clean(input).toLocaleLowerCase("de");
 const archiveTarget=/\b(archiv|archiviert|vorlage|frühere[nr]?|alten?|bisherigen?|gespeicherte[nr]?)\b/.test(s)||
  /\b(rezept(e|en)?|einkaufslisten?|einkaufszettel)\b/.test(s);
 const storeVerb=/\b(archivier\w*|speicher\w*|merk\w*|hinterleg\w*|trage.{0,12}archiv|füge.{0,12}archiv)\b/.test(s);
 const store=archiveTarget&&storeVerb;
 const shopping=/\b(einkaufszettel|einkaufslisten?|wochen[e]?inkauf|lebensmittelbedarf)\b/.test(s)||/\b(wie\s+(sonst|früher|immer))\s+einkauf/.test(s);
 const recipes=/\b(rezept(e|en)?|gerichte?|kochen|abendessen|mittagessen|frühstück|menü|mahlzeiten?|essen\s+für)\b/.test(s);
 const wantGeneration=/\b(erstell\w*|plan\w*|mach\w*|generier\w*|stell.{0,10}zusammen|schlag\w*|such\w*|find\w*|zeig\w*|nutz\w*|verwend\w*)\b/.test(s);
 const explicitRetrieve=/\b(wie\s+(früher|damals|immer)|aus\s+meinem\s+archiv|aus\s+den\s+(alten|früheren)|mein\s+gespeichertes)\b/.test(s);
 const deletion=/\b(lösch\w*|entfern\w*|vergiss\w*)\b/.test(s);
 const archiveIndex=deletion&&/\b(archiv|archiviert|früher\w*|alt\w*|gespeichert\w*)\b/.test(s);
 return {store,planning:wantGeneration,recipeLookup:!store&&(wantGeneration||explicitRetrieve)&&recipes,
  shoppingLookup:!store&&(wantGeneration||explicitRetrieve)&&shopping,archiveIndex};
}
window.ZettelKnowledge={open,route,tokenize};
})();
