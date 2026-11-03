// Baltic Freight 2: Transport, stock and suppliers (A2). The student is a new assistant at Baltic Freight. § marks the good reply; the other two replies do not fit.
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
A week later. Marta has a new problem on her desk. # scene: 1 # title: Choosing transport
Marta: A customer must send a big ‹cargo› from China to Lithuania. It goes in a ‹container›. We must choose the transport. Can you help me?
- (d1)
* [I like trains.]
    ~ tries = tries + 1
    Marta: Me too! But can you help me?
    Marta asks for your help. Say yes. Say: Of course. Let's compare the plane, the ship and the train. # note
    -> d1
* [§Of course. Let's compare the plane, the ship and the train.]
    ~ good()
    Marta: Good. Let's ‹compare› them.
* [Yes, it is very big.]
    ~ tries = tries + 1
    Marta: Yes, the cargo is big. But can you help me?
    Marta asks if you can help. Say: Of course. Let's compare the plane, the ship and the train. # note
    -> d1
- Marta: The customer is not in a hurry. They want a low ‹cost›. Which transport do we choose?
- (d2)
* [The plane. It is the cheapest.]
    ~ tries = tries + 1
    Marta: The cheapest? No, the plane is the most expensive!
    A plane is the fastest, but it is not cheap. Say: The ship. It is slower, but much cheaper. # note
    -> d2
* [I like the sea.]
    ~ tries = tries + 1
    Marta: Ha! Me too. But which transport?
    Marta asks you to choose. Say: The ship. It is slower, but much cheaper. # note
    -> d2
* [§The ship. It is slower, but much cheaper.]
    ~ good()
    Marta: Yes! A plane is the fastest, but it is also the most expensive.
- Marta: The ship goes to the ‹port› of Klaipeda. Then a truck takes the container to Kaunas. A ship needs thirty days. A train needs fifteen. Is the train a good choice?
- (d3)
* [§It is faster than the ship, but more expensive.]
    ~ good()
    Marta: Right. For this customer the ship is better. Thank you!
* [It is fifteen days.]
    ~ tries = tries + 1
    Marta: Yes, fifteen days. But is it a good choice?
    Marta asks for your opinion. Say: It is faster than the ship, but more expensive. # note
    -> d3
* [Yes, I like trains.]
    ~ tries = tries + 1
    Marta: Ha! But why?
    Give a reason with faster or cheaper. Say: It is faster than the ship, but more expensive. # note
    -> d3
- -> s2

=== s2 ===
On Thursday Marta takes you to a customer, a clothes shop. The shop manager is Ruta. # scene: 2 # title: The stock
Ruta: Hello! We have a problem. We are ‹out of stock› of winter jackets. Customers ask for them every day. What can you do?
- (d4)
* [Winter is cold.]
    ~ tries = tries + 1
    Ruta: Yes, it is. But what can you do about the jackets?
    Ruta asks what you can do. Say: We can make a new order today. I'll call the supplier. # note
    -> d4
* [I have a jacket.]
    ~ tries = tries + 1
    Ruta: Good for you! But the shop has no jackets.
    Ruta needs a solution for the shop. Say: We can make a new order today. I'll call the supplier. # note
    -> d4
* [§We can make a new order today. I'll call the supplier.]
    ~ good()
    Ruta: Please do it fast.
- Ruta: In the other room we have the opposite problem. We have too many summer hats. This is ‹overstock›. They wait and we pay for the space.
- (d5)
* [§Let's sell them cheaper. Then we save space.]
    ~ good()
    Ruta: Good idea. We can start tomorrow.
* [Let's buy more hats.]
    ~ tries = tries + 1
    Ruta: More? We have too many already!
    You have too many hats. You need to sell them. Say: Let's sell them cheaper. Then we save space. # note
    -> d5
* [I like hats.]
    ~ tries = tries + 1
    Ruta: Ha! Me too. But what do you suggest?
    Ruta asks for a suggestion. Say: Let's sell them cheaper. Then we save space. # note
    -> d5
- Ruta: How do you know how many jackets to order?
Marta: We check the ‹inventory› and the ‹demand›. Do you remember what demand is?
- (d6)
* [It is the number of boxes in the warehouse.]
    ~ tries = tries + 1
    Marta: That is inventory. Demand is different.
    Inventory is what you have. Demand is what people want. Say: Demand is how many people want to buy a product. # note
    -> d6
* [§Demand is how many people want to buy a product.]
    ~ good()
    Marta: Exactly. And inventory is what we have in the warehouse.
* [It is when a product is late.]
    ~ tries = tries + 1
    Marta: No, that is a delay.
    Demand is about how many people want a product. Say: Demand is how many people want to buy a product. # note
    -> d6
- -> s3

=== s3 ===
Back in the office Marta needs a new ‹supplier› for the jackets. # scene: 3 # title: The supplier
Marta: We need a ‹reliable› supplier. Late goods stop our work. I asked three suppliers for a ‹quote›. A quote shows the price. This one is the best. Please call him.
You dial the number. A man answers.
Mr Berg: Hello, Berg Textile. How can I help you?
- (d7)
* [I am fine, thank you.]
    ~ tries = tries + 1
    Mr Berg: Good! But how can I help you?
    Say who you are and why you call. Say: Hello, this is Baltic Freight. I'd like to talk about your quote. # note
    -> d7
* [Goodbye, see you.]
    ~ tries = tries + 1
    Mr Berg: Goodbye? You called me!
    "Goodbye" is for the end of a call. Say: Hello, this is Baltic Freight. I'd like to talk about your quote. # note
    -> d7
* [§Hello, this is Baltic Freight. I'd like to talk about your quote.]
    ~ good()
    Mr Berg: Of course. The price is nine euros for one jacket.
- Marta shows you a note. It says: ‹Negotiate=negotiate›! Ask for a lower price.
- (d8)
* [§That's a bit high. Can you do eight euros?]
    ~ good()
    Mr Berg: Hmm. Eight euros fifty, if you order five hundred jackets. And the ‹quality› is very good.
* [It is a nice jacket.]
    ~ tries = tries + 1
    Mr Berg: Thank you! But what about the price?
    You want a lower price. Ask for it. Say: That's a bit high. Can you do eight euros? # note
    -> d8
* [Where is your office?]
    ~ tries = tries + 1
    Mr Berg: In Vilnius. But about the price?
    First talk about the price. Say: That's a bit high. Can you do eight euros? # note
    -> d8
- Mr Berg: Eight euros fifty for five hundred jackets. Do you ‹agree›?
- (d9)
* [Five hundred kilometres.]
    ~ tries = tries + 1
    Mr Berg: Kilometres? I asked about the price.
    Mr Berg asks if you agree. Say: Yes, I agree. Eight fifty is fine. # note
    -> d9
* [§Yes, I agree. Eight fifty is fine.]
    ~ good()
    Mr Berg: Great. I will send the ‹contract› today.
* [Thank you, I'm fine.]
    ~ tries = tries + 1
    Mr Berg: Good! But do you agree?
    Mr Berg wants a yes or a no. Say: Yes, I agree. Eight fifty is fine. # note
    -> d9
- Marta: Please check the contract before we sign it. What do we look at?
- (d10)
* [§The price, the quality and the delivery time.]
    ~ good()
    Marta: Perfect. A reliable supplier is half of good logistics. # end
* [The weather in Riga.]
    ~ tries = tries + 1
    Marta: The weather? No.
    A contract is about price, quality and time. Say: The price, the quality and the delivery time. # note
    -> d10
* [The colour of the paper.]
    ~ tries = tries + 1
    Marta: Ha! No, not the paper.
    Look at what the supplier must do. Say: The price, the quality and the delivery time. # note
    -> d10
- -> DONE
