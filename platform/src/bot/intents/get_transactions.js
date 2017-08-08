let getTransactions = {
  name: "GetTransactions",
  description: "Show the customer a list of recent transactions",
  fulfillmentActivity: {
    type: "ReturnIntent"
  },
  slots: [
    {
      name: "charOne",
      description: "Slot to hold a character of the users memorable word",
      slotConstraint: "Optional",
      slotType: "character" ,
      slotTypeVersion: "1",
      valueElicitationPrompt: {
        messages: [
          {
            contentType :"PlainText" ,
            content: "Please enter the second character of your memorable word"
          },
        ],
        maxAttempts: 2
      },
      priority :1,
      sampleUtterances: []
    },
    {
      name: "charTwo",
      description: "Slot to hold a character of the users memorable word",
      slotConstraint: "Optional",
      slotType: "character" ,
      slotTypeVersion: "1",
      valueElicitationPrompt: {
        messages: [
          {
            contentType :"PlainText" ,
            content: "Please enter the fifth character of your memorable word"
          },
        ],
        maxAttempts: 2
      },
      priority :1,
      sampleUtterances: []
    }
  ],
  sampleUtterances: [
    "Show me my recent transactions",
    "Check my last ransactions",
    "Show my transactions",
    "I would like to see my last transactions",
    "I'd like to see my recent transactions"
  ]
};

module.exports = getTransactions;
