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
const game={kind:'storyGame',slug:SLUG,topic:meta.title,title:meta.title,level:meta.level,lead:meta.lead,minutes:meta.minutes,total:meta.decisions.length,scenes,practiceSet:PRACTICE,
  ...(meta.shortTitle?{shortTitle:meta.shortTitle}:{}),...(fs.existsSync(path.join(dir,'art.json'))?{art:JSON.parse(fs.readFileSync(path.join(dir,'art.json'),'utf8'))}:{}),...(meta.sayLabel?{sayLabel:meta.sayLabel}:{}),...(meta.noteTitle?{noteTitle:meta.noteTitle}:{}),...(meta.how?{how:meta.how}:{}),words,story:storyJson};
fs.writeFileSync(path.join(out,SLUG+'.json'),JSON.stringify(game,null,2));
const base={id:'',type:'word',text:'',definition:'',example:'',phonetic:'',chunks:[],phraseSplitIndex:1,image:null,audio:null,imageHint:'',imageQuery:'',illustrable:false,wantsImage:false,requiresPreposition:false,correctPreposition:'',prepositionSentence:'',wordFamily:[],wordFormationSentence:'',wordFormationAnswer:'',isCollocation:false,collocationSentence:'',collocationAnswer:'',collocationDistractors:[],isVerb:false,pastSimple:'',pastParticiple:'',verbSentence:'',verbAnswer:''};
const items=[];let k=1;
words.forEach(w=>items.push({...base,id:'item_'+(k++),type:'word',text:w.text,definition:w.definition,example:w.example,phonetic:w.phonetic}));
meta.decisions.filter(d=>d.practice!==false).forEach(d=>items.push({...base,id:'item_'+(k++),type:'phrase',text:d.q,example:d.q+' '+d.good[0],chunks:d.q.split(' '),phraseSplitIndex:1,qaAnswer:d.good[0],qaWrong:d.wrong}));
const vocab={topic:meta.title+' (words from the game)',fromGame:SLUG,level:meta.level,modes:['matching','listening','fillLetters','letterScramble','phraseBuilder','questionAnswer','questionAnswerListen'],antonymPairs:[],items};
fs.writeFileSync(path.join(out,PRACTICE+'.json'),JSON.stringify(vocab,null,2));
const tpl=fs.readFileSync(path.join(__dirname,'player.template.html'),'utf8'), ink=fs.readFileSync(path.join(__dirname,'node_modules/inkjs/dist/ink.js'),'utf8');
const put=(t,ph,val)=>t.split(ph).join('@@X@@').replace('@@X@@',()=>val).split('@@X@@').join(ph);
const player=put(tpl,'/*INK_JS*/',ink); fs.writeFileSync(path.join(out,'story-game.html'),player);
fs.writeFileSync(path.join(out,'preview-'+SLUG+'.html'),put(player,'/*GAME_DATA*/null',JSON.stringify({...game,preview:true}).replace(/</g,'\\u003c')));
console.log(SLUG,'scenes',scenes.length,'words',words.length,'phrase items',items.length-words.length,'player KB',(player.length/1024)|0,'game KB',(JSON.stringify(game).length/1024)|0);
