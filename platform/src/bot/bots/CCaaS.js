let CCaaS = (lexmodel) => {
  let intents = Object.keys(lexmodel.intent).map(intentName => ({
    intentVersion: lexmodel.intent[intentName].Version,
    intentName
  }));
  return {
    name: 'CCaaSBot',
    description: 'A chatbot for a next generation contact centre',
    locale: "en-US",
    childDirected: false,
    abortStatement: {
      messages: [
        {
          content: "I'm sorry, I can't deal with your request this time, let me pass you over to a human agent",
          contentType: "PlainText"
        }
      ]
    },
    clarificationPrompt: {
      maxAttempts: 2,
      messages: [
        {
          content: "Sorry, I don't understand what you means, you can ask me to perform account services, or ask a question about our company.",
          contentType: "PlainText"
        },
        {
          content: "I'm sorry, I'm not sure what you mean. Try asking a question like \"can you show me my balance?\".",
          contentType: "PlainText"
        }
      ]
    },
    idleSessionTTLInSeconds: 500,
    intents,
    processBehavior: "BUILD",
    voiceId: "Kendra"
  };
};

module.exports = CCaaS;
