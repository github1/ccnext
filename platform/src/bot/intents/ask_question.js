let askQuestion = (uri) => {
  return {
    name: "AskQuestion",
    description: "An intent to answer a customers question for simple information",
    fulfillmentActivity: {
      type: "ReturnIntent"
    },
    dialogCodeHook: {
      uri,
      messageVersion: "1.0"
    },
    slots: [
      {
        name: "QuestionTopic",
        description: "Topic of the question being asked by the customer",
        slotConstraint : "Required",
        slotType: "topic",
        slotTypeVersion: "1",
        valueElicitationPrompt: {
          messages: [
            {
              contentType: "PlainText",
              content: "Sorry, I didn't understand what you are asking. Could you try again?"
            }
          ],
          maxAttempts: 2
        },
        priority: 1
      }
    ],
    sampleUtterances: [
      "How can I {QuestionTopic}",
      "How do I {QuestionTopic}",
      "Where can I find {QuestionTopic}",
      "What is the {QuestionTopic}"
    ]
  };
};
module.exports = askQuestion;
