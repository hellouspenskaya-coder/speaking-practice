// Baltic Freight 3: A bad day (A2). The student is a new assistant at Baltic Freight. § marks the good reply; the other two replies do not fit.
// Tags at the END of a line: # scene: N # title: ...  |  # note  |  # end. Words in ‹ › are vocabulary (‹shown=key› when the form differs).

VAR tries = 0
VAR smooth = 0

-> s1

=== function good ===
{ tries == 0:
    ~ smooth = smooth + 1
}
~ tries = 0

=== s1 ===
It is Monday morning. The phone is ringing and Marta is not in the office. # scene: 1 # title: Bad news
You pick up the phone. A man is very angry.
Mr Lukas: Hello! My boxes arrived ‹damaged›! I want to make a ‹complaint›.
- (d1)
* [Thank you very much.]
    ~ tries = tries + 1
    Mr Lukas: Thank you? My boxes are broken!
    Mr Lukas is angry. Say sorry first. Say: I'm very sorry. Can you tell me what happened? # note
    -> d1
* [§I'm very sorry. Can you tell me what happened?]
    ~ good()
    You ‹apologize› and listen.
    Mr Lukas: Three boxes are broken. The chairs inside too.
* [Please call tomorrow. Goodbye.]
    ~ tries = tries + 1
    Mr Lukas: Tomorrow?! I am waiting now!
    Do not send an angry customer away. Say sorry and ask. Say: I'm very sorry. Can you tell me what happened? # note
    -> d1
- Mr Lukas: Whose fault is it? Is it the driver?
- (d2)
* [Yes, I am the driver.]
    ~ tries = tries + 1
    Mr Lukas: You are the driver?
    You do not know yet. Say that you are looking for the reason. Say: I don't know yet. We are looking for the reason. # note
    -> d2
* [The chairs are red.]
    ~ tries = tries + 1
    Mr Lukas: Red? What does that mean?
    Mr Lukas asks about the reason. Say: I don't know yet. We are looking for the reason. # note
    -> d2
* [§I don't know yet. We are looking for the reason.]
    ~ good()
    Mr Lukas: OK. Please find the ‹reason› fast.
- Mr Lukas: And what will you do? I need a ‹solution›.
- (d3)
* [§We'll send you new boxes tomorrow, and we will pay for the damage.]
    ~ good()
    Mr Lukas: OK. Thank you. That is better.
* [The road was wet.]
    ~ tries = tries + 1
    Mr Lukas: That is the reason. But I need a solution.
    A reason says why. A solution says what you will do. Say: We'll send you new boxes tomorrow, and we will pay for the damage. # note
    -> d3
* [Goodbye, have a nice day.]
    ~ tries = tries + 1
    Mr Lukas: Wait! What will you do?
    Tell him what you will do. Say: We'll send you new boxes tomorrow, and we will pay for the damage. # note
    -> d3
- Marta comes back. She heard everything.
Marta: Good job. We also need a new ‹rule›: drivers must tie the boxes carefully. Can you write it?
- (d4)
* [No, I am not a driver.]
    ~ tries = tries + 1
    Marta: I know! But can you write the rule?
    Marta asks you to write a rule for drivers. Say: Yes. "Drivers must tie the boxes with two belts." # note
    -> d4
* [Yes. "Boxes must be blue."]
    ~ tries = tries + 1
    Marta: Blue? Hmm. The rule is about tying the boxes.
    The rule is about tying the boxes. Say: Yes. "Drivers must tie the boxes with two belts." # note
    -> d4
* [§Yes. "Drivers must tie the boxes with two belts."]
    ~ good()
    Marta: Perfect. Short and clear.
- -> s2

=== s2 ===
The next day a truck from Turkey waits at the ‹border› of the European Union. Marta calls you. # scene: 2 # title: At the border
Marta: Our customs ‹specialist=specialist› is ill. Please help the driver. Here are the ‹documents=document›: the ‹invoice› and the ‹declaration›.
A ‹customs› officer comes to the truck.
Customs officer: Good morning. Documents, please.
- (d5)
* [§Good morning. Here you are.]
    ~ good()
    Customs officer: Thank you.
* [Good night.]
    ~ tries = tries + 1
    Customs officer: Night? It is morning!
    Say good morning and give the documents. Say: Good morning. Here you are. # note
    -> d5
* [I have a bag.]
    ~ tries = tries + 1
    Customs officer: OK. But I need the documents.
    The officer wants the papers. Say: Good morning. Here you are. # note
    -> d5
- Customs officer: What is in the truck?
- (d6)
* [A big truck.]
    ~ tries = tries + 1
    Customs officer: I can see that. What is inside it?
    The officer asks about the goods inside. Say: Cotton shirts, five hundred pieces. The invoice is here. # note
    -> d6
* [§Cotton shirts, five hundred pieces. The invoice is here.]
    ~ good()
    Customs officer: OK. Please wait. I will check the declaration.
* [It is Tuesday.]
    ~ tries = tries + 1
    Customs officer: Ha, yes. But what is in the truck?
    The officer asks about the goods. Say: Cotton shirts, five hundred pieces. The invoice is here. # note
    -> d6
- The officer reads the papers for a long time.
Customs officer: There is a mistake. The date is wrong. The truck must wait.
- (d7)
* [Thank you, goodbye.]
    ~ tries = tries + 1
    Customs officer: Wait! The truck must wait.
    There is a problem. Say sorry and ask what to do. Say: I'm sorry. Can we correct it now? # note
    -> d7
* [It is a nice date.]
    ~ tries = tries + 1
    Customs officer: No, it is the wrong date!
    The officer says the date is wrong. Say: I'm sorry. Can we correct it now? # note
    -> d7
* [§I'm sorry. Can we correct it now?]
    ~ good()
    Customs officer: Yes. Write the right date here.
- Customs officer: Good. Now you must pay ‹duty›. It is two hundred euros.
- (d8)
* [§Okay. Can I pay by card?]
    ~ good()
    Customs officer: Yes. The machine is here. Welcome to the European Union!
* [I like your uniform.]
    ~ tries = tries + 1
    Customs officer: Thank you. But you must pay duty.
    The officer asks you to pay. Say: Okay. Can I pay by card? # note
    -> d8
* [Where is the truck?]
    ~ tries = tries + 1
    Customs officer: It is behind you. Duty, please.
    Answer about the duty. Say: Okay. Can I pay by card? # note
    -> d8
- -> s3

=== s3 ===
Back at Baltic Freight, Marta sends you to the team leader, Tomas. # scene: 3 # title: The team
Tomas: New workers start next week. They need ‹training›. First we must plan the ‹shift›. Some people want the morning shift and some want the night shift. Which shift do you take?
- (d9)
* [I like shifts.]
    ~ tries = tries + 1
    Tomas: Ha! But which shift?
    Tomas asks you to choose morning or night. Say: I'll take the morning shift. I like to start early. # note
    -> d9
* [§I'll take the morning shift. I like to start early.]
    ~ good()
    Tomas: Good. I will write it down.
* [A taxi, please.]
    ~ tries = tries + 1
    Tomas: A taxi? I asked about the shift.
    Tomas asks about the shift. Say: I'll take the morning shift. I like to start early. # note
    -> d9
- Tomas: On Monday we have a ‹meeting› at eight. What do we tell the new workers first?
- (d10)
* [§First the safety rules. Then the machines.]
    ~ good()
    Tomas: Yes. Safety first. Today was a bad day, but you did well. # end
* [First the weather.]
    ~ tries = tries + 1
    Tomas: The weather? No, not first.
    Safety is the first thing in a warehouse. Say: First the safety rules. Then the machines. # note
    -> d10
* [First lunch, then sleep.]
    ~ tries = tries + 1
    Tomas: Ha! No. Safety first.
    Think about the warehouse. Safety is first. Say: First the safety rules. Then the machines. # note
    -> d10
- -> DONE
