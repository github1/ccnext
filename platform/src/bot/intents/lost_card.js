let lostCard = {
  name: "LostCard",
  description: "report a card lost or stolen",
  fulfillmentActivity: {
    type: "ReturnIntent"
  },
  slots: [
    {
      name: "cardOwner",
      description: "Slot to hold customer's full name",
      slotConstraint: "Required",
      slotType: "accountHolder" ,
      slotTypeVersion: "1",
      valueElicitationPrompt: {
        messages: [
          {
            contentType :"PlainText" ,
            content: "Please could you tell me your full name?"
          }
        ],
        maxAttempts: 2
      },
      priority :1,
      sampleUtterances: []
    },
    {
      name: "dateOfBirth",
      description: "Customer's date of birth",
      slotConstraint: "Required",
      slotType: "AMAZON.DATE" ,
      valueElicitationPrompt: {
        messages: [
          {
            contentType:"PlainText" ,
            content: "Please could you tell me your date of birth?"
          }
        ],
        maxAttempts: 2
      },
      priority :1,
      sampleUtterances: []
    },
    {
      name: "incidentDate",
      description: "The date the card was lost/stolen",
      slotConstraint: "Required",
      slotType: "AMAZON.DATE" ,
      valueElicitationPrompt: {
        messages: [
          {
            contentType :"PlainText" ,
            content: "When was your card lost/stolen?"
          }
        ],
        maxAttempts: 2
      },
      priority :1,
      sampleUtterances: []
    },
    {
      name: "cardType",
      description: "Slot to hold customer's card type",
      slotConstraint: "Required",
      slotType: "cardType",
      slotTypeVersion: "1",
      valueElicitationPrompt: {
        messages: [
          {
            contentType :"PlainText",
            content: "What type of credit card have you had lost/stolen? (e.g. Debit, Platinum, Freedom Rewards)"
          }
        ],
        maxAttempts: 2
      },
      priority :1,
      sampleUtterances: []
    }
  ],
  sampleUtterances: [
    "I lost my {cardType} card on {incidentDate}",
    "I lost my {cardType} credit card",
    "My {cardType} has been stolen",
    "I have lost my card",
    "Lost card",
  ]
};

module.exports = lostCard;
