let getAccountBalance = (uri) => {
  return {
    name: "GetAccountBalance",
    description: "Enable the customer to check their account balance",
    fulfillmentActivity: {
      type: "ReturnIntent"
    },
    dialogCodeHook: {
      uri,
      messageVersion: "1.0"
    },
    slots: [
      {
        name : "charOne",
        description : "Slot to hold a character of the users memorable word",
        slotConstraint : "Optional",
        slotType: "character" ,
        slotTypeVersion : "1",
        valueElicitationPrompt : {
          messages : [
            {
              contentType :"PlainText" ,
              content : "Please enter the second character of your memorable word"
            }
          ],
          maxAttempts: 2
        },
        priority:1,
        sampleUtterances : []
      },
      {
        name : "charTwo",
        description : "Slot to hold a character of the users memorable word",
        slotConstraint : "Optional",
        slotType: "character" ,
        slotTypeVersion : "1",
        valueElicitationPrompt : {
          messages: [
            {
              contentType: "PlainText" ,
              content : "Please enter the fifth character of your memorable word"
            }
          ],
          maxAttempts: 2
        },
        priority :1,
        sampleUtterances : []
      }
    ],
    sampleUtterances : [
      "What is my balance",
      "Check my balance",
      "Show balance",
      "Can you tell me my balance please",
      "Can you show me my balance please"
    ]
  };
};

module.exports = getAccountBalance;
