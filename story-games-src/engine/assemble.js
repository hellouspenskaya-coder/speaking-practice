// node assemble.js <game folder> <out folder> — builds <slug>.json (game), <slug>-words.json (Voc Practice set), story-game.html, preview-<slug>.html
const fs=require('fs'),path=require('path');
const dir=process.argv[2], out=process.argv[3]; fs.mkdirSync(out,{recursive:true});
// every game gets an avatar for each of its speakers (fixed look for known characters, made from the name for new ones)
require('child_process').execFileSync('python3',['-I',path.join(__dirname,'avatars.py'),dir],{stdio:'inherit'});
const meta=JSON.parse(fs.readFileSync(path.join(dir,'meta.json'),'utf8'));
const words=JSON.parse(fs.readFileSync(path.join(dir,'game.words.json'),'utf8'));
const src=fs.readFileSync(path.join(dir,'story.ink'),'utf8'), storyJson=fs.readFileSync(path.join(dir,'story.json'),'utf8');
const scenes=[...src.matchAll(/# scene:\s*(\d+)\s*# title:\s*(.+)/g)].map(m=>({n:m[1],title:m[2].trim()}));
const SLUG=meta.slug, PRACTICE=SLUG+'-words';
const hasDays=words.some(w=>w.day);
const game={kind:'storyGame',slug:SLUG,topic:meta.title,title:meta.title,level:meta.level,lead:meta.lead,minutes:meta.minutes,total:meta.decisions.length,scenes,practiceSet:PRACTICE,
  ...(meta.shortTitle?{shortTitle:meta.shortTitle}:{}),...(fs.existsSync(path.join(dir,'art.json'))?{art:JSON.parse(fs.readFileSync(path.join(dir,'art.json'),'utf8'))}:{}),...(meta.player||{}),...(meta.real||{}),
  ...(meta.sayLabel?{sayLabel:meta.sayLabel}:{}),...(meta.noteTitle?{noteTitle:meta.noteTitle}:{}),...(meta.how?{how:meta.how}:{}),words:words.map(({day,...w})=>w),story:storyJson};
if(hasDays){ delete game.practiceSet; game.practiceSets={}; [...new Set(words.map(w=>w.day))].forEach(d=>{ game.practiceSets[d]=SLUG+'-words-'+d; }); }
fs.writeFileSync(path.join(out,SLUG+'.json'),JSON.stringify(game,null,2));
const base={id:'',type:'word',text:'',definition:'',example:'',phonetic:'',chunks:[],phraseSplitIndex:1,image:null,audio:null,imageHint:'',imageQuery:'',illustrable:false,wantsImage:false,requiresPreposition:false,correctPreposition:'',prepositionSentence:'',wordFamily:[],wordFormationSentence:'',wordFormationAnswer:'',isCollocation:false,collocationSentence:'',collocationAnswer:'',collocationDistractors:[],isVerb:false,pastSimple:'',pastParticiple:'',verbSentence:'',verbAnswer:''};
const MODES=['matching','listening','fillLetters','letterScramble','phraseBuilder','questionAnswer','questionAnswerListen'];
function makeSet(wordList,decList,topic){ const items=[]; let k=1;
  wordList.forEach(w=>items.push({...base,id:'item_'+(k++),type:'word',text:w.text,definition:w.definition,example:w.example,phonetic:w.phonetic}));
  decList.filter(d=>d.practice!==false&&!d.neutral&&d.q).forEach(d=>items.push({...base,id:'item_'+(k++),type:'phrase',text:d.q,example:d.q+' '+d.good[0],chunks:d.q.split(' '),phraseSplitIndex:1,qaAnswer:d.good[0],qaWrong:d.wrong.slice(0,2)}));
  return {topic,fromGame:SLUG,level:meta.level,modes:MODES,antonymPairs:[],items}; }
let nSets=0;
if(hasDays){ [...new Set(words.map(w=>w.day))].forEach(d=>{ const vs=makeSet(words.filter(w=>w.day===d),meta.decisions.filter(x=>x.day===d),meta.title+' \u00b7 part '+d+' (words from the game)'); fs.writeFileSync(path.join(out,SLUG+'-words-'+d+'.json'),JSON.stringify(vs,null,2)); nSets++; }); }
else { fs.writeFileSync(path.join(out,PRACTICE+'.json'),JSON.stringify(makeSet(words,meta.decisions,meta.title+' (words from the game)'),null,2)); nSets=1; }
if(hasDays && meta.reviews){ game.reviewSets={}; meta.reviews.forEach(rv=>{ const slug=SLUG+'-review-'+rv.afterDay; const vs=makeSet(rv.only?words.filter(w=>rv.only.includes(w.text)):words.filter(w=>rv.days.includes(w.day)),meta.decisions.filter(x=>rv.days.includes(x.day)),meta.title+' \u00b7 '+rv.label+' (review)'); fs.writeFileSync(path.join(out,slug+'.json'),JSON.stringify(vs,null,2)); game.reviewSets[rv.afterDay]={slug,label:rv.label}; nSets++; }); fs.writeFileSync(path.join(out,SLUG+'.json'),JSON.stringify(game,null,2)); }
const tpl=fs.readFileSync(path.join(__dirname,'player.template.html'),'utf8'), ink=fs.readFileSync(path.join(__dirname,'node_modules/inkjs/dist/ink.js'),'utf8');
const put=(t,ph,val)=>t.split(ph).join('@@X@@').replace('@@X@@',()=>val).split('@@X@@').join(ph);
const player=put(tpl,'/*INK_JS*/',ink); fs.writeFileSync(path.join(out,'story-game.html'),player);
const previewGame={...game,preview:true,freeNav:true,...(meta.preview||{})};
fs.writeFileSync(path.join(out,'preview-'+SLUG+'.html'),put(player,'/*GAME_DATA*/null',JSON.stringify(previewGame).replace(/</g,'\\u003c')));
console.log(SLUG,'scenes',scenes.length,'words',words.length,'practice sets',nSets,'player KB',(player.length/1024)|0,'game KB',(JSON.stringify(game).length/1024)|0);
