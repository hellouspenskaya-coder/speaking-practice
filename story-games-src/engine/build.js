// node build.js <game folder> [runs]  — compiles story.ink, checks it, writes story.json
const fs=require('fs'),path=require('path');
const {Compiler,Story}=require('inkjs/full');
const dir=process.argv[2]; const N=+(process.argv[3]||3000);
const src=fs.readFileSync(path.join(dir,'story.ink'),'utf8');
const meta=JSON.parse(fs.readFileSync(path.join(dir,'meta.json'),'utf8'));
const words=JSON.parse(fs.readFileSync(path.join(dir,'game.words.json'),'utf8'));
const errs=[],warns=[];
const story=new Compiler(src,{errorHandler:(m,t)=>{(t===2?errs:warns).push(m)}}).Compile();
console.log(meta.slug,'compile errors',errs,'warnings',warns); if(errs.length) process.exit(1);
const json=story.ToJson().replace(/^﻿/,''); fs.writeFileSync(path.join(dir,'story.json'),json);
let problems=0; const bad=(m)=>{problems++;console.log('PROBLEM:',m)};
// 1) every decision in meta exists in the story, with the right good/flawed replies
const blocks=src.split(/^- \(d\d+\)\s*$/m).slice(1);
if(blocks.length!==meta.decisions.length) bad(`story has ${blocks.length} decisions, meta lists ${meta.decisions.length}`);
meta.decisions.forEach((d,i)=>{ const ch=[...(blocks[i]||'').matchAll(/^\s*\* \[(§?)(.+?)\]\s*$/gm)].map(m=>({good:!!m[1],t:m[2]}));
  const g=ch.filter(c=>c.good).map(c=>c.t).sort().join('|'), w=ch.filter(c=>!c.good).map(c=>c.t).sort().join('|');
  if(g!==[...d.good].sort().join('|')) bad(`D${i+1} good replies differ from meta: ${g}`);
  if(w!==[...d.wrong].sort().join('|')) bad(`D${i+1} flawed replies differ from meta: ${w}`); });
const allChoices=[...src.matchAll(/^\s*\* \[(§?)(.+?)\]\s*$/gm)].map(m=>({good:!!m[1],t:m[2]}));
const texts=allChoices.map(c=>c.t); const dup=texts.filter((t,i)=>texts.indexOf(t)!==i); if(dup.length) console.log('note: repeated reply texts (fine if intended):',[...new Set(dup)]);
const nGood=allChoices.filter(c=>c.good).length, nAll=allChoices.length; console.log('replies',nAll,'good',nGood,'flawed',nAll-nGood);
// 1b) a "Say:" correction must never be identical to a good reply (it would give the answer away)
{ const goodTexts=new Set(allChoices.filter(c=>c.good).map(c=>c.t));
  for(const m of src.matchAll(/Say:\s*(.+?)\s*# note/g)){ const phrase=m[1].trim();
    const decisionOf=(txt)=>{ const idx=src.indexOf(m[0]); return idx; };
    // only a problem for games with more than one good reply per decision (the correction is meant to differ from the answers)
    if(meta.decisions.some(d=>d.good.length>1) && goodTexts.has(phrase)) bad('the correction repeats a good reply: '+phrase); } }
// 2) markup: every ‹shown|key› has a definition; every word is used
const keys=new Set(words.map(w=>w.text.toLowerCase())); const used=new Set(),missing=new Set();
const body=src.split('\n').filter(l=>!l.trim().startsWith('//')).join('\n');
for(const m of body.matchAll(/‹([^›]+)›/g)){ const [shown,key]=m[1].split('='); const k=(key||shown).toLowerCase(); keys.has(k)?used.add(k):missing.add(k); }
if(missing.size) bad('markup without a definition: '+[...missing]); const unused=[...keys].filter(k=>!used.has(k)); if(unused.length) bad('words never used in the story: '+unused);
// 3) random playthroughs
let ended=0,errors=0,minC=1e9,maxC=0; const goodSeen=new Set();
for(let i=0;i<N;i++){ const s=new Story(json); let fin=false,cnt=0,steps=0;
  try{ while(steps++<500){ while(s.canContinue){ s.Continue(); if((s.currentTags||[]).includes('end'))fin=true; }
    if(s.currentErrors&&s.currentErrors.length){errors++;console.log(s.currentErrors);break}
    if(!s.currentChoices.length)break; s.ChooseChoiceIndex(Math.floor(Math.random()*s.currentChoices.length)); cnt++; } }catch(e){errors++;console.log('EXC',e.message);}
  if(fin)ended++; minC=Math.min(minC,cnt); maxC=Math.max(maxC,cnt); }
console.log({runs:N,ended,errors,minChoices:minC,maxChoices:maxC}); if(errors||ended!==N) bad('some runs did not end cleanly');
// 4) perfect path: always the first good reply; must give full stars, never loop
const s=new Story(json); let picks=0,txt=[];
while(true){ while(s.canContinue){txt.push(s.Continue().trim());} if(!s.currentChoices.length)break;
  const g=s.currentChoices.filter(c=>c.text.startsWith('§')); if(!g.length){bad('no good reply offered at: '+s.currentChoices.map(c=>c.text).join(' / '));break;}
  s.ChooseChoiceIndex(g[0].index); picks++; if(picks>60){bad('perfect path loops');break;} }
console.log('perfect path:',picks,'decisions, stars',s.variablesState['smooth'],'of',meta.decisions.length); if(s.variablesState['smooth']!==meta.decisions.length) bad('perfect path did not earn every star');
// 5) reading check
const sents=txt.join(' ').replace(/[‹›]/g,'').replace(/=[a-z -]+(?=[ ,.!?])/g,'').split(/(?<=[.!?])\s+/); const wc=sents.map(x=>x.split(/\s+/).length);
console.log('sentences',sents.length,'avg words',(wc.reduce((a,b)=>a+b,0)/wc.length).toFixed(1),'longest',Math.max(...wc));
console.log(problems? `${problems} PROBLEM(S)`:'ALL CHECKS PASSED'); process.exit(problems?1:0);
