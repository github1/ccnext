'use strict';
// ------------- Constants ------------------------

const topics = {
  'make a complaint': {answer: 'The best way to get in touch is to send us a secure message from Barclaycard online servicing - that way we\'ll be able to quickly direct your query and respond to you within 24 hours.'},
  'password': {answer: `If you've forgotten your passcode, please select the 'Forgotten your passcode’ link on the login screen Step 1 and follow the instructions to reset your passcode.`},
  'log in details': {answer: 'If you have forgotten your Username/ID number, click on the ‘Forgotten…’ link below the Username/ID number field and you can complete the log in process by entering your card number. This can be found on the front of your Barclaycard and on paper statements.'},
  'pay my bill': {answer: 'You can pay your bill using your debit card within Barclaycard online servicing and our Barclaycard mobile app.'}
};

const cardTypes = ["platinum", "initial", "freedom reward"];

// ------------- Response Helpers ----------------

function getSlots(intentRequest) {
  return intentRequest.currentIntent.slots;
}

function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message) {
  return {
    sessionAttributes,
    dialogAction: {
      type: 'ElicitSlot',
      intentName,
      slots,
      slotToElicit,
      message
    }
  };
}

function delegate(sessionAttributes, slots) {
  return {
    sessionAttributes,
    dialogAction: {
      type: 'Delegate',
      slots
    }
  };
}

// ---------------- Helpers ----------------------

function parseLocalDate(date) {
  var dateComponents = date.split(/-/);
  return new Date(dateComponents[0], dateComponents[1] - 1, dateComponents[2]);
}

function isValidDate(date) {
  try {
    return !(isNaN(parseLocalDate(date).getTime()));
  } catch (err) {
    return false;
  }
}

function buildValidationResult(isValid, violatedSlot, messageContent){
  if (messageContent == null) {
    return {
      isValid,
      violatedSlot
    };
  }
  return {
    isValid,
    violatedSlot,
    message: createMessage(messageContent)
  };
}

function createMessage(messageContent) {
  return {
    contentType: 'PlainText',
    content:messageContent
  };
}

function authenticate(slots) {
  if (slots) {
    return true;  
  }
}

// ---------- Slot Validations ------------------------

const validate = {
  QuestionTopic: validateQuestionTopic,
  MakePayment: validateMakePayment,
  LostCard: validateLostCard,
  RequestCallback: validateRequestCallback
};

function validateQuestionTopic(slots) {
  let topic = slots.topic;
  if (topic != null && !(topic.toLowerCase() in topics)) {
    return buildValidationResult(false, 'topic');
  }
  return buildValidationResult(true, null, null );
}

function validateMakePayment (slots) {
  let paymentDate = slots.paymentDate;
  let amount = slots.amount;
  let fromAccount = slots.fromAccount;
  if (paymentDate) {
    if (!isValidDate(paymentDate)) {
      return buildValidationResult(false, 'paymentDate', `Sorry, that wasn't a valid date, your payment can be sent today or a date in the future`);
    }
    let payDate = new Date(paymentDate);
    let today = new Date(`${new Date().getFullYear()}-${new Date().getMonth()+1}-${new Date().getDate()}`);
    if (payDate < today) {
      return buildValidationResult(false, 'paymentDate', 'Sorry, payment dates must be either today, or in the future. When would you like to send the payment?');
    }
  }
  if (amount) {
    if (isNaN(amount)) {
      return buildValidationResult(false, 'amount', 'Sorry, £{amount} is not a valid amount. Please tell me how much you would like to send in £');
    }
    if (amount > 250 ) {
      return buildValidationResult(false, 'amount', 'Sorry, I can only process payments of up to £250');
    }
    if (amount <= 0 ) {
      return buildValidationResult(false, 'amount', 'The payment must be greater than £0');
    }
  }
  if (fromAccount) {
    if (!/^\d{4}$/.test(fromAccount)) {
      return buildValidationResult(false, 'fromAccount', `Please provide just the last 4 digits from the account you want the payment to be made from`);
    }
  }
  return buildValidationResult(true, null, null);
}

function validateLostCard (slots) {
  let dateOfBirth = slots.dateOfBirth;
  let incidentDate = slots.incidentDate;
  let cardType = slots.cardType;
  let today = new Date(`${new Date().getFullYear()}-${new Date().getMonth()+1}-${new Date().getDate()}`);
  if (dateOfBirth) {
    if (!isValidDate(dateOfBirth)) {
      return buildValidationResult(false, 'dateOfBirth', `Sorry, that wasn't a valid date, please tell me your birth date`);
    }
    let dob = new Date(dateOfBirth);
    if (dob >= today) {
      return buildValidationResult(false, 'dateOfBirth', `Your date of birth must be in the past, please tell me your date of birth again`);
    }
  }
  if (incidentDate) {
    if (!isValidDate(incidentDate)) {
      return buildValidationResult(false, 'incidentDate', `Sorry, that wasn't a valid date, please tell me the date your card was lost/stolen`);
    }
    let incDate = new Date(incidentDate);
    if (incDate > today) {
      return buildValidationResult(false, 'incidentDate', `The date of the incident must be either today or a day in the past. Could you tell me the date your card was lost/stolen again please?`);
    }
  }
  if (cardType && cardTypes.indexOf(cardType.toLowerCase()) == -1) {
    return buildValidationResult(false, 'cardType', `That isn't a valid card type. Have you lost a platinum, initial, or freedom rewards card?`);
  }
  return buildValidationResult(true, null, null);
}

function validateRequestCallback (slots) {
  let contactNumber = slots.contactNumber;
  let callTime = slots.callTime;
  if (contactNumber) {
    contactNumber = contactNumber.replace(/ /g,'');
    // check it is a number
    if (!/^0\d{10}$/.test(contactNumber)) {
      return buildValidationResult(false, 'contactNumber', `That isn't a valid phone number. Your number must be 11 digits long and start with a zero. Please tell me your number again.`);
    }
  }
  if (callTime) {
    let now = new Date(new Date().getTime()).toLocaleTimeString();
    if (now > callTime) {
      return buildValidationResult(false, 'callTime', `Sorry, it's already gone ${callTime} today, please give me a time we can schedule a call for`);
    }
  }
  return buildValidationResult(true, null, null);
}

// ------------ Bot Behaviour --------------------

function welcome(intentRequest) {
  return(delegate(intentRequest.sessionAttributes, getSlots(intentRequest)));
}

function accountService(intentRequest) {
  let slots = getSlots(intentRequest);
  let sessionAttributes = intentRequest.sessionAttributes || {};
  let authenticated = sessionAttributes.authenticated || false;
  if (authenticated !== 'true') {
    let charOne = slots.charOne;
    let charTwo = slots.charTwo;
    if (charOne == null || charTwo == null) {
      if (charOne == null) {
        return (elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, 'charOne', {'contentType': 'PlainText', 'content': 'Sure thing. First, can I get character two from your memorable word'}));
      }
      if (charTwo == null) {
        return (elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, 'charTwo', {'contentType': 'PlainText', 'content': 'Great, now can I get the fifth character from your memorable word'}));
      }
    }
    // hit the authentication service
    let authenticationResult = authenticate(slots);
    if (authenticationResult === true) {
      sessionAttributes.authenticated = authenticationResult;
      authenticated = true;
    } else {
      slots.charOne = null;
      slots.charTwo = null;
      return(elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, 'charOne', createMessage('Sorry that was incorrect, please give me the second character from your memorable word')));
    }
  }
}

function validateSlots(intentRequest) {
  const source = intentRequest.invocationSource;
  const intent = intentRequest.currentIntent.name;
  if (source == 'DialogCodeHook') {
    let slots = getSlots(intentRequest);
    let validationResult = validate[intent](slots);
    if (!validationResult.isValid) {
      slots[validationResult.violatedSlot] = null;
      return elicitSlot(intentRequest.sessionAttributes, intent, slots, validationResult.violatedSlot, validationResult.message);
    }
    // add session attributes here if required
    return delegate(intentRequest.sessionAttributes, slots);
  }
}

// --------------- Intents -----------------------

function dispatch(intentRequest, callback) {
  const intentName = intentRequest.currentIntent.name;
  console.log(`request received for userId=${intentRequest.userId}, intentName=${intentName}`);
  console.log(intentRequest.inputText);
  console.log(intentRequest);

  switch (intentName) {
    case "Welcome":
      callback(welcome(intentRequest));
      break;
    case "AskQuestion":
    case "MakePayment":
    case "LostCard":
    case "RequestCallback":
      callback(validateSlots(intentRequest));
      break;
    case "GetAccountBalance":
    case "GetTransactions":
      callback(accountService(intentRequest));
  }
}

// --------------- Main handler -----------------------

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
  try {
    dispatch(event,
      (response) => {
        callback(null, response);
      });
  } catch (err) {
    callback(err);
  }
};
