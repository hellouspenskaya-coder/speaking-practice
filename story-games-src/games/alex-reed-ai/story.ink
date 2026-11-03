// A CONVERSATION AT THE CONFERENCE (B2). The student meets Alex Reed (an invented founder) after a keynote on AI and strategy.
// § marks a GOOD reply. Here there are TWO good replies in every decision (two real positions the student can take)
// and TWO flawed ones (a grammar or word-choice slip, or the wrong tone). The card after a flawed reply shows a corrected version.
// Tags at the END of a line: # scene: N # title: ...  |  # note  |  # end.  Words in ‹ › are vocabulary.

VAR tries = 0
VAR smooth = 0
VAR who = ""        // "ops" or "consultant"
VAR bold = 0        // bolder positions taken (D3, D4, D7)
VAR people = 0      // people-first positions taken (D5, D6)

-> keynote

=== function good ===
{ tries == 0:
    ~ smooth = smooth + 1
}
~ tries = 0

=== keynote ===
The ‹keynote› is over and the hall is slowly emptying. # scene: 1 # title: After the keynote
It was called "Strategy in the Age of AI". The speaker, Alex Reed, is the founder of Reedworks, a logistics company that rebuilt itself around AI.
Now he is walking towards the coffee table, alone. This is your chance.
- (d1)
* [§Excuse me, Mr Reed. Your keynote really made me rethink our approach.]
    ~ good()
    Alex: Thank you. That is exactly what I hope for. People who leave with questions, not answers.
* [Mr Reed, I am wanting to ask you about your talk.]
    ~ tries = tries + 1
    Alex raises an eyebrow, then smiles.
    "Want" is not normally used in the continuous form, and the opening sounds heavy. Say: Mr Reed, I'd like to ask you about your talk. # note
    -> d1
* [§Hi, I hope I'm not interrupting. I had a question about something you said on stage.]
    ~ good()
    Alex: Not at all. I am only hiding from the queue. Go ahead.
* [Hey you! Stop, I have to talk with you.]
    ~ tries = tries + 1
    Alex stops, a little surprised. Other people turn around.
    This sounds like an order, not like a polite first contact. Say: Excuse me, do you have a minute? # note
    -> d1
- Alex: But first, tell me about yourself. What do you do?
- (d2)
* [I am working in the operations since five years.]
    ~ tries = tries + 1
    Alex: Operations? For five years? Let me hear that again.
    With "since" and a point in time we use the present perfect, and the job needs "in". Say: I've been working in operations for five years. # note
    -> d2
* [§I'm in charge of operations at a mid-sized manufacturing company.]
    ~ good()
    ~ who = "ops"
    Alex: Operations. Good. That is where AI is hardest, and where it matters most.
* [I am boss from a middle company.]
    ~ tries = tries + 1
    Alex: A boss? Of a company in the middle? I am not sure I follow.
    Some words are borrowed from your own language. Say: I'm the director of a mid-sized company. # note
    -> d2
* [§I run a small consultancy that helps firms improve their processes.]
    ~ good()
    ~ who = "consultant"
    Alex: A consultant. So you see many companies from the inside. That is useful.
- -> ai_in_company

=== ai_in_company ===
Alex hands you a coffee and leans on the table. # scene: 2 # title: AI at work
Alex: Many firms only use AI to ‹streamline› what they already do. That is a start, but it is not a strategy.
Alex: {who == "ops":Is your company using AI yet?|Are your clients using AI yet?}
- (d3)
* [We use AI from last year, but it doesn't work good.]
    ~ tries = tries + 1
    Alex: Since last year, and it does not work well? That is a story I would like to hear.
    For a period that started in the past we say "since" or the present perfect, and "work" needs an adverb. Say: We've been using it since last year, but it doesn't work well. # note
    -> d3
* [§We're still at an early stage. We're running a few small pilots, nothing more.]
    ~ good()
    Alex: ‹Pilots=pilot› are fine. The danger is staying in pilot mode for three years.
* [§Yes, we've already rolled out AI in customer support, and we're moving on to logistics.]
    ~ good()
    ~ bold = bold + 1
    Alex: So you have already ‹rolled out=roll out› something. That is fast. I hope someone asked the support team what they actually needed.
* [Not really. Our management is very afraid about it.]
    ~ tries = tries + 1
    Alex: Afraid? Of what, exactly?
    After "afraid" we use "of". Say: Not really. Our management is very afraid of it. # note
    -> d3
- Alex: Let me tell you what I really think. The biggest risk is not being late. It is ‹automating=automate› the wrong thing.
- (d4)
* [I am agree with you, it is very true.]
    ~ tries = tries + 1
    Alex: I will take that as a yes.
    "Agree" is a verb, so we do not use "am" before it. Say: I agree with you, that's very true. # note
    -> d4
* [§That makes sense. Many companies automate what is easy rather than what matters.]
    ~ good()
    Alex: Exactly. Easy and valuable are rarely the same thing.
* [No, that's wrong. Being late is the real problem.]
    ~ tries = tries + 1
    Alex: Wrong? Strong word. Tell me why.
    The idea is fine, but "that's wrong" is too blunt for a first conversation. Say: I'm not sure I agree. Being late can be a real problem too. # note
    -> d4
* [§I see your point, but isn't there a risk in waiting too long? Competitors may build a data advantage.]
    ~ good()
    ~ bold = bold + 1
    Alex: Fair challenge. Data matters, but only if you know which question to ask.
- -> where_to_start

=== where_to_start ===
Alex: Let us be practical. AI is only a ‹competitive edge› if it changes how people work. # scene: 3 # title: Where to start
Alex: So how would you decide where to begin?
- (d5)
* [I would start by to look at the numbers.]
    ~ tries = tries + 1
    Alex: Looking at the numbers is a good instinct. Say it again, slowly.
    After "start" we use "to + verb" or "-ing", not "by to". Say: I would start by looking at the numbers. # note
    -> d5
* [§I'd begin with the bottlenecks, the steps where work always piles up.]
    ~ good()
    Alex: Good. A ‹bottleneck› is a clear target, and you can measure the result.
* [I'd start with the process which has the most big problems.]
    ~ tries = tries + 1
    Alex: The most big problems? I think you mean the biggest.
    Short adjectives like "big" make the superlative with "-est", and "that" is more natural than "which" here. Say: I'd start with the process that has the biggest problems. # note
    -> d5
* [§I'd ask the people who do the work. They know best what slows them down.]
    ~ good()
    ~ people = people + 1
    Alex: Yes. ‹Buy-in› from the team matters more than the tool. If they do not trust it, they will work around it.
- Alex: And once you have chosen a task, how do you get people to ‹adopt› it?
- (d6)
* [I'd say them that it is good for their work.]
    ~ tries = tries + 1
    Alex: Say them? Ah, tell them.
    "Say" cannot take a person directly. We say something to someone, or tell someone. Say: I'd tell them that it is good for their work. # note
    -> d6
* [§I'd show them a small success first. Results speak louder than slides.]
    ~ good()
    Alex: A small win beats a big promise. I agree.
* [I'd explain them how the system works.]
    ~ tries = tries + 1
    Alex: Explain them? You explain it to them.
    "Explain" needs "to" before the person. Say: I'd explain to them how the system works. # note
    -> d6
* [§I'd involve them from day one, so the change is not something that happens to them.]
    ~ good()
    ~ people = people + 1
    Alex: That is the difference between a project and a rebellion.
- -> people_and_work

=== people_and_work ===
Alex looks around the empty hall, then lowers his voice. # scene: 4 # title: People and work
Alex: Here is my favourite question. In ten years, will AI make the ‹workforce› ‹shrink›?
- (d7)
* [I think that the workforce will be less, but it depends.]
    ~ tries = tries + 1
    Alex: Less? Smaller, you mean. And depends on what?
    A workforce gets "smaller" (or "shrinks"), not "less", and "it depends" needs a reason. Say: I think the workforce will get smaller, but it depends on the industry. # note
    -> d7
* [§Some jobs will change a lot, but I think the bigger task is to upskill people rather than replace them.]
    ~ good()
    ~ people = people + 1
    Alex: A comfortable answer, and probably a true one. The hard part is who pays to ‹upskill› everybody.
* [It is a difficult topic and I do not have any opinion, sorry.]
    ~ tries = tries + 1
    Alex: No opinion? Come on, you have been listening for an hour.
    This sounds like a closed door. Soften it and keep the conversation open. Say: It's a difficult topic, and I don't really have a strong view yet. # note
    -> d7
* [§Honestly, I think some roles will disappear. The question is whether we prepare people early enough.]
    ~ good()
    ~ bold = bold + 1
    Alex: Nobody likes saying it out loud. Thank you. And then who will ‹upskill› the people who stay?
- Alex checks his watch.
Alex: I have a plane to catch. It was a real pleasure talking with you.
- (d8)
* [Give me your email, I will write to you.]
    ~ tries = tries + 1
    Alex: I appreciate the enthusiasm, but let us try that again.
    This sounds like an instruction. Ask for permission instead. Say: Could I have your email? I'd like to write to you. # note
    -> d8
* [§Thank you for your time. Would it be all right if I followed up by email?]
    ~ good()
    Alex: Of course. Please ‹follow up› next week, not tomorrow. Here is my card.
* [Thanks for the time. I hope we will meet again in the future one day.]
    ~ tries = tries + 1
    Alex: One day. Perhaps.
    After "hope" we use the present simple for the future, and "in the future one day" is too much. Say: Thanks for your time. I hope we meet again one day. # note
    -> d8
* [§This was really valuable. Could we stay in touch? I would love to share how our project goes.]
    ~ good()
    Alex: I would like that. Please ‹follow up› next week. Here is my card.
- -> goodbye

=== goodbye ===
You take the card. # scene: 5 # title: Goodbye
{ bold >= 2:
    Alex: One last thing. You move fast and you are not afraid to disagree. Just make sure you test the right thing before you roll it out.
- else:
    Alex: One last thing. You test before you bet big. Keep that habit, but do not let it become a reason to wait.
}
{ people >= 1:
    Alex: And you asked about people, not only about tools. That is rarer than you think.
}
He shakes your hand and disappears through the door. You stay for a moment with your coffee and your notes. # end
-> DONE
