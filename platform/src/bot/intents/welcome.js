let welcome = (uri) => {
  return {
    name: "Welcome",
    description: "Helps the user work out how to use the bot",
    slots: [],
    fulfillmentActivity: {
      type: "ReturnIntent"
    },
    dialogCodeHook: {
      uri,
      messageVersion: "1.0"
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
};

module.exports = welcome;
