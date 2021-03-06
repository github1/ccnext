'use-strict';

var cardTypeSet = new Set (["debit", "freedom reward", "platinum", "initial"]);
var topicSet = new Set(["pay my bill", "change my address", "change my mailing preferences", "make a complaint"]);
var validatorFunctions = new Map ().set('AskQuestion', validateAskQuestion ).set('GetAccountBalance', validateCharacters).set('GetTransactions', validateCharacters).set('LostCard', validateLostCard).set('MakePayment', validateMakePayment);

// --------------------- Response Helpers -----------------------

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

function buildTypeValidationMessage(isValid, violatedSlotType, reasonWhy){
  return {
    isValid,
    violatedSlotType,
    message: {
      contentType: 'PlainText',
      content:reasonWhy
    }
  };
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
    message: {
      contentType: 'PlainText',
      content:messageContent
    }
  };
}

function parseLocalDate(date) {

  var dateComponents = date.split(/-/);
  return new Date(dateComponents[0], dateComponents[1] - 1, dateComponents[2]);
}

function isAlpha(str) {
  var code, i, len;
  for (i = 0, len = str.length; i < len; i++) {
    code = str.charCodeAt(i);
    if (!(code > 64 && code < 91) && // upper alpha (A-Z)
        !(code > 96 && code < 123)) { // lower alpha (a-z)
      return false;
    }
  }
  return true;
}

function hasWhiteSpace(s) {
  return s.indexOf(' ') >= 0;
}
// ---------------- Soft Validation Helpers ----------------------

function isValidSlot ( slot, slotType ) {
  if (slot ){
    switch (slotType) {
      case 'cardType':
        if (!(cardTypeSet.has(slot.toLowerCase()))) {
          return buildTypeValidationMessage(false, 'cardType', `wrongCardType`);
        }
        return buildTypeValidationMessage(true, null, null );

      case 'character':
        if (!(isAlpha(slot)) ) {
          return buildTypeValidationMessage (false, 'character', `notAlpha`);
        } else if (slot.length > 1) {
          return buildTypeValidationMessage (false, 'character', `wrongLength`);
        }
        return buildTypeValidationMessage(true, null, null);

      case 'topic':
        if (!(topicSet.has(slot.toLowerCase()))) {
          return buildTypeValidationMessage(false, 'topic', `undefinedTopic`);
        }
        return buildTypeValidationMessage(true, null, null );

      case 'accountHolder' :
        if (!hasWhiteSpace(slot)){
          return buildTypeValidationMessage (false, 'accountHolder', `notWhiteSpace` );
        }else {
          var res = slot.split(" ") ;
          if (res.length >2){
            if(!(isAlpha(res.join('')))) {
              return buildTypeValidationMessage (false, 'accountHolder', `notAlpha` );
            }
          }else {
            return buildTypeValidationMessage (false, 'accountHolder', `oneAlphaOneSpace` );
          }
        }
        return buildTypeValidationMessage(true, null, null );

      case 'AMAZON.DATE' :
        if ((isNaN(parseLocalDate(slot).getTime()))){
          return buildTypeValidationMessage( false, 'AMAZON.TIME', `undefinedDate`);
        }
        return buildTypeValidationMessage( true, null, null);
      default:
        //Not a custom SlotType.
        return buildTypeValidationMessage(true, slotType, 'amazonSlotType');
    }
  }
}
//--------------------Intent Soft Validators ----------------------


function validateCharacters ( slots ) {
  var charOneState = isValidSlot(slots.charOne, 'character') ;
  var charTwoState = isValidSlot(slots.charTwo, 'character') ;

  if (slots.charOne && !(charOneState.isValid)) {
    switch (charOneState.message.content) {

      case `notAlpha`:
        return buildValidationResult(false, 'charOne', `The character expected must be a letter`);

      case `wrongLength`:
        return buildValidationResult( false, 'charOne', `You must enter a single character`);
    }
  }
  if (slots.charTwo && !(charTwoState.isValid)) {
    switch (charTwoState.message.content) {

      case `notAlpha`:
        return buildValidationResult(false, 'charTwo', `The character expected must be a letter`);

      case `wrongLength`:
        return buildValidationResult( false, 'charTwo', `You must enter a single character`);
    }
  }
  return buildValidationResult( true, null, null);
}


function validateAskQuestion( slots) {
  var topicSlotState = isValidSlot(slots.QuestionTopic, 'topic') ;
  if (slots.QuestionTopic && !(topicSlotState.isValid)){
    return buildValidationResult( false, 'QuestionTopic', `Sorry, I didn't quite understand what you meant. Can you try a different question ?`);
  }
  return buildValidationResult(true, null, null);
}


function validateLostCard (slots) {
  var cardOwnerState = isValidSlot(slots.cardOwner, 'accountHolder') ;
  var cardTypeState = isValidSlot(slots.cardType, 'cardType') ;
  var dateOfBirthState = isValidSlot(slots.dateOfBirth, 'AMAZON.DATE') ;
  var incidentDateState = isValidSlot(slots.incidentDate, 'AMAZON.DATE') ;

  if (slots.cardOwner && !(cardOwnerState.isValid)){
    return buildValidationResult(false, 'cardOwner', `You must have typed a wrong name. Please try again.`);
  }
  if (slots.cardType && !(cardTypeState.isValid)){
    return buildValidationResult(false, 'cardType', `We currently do not support ${slots.cardType} as a valid card type. Can you try a different type ?`);
  }
  if(slots.incidentDate){
    if ( !incidentDateState.isValid){
      return buildValidationResult( false, 'incidentDate', `I did not understand your incident date. Can you try again please ?`);
    } else if (parseLocalDate(slots.incidentDate)> new Date()){
      return buildValidationResult( false, 'incidentDate', `Good for you if you can predict the future, but let's try a date that has taken place in the past.`);
    }
  }
  if(slots.dateOfBirth){
    if ( !dateOfBirthState.isValid){
      return buildValidationResult( false, 'incidentDate', `I did not understand your incident date. Can you try again please ?`);
    } else if (parseLocalDate(slots.dateOfBirth)> new Date()){
      return buildValidationResult( false, 'incidentDate', `Wrong birth date. You're supposed to be already born`);
    }
  }
  return buildValidationResult(true, null, null);
}


function validateMakePayment (slots){
  var payeeState = isValidSlot(slots.payee, 'AccountHolder');
  var paymentDateState = isValidSlot(slots.paymentDate, 'AMAZON.DATE');
  //var amountSlot = slots.amount;
  //var fromAccountSlot = slots.fromAccount;

  if (slots.payee && !(payeeState.isValid) ){
    return buildValidationResult(false, 'payee', `You must have typed a wrong name. Please try again.`);
  }
  if (slots.paymentDate){
    if (!paymentDateState.isValid){
      return buildValidationResult( false, 'paymentDate', `I did not understand your incident date. Can you try again please ?`);
    } else if (parseLocalDate(slots.paymentDate)< new Date()){
      return buildValidationResult( false, 'paymentDate', `Payments must be scheduled at least one day in advance.  Can you try a different date?`);
    }
  }
  return buildValidationResult( true, null, null);
}


function dialogManagement ( intentRequest , callback ){
  var sessionAttributes = intentRequest.sessionAttributes || {} ;
  //let authenticated = sessionAttributes.authenticated || false ;
  var slots = intentRequest.currentIntent.slots ;
  if (intentRequest.invocationSource == 'DialogCodeHook') {
    if (intentRequest.currentIntent.name != 'Welcome') {
      var validationResult = validatorFunctions.get(intentRequest.currentIntent.name)(intentRequest.currentIntent.slots);
      if ( !validationResult.isValid ) {
        slots[`${validationResult.violatedSlot}`] = null ;
        callback( elicitSlot ( sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message)) ;
        return ;
      }  if (intentRequest.currentIntent.name == 'GetAccountBalance' || intentRequest.currentIntent.name == 'GetTransactions' ){
        sessionAttributes.authenticated = true  ;
        console.log('Successful authentication') ;
      }
    }
    return callback(delegate(intentRequest.sessionAttributes, slots));
  }
}

/**
* Called when the user specifies an intent for this bot
*/

function dispatch (intentRequest, callback) {
  console.log(`dispatch userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}`) ;
  return dialogManagement ( intentRequest, callback);
}

//---------------------------------Main Handler -----------------------------


//Route the incoming request based on intent.
//the JSON body of the request is provided in the event slot

exports.handler =  (event, context, callback ) => {
  try {
    dispatch (event, (response) => callback( null, response));
  }
  catch (err) {
    callback(err);
  }
};
