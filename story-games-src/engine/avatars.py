"""python3 -I avatars.py <game folder>  ->  <game folder>/art.json  with an avatar for EVERY speaker of the story.
Known characters have a fixed look (the same in all games). A new character gets a look made from the name,
so every future game has avatars without extra work. Add a character to KNOWN to give them a special look."""
import json, re, sys, hashlib, os
SKIN={'a':'#F3D0B0','b':'#D9A47A','c':'#A9713F'}
def avatar(skin,hair,hcol,shirt,extra=(),cap='k'):
    s=SKIN[skin]; p=['<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">','<circle class="l" cx="24" cy="24" r="24"/>']
    if hair=='long': p.append(f'<path d="M12 26Q10 8 24 8Q38 8 36 26L36 38Q31 34 33 24L15 24Q17 34 12 38Z" fill="{hcol}"/>')
    p.append(f'<path class="{shirt}" d="M5 48Q7 34 24 34Q41 34 43 48Z"/>')
    p.append(f'<rect x="21" y="27" width="6" height="9" rx="2" fill="{s}"/><circle cx="24" cy="22" r="10" fill="{s}"/>')
    if hair=='short': p.append(f'<path d="M13.5 22Q13 10 24 10.5Q35 10 34.5 22Q32 15.5 24 15.5Q16 15.5 13.5 22Z" fill="{hcol}"/>')
    if hair=='curly': p.append(''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{hcol}"/>' for x,y,r in [(14,22,3.6),(15,16.5,4.6),(19.5,12,5),(24.5,10.2,5.2),(29.5,12,5),(33,16.5,4.6),(34,22,3.6)]))
    if hair=='bun': p.append(f'<path d="M13.5 22Q13 10 24 10.5Q35 10 34.5 22Q32 15.5 24 15.5Q16 15.5 13.5 22Z" fill="{hcol}"/><circle cx="24" cy="8" r="4.2" fill="{hcol}"/>')
    if hair=='long': p.append(f'<path d="M13.5 22Q13 10 24 10.5Q35 10 34.5 22Q31 14.5 24 14.5Q17 14.5 13.5 22Z" fill="{hcol}"/>')
    if hair=='bald': p.append(f'<path d="M14 21Q13.5 18 15 16.5Q14.5 20 16 22Z M34 21Q34.5 18 33 16.5Q33.5 20 32 22Z" fill="{hcol}"/>')
    if hair=='cap': p.append(f'<path d="M13 19Q13.5 7.5 24 7.5Q34.5 7.5 35 19Z" class="{cap}"/><rect x="21" y="17" width="19" height="3.2" rx="1.6" class="{cap}"/><rect x="21.5" y="11" width="5" height="3.4" rx="1" class="o"/>')
    p.append('<circle cx="20.3" cy="22.5" r="1.25" fill="#2B2B2B"/><circle cx="27.7" cy="22.5" r="1.25" fill="#2B2B2B"/><path d="M20.5 27Q24 29.8 27.5 27" fill="none" stroke="#2B2B2B" stroke-width="1.3" stroke-linecap="round"/>')
    if 'beard' in extra: p.append(f'<path d="M13.6 23Q13 38.5 24 38.8Q35 38.5 34.4 23Q33.4 31.5 29 31.6Q24 33.6 19 31.6Q14.6 31.5 13.6 23Z" fill="{hcol}"/>')
    if 'bigstache' in extra: p.append('<path d="M16.5 26.8Q19 23.4 24 25.4Q29 23.4 31.5 26.8Q28 29.2 24 27.2Q20 29.2 16.5 26.8Z" fill="#5C6168"/>')
    if 'mustache' in extra: p.append(f'<path d="M19 26Q24 24.2 29 26Q24 27.8 19 26Z" fill="{hcol}"/>')
    if 'glasses' in extra: p.append('<circle cx="20.3" cy="22.5" r="3.2" fill="none" stroke="#2B2B2B" stroke-width="1"/><circle cx="27.7" cy="22.5" r="3.2" fill="none" stroke="#2B2B2B" stroke-width="1"/><path d="M23.5 22.5h1" stroke="#2B2B2B" stroke-width="1"/>')
    if 'scarf' in extra: p.append('<path class="r" d="M16 35Q24 41 32 35L33 40Q24 46 15 40Z"/>')
    if 'tie' in extra: p.append('<path class="r" d="M22.4 35.5L24 37.4L25.6 35.5L26.6 44H21.4Z"/>')
    if 'badge' in extra: p.append('<rect class="o" x="31" y="39" width="6" height="4" rx="1"/>')
    p.append('</svg>'); return ''.join(p)
KNOWN={
 # airport
 "Check-in agent":  dict(skin='a',hair='bun',hcol='#5A3825',shirt='m',extra=('badge',)),
 "Security officer":dict(skin='b',hair='cap',hcol='#222',shirt='k',extra=('badge',),cap='k'),
 "Flight attendant":dict(skin='a',hair='long',hcol='#8A4B1F',shirt='r',extra=('scarf',)),
 "Passport officer":dict(skin='c',hair='short',hcol='#1F1A17',shirt='m',extra=('glasses','badge')),
 "Woman":           dict(skin='b',hair='long',hcol='#3A2A22',shirt='g'),
 "Customs officer": dict(skin='a',hair='cap',hcol='#222',shirt='g',extra=('badge',),cap='g'),
 # Baltic Freight
 "Marta":   dict(skin='a',hair='long',hcol='#8A3F25',shirt='md',extra=('glasses',)),
 "Tomas":   dict(skin='b',hair='short',hcol='#3A2C22',shirt='o',extra=('badge',)),
 "Jonas":   dict(skin='c',hair='cap',hcol='#222',shirt='m',cap='m'),
 "Ruta":    dict(skin='a',hair='short',hcol='#C9A227',shirt='r'),
 "Mr Berg": dict(skin='a',hair='short',hcol='#9AA0A6',shirt='k',extra=('glasses','mustache')),
 "Mr Lukas":dict(skin='b',hair='short',hcol='#2B211B',shirt='md',extra=('tie',)),
 # Alex Reed
 "Alex":    dict(skin='a',hair='short',hcol='#4A4038',shirt='k'),
 # Case Files
 "Dr Hale": dict(skin='a',hair='curly',hcol='#9AA0A6',shirt='md',extra=('glasses','beard','tie')),
 "Experimenter": dict(skin='a',hair='short',hcol='#3A3028',shirt='k',extra=('glasses','tie')),
 "Learner": dict(skin='b',hair='short',hcol='#7A6A5A',shirt='o',extra=('mustache',)),
}
NO_AVATAR={'Announcement'}   # voices without a face
def auto(name):
    h=int(hashlib.md5(name.encode()).hexdigest(),16)
    pick=lambda lst,sh: lst[(h>>sh)%len(lst)]
    return dict(skin=pick('abc',0),hair=pick(['short','bun','long','short','bald'],3),hcol=pick(['#2B211B','#5A3825','#8A4B1F','#C9A227','#9AA0A6','#1F1A17'],7),
                shirt=pick(['m','md','g','r','o','k'],11),extra=pick([(),(),('glasses',),('badge',),('mustache',)],15))
def speakers(src):
    seen=[]
    for line in src.split('\n'):
        t=line.strip()
        if t.startswith('//') or t.startswith('* [') or t.startswith('VAR') or t.startswith('===') or t.endswith('# note') or '# card:' in t or '# fold:' in t: continue
        t=re.sub(r'^(-\s*(\(\w+\)\s*)?)+','',t)
        m=re.match(r"^([A-Z][A-Za-z' -]{1,24}):\s+\S",t)
        if m and m.group(1) not in seen and m.group(1) not in NO_AVATAR: seen.append(m.group(1))
    return seen
if __name__=='__main__':
    d=sys.argv[1]; names=speakers(open(os.path.join(d,'story.ink'),encoding='utf8').read()); out={}
    for n in names: out[n]=avatar(**(KNOWN.get(n) or auto(n)))
    json.dump({'avatars':out},open(os.path.join(d,'art.json'),'w',encoding='utf8'),ensure_ascii=False)
    print(os.path.basename(os.path.normpath(d)),'avatars:',', '.join(n+('' if n in KNOWN else ' (auto)') for n in names),'|',round(len(json.dumps(out))/1024,1),'KB')
