// Baltic Freight 1: Your first day (A2). The student is a new assistant at Baltic Freight. § marks the good reply; the other two replies do not fit.
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
You walk into the office of Baltic Freight in Kaunas. It is your first day as a logistics assistant. # scene: 1 # title: Welcome
A woman comes to meet you. She smiles.
Marta: Good morning! I am Marta, the ‹manager›. Welcome to Baltic Freight.
- (d1)
* [I have a big family.]
    ~ tries = tries + 1
    Marta: Ha! That is nice. But I said welcome.
    Marta says hello and tells you her name. Greet her. Say: Nice to meet you, Marta. I'm happy to be here. # note
    -> d1
* [§Nice to meet you, Marta. I'm happy to be here.]
    ~ good()
    Marta: Thank you. Come in, please.
* [It is Monday today.]
    ~ tries = tries + 1
    Marta: Yes, it is. Your first day!
    Marta wants to meet you. Say hello to her. Say: Nice to meet you, Marta. I'm happy to be here. # note
    -> d1
- Marta: At Baltic Freight we move ‹goods› for many ‹customers=customer›. Do you know what ‹logistics› is?
- (d2)
* [I am from Kaunas.]
    ~ tries = tries + 1
    Marta: Nice, me too! But what about logistics?
    Marta asks about logistics, not about you. Say: A little. It is moving goods from one place to another. # note
    -> d2
* [Yes, I have a new car.]
    ~ tries = tries + 1
    Marta: A car? Hmm. I asked about logistics.
    Marta asks what logistics is. Say: A little. It is moving goods from one place to another. # note
    -> d2
* [§A little. It is moving goods from one place to another.]
    ~ good()
    Marta: Exactly. Every step, from the factory to the shop, is part of the ‹supply chain›. Our job is to plan each step.
- Marta: Today you will see the office, a delivery plan and the warehouse. Are you ready?
- (d3)
* [§Yes, I'm ready. Let's start.]
    ~ good()
    Marta: Great! Let's start with an ‹order›.
* [No, thank you.]
    ~ tries = tries + 1
    Marta: No, thank you? Do you want to go home?
    "No, thank you" is for offers. Marta asks if you are ready. Say: Yes, I'm ready. Let's start. # note
    -> d3
* [Yes, I am a driver.]
    ~ tries = tries + 1
    Marta: A driver? You are my new assistant!
    Marta asks if you are ready for the day. Say: Yes, I'm ready. Let's start. # note
    -> d3
- -> s2

=== s2 ===
Marta shows you her screen. A customer in Riga wants ten boxes of office chairs. # scene: 2 # title: The delivery plan
Marta: I am ‹responsible for› every delivery. This one has a ‹deadline›: Friday. The truck must arrive in Riga before that.
Marta: When must the truck leave Kaunas?
- (d4)
* [On a big truck.]
    ~ tries = tries + 1
    Marta: A big truck, yes. But when?
    Marta asks WHEN. Answer with a day. Say: On Wednesday, I think. Then it is in Riga on Thursday. # note
    -> d4
* [It is very expensive.]
    ~ tries = tries + 1
    Marta: Maybe! But when must the truck leave?
    Marta asks about time. Say: On Wednesday, I think. Then it is in Riga on Thursday. # note
    -> d4
* [§On Wednesday, I think. Then it is in Riga on Thursday.]
    ~ good()
    Marta: Good thinking. We need one extra day for problems.
- Marta: Now the ‹route›. Kaunas to Riga is about three hundred kilometres. How long is the drive?
- (d5)
* [§About four hours, I think.]
    ~ good()
    Marta: Right. Now the workers ‹load› the boxes and the ‹driver› checks the ‹shipment›.
* [About three hundred euros.]
    ~ tries = tries + 1
    Marta: Euros? I asked about time.
    Marta asks about the time of the drive, not about money. Say: About four hours, I think. # note
    -> d5
* [It is a nice road.]
    ~ tries = tries + 1
    Marta: Ha! Maybe. But how many hours?
    Marta asks for hours. Say: About four hours, I think. # note
    -> d5
- The driver, Jonas, calls Marta.
Jonas: Hello, Marta. I have a ‹delay›. The road is closed.
Marta: Jonas is late. What do we tell the customer?
- (d6)
* [The chairs are very nice.]
    ~ tries = tries + 1
    Marta: Yes, but the customer is waiting!
    The customer must know about the delay. Say: Let's call the customer and say we are late. # note
    -> d6
* [§Let's call the customer and say we are late.]
    ~ good()
    You call the customer. He says: no problem, Friday is fine.
* [Let's buy new chairs.]
    ~ tries = tries + 1
    Marta: New chairs? The chairs are fine. The truck is late.
    The problem is the truck, not the chairs. Say: Let's call the customer and say we are late. # note
    -> d6
- -> s3

=== s3 ===
Marta takes you to the warehouse. It is big and busy. A man in a yellow jacket waves at you. # scene: 3 # title: The warehouse
Tomas: Hello! I am Tomas, the team leader. Careful, a ‹forklift› is coming. Please stand behind the yellow line.
- (d7)
* [Yes, I like yellow.]
    ~ tries = tries + 1
    Tomas: Ha! Me too. But please, behind the line!
    Tomas asks you to move. Do it and say sorry. Say: Sorry! I'm behind the line now. # note
    -> d7
* [Where is the toilet?]
    ~ tries = tries + 1
    Tomas: The toilet is over there. But first, behind the line, please.
    First do what Tomas asks. Say: Sorry! I'm behind the line now. # note
    -> d7
* [§Sorry! I'm behind the line now.]
    ~ good()
    Tomas: Thank you. Safety is very important here.
- Tomas: Every product has a label with a ‹barcode›. A worker uses a machine to ‹scan› it. Would you like to try?
- (d8)
* [§Yes, please. Like this?]
    ~ good()
    You scan the box. Beep!
    Tomas: Perfect!
* [Yes, it is a big box.]
    ~ tries = tries + 1
    Tomas: Yes, it is! So, do you want to try?
    Tomas asks if you want to try. Say: Yes, please. Like this? # note
    -> d8
* [Thank you, goodbye.]
    ~ tries = tries + 1
    Tomas: Goodbye? We have just started!
    "Goodbye" is for the end. Tomas asks you a question. Say: Yes, please. Like this? # note
    -> d8
- Tomas: Now the workers put the boxes on a ‹pallet›. This pallet is for Riga. How many boxes are on it?
- (d9)
* [It is ten o'clock.]
    ~ tries = tries + 1
    Tomas: Ha, not the time! The number of boxes.
    Tomas asks HOW MANY. Say: Ten boxes. They are the chairs for Riga! # note
    -> d9
* [§Ten boxes. They are the chairs for Riga!]
    ~ good()
    Tomas: Correct! The forklift takes them to the truck.
* [It is very heavy.]
    ~ tries = tries + 1
    Tomas: Yes, it is heavy. But how many boxes?
    Tomas asks for a number. Say: Ten boxes. They are the chairs for Riga! # note
    -> d9
- At five o'clock Marta finds you. Your first day is almost over.
Marta: So, how was your first day? What did you like most?
- (d10)
* [§The warehouse. I liked scanning the boxes.]
    ~ good()
    Marta: Great. See you tomorrow at eight. Well done today.
* [See you tomorrow.]
    ~ tries = tries + 1
    Marta: Yes, see you tomorrow! But what did you like?
    Marta asks what you liked. Say: The warehouse. I liked scanning the boxes. # note
    -> d10
* [I am fine, thank you.]
    ~ tries = tries + 1
    Marta: Good! But what did you like?
    Marta asks about your day, not about how you are. Say: The warehouse. I liked scanning the boxes. # note
    -> d10
- You walk out of Baltic Freight. Your first day is over. # end
- -> DONE
