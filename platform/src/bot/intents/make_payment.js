let makePayment = {
  name: "MakePayment",
  description: "An intent to allow a user to initiate making a payment",
  fulfillmentActivity: {
    type: "ReturnIntent"
  },
  slots: [
    {
      name: "payee",
      description: "Person/company the person would like to pay",
      slotConstraint : "Required",
      slotType: "accountHolder",
      slotTypeVersion: "1",
      valueElicitationPrompt: {
        messages: [
          {
            contentType: "PlainText",
            content: "Who would you like to pay {amount} to?"
          },
          {
            contentType: "PlainText",
            content: "Who would you like to pay the money to?"
          }
        ],
        maxAttempts: 2
      },
      priority: 1,
      sampleUtterances: [
        "Pay it to {payee}",
        "Send it to {payee}",
        "to {payee}"
      ]
    },
    {
      name: "amount",
      description: "Amount of money they customer would like to send",
      slotConstraint : "Required",
      slotType: "AMAZON.NUMBER",
      valueElicitationPrompt: {
        messages: [
          {
            contentType: "PlainText",
            content: "How much would you like to send?"
          },
          {
            contentType: "PlainText",
            content: "How much would you like to send to {payee}?"
          }
        ],
        maxAttempts: 2
      },
      priority: 1,
      sampleUtterances: [
        "Send them {amount}"
      ]
    },
    {
      name: "fromAccount",
      description: "Account the money is to be sent from",
      slotConstraint : "Required",
      slotType: "AMAZON.FOUR_DIGIT_NUMBER",
      valueElicitationPrompt: {
        messages: [
          {
            contentType: "PlainText",
            content: "Which account would you like the money to come from? Please provide the last 4 digits of the acount number"
          },
          {
            contentType: "PlainText",
            content: "Please provide the last four digits of the account number you would like to send the money from"
          }
        ],
        maxAttempts: 2
      },
      priority: 1,
      sampleUtterances: [
        "{fromAccount} please",
        "from {fromAccount} please"
      ]
    },
    {
      name: "paymentDate",
      description: "Date the customer would like the payment to be made",
      slotConstraint: "Required",
      slotType: "AMAZON.DATE",
      valueElicitationPrompt: {
        messages: [
          {
            contentType: "PlainText",
            content: "And when should I send the money?"
          },
          {
            contentType: "PlainText",
            content: "When would you like the payment to be made?"
          }
        ],
        maxAttempts: 2
      },
      priority: 1,
      sampleUtterances: [
        "{paymentDate} please"
      ]
    }
  ],
  sampleUtterances: [
    "Can I send {amount} to {payee} {paymentDate} from account ending in {fromAccount}",
    "I would like to send {amount} to {payee} {paymentDate} from my account ending in {fromAccount}",
    "Can I send {amount} to {payee} on {paymentDate} from account ending in {fromAccount}",
    "I would like to send {amount} to {payee} on {paymentDate} from my account ending in {fromAccount}",
    "Can I send {amount} to {payee} please",
    "I'd like to send {payee} {amount}",
    "Can I send money from {fromAccount} to {payee} please",
    "Can I send some money to {payee}",
    "Can I make a payment please"
  ]
};

module.exports = makePayment;
