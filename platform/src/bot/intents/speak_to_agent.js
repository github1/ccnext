let speakToAgent = {
  name: "SpeakToAgent",
  description: "An intent to escalate the chat to a live agent",
  fulfillmentActivity: {
    type: "ReturnIntent"
  },
  slots: [],
  sampleUtterances: [
    "Can I speak with an agent",
    "I would like to talk with an agent",
    "I want to speak with an agent",
    "I want to talk to a person"
  ]
};
module.exports = speakToAgent;
