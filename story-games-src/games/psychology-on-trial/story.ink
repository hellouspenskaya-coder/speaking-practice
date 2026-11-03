// PSYCHOLOGY ON TRIAL (B2). Ten classic experiments, three days each. Parts 1-3: Milgram's obedience studies. Parts 4-6: Asch's line judgements.
// Day 1: you are the volunteer (role play). Day 2: the objections (ethics, interpretation). Day 3: variations, replication, what is left.
// Dr Hale is an invented professor. The experiments are real; every claim comes from the sources in the "Sources" button.
// Markers:  § good reply (checked)  |  ^ neutral reply (an opinion or a choice, no right or wrong)  |  # note = "Not quite" card with a "Say:" correction
//           # fold: X = hidden button (Sources)  |  # card: X = open card (Bring to the lesson, data)  |  # endpart: N = end of day N

VAR guess = 0
VAR stoppedAt = 0     // 0 = went all the way to 450 volts
VAR hesit = 0
VAR gaveIn = 0
VAR left = 0
VAR played1 = false   // true once day 1 was played in this browser (the later days use your choices)
VAR played4 = false
VAR yielded = 0       // Asch: critical cards on which you went with the group (0-4)
VAR share = 0         // Asch: your prediction of the share who followed the group

-> ep1

=== function prod(n) ===
{ n:
- 1: Please continue.
- 2: The experiment requires that you continue.
- 3: It is absolutely essential that you continue.
- else: You have no other choice. You must go on.
}

=== ep1 ===
The seminar room is quiet and a folder lies on the table. # scene: 1 # title: You are the volunteer
Dr Hale, your professor, taps the cover: CASE 1.
Dr Hale: Welcome. Our first case is a famous study from the early 1960s.
Dr Hale: This time you will not only read about the study. You will take part in it. Imagine that it is 1961.
You are a ‹volunteer›. You answered a newspaper advertisement for a study of memory and learning at Yale University, a famous and ‹legitimate› institution. You will be paid a few dollars.
In the laboratory there are two other men. One is the experimenter, a serious man who leads the session. The other is a quiet man in his fifties, who seems to be another volunteer.
The experimenter draws two slips of paper. You get the word TEACHER and the other man gets LEARNER.
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
    ~ hesit = 0
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
    ~ hesit = 0
    -> back

=== debrief ===
~ played1 = true
Dr Hale: Stop. The session is over.
Dr Hale: Here is what you did not know. The shocks were fake. The learner was a ‹confederate› of the experimenter, and his protests followed a script. The draw of the slips was rigged, so that you always became the teacher. Nobody was hurt. But the volunteers in 1961 did not know this. Many of them showed clear ‹distress›, and the whole study relied on ‹deception›.
Dr Hale: The subject of this case is ‹obedience›.
{
- stoppedAt == 0:
    Dr Hale: You went all the way to 450 volts. In the first study, twenty-six of the forty men did the same. That is sixty-five per cent.
- stoppedAt == 300:
    Dr Hale: You stopped at 300 volts. Five of the forty men in the first study stopped at exactly that point. None of them stopped earlier, and twenty-six went all the way.
- stoppedAt == 450:
    Dr Hale: You refused only at the last switch. In the first study, twenty-six of the forty men pressed it.
- else:
    { stoppedAt == 150:
        Dr Hale: You refused at the very first protest, at 150 volts. In the first study, all forty men went at least as far as 300 volts. Nobody stopped as early as you.
    - else:
        Dr Hale: You stopped at {stoppedAt} volts, before the learner fell silent. In the first study, all forty men went at least as far as 300 volts. Nobody stopped as early as you.
    }
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
Dr Hale: Now read how a journal article would report this. Academic writing is compact, so read it twice.
Method. Forty men, aged 20 to 50, took part individually in a ‹procedure› at Yale University. Each man was given the role of teacher and had to give the learner an electric shock for every wrong answer. The shock level rose by 15 volts each time, from 15 to 450 volts. The learner was a ‹confederate› and was never shocked. When a teacher ‹hesitated=hesitate›, the experimenter used up to four standard prods. # card: In the article
Results. All forty participants continued to 300 volts, and 26 of them (65 per cent) went on to the maximum. Many showed ‹distress›: some laughed nervously, and in a few cases the tension led to seizures. The ‹outcome› was far higher than the experts of the time had predicted. # card: In the article
Discussion. The author argued that ordinary people may ‹comply› with an authority even when the instructions conflict with their conscience, and that the explanation lies in the situation rather than in the personality of the volunteers. # card: In the article
Dr Hale: Which sentence reports the Results paragraph correctly?
// q: Results paragraph: which sentence reports it correctly?
- (d41)
* [All forty volunteers went on to the maximum, 450 volts.]
    Dr Hale: Check the paragraph.
    All forty reached 300 volts, but only 26 went on to 450. Say: Every volunteer reached 300 volts, and 26 of the 40 went to the maximum. # note
    -> d41
* [§Every volunteer reached 300 volts, and 26 of the 40 (65 per cent) continued to the maximum.]
    Dr Hale: Good. Both numbers are there and they are in the right order.
* [The outcome were higher than the experts predicted.]
    Dr Hale: Good idea, but check the grammar.
    "Outcome" is singular, so the verb is "was". Say: The outcome was much higher than the experts predicted. # note
    -> d41
* [§The outcome was much higher than the experts had predicted.]
    Dr Hale: Good. The past perfect, "had predicted", shows that the predictions came first.
- Dr Hale: Now the seminar blog. A classmate summarised the result in one sentence. Which version is the most careful and accurate?
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
- Dr Hale: Let us close this part as a paper closes: with a conclusion and a look at further research.
Conclusion. The procedure produced a clear and unexpected outcome: most volunteers were willing to comply, although many were visibly ‹troubled›. The study raised more questions than it answered. Why did so many continue? Was the explanation obedience, or something else? And was the research itself ‹acceptable›? # card: Conclusion and further research
Further research. Milgram ran about twenty variations of the procedure himself. Later researchers repeated it in other countries and in safer versions. A review by Thomas Blass (1999) found that the share of volunteers who obeyed ‹ranged=range› from 28 to 91 per cent across studies, with no clear change over time. Other researchers asked whether the result holds for harm that is more ‹typical› of modern life: in 1986, Wim Meeus and Quinten Raaijmakers asked volunteers in the Netherlands to disturb a job applicant during a test, and more than 90 per cent carried out the instructions. # card: Conclusion and further research
Dr Hale: Next, we read the objections. A famous study is never closed after one reading.
1. At the first protest, what did you do, and what made it easier or harder? # card: Bring to the lesson
2. Nobody in the first study stopped before 300 volts. Why might a first hesitation not lead to a refusal? # card: Bring to the lesson
Milgram, S. (1963). Behavioral study of obedience. Journal of Abnormal and Social Psychology, 67(4), 371-378. # fold: Sources
Milgram, S. (1974). Obedience to Authority: An Experimental View. New York: Harper & Row. # fold: Sources
Blass, T. (1999). The Milgram paradigm after 35 years: Some things we now know about obedience to authority. Journal of Applied Social Psychology, 29(5), 955-978. https:\/\/doi.org\/10.1111/j.1559-1816.1999.tb00134.x # fold: Sources
Meeus, W. H. J., & Raaijmakers, Q. A. W. (1986). Administrative obedience: Carrying out orders to use psychological-administrative violence. European Journal of Social Psychology, 16(4), 311-324. https:\/\/doi.org\/10.1002/ejsp.2420160402 # fold: Sources # endpart: 1
-> DONE

=== ep2 ===
The folder is back on the table, thicker than before. # scene: 2 # title: The case against the case
{
- not played1:
    Dr Hale: Last time you took part in the study as a volunteer. Now we ask what the numbers really mean.
- stoppedAt == 0:
    Dr Hale: Last time you went all the way to 450 volts, like most volunteers in 1961. Now we ask what that number really means.
- else:
    Dr Hale: Last time you stopped at {stoppedAt} volts. Now we ask what the number for the others really means.
}
Dr Hale: There are two objections in this part. Be ‹sceptical› of the headline and of its critics. First, ethics.
Diana Baumrind, a developmental psychologist, answered in print in 1964. Her main objection was about the volunteers' ‹welfare›. They had been deceived, they had not given real ‹informed consent›, and some were under severe stress. She argued that once the experimenter saw this distress, he had a duty to stop.
Milgram replied that he had not expected such stress. Every volunteer was told the truth in a ‹debrief› and met the "learner" again.
Dr Hale: Months later, Milgram sent all the volunteers a questionnaire, and about 92 per cent of them replied. What share of those who replied said they were glad or very glad to have taken part?
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
    Dr Hale: There is no single correct answer here. This is a careful middle position. But the data answer part of it: about 92 per cent of the volunteers replied, so even if every volunteer who stayed silent had been unhappy, they would be about 8 per cent of the group. The worry is smaller than it looks. What the survey cannot answer is the consent problem, because nobody asked the volunteers before the study.
- Dr Hale: Here is how a review article might summarise the ethical ‹controversy›.
Baumrind (1964) criticised the study on three grounds: the volunteers were deceived, they could not give informed consent, and their welfare was not protected once their distress became visible. Milgram (1964) replied that the stress had been unexpected and brief, and he argued that the debriefing and the follow-up questionnaire showed no lasting harm. In retrospect, the debate had a large effect on research practice: in the United States, the Belmont Report (1979) set out principles of respect for persons, beneficence and justice, and research ethics ‹committees=committee› became routine. # card: In the review
Dr Hale: Which sentence reports Milgram's reply correctly?
// q: Which sentence reports Milgram's reply to Baumrind correctly?
- (d42)
* [Milgram admitted that the volunteers had suffered lasting harm.]
    Dr Hale: Check the paragraph.
    Milgram argued the opposite: that the stress was brief and that no lasting harm was found. Say: Milgram argued that the stress was brief and that no lasting harm was found. # note
    -> d42
* [§Milgram replied that the stress had been unexpected and brief, and argued that the follow-up showed no lasting harm.]
    Dr Hale: Good. "Argued" marks the claim as his, not as a fact.
* [Milgram replying that the debriefing was protecting the volunteers.]
    Dr Hale: Good idea, but check the grammar.
    This is not a complete sentence: it has no finite verb. Say: Milgram replied that the debriefing protected the volunteers. # note
    -> d42
* [§Milgram pointed to the debriefing and the questionnaire as evidence that the volunteers had not been harmed.]
    Dr Hale: Good. "Pointed to ... as evidence" is a precise way to report an argument.
- Dr Hale: The second objection is about ‹interpretation›: is it really obedience? Milgram's experimenter used four prods, in a fixed order. Which one do you think was the least successful?
- (d12)
* [^"Please continue."]
    Dr Hale: Not this one. The polite first prod was among the most successful.
* [^"The experiment requires that you continue."]
    Dr Hale: Not this one. The second prod worked better than the fourth.
* [^"It is absolutely essential that you continue."]
    Dr Hale: Not this one. The third prod worked better than the fourth.
* [^"You have no other choice. You must go on."]
    Dr Hale: Right. The fourth prod was the least successful.
- Dr Hale: Here are the four prods, in the order in which the experimenter used them.
1. "Please continue." # card: The four prods
2. "The experiment requires that you continue." # card: The four prods
3. "It is absolutely essential that you continue." # card: The four prods
4. "You have no other choice, you must go on." # card: The four prods
Dr Hale: The fourth prod is the one that sounds most like an order, and that surprised many researchers. The more a prod sounded like an order, the less likely people were to go on.
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
    No source in this reading says this. Careful verbs: argue, suggest, may. Say: Some critics question how Milgram interpreted his results. # note
    -> d14
* [According to Perry, many volunteers doubts the shocks were real.]
    Dr Hale: Close. Look at the verb.
    Subject-verb agreement, and a report needs the past tense. Say: According to Perry, many volunteers doubted that the shocks were real. # note
    -> d14
* [§Archival evidence suggests that doubt about the set-up may have influenced how far some volunteers went.]
    Dr Hale: Good. "Suggests" and "may have influenced" show the right level of confidence.
- Dr Hale: Last question for this part. If the volunteers were not simply obeying, why did so many continue?
- (d15)
* [^Because they trusted the science and the university.]
    Dr Hale: There is no single correct answer, but this view has the most support today. It is the idea of Haslam and Reicher, called engaged followership: the volunteers continued because they identified with the scientific project, not because they feared an order. Their evidence: prods that appealed to science worked better than prods that sounded like orders. The limit: their experiment is an analogue, not Milgram's own procedure.
* [^Because they doubted that the learner was really in danger.]
    Dr Hale: There is no single correct answer. This has some support. Perry and her colleagues reanalysed one unpublished test. They reported that volunteers who doubted the learner was in pain tended to give stronger shocks, and those who believed in the pain more often refused. The limits: it is only one test, and doubt does not explain every volunteer. Defenders of Milgram answer that his main finding, the power of the situation, still holds.
* [^Because after the first shocks it felt too late to stop.]
    Dr Hale: There is no single correct answer. This is a hypothesis about gradual escalation: after many small steps, a big step feels less different. Milgram's design fits it, because the shocks rose in small steps of 15 volts. But the sources in this part do not test it, so it is an idea, not a finding.
- Dr Hale: Let us close this part with a conclusion and a look at further research.
Conclusion. The two objections ask different questions. The first concerns what was done to the volunteers; the second concerns what the results mean. Neither ‹cancels=cancel› the study, but both changed how it is read. Today it is cited as evidence about the power of a situation, and also as one of the cases that helped to create modern research ethics. # card: Conclusion and further research
Further research. In 2012, Stephen Reicher, Alexander Haslam and Joanne Smith proposed that the volunteers had ‹identified with=identify with› the experimenter and with the scientific cause, and that they worked towards his goals instead of simply following orders. In 2015, Haslam, Reicher and Kathryn Millard ‹restaged=restage› the procedure for a film, using actors and Milgram's own script, and found a strong correlation between the shock levels reached and those in the matching variation of Milgram's study. The historian Gina Perry (2013) keeps the debate open: she argues that the archive tells a ‹messier=messy› story than the textbook version. # card: Conclusion and further research
Dr Hale: Next: what happened when the study was repeated and changed.
1. Is it fair to judge a 1961 study by the ethical rules of today? What did Baumrind's objection change? # card: Bring to the lesson
2. In therapy you also work with stories you cannot fully check. How do you hold an idea that is influential but partly challenged? # card: Bring to the lesson
Baumrind, D. (1964). Some thoughts on ethics of research: After reading Milgram's "Behavioral Study of Obedience". American Psychologist, 19(6), 421-423. # fold: Sources
Milgram, S. (1964). Issues in the study of obedience: A reply to Baumrind. American Psychologist, 19(11), 848-852. # fold: Sources
Haslam, S. A., Reicher, S. D., & Birney, M. E. (2014). Nothing by mere authority: Evidence that in an experimental analogue of the Milgram paradigm participants are motivated not by orders but by appeals to science. Journal of Social Issues, 70(3), 473-488. # fold: Sources
Perry, G., Brannigan, A., Wanner, R. A., & Stam, H. (2020). Credibility and incredulity in Milgram's obedience experiments: A reanalysis of an unpublished test. Social Psychology Quarterly, 83(1), 88-106. # fold: Sources
Perry, G. (2013). Behind the Shock Machine: The Untold Story of the Notorious Milgram Psychology Experiments. New York: The New Press. # fold: Sources
Reicher, S. D., Haslam, S. A., & Smith, J. R. (2012). Working toward the experimenter: Reconceptualizing obedience within the Milgram paradigm as identification-based followership. Perspectives on Psychological Science, 7(4), 315-324. # fold: Sources
Haslam, S. A., Reicher, S. D., & Millard, K. (2015). Shock treatment: Using immersive digital realism to restage and re-examine Milgram's obedience research. PLoS ONE, 10(3), e109015. https:\/\/doi.org\/10.1371/journal.pone.0109015 # fold: Sources # endpart: 2
-> DONE

=== ep3 ===
Dr Hale puts a table on the desk. It has one column of numbers. # scene: 3 # title: What is left
Dr Hale: Last time: objections. Now: evidence. Milgram did not stop after the first study. He ran about twenty ‹variations=variation› and changed one thing at a time. In which one do you think the fewest volunteers went all the way to 450 volts?
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
- Dr Hale: Next, replication. In 2009 Jerry Burger repeated part of the study with seventy adults, forty of them in the base condition. Would people today obey less?
- (d18)
* [^Much less. Times have changed.]
    Dr Hale: Not supported. About seventy per cent of Burger's volunteers went past 150 volts, against 82.5 per cent (33 of 40 men) in Milgram's Experiment 5, the version Burger used for comparison. That is a small difference, not a big one.
* [^A little less.]
    Dr Hale: Partly right. The number was a little lower, about seventy against 82.5 per cent, but the difference was not statistically significant.
* [^About the same.]
    Dr Hale: Right. Seventy per cent (28 of 40) against 82.5 per cent (33 of 40) in Milgram's Experiment 5, the version Burger used for comparison. The difference was not statistically significant.
* [^More than in 1961.]
    Dr Hale: Not supported. The number was a little lower, not higher: about seventy against 82.5 per cent.
- Dr Hale: Here are the facts. For ethical reasons, Burger stopped at 150 volts, the point of the learner's first protest. Most of Milgram's volunteers who passed that point had gone on to the end, so it was a reasonable ‹safeguard›. Burger compared his base group with Milgram's Experiment 5, the version most psychologists know. In that experiment 33 of 40 men (82.5 per cent) went past 150 volts, and 26 of those 33 went on to the end. In Burger's base group, 28 of 40 (70 per cent) went past 150 volts. The difference was not statistically ‹significant›.
Dr Hale: Be careful. A study that stops at 150 volts cannot be compared directly with one that runs to 450. This is a partial ‹replication›, so every claim about it needs a ‹caveat›.
Dr Hale: Here is how the Discussion section of a review might sum up the evidence so far.
Three conclusions seem safe. First, the situation matters: across Milgram's variations, the share of volunteers who went to the end ranged from about 10 to about 65 per cent. Second, the finding appears ‹robust› in a limited sense: partial replications in the United States and, later, in Poland produced similar rates. Third, the finding cannot be ‹generalised=generalise› without caution: every study used volunteers who agreed to take part in a laboratory study, and the replications stopped early or used milder shocks. # card: In the discussion
Dr Hale: Which sentence from a student essay uses this evidence most carefully?
// q: Which sentence uses the evidence from the Discussion most carefully?
- (d43)
* [The replications prove that people everywhere always obey.]
    Dr Hale: Careful. "Prove", "everywhere" and "always" are all too strong.
    The paragraph says the finding is robust only in a limited sense, and that it cannot be generalised without caution. Say: The replications point to a robust finding, but not to a universal one. # note
    -> d43
* [§The replications suggest that the finding is robust, but it cannot be generalised to every situation.]
    Dr Hale: Good. "Suggest" and "but" give the claim and its limit in one sentence.
* [The finding can be generalise to all situations.]
    Dr Hale: Close, but check the grammar.
    After "can be" we need the past participle, and "all situations" is too strong. Say: The finding cannot be generalised to every situation. # note
    -> d43
* [§Partial replications found similar rates, so the finding appears robust in this kind of set-up.]
    Dr Hale: Good. "In this kind of set-up" keeps the claim inside its limits.
- Dr Hale: Let us test some ‹claims=claim›. Claim one: "Ordinary people always obey authority." What is its status?
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
    Dr Hale: There is no single correct answer. This is the critical reading, and the table supports it: 65 per cent is one number out of about twenty variations, and in the table the results run from 10 to 65. The lesson for a future therapist, too: ask what a famous number leaves out.
* [^It shows why research ethics are so important.]
    ~ left = 4
    Dr Hale: There is no single correct answer. This is the reading of research ethics: many historians of psychology say that Milgram's study, together with Baumrind's objection, helped to bring in today's rules on consent and debriefing. The limit: this says more about how we do research than about obedience itself.
- {
- not played1:
    Dr Hale: One more thing. The variations suggest that refusing gets easier when somebody else refuses first. In your own work, who could stand beside you?
- stoppedAt == 0:
    Dr Hale: One more thing. In the role play you went all the way. The variations suggest what might have helped you stop: somebody else refusing first. In your own work, who could be that person for you?
- else:
    Dr Hale: One more thing. In the role play you refused at {stoppedAt} volts. The variations suggest that refusing gets easier when somebody else refuses first. In your own work, who could stand beside you?
}
Dr Hale: A last word, as a paper would end.
Conclusion. After more than sixty years, three things seem to ‹remain›. A situation can move many people further than they expect. The simple explanation, blind obedience, is only one of several, and perhaps not the best. And the result is ‹contemporary› as well as historical: it can be tested again, but only in ethical, partial forms. # card: Conclusion and further research
Further research. In 2017, Dariusz Doliński and his colleagues repeated the procedure with 80 adults in Poland, again stopping at 150 volts: 90 per cent went to the highest level that was offered. Over the decades, Blass's review had found no significant trend in obedience rates, so the question is no longer whether the result can be ‹reproduced=reproduce›. The open questions are about explanation: why do people continue, who refuses, and what helps people to stop? Researchers now study these questions with ‹ethical› designs, for example with filmed re-creations, virtual reality and surveys of the volunteers' own explanations. # card: Conclusion and further research
Dr Hale: Next, Case 2: a quiet room, a card with some lines on it, and a group of strangers who all seem to agree.
1. In the variations, the support of others cut obedience from 65 to 10 per cent. Where does your profession need that kind of support? # card: Bring to the lesson
2. What would you add to the sentence "Situations can push many people further than they expect" to make it fair to the evidence? # card: Bring to the lesson
Milgram, S. (1965). Some conditions of obedience and disobedience to authority. Human Relations, 18(1), 57-76. # fold: Sources
Milgram, S. (1974). Obedience to Authority: An Experimental View. New York: Harper & Row. # fold: Sources
Burger, J. M. (2009). Replicating Milgram: Would people still obey today? American Psychologist, 64(1), 1-11. https:\/\/doi.org\/10.1037/a0010932 # fold: Sources
Haslam, S. A., Reicher, S. D., & Birney, M. E. (2014). Journal of Social Issues, 70(3), 473-488. https:\/\/doi.org\/10.1111/josi.12072 # fold: Sources
Doliński, D., Grzyb, T., Folwarczny, M., Grzybała, P., Krzyszycha, K., Martynowska, K., & Trojanowski, J. (2017). Would you deliver an electric shock in 2015? Obedience in the experimental paradigm developed by Stanley Milgram in the 50 years following the original studies. Social Psychological and Personality Science, 8(8). https:\/\/doi.org\/10.1177/1948550617693060 # fold: Sources # endpart: 3
-> DONE

=== ep4 ===
The seminar room is quiet and the folder lies on the table again. # scene: 4 # title: A simple test of seeing
Dr Hale, your professor, opens it: CASE 2.
Dr Hale: Welcome back. Our second case is a study by the American psychologist Solomon Asch, from 1951. Again you will take part in it.
Imagine that you are a student at a small American college. You answered a notice for a study of visual ‹judgement›. You enter a classroom. Seven other students sit around a table, and there is one free chair near the end. A man with a folder introduces himself as the experimenter.
Experimenter: This is a simple test. I will show you cards with lines on them. On the left card there is one line. On the right card there are three lines, marked A, B and C. One of the three is the same length as the line on the left card. Please say your answer aloud, in the order of the seats.
You take the free chair. You are the second to last, so six students answer before you. Each card is a new ‹trial›.
Experimenter: Please look carefully. Here is the first card. # lines: 7,7,4.5,10
Everybody says "A." You say it too. The second card is just as easy, and again everybody agrees. Then the experimenter shows the third card.
-> trial1

=== trial1 ===
The third card. # lines: 8,5,8,11
The first student says "C." The second says "C." The third, the fourth, the fifth and the sixth all say "C." Now everybody looks at you.
- (d23)
* [^Say: "B."]
    You answer calmly. A few heads turn towards you. Somebody looks at the floor.
    -> trial2
* [^Say: "C."]
    ~ yielded = yielded + 1
    You answer with the group. Nobody reacts. The experimenter writes something down.
    -> trial2
* [^Lean forward and look at the card again.]
    The card has not changed. Nobody speaks. You can hear the clock. # lines: 8,5,8,11
    Experimenter: Please answer when you are ready.
    -> d23

=== trial2 ===
Two cards later. # lines: 7,10,4.5,7
This time the first student says "A." The second says "A." All six say "A." You hear a small cough.
- (d24)
* [^Say: "C."]
    You say it a little more quietly than before.
    -> trial3
* [^Say: "A."]
    ~ yielded = yielded + 1
    You say it fast, so it is over. The student next to you does not look at you.
    -> trial3
* [^Lean forward and look at the card again.]
    The card has not changed. Nobody speaks. # lines: 7,10,4.5,7
    Experimenter: Please answer when you are ready.
    -> d24

=== trial3 ===
Another card. # lines: 6,6,8.5,11
The six students before you say "B." Your hands feel warm.
- (d25)
* [^Say: "A."]
    You hear your own voice. It sounds very loud in the quiet room.
    -> trial4
* [^Say: "B."]
    ~ yielded = yielded + 1
    You say it. For a moment you feel relieved, and then not.
    -> trial4
* [^Lean forward and look at the card again.]
    The card has not changed. Nobody speaks. # lines: 6,6,8.5,11
    Experimenter: Please answer when you are ready.
    -> d25

=== trial4 ===
The last card of your session. # lines: 9,6,9,11.5
Six students say "A." Nobody looks at you now, and that is worse.
- (d26)
* [^Say: "B."]
    You say it and sit back.
    -> debrief2
* [^Say: "A."]
    ~ yielded = yielded + 1
    You say it and sit back.
    -> debrief2
* [^Lean forward and look at the card again.]
    The card has not changed. Nobody speaks. # lines: 9,6,9,11.5
    Experimenter: Please answer when you are ready.
    -> d26

=== debrief2 ===
~ played4 = true
Dr Hale: Stop. The session is over.
Dr Hale: Here is what you did not know. The other seven students were actors, ‹confederates=confederate› who worked for the experimenter. In the whole experiment there were eighteen cards. On twelve of them, called the critical trials, the actors formed a ‹majority› and gave the same wrong answer. They were ‹unanimous›. You saw four of the twelve.
Dr Hale: The subject of this case is ‹conformity›.
Dr Hale: A first question: how do we know that the mistakes came from the group, and not from the lines? Asch also tested students who did the task alone, with nobody around. What share of their answers were wrong?
- (d22)
* [^About 20 per cent.]
    Dr Hale: Too high. Working alone, the students gave wrong answers on fewer than one answer in a hundred. So the lines were easy, and any mistakes in the group need another explanation.
* [^About 5 per cent.]
    Dr Hale: Too high. Working alone, the students gave wrong answers on fewer than one answer in a hundred. So the lines were easy, and any mistakes in the group need another explanation.
* [^Less than 1 per cent.]
    Dr Hale: Right. Working alone, the students gave wrong answers on fewer than one answer in a hundred. So the lines were easy, and any mistakes in the group need another explanation.
- Dr Hale: Now the main question. Before I give you the numbers, a prediction. Imagine one hundred answers from volunteers like you, on the critical trials. How many of the hundred followed the group's wrong answer?
- (d27)
* [^About 5.]
    ~ share = 1
    Dr Hale: Too low. In Asch's whole series, 36.8 per cent of the answers on critical trials followed the group's wrong answer. That is more than one answer in three.
* [^About 15.]
    ~ share = 2
    Dr Hale: Too low. In Asch's whole series, 36.8 per cent of the answers on critical trials followed the group's wrong answer. That is more than one answer in three.
* [^About 35.]
    ~ share = 3
    Dr Hale: Right. In Asch's whole series, 36.8 per cent of the answers on critical trials followed the group's wrong answer.
* [^About 60.]
    ~ share = 4
    Dr Hale: Too high. In Asch's whole series, 36.8 per cent of the answers on critical trials followed the group's wrong answer. That is about one answer in three, not most of them.
- Dr Hale: There is a second number. About three quarters of the volunteers ‹yielded=yield› to the group at least once. About one quarter never did.
{ yielded:
- 0:
    Dr Hale: On your four cards you gave your own answer every time. About a quarter of Asch's volunteers did the same on all twelve.
- 4:
    Dr Hale: On your four cards you went with the group every time. In Asch's series only about five per cent of the volunteers did that on all twelve. Four cards are only a sample, of course.
- else:
    Dr Hale: On your four cards you went with the group {yielded} time{yielded > 1:s}. Most of Asch's volunteers were like you: sometimes they went along, and sometimes they did not.
}
Dr Hale: After the session, Asch interviewed each volunteer. Think about your last card. Why did you answer as you did?
- (d28)
* [^I trusted my own eyes.]
    Dr Hale: Some volunteers described exactly this. Asch also noted that independence did not always feel calm: some independent volunteers were tense or doubtful, and still kept their answer.
* [^I thought the others must see something I did not.]
    Dr Hale: Asch called this a distortion of judgement: the volunteer begins to doubt his own eyes and trusts the group. Some volunteers described exactly this.
* [^I did not want to be the only one who disagreed.]
    Dr Hale: Asch called this a distortion of action: the volunteer knows what he sees, but does not want to stand out. Some volunteers described exactly this.
* [^I felt tense and I wanted it to end.]
    Dr Hale: Asch noted that many volunteers showed ‹tension›: they hesitated, laughed nervously or looked uncomfortable.
- Dr Hale: Now read how a journal article would report this study. Academic writing is compact, so read it twice.
Method. Male college students took part one at a time in a group of seven to nine. All the other members of the group were confederates. On eighteen cards, the participant had to say which of three lines matched a standard line. On twelve of the eighteen trials, the confederates gave the same wrong answer, and the participant answered last but one. # card: In the article
Results. In a control group, which judged the lines alone, the error rate was below one per cent. On the critical trials, 36.8 per cent of the answers followed the wrong majority, and about three quarters of the participants followed it at least once. # card: In the article
Discussion. Asch concluded that group pressure can ‹distort› judgement even when the task is simple. He also stressed the differences between individuals: some participants never yielded, and those who did gave very different reasons. # card: In the article
Dr Hale: Which sentence reports the Results paragraph correctly?
// q: Results paragraph: which sentence reports it correctly?
- (d44)
* [In the control group, one answer in ten was wrong.]
    Dr Hale: Check the paragraph.
    The control group made almost no mistakes. Say: In the control group, fewer than one answer in a hundred was wrong. # note
    -> d44
* [§In the control group, fewer than one per cent of the answers were wrong.]
    Dr Hale: Good. The number and the unit are both exact.
* [About three quarters of the participants was following the majority once.]
    Dr Hale: Good idea, but check the grammar.
    "Three quarters of the participants" is plural, and for a result we use the simple past. Say: About three quarters of the participants followed the majority at least once. # note
    -> d44
* [§On the critical trials, about a third of the answers followed the wrong majority.]
    Dr Hale: Good. "About a third" matches 36.8 per cent.
- Dr Hale: Now the seminar blog. A classmate summarised the result in one sentence. Which version is the most careful and accurate?
// q: Asch's line study: which sentence is the most careful and accurate?
- (d29)
* [The study proves that most people cannot think for themselves.]
    Dr Hale: Hmm. "Proves" and "most people" are very big words for one experiment with students.
    The claim is much stronger than the evidence. In most answers the volunteers did not follow the group. Say: The study suggests that a unanimous majority can pull many people towards a wrong answer. # note
    -> d29
* [§In this set-up, about a third of the answers followed a unanimous wrong majority, and about two thirds did not.]
    Dr Hale: Good. You gave both numbers and limited the claim to "this set-up".
* [The results suggest that a unanimous majority are able to make people yields.]
    Dr Hale: Good idea, but check the grammar.
    After "make" we use the base form of the verb. Say: The results suggest that a unanimous majority can make people yield. # note
    -> d29
* [§The results suggest that a unanimous majority can pull many people towards a wrong answer, even when the task is easy.]
    Dr Hale: Also good. "Suggest" and "can" keep the claim in proportion to the evidence.
- Dr Hale: Let us close this part as a paper closes: with a conclusion and a look at further research.
Conclusion. Asch's procedure produced a clear and uncomfortable result: a unanimous majority led many people to give an answer that they could see was wrong. It also produced a second result that is easy to forget: most answers were still independent. The study therefore asks two questions. What exactly was the pressure made of? And how far does it reach beyond a classroom with strangers and lines? # card: Conclusion and further research
Further research. Asch built on Muzafer Sherif (1935), who used an ‹ambiguous› task: volunteers in a dark room judged how far a point of light moved, and their ‹estimates=estimate› moved towards the group's. Asch asked what happens when the answer is ‹obvious›. Stanley Milgram, who had worked as Asch's research assistant, later asked whether the same kind of pressure works in a more serious situation. That question led to the study you played in Case 1. The next two parts follow the main lines of later research: why people yield, what changes the pressure, and whether the result depends on time and culture. # card: Conclusion and further research
Dr Hale: Next, we read the objections. A famous result is often told in the shortest way. We will check what was left out.
1. On the critical cards, what did you tell yourself before you answered? Which of the three reasons in the interview was closest to yours? # card: Bring to the lesson
2. Think of a case discussion or a supervision group. When did you keep a different opinion to yourself, and what would have made it easier to say it? # card: Bring to the lesson
Asch, S. E. (1951). Effects of group pressure upon the modification and distortion of judgments. In H. Guetzkow (Ed.), Groups, Leadership and Men (pp. 177-190). Pittsburgh: Carnegie Press. # fold: Sources
Asch, S. E. (1955). Opinions and social pressure. Scientific American, 193(5), 31-35. # fold: Sources
Asch, S. E. (1956). Studies of independence and conformity: I. A minority of one against a unanimous majority. Psychological Monographs, 70(9), 1-70. # fold: Sources
Sherif, M. (1935). A study of some social factors in perception. Archives of Psychology, 27(187), 1-60. # fold: Sources # endpart: 4
-> DONE

=== ep5 ===
Dr Hale has put a textbook on the table, open at a page with a yellow note. # scene: 5 # title: Is it really conformity?
{
- not played4:
    Dr Hale: Last time you took part in the study as a volunteer. Now we ask what the numbers really say.
- yielded == 0:
    Dr Hale: Last time you gave your own answer on all four cards. Now we ask what the numbers really say about people like you.
- yielded == 4:
    Dr Hale: Last time you went with the group on all four cards. Now we ask what that means, and what it does not mean.
- else:
    Dr Hale: Last time you went with the group {yielded} time{yielded > 1:s} out of four. Now we ask what the numbers really say.
}
Dr Hale: There are two objections in this part. The first is about how the study is told.
Asch's report of 1956 has a long title: "Studies of independence and conformity". The word ‹independence› comes first. But the study is usually called a conformity experiment. In 1990, Ronald Friend and his colleagues argued that Asch's work had been ‹misinterpreted=misinterpret› over the years: books gave more and more space to the volunteers who yielded, and less to the ones who did not.
Dr Hale: Asch's data can be told in two ways. Version 1: "On about a third of the critical cards, the volunteers followed the group's wrong answer." Version 2: "On about two thirds of the critical cards, the volunteers gave their own correct answer." Both versions are true. In 2015, Richard Griggs checked twenty recent ‹textbooks=textbook›. How many of the twenty told students Version 2?
- (d30)
* [^Most of them.]
    Dr Hale: Too high. Only one of the twenty told Version 2. Fourteen told only Version 1.
* [^About half of them.]
    Dr Hale: Too high. Only one of the twenty told Version 2. Fourteen told only Version 1.
* [^A few of them.]
    Dr Hale: Close, but lower. Only one of the twenty told Version 2. Fourteen told only Version 1.
* [^Only one.]
    Dr Hale: Right. Only one of the twenty told Version 2. Fourteen told only Version 1.
- Dr Hale: The number they left out is 63.2 per cent: almost two thirds of the answers on critical trials did not follow the group (and 36.8 per cent did). And only one book mentioned Asch's interviews, where many volunteers explained why they kept their own answer.
Dr Hale: Write the blog sentence again. Which version reports the result in the most ‹balanced› way?
// q: Asch's main experiment: which sentence reports the result in the most balanced way?
- (d31)
* [Asch showed that most people always follow the group.]
    Dr Hale: Check the numbers.
    About two thirds of the answers did not follow the group, and about a quarter of the volunteers never did. Say: Asch found that about a third of the answers followed the group. # note
    -> d31
* [§In Asch's main experiment, about a third of the answers followed the group's wrong answer, and about two thirds did not.]
    Dr Hale: Good. Both numbers are there, and the claim is limited to "Asch's main experiment".
* [Asch's volunteers were independent, so the group had no effect.]
    Dr Hale: Careful. That goes too far in the other direction.
    About a third of the answers followed the group, and about three quarters of the volunteers did so at least once. Say: The group had a strong effect on some answers, but not on most. # note
    -> d31
* [§Asch's volunteers resisted the group on most answers, but about three quarters of them yielded at least once.]
    Dr Hale: Also good. It shows independence and conformity in the same sentence.
- Dr Hale: The second objection asks why people yielded at all.
In 1955, Morton Deutsch and Harold Gerard asked what kinds of pressure were at work. They separated two kinds.
Normative influence: you go along because you want to be accepted and to avoid disapproval. # card: Two kinds of pressure
Informational influence: you go along because other people's answers are evidence about what is true. # card: Two kinds of pressure
To tell them apart, they changed Asch's set-up. In one condition, volunteers sat face to face with a group and said their answers aloud, as in Asch's study. In the other, each volunteer sat alone in a ‹booth=booth› and wrote the answer in private, so nobody could see it, but he still learned what the group had answered. This is called an ‹anonymous› condition. A third group judged the lines alone, with no group answers at all. The anonymous volunteers made fewer mistakes than the face-to-face ones. But they still made more mistakes than the volunteers who judged alone.
Dr Hale: Now put the three groups in order. Which order shows the number of mistakes, from the most to the fewest?
// q: Deutsch and Gerard: in which order did the three groups make mistakes, from the most to the fewest?
- (d32)
* [Alone, anonymous, face to face.]
    Dr Hale: Check the text.
    The group that judged alone made the fewest mistakes, not the most. # note
    -> d32
* [§Face to face, anonymous, alone.]
    Dr Hale: Right. Being seen made the pressure stronger, but the group's answers had an effect even in private. So both kinds of pressure seem to matter.
* [Anonymous, face to face, alone.]
    Dr Hale: Check the text.
    The anonymous volunteers made fewer mistakes than the face-to-face ones. # note
    -> d32
* [All three made about the same number of mistakes.]
    Dr Hale: Check the text.
    The three groups made different numbers of mistakes. # note
    -> d32
- Dr Hale: Now think about your own life. Remember a time when you agreed with a group, although you had doubts. Which kind of pressure was stronger?
- (d33)
* [^Normative: I did not want to stand out.]
    Dr Hale: There is no single correct answer. This was the reason of the volunteers who knew what they saw but went along, which Asch called a distortion of action. Deutsch and Gerard would add that it may not be the whole story.
* [^Informational: I thought the others knew better.]
    Dr Hale: There is no single correct answer. This was the reason of volunteers who began to trust the group more than themselves, which Asch called a distortion of judgement. It is more likely when a task is difficult or unclear, so it was probably less common in the line task.
* [^Both, in different moments.]
    Dr Hale: There is no single correct answer. This is close to what Deutsch and Gerard argued: both kinds of pressure matter, and they can change from one moment to the next.
* [^Neither: I kept my own opinion.]
    Dr Hale: There is no single correct answer. This is the independent volunteer's reason, and it was the most common one in Asch's study: about two thirds of the answers did not follow the group.
- Dr Hale: Last question for this part. If about two thirds of the answers were independent, what would be a fair name for the study?
- (d34)
* [^"Studies of independence and conformity"]
    Dr Hale: There is no single correct answer. This is Asch's own title for the report of 1956. Independence comes first.
* [^"The Asch conformity experiment"]
    Dr Hale: There is no single correct answer. This is the usual name. It is short and well known, but it hides the two thirds.
* [^"A minority of one against a unanimous majority"]
    Dr Hale: There is no single correct answer. This is Asch's own subtitle. It describes the situation of the volunteer, not the result.
* [^"How strangers pressure strangers"]
    Dr Hale: There is no single correct answer. This is a fair name for the set-up, but it leaves out the independence.
- Dr Hale: Here is how a review article might sum up the two objections.
Two lessons follow from this literature. First, ‹selective› reporting: Asch's own title put independence first, but later textbooks gave more space to the answers that followed the group (Friend, Rafferty and Bramel, 1990; Griggs, 2015). Second, the pressure has more than one source: Deutsch and Gerard (1955) distinguished normative from informational influence, and their anonymous condition suggests that both operate. Asch's interviews add that volunteers differed in how they experienced the pressure. # card: In the review
Dr Hale: Which sentence reports the review correctly?
// q: Which sentence reports the review of the objections correctly?
- (d45)
* [Textbooks lied about Asch's results.]
    Dr Hale: Check the paragraph.
    The review says that the numbers were reported, but the conformity half got more space. Say: Many textbooks stressed the answers that followed the group and gave less space to the independent ones. # note
    -> d45
* [§Many textbooks gave more space to the answers that followed the group than to the independent answers.]
    Dr Hale: Good. It reports the imbalance without accusing anybody.
* [Deutsch and Gerard has distinguish two kinds of pressure.]
    Dr Hale: Good idea, but check the grammar.
    A report of earlier research needs the simple past. Say: Deutsch and Gerard distinguished two kinds of pressure. # note
    -> d45
* [§Deutsch and Gerard distinguished two kinds of pressure, and their anonymous condition suggests that both operate.]
    Dr Hale: Good. "Suggests" keeps the claim in proportion to the evidence.
- Dr Hale: Let us close this part with a conclusion and a look at further research.
Conclusion. The first objection corrects the telling of the study, not the study itself: both numbers are true, but they were not given the same ‹weight›. The second objection shows that "conformity" is not one thing. A volunteer can yield to be accepted, to be right, or both, and the line task cannot always tell these reasons apart. # card: Conclusion and further research
Further research. Later researchers tried to separate the reasons. In 2010, Kazuo Mori and Miho Arai repeated the line task with 104 Japanese ‹undergraduates=undergraduate›, without any confederates: polarising filters let one student in each group of four see different lines from the other three. They reported results similar to Asch's. In 2005, Gregory Berns and colleagues (link in Sources) used brain imaging during a mental-rotation task. They reported that going with a wrong majority was linked to activity in visual and spatial areas of the brain, and independence to activity in emotional areas such as the amygdala. Both studies are small, and both need further ‹replication›. # card: Conclusion and further research
Dr Hale: Next: what happened when Asch changed the set-up, and when other people repeated it.
1. The headline says "a third followed the group". The data also say "two thirds did not". In your work, which half of a story do people usually tell? # card: Bring to the lesson
2. Normative or informational: in a group supervision, which pressure would you expect to feel? How could you tell them apart in your own behaviour? # card: Bring to the lesson
Friend, R., Rafferty, Y., & Bramel, D. (1990). A puzzling misinterpretation of the Asch "conformity" study. European Journal of Social Psychology, 20(1), 29-44. https:\/\/doi.org\/10.1002/ejsp.2420200104 # fold: Sources
Griggs, R. A. (2015). The disappearance of independence in textbook coverage of Asch's social pressure experiments. Teaching of Psychology, 42(2), 137-142. https:\/\/doi.org\/10.1177/0098628315569939 # fold: Sources
Deutsch, M., & Gerard, H. B. (1955). A study of normative and informational social influences upon individual judgment. Journal of Abnormal and Social Psychology, 51(3), 629-636. # fold: Sources
Asch, S. E. (1956). Studies of independence and conformity: I. A minority of one against a unanimous majority. Psychological Monographs, 70(9), 1-70. # fold: Sources
Mori, K., & Arai, M. (2010). No need to fake it: Reproduction of the Asch experiment without confederates. International Journal of Psychology, 45(5), 390-397. https:\/\/doi.org\/10.1080/00207591003774485 # fold: Sources
Berns, G. S., Chappelow, J., Zink, C. F., Pagnoni, G., Martin-Skurski, M. E., & Richards, J. (2005). Neurobiological correlates of social conformity and independence during mental rotation. Biological Psychiatry, 58(3), 245-253. https:\/\/doi.org\/10.1016/j.biopsych.2005.04.012 # fold: Sources # endpart: 5
-> DONE

=== ep6 ===
Dr Hale puts a table on the desk. It has a column of numbers and a column of names. # scene: 6 # title: What is left of Asch
Dr Hale: Last time: objections. Now: evidence. Asch did not stop after the first experiment. He changed one thing at a time. First, the size of the majority. How many opponents did he need to produce the strongest pull on a volunteer?
- (d35)
* [^One.]
    Dr Hale: Not enough. With one opponent, the pull was almost zero.
* [^Two.]
    Dr Hale: Not yet. With two opponents, 13.6 per cent of the answers followed the group.
* [^Three.]
    Dr Hale: Right. With three opponents the share rose to 31.8 per cent, and then it ‹levelled off=level off›.
* [^Fifteen.]
    Dr Hale: Not needed. With three opponents the share was already 31.8 per cent, and more did not add much.
- Dr Hale: Next, the partner. In one variation, one of the actors gave the correct answer every time, so the volunteer had an ‹ally›. Here is the table. In every row, the number shows how many answers out of 100 followed the group's wrong answer.
Volunteer alone, no group: fewer than 1 out of 100 # card: Answers that followed the wrong majority
One opponent: almost none # card: Answers that followed the wrong majority
Two opponents: 13.6 out of 100 # card: Answers that followed the wrong majority
Three opponents: 31.8 out of 100 # card: Answers that followed the wrong majority
Many opponents, up to fifteen: about 32 to 37 out of 100 # card: Answers that followed the wrong majority
Three opponents and one true partner: about a quarter of the usual rate, so about 8 to 10 out of 100 # card: Answers that followed the wrong majority
Dr Hale: Now the question. What do these numbers suggest?
// q: The pull of the group stopped growing after three opponents and fell with one ally. What do these numbers suggest?
- (d36)
* [That the pressure grows with every extra person.]
    Check the table: after three opponents the pressure did not grow much. # note
    -> d36
* [§That the size of the majority matters only up to a point, and that one ally makes it much easier to refuse.]
    Dr Hale: Yes. The famous result, that about a third of the answers followed the group, is one number out of many.
* [That a true partner made no difference.]
    Check the table: with a partner, the rate fell to about a quarter of the usual rate. # note
    -> d36
* [§That unanimity matters: when one person breaks it, the pressure falls sharply.]
    Dr Hale: Yes. The pressure came from a unanimous group, not just from a large one.
- Dr Hale: Next, repetition. In 1980, two British researchers, Stephen Perrin and Christopher Spencer, repeated Asch's procedure with British university students of engineering, mathematics and chemistry. In Asch's study, volunteers followed the group's wrong answer on about a third of the critical trials. Perrin and Spencer's students had 396 critical trials in total. On how many of them did a student follow the group's wrong answer?
- (d37)
* [^About 130 times.]
    Dr Hale: Not at all. It happened only once in 396 critical trials.
* [^About 40 times.]
    Dr Hale: Not at all. It happened only once in 396 critical trials.
* [^About 10 times.]
    Dr Hale: Not at all. It happened only once in 396 critical trials.
* [^Once.]
    Dr Hale: Right. It happened only once in 396 critical trials.
- Dr Hale: Perrin and Spencer argued that the result of 1951 belonged to its time and place, the United States of the early 1950s. Be careful: their volunteers were students trained to measure things, which may also explain it. In a follow-up with young people on probation, who faced probation officers as the majority, they reported conformity close to Asch's. This is a partial replication of the context, not a repetition of the same experiment.
In 1996, Rod Bond and Peter Smith published a ‹meta-analysis› of 133 studies from 17 countries that used the line task. They reported two patterns. In the United States, conformity had ‹declined=decline› since the 1950s. And in more ‹collectivist› countries conformity was higher than in more individualist ones. Be careful, though: the ‹sample› of studies was uneven, and most came from the United States. Every claim needs a ‹caveat›.
Dr Hale: Here is how the Discussion section of a review might sum up the evidence.
Three conclusions seem safe. First, the pressure depends on the situation: it rises with the size of a unanimous majority up to about three people, and it falls sharply when one person breaks the unanimity. Second, the result varies across time and place: a British replication found almost no conformity, and a meta-analysis found lower rates in recent American studies and higher rates in collectivist countries. Third, the finding is ‹robust› enough to be reproduced, but it cannot be ‹generalised=generalise› from line judgements to every kind of group decision. # card: In the discussion
Dr Hale: Which sentence uses this evidence most carefully?
// q: Which sentence uses the evidence from the Discussion most carefully?
- (d46)
* [Asch proved that group pressure is the same in every culture.]
    Dr Hale: Careful. "Proved" and "the same in every culture" are both too strong.
    The paragraph says that the result varies across time and place. Say: The evidence points to variation across situations, times and cultures. # note
    -> d46
* [§The evidence suggests that group pressure varies with the situation, the time and the culture.]
    Dr Hale: Good. "Suggests" and the list of three factors keep the claim inside its limits.
* [The pressure fall when one person disagree.]
    Dr Hale: Close, but check the grammar.
    Both verbs need the third-person ending or the simple past. Say: The pressure falls when one person disagrees. # note
    -> d46
* [§The pressure fell sharply when one person broke the unanimity, so unanimity seems to matter.]
    Dr Hale: Good. "Seems to" marks the explanation as an interpretation.
- Dr Hale: Let us test some ‹claims=claim›. Claim one: "People always follow a unanimous majority." What is its status?
// q: Claim: "People always follow a unanimous majority." What is its status?
- (d38)
* [Still supported.]
    About a third of the answers followed the group, and a quarter of the volunteers never did. "Always" is too strong. # note
    -> d38
* [§Too strong.]
    Dr Hale: Yes. In some conditions, one ally or a different culture was enough to change the result.
* [Completely disproved.]
    A third of the answers followed the group, and many later studies found conformity too. It is not disproved, it is overstated. # note
    -> d38
- Dr Hale: Claim two: "A unanimous majority can pull many people towards a wrong answer, but how much depends on the situation, the culture and the time." And what is its status?
// q: Claim: "A unanimous majority can pull many people towards a wrong answer, but how much depends on the situation, the culture and the time." What is its status?
- (d39)
* [Too strong.]
    Dr Hale: Not really. The sentence says "can" and "many", and it names its own limits.
    The sentence already contains its limits: "can", "many" and "depends on". Say: This claim is carefully limited and still supported. # note
    -> d39
* [§Still supported, with limits.]
    Dr Hale: Yes. The finding survives; its size changes with the situation, the culture and the time.
* [Completely disproved.]
    The variations, the replications and the meta-analysis all found that group pressure exists. It is not disproved. # note
    -> d39
- Dr Hale: Last question. What would you tell a first-year student about this study?
- (d40)
* [^It shows how a unanimous majority can pull people away from what they see.]
    Dr Hale: There is no single correct answer. This is the classic reading. Add one "can" and one "in some conditions" and it is also a careful one.
* [^It shows how much independence people also show under pressure.]
    Dr Hale: There is no single correct answer. This is the reading of Asch's own title and of the critics of the textbooks: about two thirds of the answers were independent.
* [^It shows that group pressure changes with the time, the place and the people.]
    Dr Hale: There is no single correct answer. This is the reading of Perrin and Spencer and of Bond and Smith. It is supported by the replications.
* [^It shows how one ally can change the situation.]
    Dr Hale: There is no single correct answer. This is supported by Asch's partner variation, where the pressure fell to about a quarter.
- Dr Hale: A last word, as a paper would end.
Conclusion. After seventy years, the picture is more careful than the textbook ‹headline›. A unanimous group can pull many people away from what they see. It does so less often than people think, and less in some times, places and groups than in others. And one ally is enough to change the situation. # card: Conclusion and further research
Further research. The main questions now are about reasons and limits. Bond and Smith (1996) linked conformity to individualism and collectivism, but later work has not always confirmed the ‹stereotype›: Takano and Sogon (2008) did not find that Japanese students conformed more than students in the United States. Methods have also changed, from confederates to polarising filters and brain scans, which you met in the previous part. A current question is whether online groups, where a majority is shown as a number of likes or votes, ‹exert› the same kind of pressure. # card: Conclusion and further research
- {
- not played4:
    Dr Hale: One more thing. The table suggests what makes refusing easier: an ally. In your own work, who could be that ally for you?
- yielded == 0:
    Dr Hale: One more thing. In the role play you never went with the group. The table suggests what might have made that easier: an ally. In your own work, who could be that ally for you?
- else:
    Dr Hale: One more thing. In the role play you went with the group {yielded} time{yielded > 1:s}. The table suggests what might have made refusing easier: an ally. In your own work, who could be that ally for you?
}
Dr Hale: That is the end of Case 2.
1. Asch found that one ally changed the situation. In a group where everybody seems to agree, what does it take for you to speak? What could a colleague do to make it easier? # card: Bring to the lesson
2. Perrin and Spencer suggested that conformity depends on time and place. Do you think the pressure to agree with a group is different in Lithuania today from the United States in the 1950s? What would you expect, and why? # card: Bring to the lesson
Asch, S. E. (1955). Opinions and social pressure. Scientific American, 193(5), 31-35. # fold: Sources
Perrin, S., & Spencer, C. (1981). Independence or conformity in the Asch experiment as a reflection of cultural and situational factors. British Journal of Social Psychology, 20(3), 205-209. # fold: Sources
Bond, R., & Smith, P. B. (1996). Culture and conformity: A meta-analysis of studies using Asch's (1952b, 1956) line judgment task. Psychological Bulletin, 119(1), 111-137. https:\/\/doi.org\/10.1037/0033-2909.119.1.111 # fold: Sources
Takano, Y., & Sogon, S. (2008). Are Japanese more collectivistic than Americans? Examining conformity in in-groups and the reference-group effect. Journal of Cross-Cultural Psychology, 39(3), 237-250. # fold: Sources # endpart: 6
-> DONE

=== ep7 ===
Dr Hale has cleared the table. Two folders lie side by side: CASE 1 and CASE 2. # scene: 7 # title: Two cases side by side
Dr Hale: You have now taken part in two famous studies, and you have read the objections to both. This part has no new experiment. We compare the two cases and ask what they say together. Take your time: many questions here have no single right answer.
Dr Hale: First, the facts side by side. Read the table twice.
Aspect :: Case 1: Milgram :: Case 2: Asch # table: The two cases side by side
Pressure comes from :: An authority figure, the experimenter :: A unanimous group of equals # table: The two cases side by side
Task :: Giving electric shocks that seem to grow more dangerous :: Judging the length of lines # table: The two cases side by side
Headline result :: 65 per cent of the volunteers went to the maximum :: 36.8 per cent of the answers followed the group # table: The two cases side by side
The other half :: 35 per cent stopped before the maximum :: 63.2 per cent of the answers were independent # table: The two cases side by side
What made refusing easier :: Other volunteers refusing first (10 per cent went on); orders by telephone (about 20 per cent) :: One true partner (about a quarter of the usual rate) # table: The two cases side by side
Replications :: Burger 2009 (70 per cent past 150 volts); Poland 2017 (90 per cent) :: Perrin and Spencer 1980 (once in 396 critical trials); Mori and Arai 2010 # table: The two cases side by side
Main objections :: Ethics; the interpretation of the result :: One-sided retelling; the reasons for yielding # table: The two cases side by side
Dr Hale: Academic comparisons use special language. Here is a short toolkit, with examples from our two cases.
‹Whereas› and while contrast two things in one sentence: Case 1 studied an authority, whereas Case 2 studied a group. # card: Language for comparing
‹Similarly=similarly› and in the same way link two things that are alike: Similarly, both studies used deception. # card: Language for comparing
‹In contrast=in contrast› and unlike mark a difference: In contrast to Case 1, Case 2 produced more independent than yielding answers. # card: Language for comparing
Both ... and ... and neither ... nor ... join two things: Both studies were replicated, and neither result was simple. # card: Language for comparing
Dr Hale: Choose the connector that completes the comparison: "___ Milgram's volunteers faced an authority, Asch's volunteers faced a group of equals."
// q: ___ Milgram's volunteers faced an authority, Asch's volunteers faced a group of equals.
- (d59)
* [Unless]
    Dr Hale: Not this one. "Unless" means "if not", and the sentence does not state a condition.
    Whereas Milgram's volunteers faced an authority, Asch's volunteers faced a group of equals. # note
    -> d59
* [§Whereas]
    Dr Hale: Right. "Whereas" contrasts the two cases in one sentence.
* [Therefore]
    Dr Hale: Not this one. "Therefore" introduces a result, not a contrast.
    Whereas Milgram's volunteers faced an authority, Asch's volunteers faced a group of equals. # note
    -> d59
* [Similarly]
    Dr Hale: Not this one. "Similarly" links things that are alike, and here the cases differ.
    Whereas Milgram's volunteers faced an authority, Asch's volunteers faced a group of equals. # note
    -> d59
- Dr Hale: Which sentence compares the two cases most carefully?
// q: Which sentence compares the two cases most carefully?
- (d47)
* [Both studies prove that people always follow authorities and groups.]
    Dr Hale: Careful. "Prove" and "always" are too strong.
    In both studies a large minority resisted. Say: In both studies a situation led many people to act against their own judgement, but a large minority did not. # note
    -> d47
* [§In both studies, a situation led many people to act against their own judgement, but a large minority did not.]
    Dr Hale: Good. The sentence gives the finding and its limit.
* [In Case 1 the pressure come from an authority, whereas in Case 2 it come from a group.]
    Dr Hale: Good idea, but check the grammar.
    The verb "come" needs the past tense for a finished study. Say: In Case 1 the pressure came from an authority, but in Case 2 it came from a group. # note
    -> d47
* [§In Case 1 the pressure came from an authority, whereas in Case 2 it came from a group of equals.]
    Dr Hale: Good. "Whereas" is a clear way to compare two cases in one sentence.
- Dr Hale: Now the first question for you. Which pressure would be harder for you to resist?
- (d48)
* [^An authority figure.]
    Dr Hale: There is no single correct answer. In Case 1 the authority was strong, but its power depended on the situation: when the experimenter gave orders by telephone, only about 20 per cent went to the end, and when two other volunteers refused first, only 10 per cent did.
* [^A group of equals.]
    Dr Hale: There is no single correct answer. In Case 2 the group had no power to reward or punish, and still about a third of the answers followed it. Later research both supports and complicates this. Abrams and colleagues (1990) reported more conformity when the majority were seen as members of the volunteers' own group. Williams and Sogon (1984) found more conformity when the majority were friends than when they were strangers. These results fit the idea that belonging matters. But Berns and colleagues (2005) suggested that yielding may even change what people perceive, so wanting to belong may not be the whole story.
* [^It depends on the person.]
    Dr Hale: There is no single correct answer. In both studies a large minority resisted: 35 per cent in Case 1 and about a quarter of the volunteers in Case 2. But neither study could say what made these people different.
* [^It depends on the situation.]
    Dr Hale: There is no single correct answer. This is the lesson of the variations in both cases: when one feature of the set-up changed, the share who yielded changed a lot.
- Dr Hale: The second question. Both studies found that one ally changed the situation. What does this suggest?
- (d49)
* [^That people need a model for saying no.]
    Dr Hale: There is no single correct answer. This is a plausible reading: in Case 1, seeing two others refuse made refusing much more common. It is a hypothesis about the mechanism, not something the studies measured.
* [^That the pressure comes from unanimity, not from size.]
    Dr Hale: There is no single correct answer. This is supported by Case 2, where a single true partner cut the effect to about a quarter, although the majority stayed the same size.
* [^That it is easier to refuse when you feel less alone.]
    Dr Hale: There is no single correct answer. This is close to the ordinary meaning of social support. The studies did not measure feelings directly, so this remains an interpretation.
- Dr Hale: Now read how a review might sum up the two cases together.
Taken together, the two cases support three conclusions. First, behaviour in these studies depended strongly on the situation: the share of volunteers who yielded changed greatly when one feature of the set-up changed, for example the presence of an ally. Second, in both studies independence was as important as conformity: a large minority resisted, but later retellings often hid them. Third, the explanations are still debated: obedience and conformity may be less about blind ‹submission› than about identification with a group or a cause (Haslam and Reicher, 2012). Both studies also have clear ‹limitations=limitation›: artificial tasks, small samples of volunteers, and a particular time and place. # card: In the synthesis
Dr Hale: Which sentence from a student essay uses the synthesis most carefully?
// q: Which sentence uses the synthesis most carefully?
- (d50)
* [Haslam and Reicher proved that nobody obeys blindly.]
    Dr Hale: Careful. "Proved" and "nobody" are too strong.
    The review says that the explanations are still debated. Say: Haslam and Reicher suggest that obedience can be less blind than it seems. # note
    -> d50
* [§Haslam and Reicher argue that obedience may be less blind than it seems.]
    Dr Hale: Good. "Argue" and "may" show that this is one position in a debate.
* [Both studies has limitations, so we can learn nothing from them.]
    Dr Hale: Close, but check the grammar and the logic.
    "Both studies" is plural, and having limitations does not make a study useless. Say: Both studies have limitations, yet they still show the power of a situation. # note
    -> d50
* [§Both studies have limitations, but they still show how much a situation can matter.]
    Dr Hale: Good. The sentence joins the criticism and the finding.
- Dr Hale: A question that goes beyond the two cases. Why might a ‹tendency› to follow the group exist at all? Evolutionary researchers treat it as a possible ‹adaptation›. Which explanation seems most plausible to you?
- (d60)
* [^Copying the majority is a quick way to learn what works.]
    Dr Hale: There is no single correct answer. This is the idea of Boyd and Richerson (1985): when learning for yourself is costly or risky, copying what most people do can be a good strategy. In 2012, Haun, Rekers and Tomasello reported that chimpanzees and two-year-old children copied an action shown once by three individuals, rather than three times by one individual, while orangutans did not. This supports a long evolutionary history, but it does not show that the volunteers in Case 2 acted on such a tendency.
* [^Following the group keeps the group together and helps cooperation.]
    Dr Hale: There is no single correct answer. Henrich and Boyd (1998) modelled how copying the majority could make behaviour within a group more similar, and so increase the differences between groups. This links conformity to cooperation and to group identity. It remains a model, and it is debated how far it explains everyday behaviour.
* [^It is mainly a habit of culture, not an adaptation.]
    Dr Hale: There is no single correct answer. Claidière, Bowler and Whiten (2012) tested conformity in an everyday situation and found only a weak, roughly linear effect, not an exaggerated tendency to copy the majority. Claidière and Whiten (2012) also argue that informational and normative conformity should be studied separately in humans and in animals.
- Dr Hale: Now a few questions that connect the cases to you. Which objection seems most important to you?
- (d51)
* [^The ethics of the experiments.]
    Dr Hale: There is no single correct answer. This was Baumrind's objection to Case 1. It changed research practice: today, consent is requested in advance, and ethics committees review studies before they start.
* [^How the results were retold.]
    Dr Hale: There is no single correct answer. This is the objection of Friend and his colleagues and of Griggs, mostly about Case 2: a true number can mislead when only one half of it is told.
* [^The explanation: obedience or identification.]
    Dr Hale: There is no single correct answer. This is the debate between Milgram and Haslam and Reicher about Case 1, and a similar question about why volunteers yielded in Case 2. It is still open.
* [^Time, place and culture.]
    Dr Hale: There is no single correct answer. This is the point of Perrin and Spencer and of Bond and Smith for Case 2, and of Blass's review for Case 1, where obedience rates ranged from 28 to 91 per cent: results move with time and place, and we should say where a finding was made.
- Dr Hale: Next, a question about your work. A client says: "Everybody does it, so it must be normal." What would you say?
- (d52)
* [^Group pressure is real, but it is not a law.]
    Dr Hale: There is no single correct answer. Both cases support this: a large minority resisted, and the pressure changed with the situation.
* [^What exactly is pushing you: wanting to belong, or doubting yourself?]
    Dr Hale: There is no single correct answer. This uses the two kinds of pressure of Deutsch and Gerard. It is a useful question, though the line task cannot tell the two kinds apart for every person.
* [^Is there anybody who sees it differently, and could stand beside you?]
    Dr Hale: There is no single correct answer. This uses the finding about one ally. It is a practical idea, but remember that the studies used strangers, not friends or family.
- Dr Hale: And a last question about the two studies. Which one changed your opinion more?
- (d53)
* [^Case 1, the obedience study.]
    Dr Hale: There is no single correct answer. Case 1 is often remembered for its strong headline. The variations and the objections show how much depends on the details of the set-up.
* [^Case 2, the line study.]
    Dr Hale: There is no single correct answer. Case 2 is often remembered as a study of conformity. The numbers show that independence was the larger half of the result.
* [^Neither: I knew both already.]
    Dr Hale: There is no single correct answer. Even so, it is worth asking which details you knew: the full numbers, the variations and the objections are often missing from the usual summaries.
- Dr Hale: Now a short word check. Choose the word that completes each sentence. First sentence: "The criticism did not ___ the study, but it changed how it is read."
// q: The criticism did not ___ the study, but it changed how it is read.
- (d54)
* [reproduce]
    Dr Hale: Not this one. To "reproduce" a result is to get it again by repeating a study.
    The criticism did not cancel the study. # note
    -> d54
* [§cancel]
    Dr Hale: Right. To cancel something is to make it no longer valid.
* [yield]
    Dr Hale: Not this one. To "yield" is to give way to pressure.
    The criticism did not cancel the study. # note
    -> d54
* [estimate]
    Dr Hale: Not this one. An "estimate" is a guess about a size or amount.
    The criticism did not cancel the study. # note
    -> d54
- Dr Hale: Next sentence: "When everybody in the group gives the same answer, the majority is ___."
// q: When everybody in the group gives the same answer, the majority is ___.
- (d55)
* [anonymous]
    Dr Hale: Not this one. "Anonymous" means that the name or identity is not known.
    The majority is unanimous. # note
    -> d55
* [§unanimous]
    Dr Hale: Right. "Unanimous" means that everybody agrees.
* [selective]
    Dr Hale: Not this one. "Selective" means choosing only some things.
    The majority is unanimous. # note
    -> d55
* [ambiguous]
    Dr Hale: Not this one. "Ambiguous" means unclear.
    The majority is unanimous. # note
    -> d55
- Dr Hale: Next sentence: "Volunteers who ___ with an authority do what they are told, even when they doubt it."
// q: Volunteers who ___ with an authority do what they are told, even when they doubt it.
- (d56)
* [§comply]
    Dr Hale: Right. To comply is to do what you are told.
* [remain]
    Dr Hale: Not this one. To "remain" is to stay in the same state or place.
    Volunteers who comply do what they are told. # note
    -> d56
* [restage]
    Dr Hale: Not this one. To "restage" is to perform something again.
    Volunteers who comply do what they are told. # note
    -> d56
* [exert]
    Dr Hale: Not this one. To "exert" is to use power or influence.
    Volunteers who comply do what they are told. # note
    -> d56
- Dr Hale: Next sentence: "The finding appears ___ because partial replications gave similar rates."
// q: The finding appears ___ because partial replications gave similar rates.
- (d57)
* [messy]
    Dr Hale: Not this one. "Messy" means complicated and not clear.
    The finding appears robust. # note
    -> d57
* [§robust]
    Dr Hale: Right. A robust finding is strong and not easily disproved.
* [typical]
    Dr Hale: Not this one. "Typical" means normal or usual.
    The finding appears robust. # note
    -> d57
* [obvious]
    Dr Hale: Not this one. "Obvious" means easy to see.
    The finding appears robust. # note
    -> d57
- Dr Hale: Last sentence: "Every claim needs a ___: a warning about its limits."
// q: Every claim needs a ___: a warning about its limits.
- (d58)
* [headline]
    Dr Hale: Not this one. A "headline" is the main point of a story in short form.
    Every claim needs a caveat. # note
    -> d58
* [stereotype]
    Dr Hale: Not this one. A "stereotype" is a fixed, simple idea about a group.
    Every claim needs a caveat. # note
    -> d58
* [§caveat]
    Dr Hale: Right. A caveat warns the reader about the limits of a claim.
* [sample]
    Dr Hale: Not this one. A "sample" is a small group chosen to represent a larger group.
    Every claim needs a caveat. # note
    -> d58
- Dr Hale: Let us close this part as a paper closes: with a conclusion and a look at further research.
Conclusion. A classic study is a starting point, not a verdict. Read side by side, the two cases share a pattern: a strong headline, a larger and quieter second half of the result, and a ‹hypothesis› about the reasons that is still being tested. The best summary of each case names its numbers, its limits and its critics. # card: Conclusion and further research
Further research. Haslam and Reicher (2012) compared Milgram's studies with another famous study of roles and power, and argued that in both people followed leaders they identified with, rather than simply obeying. Cialdini and Goldstein (2004) reviewed the wider research on compliance and conformity in everyday life. A different line of work asks why a collective tendency exists at all: evolutionary researchers treat copying the majority as a possible adaptation. Boyd and Richerson (1985) modelled when it pays to copy the majority, Haun, Rekers and Tomasello (2012) found majority-biased copying in chimpanzees and in two-year-old children, and Claidière and Whiten (2012) reviewed conformity in animals and humans. These are hypotheses about origins, not proof that Asch's volunteers were acting on an ancient instinct. A useful habit for any student of psychology follows from all of this: before you use a famous number, find out what it left out. # card: Conclusion and further research
Five questions to take with you. 1) What is the pressure made of: wanting to belong, or doubting yourself? 2) Who is the group, and is it really unanimous? 3) Is there an ally, even one? 4) What does the famous number leave out? 5) Who resisted, and what helped them? # card: Questions to keep
1. Which of the two cases was harder for you to play, and why? What does that tell you about the kind of pressure you find hardest? # card: Bring to the lesson
2. Think of a client, real or imagined, who goes along with a group against his or her own judgement. Which two of the five questions to keep would you ask first, and why? # card: Bring to the lesson
Haslam, S. A., & Reicher, S. D. (2012). Contesting the "nature" of conformity: What Milgram and Zimbardo's studies really show. PLoS Biology, 10(11), e1001426. https:\/\/pmc.ncbi.nlm.nih.gov\/articles\/PMC3502509 # fold: Sources
Cialdini, R. B., & Goldstein, N. J. (2004). Social influence: Compliance and conformity. Annual Review of Psychology, 55, 591-621. # fold: Sources
Abrams, D., Wetherell, M., Cochrane, S., Hogg, M. A., & Turner, J. C. (1990). Knowing what to think by knowing who you are: Self-categorization and the nature of norm formation, conformity and group polarization. British Journal of Social Psychology, 29(2), 97-119. # fold: Sources
Williams, T. P., & Sogon, S. (1984). Group composition and conforming behavior in Japanese students. Japanese Psychological Research, 26(4), 231-234. # fold: Sources
Boyd, R., & Richerson, P. J. (1985). Culture and the Evolutionary Process. Chicago: University of Chicago Press. # fold: Sources
Henrich, J., & Boyd, R. (1998). The evolution of conformist transmission and the emergence of between-group differences. Evolution and Human Behavior, 19(4), 215-241. https:\/\/doi.org\/10.1016\/S1090-5138(98)00018-X # fold: Sources
Haun, D. B. M., Rekers, Y., & Tomasello, M. (2012). Majority-biased transmission in chimpanzees and human children, but not orangutans. Current Biology, 22(8), 727-731. https:\/\/doi.org\/10.1016\/j.cub.2012.03.006 # fold: Sources
Claidière, N., & Whiten, A. (2012). Integrating the study of conformity and culture in humans and nonhuman animals. Psychological Bulletin, 138(1), 126-145. # fold: Sources
Claidière, N., Bowler, M., & Whiten, A. (2012). Evidence for weak or linear conformity but not for hyper-conformity in an everyday social learning context. PLoS ONE, 7(2), e30970. https:\/\/doi.org\/10.1371\/journal.pone.0030970 # fold: Sources # endpart: 7
-> DONE
