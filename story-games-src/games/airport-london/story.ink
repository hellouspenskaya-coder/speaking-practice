// AIRPORT — a trip to London (A1-A2). The student is the traveller: "You".
// Tags at the END of a line:  # scene: N  # title: ...   (new scene)    # note   (a "How this sounds" card)
// Words in ‹ › are vocabulary: tap to see the definition (definitions live in game.json, "words").
// The good reply is marked with § (the player removes it and shows a green tick). Every decision has ONE good reply and wrong ones. A wrong reply is not punished: the other person
// reacts like a real person, a card shows how it sounds + what to say, and the choice comes back.

VAR tries = 0     // wrong replies in the current decision
VAR smooth = 0    // decisions answered well at the first try (shown at the end, not a mark)

-> checkin

=== function good ===
{ tries == 0:
    ~ smooth = smooth + 1
}
~ tries = 0

=== checkin ===
You are at the airport. Today you fly to London. # scene: 1 # title: Check-in
First you go to the ‹check-in desk›. A woman works there. She smiles at you.
Check-in agent: Good morning! Passport, please.
- (d1)
* [I like London.]
    ~ tries = tries + 1
    Check-in agent: Me too! But I need your passport, please.
    The agent waits for your passport. This is a nice sentence, but it is not the answer. Say: Here you are. # note
    -> d1
* [§Here you are.]
    ~ good()
    You give her your passport.
    Check-in agent: Thank you.
* [Thank you, goodbye.]
    ~ tries = tries + 1
    Check-in agent: Not yet! Your passport, please.
    "Goodbye" is for the end. Now you give your passport. Say: Here you are. # note
    -> d1
- You have a big blue ‹suitcase› and a small bag.
Check-in agent: Do you have any bags to check in?
- (d2)
* [I am fine, thank you.]
    ~ tries = tries + 1
    Check-in agent: Good, good! And do you have any bags to check in?
    The agent asks about your bags. Say: Yes, I have one suitcase. # note
    -> d2
* [It is ten o'clock.]
    ~ tries = tries + 1
    Check-in agent: Yes, it is! But what about bags?
    The agent asks about your bags. Say: Yes, I have one suitcase. # note
    -> d2
* [§Yes, I have one suitcase.]
    ~ good()
    Check-in agent: Please put it on the belt.
- You put the suitcase on the belt. Your small bag is your ‹hand luggage›. You keep it with you.
Check-in agent: Here is your ‹boarding pass›. Go to ‹gate› 12. Have a nice flight!
You say thank you and walk away.
-> security

=== security ===
Now you go to ‹security›. There is a long line. You wait. # scene: 2 # title: Security
At last it is your turn.
Security officer: Put your bag and your jacket in a ‹tray›, please. Do you have any ‹liquids› in your bag?
- (d3)
* [§Yes, I do. A bottle of water.]
    ~ good()
    Security officer: Thank you. Put the bottle in the tray, too.
* [My bag is heavy.]
    ~ tries = tries + 1
    Security officer: I see. But do you have any liquids in it?
    The officer asks about liquids, for example water. Say: Yes, I do. A bottle of water. # note
    -> d3
* [I am very tired.]
    ~ tries = tries + 1
    Security officer: Me too! But do you have any liquids in your bag?
    The officer asks about liquids, for example water. Say: Yes, I do. A bottle of water. # note
    -> d3
- You put your bag, your jacket and the bottle in the trays. Then you walk through the arch.
Beep! Beep! Beep!
Security officer: Stop, please. Do you have anything in your pockets? Keys? Coins?
- (d4)
* [Goodbye!]
    ~ tries = tries + 1
    Security officer: Not yet! Your pockets, please.
    "Goodbye" is for the end. The officer asks about your pockets. Say: Sorry. I have my keys. # note
    -> d4
* [§Sorry. I have my keys.]
    ~ good()
    Security officer: Thank you. Put them in the tray, please.
* [It is my first flight.]
    ~ tries = tries + 1
    Security officer: Nice! But what is in your pockets?
    The officer asks what is in your pockets. Say: Sorry. I have my keys. # note
    -> d4
- You put your keys in the tray and walk through again. No beep this time.
Security officer: Thank you. Have a nice flight.
-> flight

=== flight ===
At ‹gate› 12 you show your boarding pass. Then you get on the plane. # scene: 3 # title: The flight
The plane takes off. After one hour a flight attendant comes with a trolley.
Flight attendant: Chicken or pasta?
- (d5)
* [I am hungry.]
    ~ tries = tries + 1
    Flight attendant: Ha! Me too. Chicken or pasta?
    You must choose: chicken or pasta. Say: Pasta, please. # note
    -> d5
* [A window seat, please.]
    ~ tries = tries + 1
    Flight attendant: Sorry, this is food, not seats! Chicken or pasta?
    You must choose: chicken or pasta. Say: Pasta, please. # note
    -> d5
* [§Pasta, please.]
    ~ good()
    Flight attendant: Here you are. Enjoy!
- The pasta is nice. You sleep a little.
Announcement: Welcome to London Heathrow.
-> passport

=== passport ===
The plane lands. You follow the signs to ‹passport control›. # scene: 4 # title: Passport control
The line is long, but it moves fast. Now it is your turn. You give your passport to the officer.
Passport officer: Good afternoon. What is the ‹reason› for your visit?
- (d6)
* [I have one suitcase.]
    ~ tries = tries + 1
    Passport officer: Yes, I see. But why are you here in London?
    The officer asks WHY you are here. Say: I am here for a conference. # note
    -> d6
* [§I am here for a conference.]
    ~ good()
    Passport officer: A conference. Good.
* [Pasta, please.]
    ~ tries = tries + 1
    Passport officer: Pasta? This is not a restaurant! Why are you here?
    The officer asks WHY you are here. Say: I am here for a conference. # note
    -> d6
- Passport officer: How long are you staying?
- (d7)
* [§For three days.]
    ~ good()
    Passport officer: Thank you.
* [Here you are.]
    ~ tries = tries + 1
    Passport officer: Yes, I have your passport. How long are you staying?
    The officer asks about time. Say: For three days. # note
    -> d7
* [It is ten o'clock.]
    ~ tries = tries + 1
    Passport officer: Yes, it is. But how long are you staying?
    The officer asks about time. Say: For three days. # note
    -> d7
- The officer gives your passport back.
Passport officer: Enjoy your stay in the UK.
-> baggage

=== baggage ===
Next, you go to ‹baggage reclaim›. # scene: 5 # title: Baggage reclaim
Suitcases come out on a long belt. You see your blue suitcase and take it.
A woman points at a red suitcase on the floor.
Woman: Excuse me! Is this your suitcase?
- (d8)
* [For three days.]
    ~ tries = tries + 1
    Woman: Sorry? I asked about the suitcase.
    Look at the suitcase. Yours is blue. Say: No, mine is blue. # note
    -> d8
* [I am very tired.]
    ~ tries = tries + 1
    Woman: Oh, me too! But is this your suitcase?
    Look at the suitcase. Yours is blue. Say: No, mine is blue. # note
    -> d8
* [§No, mine is blue.]
    ~ good()
    Woman: Oh, sorry! Have a nice day.
- You smile and take your suitcase to the last door.
-> customs

=== customs ===
Now you walk to ‹customs›. # scene: 6 # title: Customs
There are two doors. The green door is for people with "Nothing to ‹declare›". The red door is for people with things to declare.
In your suitcase you have clothes and a ‹gift› for a friend. The gift is a box of chocolates.
You go to the green door. A customs officer stops you.
Customs officer: Hello. Anything to declare?
- (d9)
* [§Nothing to declare.]
    ~ good()
    Customs officer: OK. What is in your suitcase?
* [No, mine is blue.]
    ~ tries = tries + 1
    Customs officer: Sorry? I asked about things to declare.
    The officer asks if you have anything to declare. Say: Nothing to declare. # note
    -> d9
* [I am here for a conference.]
    ~ tries = tries + 1
    Customs officer: Yes, I know. But anything to declare?
    The officer asks if you have anything to declare. Say: Nothing to declare. # note
    -> d9
- (d10)
* [Here you are.]
    ~ tries = tries + 1
    Customs officer: Thank you, but what is inside?
    The officer asks what is inside your suitcase. Say: Clothes and a gift for my friend. # note
    -> d10
* [§Clothes and a gift for my friend.]
    ~ good()
    Customs officer: A gift? Nice.
* [For three days.]
    ~ tries = tries + 1
    Customs officer: Three days? OK. But what is in your suitcase?
    The officer asks what is inside your suitcase. Say: Clothes and a gift for my friend. # note
    -> d10
- Customs officer: Please open your suitcase.
- (d11)
* [Nothing to declare.]
    ~ tries = tries + 1
    Customs officer: Yes, you said that. But I must see inside. Please open it.
    The officer asks you to open the suitcase. Say: Of course. Here you go. # note
    -> d11
* [I am fine, thank you.]
    ~ tries = tries + 1
    Customs officer: Good! Now, please open your suitcase.
    The officer asks you to open the suitcase. Say: Of course. Here you go. # note
    -> d11
* [§Of course. Here you go.]
    ~ good()
    You open the suitcase. The officer looks inside.
- Customs officer: Clothes... and chocolates. Thank you! Welcome to London.
You close the suitcase and walk through the door. You are in London! # end
-> DONE
