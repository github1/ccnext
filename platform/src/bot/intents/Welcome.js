let welcome = {
  name: "Welcome",
  description: "Helps the user work out how to use the bot",
  slots: [],
  fulfillmentActivity: {
    type: "ReturnIntent"
  },
  sampleUtterances: [
    "Hello",
    "Hi",
    "Hi there",
    "Hey",
    "How does this work",
    "What does this do"
  ]
};
module.exports = welcome;
