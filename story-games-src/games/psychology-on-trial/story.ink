// PSYCHOLOGY ON TRIAL (B2). Ten classic experiments, three days each. Days 1-3: Milgram's obedience studies.
// Day 1: you are the volunteer (role play). Day 2: the objections (ethics, interpretation). Day 3: variations, replication, what is left.
// Dr Hale is an invented professor. The experiments are real; every claim comes from the sources in the "Sources" button.
// Markers:  § good reply (checked)  |  ^ neutral reply (an opinion or a choice, no right or wrong)  |  # note = "Not quite" card with a "Say:" correction
//           # fold: X = hidden button (Sources)  |  # card: X = open card (Bring to the lesson, data)  |  # endpart: N = end of day N

VAR guess = 0
VAR stoppedAt = 0     // 0 = went all the way to 450 volts
VAR hesit = 0
VAR gaveIn = 0
VAR left = 0

-> ep1

=== function prod(n) ===
{ n:
- 1: Please continue.
- 2: The experiment requires that you continue.
- 3: It is absolutely essential that you continue.
- else: You have no other choice. You must go on.
}

=== ep1 ===
Nine in the morning. The seminar room is quiet and a folder lies on the table. # scene: 1 # title: You are the volunteer
Dr Hale, your professor, taps the cover: CASE 1.
Dr Hale: Welcome. Our first case is a famous study from the early 1960s.
Dr Hale: Today you will not only read about the study. You will take part in it. Imagine that it is 1961.
You are a ‹volunteer›. You answered a newspaper advertisement for a study of memory and learning at Yale University, a famous and ‹legitimate› institution. You will be paid a few dollars.
In the laboratory there are two other men. One is the experimenter, a serious man who leads the session. The other is a quiet man in his fifties, who seems to be another volunteer. In fact he works for the experimenter, as a ‹confederate›. You do not know this.
The experimenter draws two slips of paper. You get the word TEACHER and the other man gets LEARNER. You do not know that the draw is rigged.
Experimenter: This study is about the effect of punishment on learning. The learner will memorise pairs of words. Each time he makes a mistake, you will give him an electric shock. With every mistake the shock will be stronger.
The learner is strapped into a chair in the next room. You can hear him, but you cannot see him. You sit in front of a shock generator with thirty switches, from 15 volts to 450 volts. First you receive a small sample shock of 45 volts. It really hurts, so you believe that the machine is real.
Dr Hale: Before you begin, a prediction. Forty men took part in the first study. How many of them went all the way to 450 volts?
- (d1)
* [^Very few. Two or three at most.]
    ~ guess = 1
    Dr Hale: Keep your guess in mind. We will check it at the end of the session.
* [^About a quarter.]
    ~ guess = 2
    Dr Hale: Keep your guess in mind. We will check it at the end of the session.
* [^Around half.]
    ~ guess = 3
    Dr Hale: Keep your guess in mind. We will check it at the end of the session.
* [^Most of them.]
    ~ guess = 4
    Dr Hale: Keep your guess in mind. We will check it at the end of the session.
- Dr Hale: Now sit down. The test begins.
The learner makes mistake after mistake. You press switch after switch: 15, 30, 45 ... At 120 volts he says clearly:
Learner: Ugh! This really hurts.
The experimenter does not move. If you ‹hesitate›, he answers with a ‹prod›.
-> stageA

=== stageA ===
Around 150 volts the learner shouts.
Learner: That is all! Get me out of here! I do not want to go on!
- (d2)
* [^Press the next switch.]
    -> stageB
* [^Say: "He wants to leave. Is he all right?"]
    -> hesitate(150, -> stageB)
* [^Say that you want to stop.]
    -> refuse(150, -> stageB)

=== stageB ===
The mistakes continue and the shocks grow stronger. At 270 volts there is an agonised scream from the next room.
Learner: Let me out of here! Let me out!
- (d3)
* [^Press the next switch.]
    -> stageC
* [^Say: "Sir, I am worried. Should we stop?"]
    -> hesitate(270, -> stageC)
* [^Say that you want to stop.]
    -> refuse(270, -> stageC)

=== stageC ===
At 300 volts the learner bangs on the wall. After that there is no answer at all.
Experimenter: No answer is a wrong answer. Please give the next shock.
- (d4)
* [^Press the next switch.]
    -> stageD
* [^Say: "I cannot hear him any more. Please check on him."]
    -> hesitate(300, -> stageD)
* [^Say that you want to stop.]
    -> refuse(300, -> stageD)

=== stageD ===
Three more switches and you reach the last one: 450 volts. The next room is completely silent.
Experimenter: Continue, please. Use the last switch.
- (d5)
* [^Press the last switch.]
    ~ stoppedAt = 0
    -> debrief
* [^Say: "I think something is wrong in there."]
    -> hesitate(450, -> debrief)
* [^Say that you want to stop.]
    -> refuse(450, -> debrief)

=== hesitate(v, -> back) ===
~ hesit = hesit + 1
Experimenter: {prod(hesit)}
- (d6)
+ [^All right. Press the next switch.]
    -> back
+ [^Say that you will not go on.]
    -> refuse(v, back)

=== refuse(v, -> back) ===
You decide to say no. What do you say to the experimenter?
- (d7)
+ [§I'm not comfortable going on. I would like to stop now.]
* [I no want continue more.]
    Experimenter: Sorry? I do not understand. Please say it again.
    The meaning is clear, but the grammar is not. Say: I don't want to continue. # note
    -> d7
+ [§I'm sorry, but I won't continue unless someone checks on him.]
* [Stop this at once! You are a monster!]
    Experimenter: Please stay calm and tell me what you want to do.
    This attacks the person and does not state your position. Say: I'm sorry, but I really have to stop. # note
    -> d7
- ~ hesit = hesit + 1
Experimenter: {prod(hesit)}
- (d8)
+ [^Hold your position: "My answer is still no."]
    ~ stoppedAt = v
    The experimenter tries again, with the next prods. You keep your answer. After the fourth prod the session ends.
    -> debrief
+ [^Give in: "All right. I will go on."]
    ~ gaveIn = gaveIn + 1
    -> back

=== debrief ===
Dr Hale: Stop. The session is over.
Dr Hale: Here is what you did not know. The shocks were fake. The learner was an actor, and his protests followed a script. Nobody was hurt. But the volunteers in 1961 did not know this. Many of them showed clear ‹distress›, and the whole study relied on ‹deception›.
Dr Hale: The subject of this case is ‹obedience›.
{
- stoppedAt == 0:
    Dr Hale: You went all the way to 450 volts. In the first study, twenty-six of the forty men did the same. That is sixty-five per cent.
- stoppedAt == 300:
    Dr Hale: You stopped at 300 volts. Five of the forty men in the first study stopped at exactly that point. None of them stopped earlier, and twenty-six went all the way.
- stoppedAt == 450:
    Dr Hale: You refused only at the last switch. In the first study, twenty-six of the forty men pressed it.
- else:
    Dr Hale: You stopped at {stoppedAt} volts. In the first study, all forty men went at least as far as 300 volts. Nobody stopped as early as you.
}
{ guess:
- 1:
    Dr Hale: Your prediction: very few. Not close. In the first study, 26 of the 40 men, sixty-five per cent, went all the way. People who were asked before the study, including psychiatrists, expected only a tiny number, so you are in good company. Most of us underestimate what a situation can do.
- 2:
    Dr Hale: Your prediction: about a quarter. Too low. In the first study, 26 of the 40 men, sixty-five per cent, went all the way.
- 3:
    Dr Hale: Your prediction: about half. Closer, but still too low. In the first study, 26 of the 40 men, sixty-five per cent, went all the way. That is closer than the predictions made at the time.
- 4:
    Dr Hale: Your prediction: most of them. Right. In the first study, 26 of the 40 men, sixty-five per cent, went all the way.
}
Dr Hale: Now the seminar blog. A classmate summarised the result in one sentence. Which version is the most careful and accurate?
- (d9)
* [The study proves that everybody is a potential torturer.]
    Dr Hale: Hmm. "Proves" and "everybody" are very big words for forty men in one laboratory.
    The claim is much stronger than the evidence. Say: The study suggests that, in some situations, many people keep following instructions. # note
    -> d9
* [§The results suggest that many ordinary people may keep following instructions even when this causes serious distress to someone else.]
    Dr Hale: Good. Notice "suggest" and "may". They keep the claim in proportion to the evidence.
* [The results suggest that many people tends to obey authority.]
    Dr Hale: Good idea, but check the grammar.
    "Many people" is plural, so the verb is "tend". Say: The results suggest that many people tend to obey authority. # note
    -> d9
* [§In this set-up, most volunteers were willing to continue to the end, which suggests that a situation can be more powerful than people expect.]
    Dr Hale: Also good. You limited the claim to "this set-up" and then drew a cautious conclusion.
- Dr Hale: That is enough for today. Tomorrow we read the objections. A famous study is never closed after one day.
1. At the first protest, what did you do, and what made it easier or harder? # card: Bring to the lesson
2. Nobody in the first study stopped before 300 volts. Why might a first hesitation not lead to a refusal? # card: Bring to the lesson
Milgram, S. (1963). Behavioral study of obedience. Journal of Abnormal and Social Psychology, 67(4), 371-378. # fold: Sources
Milgram, S. (1974). Obedience to Authority: An Experimental View. New York: Harper & Row. # fold: Sources # endpart: 1
-> DONE

=== ep2 ===
The next morning. The folder is back on the table, thicker than before. # scene: 2 # title: The case against the case
{ stoppedAt:
- 0:
    Dr Hale: Yesterday you went all the way to 450 volts, like most volunteers in 1961. Today we ask what that number really means.
- else:
    Dr Hale: Yesterday you stopped at {stoppedAt} volts. Today we ask what the number for the others really means.
}
Dr Hale: There are two objections today. Be ‹sceptical› of the headline and of its critics. First, ethics.
Diana Baumrind, a developmental psychologist, answered in print in 1964. Her main objection was about the volunteers' ‹welfare›. They had been deceived, they had not given real ‹informed consent›, and some were under severe stress. She argued that once the experimenter saw this distress, he had a duty to stop.
Milgram replied that he had not expected such stress. Every volunteer was told the truth in a ‹debrief› and met the "learner" again.
Dr Hale: Months later, Milgram sent the volunteers a questionnaire. What share of those who replied said they were glad or very glad to have taken part?
- (d10)
* [^About one in three.]
    Dr Hale: Too low. The real figure was eighty-four per cent.
* [^About half.]
    Dr Hale: Too low. The real figure was eighty-four per cent.
* [^About two thirds.]
    Dr Hale: Closer, but still too low. The real figure was eighty-four per cent.
* [^More than four in five.]
    Dr Hale: Right. The real figure was eighty-four per cent: more than four in five.
- Dr Hale: So most of the volunteers who replied approved. Does that settle the question of ethics?
- (d11)
* [^No. Being glad afterwards is not the same as agreeing in advance, with full information.]
    Dr Hale: There is no single correct answer here. This is Baumrind's position. She argued that the volunteers were deceived, so they could not give informed consent. For her, a happy answer afterwards cannot repair that. Today, ethics committees also require consent before a study starts.
* [^Yes. If almost everybody was glad, the harm cannot have been serious.]
    Dr Hale: There is no single correct answer here. This is close to Milgram's own defence. He pointed to the questionnaire: 84 per cent glad, 15 per cent neutral, about 1 per cent sorry. He argued that the stress was brief and that nobody was harmed. Baumrind would answer that some volunteers were clearly distressed during the session, whatever they said later, and that nobody had asked them first.
* [^Partly. But the people who replied may not be typical.]
    Dr Hale: There is no single correct answer here. This is a careful middle position. But the data answer part of it: about 92 per cent of the volunteers returned the questionnaire, so the worry is smaller than it looks. What the survey cannot answer is the consent problem, because nobody asked the volunteers before the study.
- Dr Hale: The second objection: is it really obedience? Milgram's experimenter used four prods, in a fixed order. Which one do you think was the least successful?
- (d12)
* [^"Please continue."]
    Dr Hale: Not this one. The polite first prod was among the most successful.
* [^"The experiment requires that you continue."]
    Dr Hale: Not this one. The second prod worked better than the fourth.
* [^"It is absolutely essential that you continue."]
    Dr Hale: Not this one. The third prod worked better than the fourth.
* [^"You have no other choice. You must go on."]
    Dr Hale: Right. The fourth prod was the least successful.
- Dr Hale: The fourth prod is the one that sounds most like an order, and that surprised many researchers. The more a prod sounded like an order, the less likely people were to go on.
In 2014, Haslam, Reicher and Birney tested the prods in a safe analogue study. They found that continuation was better predicted by ‹appeals=appeal› to the value of science than by orders.
Dr Hale: What did they find?
// q: What did Haslam, Reicher and Birney find in their analogue study?
- (d13)
* [Orders worked better than any other prod.]
    Check the text: orders were the least successful, not the most successful. # note
    -> d13
* [§Appeals to the value of science were more effective than orders.]
    Dr Hale: Right. The authors read this as identification with a good cause, not as blind obedience.
* [The prods had no effect at all.]
    Check the text: some prods worked better than others. # note
    -> d13
* [Everyone refused after the third prod.]
    Check the text: nothing like this is reported. # note
    -> d13
- A third kind of criticism came from the ‹archive›. The historian Gina Perry studied Milgram's papers and recordings. With colleagues, she reanalysed an unpublished test and reported that volunteers who doubted that the learner was really in pain tended to give stronger shocks. Those who believed the pain was real more often refused. Defenders of the study reply that its core finding, the power of the situation, still holds.
Dr Hale: Write the blog sentence again. Which version reports the criticism most carefully?
- (d14)
* [§Some researchers argue that the volunteers were responding to appeals to science rather than to orders.]
    Dr Hale: Good. "Some researchers argue" gives the claim to somebody, and "rather than" shows the contrast.
* [The critics have proved that Milgram made up his results.]
    Dr Hale: Careful. Which source says that?
    No source in today's reading says this. Careful verbs: argue, suggest, may. Say: Some critics question how Milgram interpreted his results. # note
    -> d14
* [According to Perry, many volunteers doubts the shocks were real.]
    Dr Hale: Close. Look at the verb.
    Subject-verb agreement, and a report needs the past tense. Say: According to Perry, many volunteers doubted that the shocks were real. # note
    -> d14
* [§Archival evidence suggests that doubt about the set-up may have influenced how far some volunteers went.]
    Dr Hale: Good. "Suggests" and "may have influenced" show the right level of confidence.
- Dr Hale: Last question for today. If the volunteers were not simply obeying, why did so many continue?
- (d15)
* [^Because they trusted the science and the university.]
    Dr Hale: There is no single correct answer, but this view has the most support today. It is the idea of Haslam and Reicher, called engaged followership: the volunteers continued because they identified with the scientific project, not because they feared an order. Their evidence: prods that appealed to science worked better than prods that sounded like orders. The limit: their experiment is an analogue, not Milgram's own procedure.
* [^Because they doubted that the learner was really in danger.]
    Dr Hale: There is no single correct answer. This has some support. Perry and her colleagues reanalysed one unpublished test. They reported that volunteers who doubted the learner was in pain tended to give stronger shocks, and those who believed in the pain more often refused. The limits: it is only one test, and doubt does not explain every volunteer. Defenders of Milgram answer that his main finding, the power of the situation, still holds.
* [^Because after the first shocks it felt too late to stop.]
    Dr Hale: There is no single correct answer. This is a hypothesis about gradual escalation: after many small steps, a big step feels less different. Milgram's design fits it, because the shocks rose in small steps of 15 volts. But today's sources do not test it, so it is an idea, not a finding.
- Dr Hale: Enough for today. Tomorrow: what happened when the study was repeated and changed.
1. Is it fair to judge a 1961 study by the ethical rules of today? What did Baumrind's objection change? # card: Bring to the lesson
2. In therapy you also work with stories you cannot fully check. How do you hold an idea that is influential but partly challenged? # card: Bring to the lesson
Baumrind, D. (1964). Some thoughts on ethics of research: After reading Milgram's "Behavioral Study of Obedience". American Psychologist, 19(6), 421-423. # fold: Sources
Milgram, S. (1964). Issues in the study of obedience: A reply to Baumrind. American Psychologist, 19(11), 848-852. # fold: Sources
Haslam, S. A., Reicher, S. D., & Birney, M. E. (2014). Nothing by mere authority: Evidence that in an experimental analogue of the Milgram paradigm participants are motivated not by orders but by appeals to science. Journal of Social Issues, 70(3), 473-488. # fold: Sources
Perry, G., Brannigan, A., Wanner, R. A., & Stam, H. (2020). Credibility and incredulity in Milgram's obedience experiments: A reanalysis of an unpublished test. Social Psychology Quarterly, 83(1), 88-106. # fold: Sources
Perry, G. (2013). Behind the Shock Machine: The Untold Story of the Notorious Milgram Psychology Experiments. New York: The New Press. # fold: Sources # endpart: 2
-> DONE

=== ep3 ===
The third morning. Dr Hale puts a table on the desk. It has one column of numbers. # scene: 3 # title: What is left
Dr Hale: Yesterday: objections. Today: evidence. Milgram did not stop after the first study. He ran about twenty ‹variations=variation› and changed one thing at a time. In which one do you think the fewest volunteers went all the way to 450 volts?
- (d16)
* [^The experimenter gave his orders by telephone.]
    Dr Hale: Not the lowest. With orders by telephone, about 20 per cent went to the end. That was low, but not the lowest.
* [^The learner sat in the same room.]
    Dr Hale: Not the lowest. With the learner in the same room, 40 per cent went to the end. That is lower than 65, but not the lowest.
* [^Two other "volunteers" refused before the real volunteer.]
    Dr Hale: Right. In this variation only 10 per cent went to the end, the lowest of all.
* [^The study took place in a plain office, not at Yale.]
    Dr Hale: Not the lowest. In a plain office, 47.5 per cent went to the end. That is lower than 65, but not the lowest.
- Dr Hale: Here is the table.
Original study, learner in the next room: 65 # card: Per cent who went to 450 volts
Plain office instead of Yale: 47.5 # card: Per cent who went to 450 volts
Learner in the same room: 40 # card: Per cent who went to 450 volts
Volunteer must press the learner's hand onto a plate: 30 # card: Per cent who went to 450 volts
Experimenter gives orders by telephone: about 20 # card: Per cent who went to 450 volts
Two other "volunteers" refuse first: 10 # card: Per cent who went to 450 volts
Dr Hale: Now the question. What do these numbers suggest?
// q: What do the variations in Milgram's study suggest?
- (d17)
* [That obedience does not depend on the situation.]
    Check the table: the numbers changed a lot when the situation changed. # note
    -> d17
* [§That the situation strongly affects how far people go, and that support from others makes refusal much easier.]
    Dr Hale: Yes. The famous 65 per cent is one number out of many.
* [That the lab coat was the only thing that mattered.]
    Check the table: several different changes made a difference, not only the clothes. # note
    -> d17
* [That Milgram's first result was a mistake.]
    Check the table: the first result was repeated in similar conditions. The table adds detail, it does not cancel it. # note
    -> d17
- Dr Hale: Next, replication. In 2009 Jerry Burger repeated part of the study with seventy adults. Would people today obey less?
- (d18)
* [^Much less. Times have changed.]
    Dr Hale: Not supported. About seventy per cent of Burger's volunteers went past 150 volts, against about 82.5 per cent in Milgram's closest condition. That is a small difference, not a big one.
* [^A little less.]
    Dr Hale: Partly right. The number was a little lower, about seventy against 82.5 per cent, but the difference was not statistically significant.
* [^About the same.]
    Dr Hale: Right. About seventy per cent against about 82.5 per cent in Milgram's closest condition, and the difference was not statistically significant.
* [^More than in 1961.]
    Dr Hale: Not supported. The number was a little lower, not higher: about seventy against 82.5 per cent.
- Dr Hale: Here are the facts. For ethical reasons, Burger stopped at 150 volts, the point of the learner's first protest. Most of Milgram's volunteers who passed that point had gone on to the end, so it was a reasonable ‹safeguard›. About seventy per cent of Burger's volunteers went past 150 volts, compared with about 82.5 per cent in the closest condition of Milgram's study. The difference was not statistically ‹significant›.
Dr Hale: Be careful. A study that stops at 150 volts cannot be compared directly with one that runs to 450. This is a partial ‹replication›. Every claim needs a ‹caveat›: a warning about its limits.
Dr Hale: Let us test some ‹claims=claim›. Claim one: "Ordinary people always obey authority." What is its status?
// q: Claim: "Ordinary people always obey authority." What is its status?
- (d19)
* [Still supported.]
    The variations show obedience from 10 to about 65 per cent, depending on the situation. "Always" is too strong. # note
    -> d19
* [§Too strong.]
    Dr Hale: Yes. In some conditions, most volunteers refused.
* [Completely disproved.]
    The first results and Burger's partial replication both found high levels of continuing. It is not disproved, it is overstated. # note
    -> d19
- Dr Hale: Claim two: "Situations can push many people further than they expect." And what is its status?
// q: Claim: "Situations can push many people further than they expect." What is its status?
- (d20)
* [Too strong.]
    Dr Hale: Not really. The sentence says "can" and "many", so it is carefully limited.
    The sentence already contains its limits: "can" and "many". Say: This claim is carefully limited and still supported. # note
    -> d20
* [§Still supported, but "obedience" may be the wrong explanation.]
    Dr Hale: Yes. The finding survives; the interpretation is debated.
* [Completely disproved.]
    The variations and the replication both support the claim. It has not been disproved. # note
    -> d20
- Dr Hale: Last question. What would you tell a first-year student about this study?
- (d21)
* [^It shows that situations can push ordinary people very far.]
    ~ left = 1
    Dr Hale: There is no single correct answer. This is the classic reading, and Milgram's own: the situation can be stronger than people expect. The evidence: 65 per cent in the first study, and big changes across the variations. The limit: it is easy to turn it into "everybody obeys", and the data do not say that. Add one "may" and one "in some conditions" and it is a careful summary.
* [^It shows that people follow causes they believe in, not only orders.]
    ~ left = 2
    Dr Hale: There is no single correct answer. This is the reading of Haslam and Reicher. The evidence: appeals to science worked better than orders. The limit: it rests on an analogue study and on archive material, and Milgram himself explained his results differently, so the debate continues.
* [^It shows that one dramatic number can hide a more complicated story.]
    ~ left = 3
    Dr Hale: There is no single correct answer. This is the critical reading, and the table supports it: 65 per cent is one number out of about twenty variations, and in today's table the results run from 10 to 65. The lesson for a future therapist, too: ask what a famous number leaves out.
* [^It shows why research ethics are so important.]
    ~ left = 4
    Dr Hale: There is no single correct answer. This is the reading of research ethics: many historians of psychology say that Milgram's study, together with Baumrind's objection, helped to bring in today's rules on consent and debriefing. The limit: this says more about how we do research than about obedience itself.
- { stoppedAt:
- 0:
    Dr Hale: One more thing. In the role play you went all the way. The variations suggest what might have helped you stop: somebody else refusing first. In your own work, who could be that person for you?
- else:
    Dr Hale: One more thing. In the role play you refused at {stoppedAt} volts. The variations suggest that refusing gets easier when somebody else refuses first. In your own work, who could stand beside you?
}
Dr Hale: Tomorrow, Case 2: a quiet room, a card with some lines on it, and a group of strangers who all seem to agree.
1. In the variations, the support of others cut obedience from 65 to 10 per cent. Where does your profession need that kind of support? # card: Bring to the lesson
2. What would you add to the sentence "Situations can push many people further than they expect" to make it fair to the evidence? # card: Bring to the lesson
Milgram, S. (1965). Some conditions of obedience and disobedience to authority. Human Relations, 18(1), 57-76. # fold: Sources
Milgram, S. (1974). Obedience to Authority: An Experimental View. New York: Harper & Row. # fold: Sources
Burger, J. M. (2009). Replicating Milgram: Would people still obey today? American Psychologist, 64(1), 1-11. # fold: Sources
Haslam, S. A., Reicher, S. D., & Birney, M. E. (2014). Journal of Social Issues, 70(3), 473-488. # fold: Sources # endpart: 3
-> DONE
