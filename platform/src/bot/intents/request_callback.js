let requestCallback = (uri) => {
  return{
    name: "RequestCallback",
    description: "Allows user to request a callback from an agent",
    fulfillmentActivity: {
      type: "ReturnIntent"
    },
    dialogCodeHook: {
      uri,
      messageVersion: "1.0"
    },
    slots: [
      {
        name: "contactNumber",
        description: "Phone number the customer would like to be contacted on",
        slotConstraint: "Required",
        slotType: "customPhoneNumber",
        slotTypeVersion: 1,
        valueElicitationPrompt: {
          messages: [
            {
              contentType: "PlainText",
              content: "What phone number should we contact you on?"
            },
            {
              contentType: "PlainText",
              content: "What phone number would you like to be contacted on?"
            }
          ],
          maxAttempts: 2
        },
        priority: 1,
        sampleUtterances: [
          "Please call me on {contactNumber}",
          "{contactNumber} please"
        ]
      },
      {
        name: "callTime",
        description: "Time the customer would like to be called by agent",
        slotConstraint : "Required",
        slotType: "AMAZON.TIME",
        valueElicitationPrompt: {
          messages: [
            {
              contentType: "PlainText",
              content: "When would you like to be called?"
            },
            {
              contentType: "PlainText",
              content: "When should we call you?"
            }
          ],
          maxAttempts: 2
        },
        priority: 2
      }
    ],
    confirmationPrompt: {
      maxAttempts: 2,
      messages: [
        {
          contentType: "PlainText",
          content: "So you would like us to give you a call on {contactNumber} at {callTime}, is that right?"
        }
      ]
    },
    rejectionStatement: {
      messages: [
        {
          contentType: "PlainText",
          content: "OK. I have cancelled your call from our agent"
        }
      ]
    },
    sampleUtterances: [
      "Can I get an agent to call me",
      "Can somebody give me a call",
      "Please can you call me back",
      "I would like someone to give me call",
      "Can you arrange for someone to call me"
    ]
  };
};

module.exports = requestCallback;
