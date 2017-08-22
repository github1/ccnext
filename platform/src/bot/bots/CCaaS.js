let CCaaS = {
  name: 'CCaaSBot', /* required */
  description: 'A chatbot for a next generation contact centre',
  locale:"en-US", /* required */
  childDirected: false, /* required */
  abortStatement: {
    messages: [ /* required */
      {
        content: "I'm sorry, I can't deal with your request this time, let me pass you over to a human agent", /* required */
        contentType: "PlainText" /* required */
      }
      /* more items */
    ]
  },
  clarificationPrompt: {
    maxAttempts: 2, /* required */
    messages: [ /* required */
      {
        content: "Sorry, I don't understand what you means, you can ask me to perform account services, or ask a question about our company.", /* required */
        contentType: "PlainText" /* required */
      },
      {
        content: "I'm sorry, I'm not sure what you mean. Try asking a question like \"can you show me my balance?\".",
        contentType: "PlainText"
      }
    ]
  },
  idleSessionTTLInSeconds: 500,
  intents: [
    {
      intentName: 'Welcome',
      intentVersion: '1'
    },
    {
      intentName: 'SpeakToAgent',
      intentVersion: '1'
    },
    {
      intentName: 'AskQuestion',
      intentVersion: '1'
    },
    {
      intentName: 'GetAccountBalance',
      intentVersion: '1'
    },
    {
      intentName: 'GetTransactions',
      intentVersion: '1'
    },
    {
      intentName: 'LostCard',
      intentVersion: '1'
    },
    {
      intentName: 'MakePayment',
      intentVersion: '1'
    }
  ],
  processBehavior: "BUILD",
  voiceId: "Kendra"
};

module.exports = CCaaS;
