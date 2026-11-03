"""python3 -I derive_meta.py <game folder> : writes meta.json decisions from story.ink (so the checks and the Voc Practice sets always match the story).
Needs meta.base.json (title, level, lead, ...). Every `- (dN)` block becomes one decision: all replies marked ^ = a neutral choice, otherwise the replies
marked § are good and the rest are flawed. The question for the Voc Practice set is the last line ending with '?' before the block."""
import re, sys, json, os
d = sys.argv[1]
src = open(os.path.join(d, 'story.ink'), encoding='utf8').read()
base = json.load(open(os.path.join(d, 'meta.base.json'), encoding='utf8'))
lines = src.split('\n')
decisions = []; day = 0; lastq = None
label = re.compile(r'^- \((d\d+)\)\s*$')
choice = re.compile(r'^\s*[*+] \[([§^]?)(.+?)\]\s*$')
plain = lambda t: re.sub(r'‹([^›=]+)(?:=[^›]+)?›', r'\1', t)
for i, ln in enumerate(lines):
    m = re.match(r'^=== ep(\d+) ===', ln)
    if m:
        day = int(m.group(1))
    t = re.sub(r'\s*#.*$', '', ln).strip()
    t = re.sub(r'^- ', '', t)
    t = re.sub(r'^(Dr Hale|Experimenter|Learner):\s*', '', t)
    if t.endswith('?') and not ln.lstrip().startswith('*'):
        lastq = plain(re.split(r'(?<=[.?!])\s+', t)[-1])   # only the question itself, not the sentences before it
    if label.match(ln):
        j = i + 1
        ch = []
        while j < len(lines) and not label.match(lines[j]) and not lines[j].startswith('==='):
            c = choice.match(lines[j])
            if c:
                ch.append((c.group(1), c.group(2)))
            j += 1
        if ch and all(k == '^' for k, _ in ch):
            decisions.append({'neutral': True, 'options': [x for _, x in ch], 'day': day})
        else:
            ov = lines[i-1][5:].strip() if lines[i-1].startswith('// q:') else None
            decisions.append({'q': (ov or lastq or 'Choose the best answer.').strip(),
                              'good': [x for k, x in ch if k == '§'],
                              'wrong': [x for k, x in ch if k == ''], 'day': day})
base['decisions'] = decisions
json.dump(base, open(os.path.join(d, 'meta.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=2)
print(len(decisions), 'decisions;', sum(1 for x in decisions if x.get('neutral')), 'neutral;',
      len([x for x in decisions if not x.get('neutral')]), 'checked')
