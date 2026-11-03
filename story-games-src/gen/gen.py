import json,re,glob,os,sys
sys.path.insert(0,'.')
from data import GAMES
# definitions from Anna's own logistics sets
defs={}
for f in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','vocab-sets','logistics-a2-*.json'))):
    for it in json.load(open(f,encoding='utf8'))['items']:
        defs.setdefault(it['text'].lower(),it)
POS=[1,2,0,2,0,1,2,0,1,0,2]
def strip(t): return re.sub(r'‹([^›=]+)(?:=[^›]+)?›',r'\1',t)
for g in GAMES:
    out=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","games",g["slug"]); os.makedirs(out,exist_ok=True)
    ink=[f"// {g['title']} (A2). The student is a new assistant at Baltic Freight. § marks the good reply; the other two replies do not fit.",
         "// Tags at the END of a line: # scene: N # title: ...  |  # note  |  # end. Words in ‹ › are vocabulary (‹shown=key› when the form differs).","",
         "VAR tries = 0","VAR smooth = 0","","-> s1","","=== function good ===","{ tries == 0:","    ~ smooth = smooth + 1","}","~ tries = 0",""]
    decisions=[]; k=0; used=[]
    for si,sc in enumerate(g['scenes'],1):
        ink.append(f"=== s{si} ===")
        first=True; prev_dec=False; gathered=False
        for it in sc['items']:
            if isinstance(it,str):
                line=it
                if first: 
                    line=re.sub(r'(\s*# end)?$',lambda m:f" # scene: {si} # title: {sc['title']}"+(m.group(1) or ''),line,1); first=False
                if prev_dec and not gathered: ink.append("- "+line); gathered=True
                else: ink.append(line)
                used.append(it)
            else:
                k+=1
                if first: raise SystemExit('scene must start with a text line')
                if prev_dec and not gathered: pass
                ink.append(f"- (d{k})")
                pos=POS[(k-1)%len(POS)]; wrong=list(it['wrong']); order=wrong[:]; order.insert(min(pos,2),'GOOD')
                for o in order:
                    if o=='GOOD':
                        ink.append(f"* [§{it['good']}]"); ink.append("    ~ good()")
                        for l in it['good_reply']: ink.append("    "+l); used.append(l)
                    else:
                        t,reply,why=o
                        ink.append(f"* [{t}]"); ink.append("    ~ tries = tries + 1")
                        for l in reply: ink.append("    "+l); used.append(l)
                        ink.append(f"    {why} Say: {it['good']} # note"); ink.append(f"    -> d{k}")
                decisions.append({"q":it['q'],"good":[it['good']],"wrong":[w[0] for w in it['wrong']]})
                prev_dec=True; gathered=False
        last = si==len(g['scenes'])
        nxt="DONE" if last else f"s{si+1}"
        ink.append(("- " if prev_dec else "")+f"-> {nxt}"); ink.append("")
    src="\n".join(ink); open(f"{out}/story.ink",'w',encoding='utf8').write(src)
    # words = every marked key, definitions from the sets
    keys=[]
    body="\n".join(l for l in ink if not l.startswith('//'))
    for m in re.finditer(r'‹([^›]+)›',body):
        key=(m.group(1).split('=')[1] if '=' in m.group(1) else m.group(1)).lower()
        if key not in keys: keys.append(key)
    words=[]
    for key in keys:
        if key not in defs: raise SystemExit(f"no definition in the sets for: {key}")
        d=defs[key]; words.append({"text":d['text'],"phonetic":"","definition":d['definition'],"example":d.get('example','')})
    json.dump(words,open(f"{out}/game.words.json",'w',encoding='utf8'),ensure_ascii=False,indent=2)
    meta={"shortTitle":g['title'].split(':')[0],"slug":g['slug'],"title":g['title'],"level":g['level'],"minutes":g['minutes'],"lead":g['lead'],"how":g['how'],"decisions":decisions}
    json.dump(meta,open(f"{out}/meta.json",'w',encoding='utf8'),ensure_ascii=False,indent=2)
    print(g['slug'],'| decisions',len(decisions),'| words',len(words),[w['text'] for w in words])
