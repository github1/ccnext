
import {topic} from "./slots/topic.js";
import {accountHolder} from "./slots/account_holder.js";
import {character} from "./slots/character.js";
import {cardType} from "./slots/card_type.js";

let slotTypeMap = new Map ([ ['Topic', topic], ['AccountHolder', accountHolder], ['Character', character], ['CardType', cardType] ]);

//"transform_to_const()" assigns to every slotType the adequate variable required

/*The function "isValidSlot()"" checks whether a slot is valid or not, whatever its type.
 It returns a boolean. */
function isValidSlot( slot, slotType ) {

    switch (slotType) {

      case 'AMAZON.DATE':
          function parseLocalDate(date) {
              /**
               * Construct a date object in the local timezone by parsing the input date string, assuming a YYYY-MM-DD format.
               * Note that the Date(dateString) constructor is explicitly avoided as it may implicitly assume a UTC timezone.
               */
              const dateComponents = date.split(/\-/);
              return new Date(dateComponents[0], dateComponents[1] - 1, dateComponents[2]);
          }
          try {
            return !(isNaN(parseLocalDate(slot).getTime()));
          }catch (err){
            return false;
          }
        //break;


      case 'AMAZON.NUMBER':
            return true;
        //break;


      case 'AMAZON.FOUR_DIGIT_NUMBER':
            return true;
      //break;

      default :
            let set = new Set ;
            slotTypeMap.get(slotType).enumerationValues.forEach( (val) => {
                set.add ( val.value.toLowerCase() );
              }
            );
            return set.has( slot.toLowerCase() ) ;
      };

}

/*Format of the response built after a validation check of an intent's slots.
 "buildValidationResult()" enables to identify which slot is violated,
 and what message it should return to the end user.*/
function buildValidationResult(isValid, violatedSlot, messageContent) {
    return {
        isValid,
        violatedSlot,
        message: { contentType: 'PlainText', content: messageContent },
    }
}
/*Slots validation for the AskQuestion intent */
function validateAskQuestion ( slots ){
  const questionTopicSlot = slots.QuestionTopic ;

  if ( !(isValidSlot(questionTopicSlot, 'Topic')) ){
      return buildValidationResult ( false, 'QuestionTopic', `Sorry,  did not understand your request.You can ask me questions about your account such as "What is my balance?" or questions about our services like "How can I pay my bill?"`);
  } else {
    return buildValidationResult( true, null, null) ;
  }
}


/*Slots validation for the GetAccountBalance intent */
function validate_get_account_balance ( slots ) {
  const charOne = slots.charOne ;
  const charTwo = slots.charTwo ;

  if ( !isValidSlot(charOne, 'Character') ) {
    return buildValidationResult( false, 'charOne', `Sorry, that was incorrect, please give me the second character from your memorable word`) ;
  }
  if ( !isValidSlot(charTwo, 'Character') ) {
    return buildValidationResult( false, 'charOne', `Sorry, that was incorrect, please give me the fifth character from your memorable word`) ;
  }
  return buildValidationResult( true, null, null) ;
}


/*Slots validation for the GetTransactions intent */
function validate_get_transactions ( slots ) {
  const charOne = slots.charOne ;
  const charTwo = slots.charTwo ;

  if ( !isValidSlot(charOne, 'Character') ) {
    return buildValidationResult( false, 'charOne', `Sorry, that was incorrect, please give me the second character from your memorable word`) ;
  }
  if ( !isValidSlot(charTwo, 'Character') ) {
    return buildValidationResult( false, 'charOne', `Sorry, that was incorrect, please give me the fifth character from your memorable word`) ;
  }

  return buildValidationResult( true, null, null) ;

}


/*Slots validation for the LostCard intent */
function validate_lost_card ( slots ) {
  const cardOwnerSlot = slots.cardOwner ;
  const dateOfBirthSlot = slots.dateOfBirth ;
  const incidentDateSlot = slots.incidentDate ;
  const card_type = slots.cardType ;


  if ( !(isValidSlot(cardOwnerSlot, 'AccountHolder')) ){
    return buildValidationResult ( false, 'cardOwner', `Sorry, the name you entered is incorrect`);
  }
  if ( !(isValidSlot( dateOfBirthSlot, 'AMAZON.DATE')) || !isValidSlot(incidentDateSlot, 'AMAZON.DATE') ) {
    return buildValidationResult ( false, 'dateOfBirth', 'Sorry, the date of birth you entered is incorrect');
  }
  if ( !(isValidSlot( card_type , 'CardType')) ) {
    return buildValidationResult ( false, 'cardType', ` Sorry, the card's type you entered is incorrect` );
  }
  return buildValidationResult( true, null, null) ;
}


/*Slots validation for the MakePayment intent */
function validateMakePayment (slots) {
  const payeeSlot = slots.payee ;
  const amountSlot = slots.amount ;
  const fromAccountSlot = slots.fromAccount ;
  const paymentDateSlot = slots.paymentDate ;

  if ( !(isValidSlot( payeeSlot, 'AccountHolder')) ){
    return buildValidationResult (false, 'payee', 'Sorry the account holder you entered is not valid.');
  }
  if ( !(isValidSlot(amountSlot, 'AMAZON.NUMBER')) ){
    return buildValidationResult ( false, 'amount', 'Sorry the number you entered is incorrect');
  }
  if ( !(isValidSlot(fromAccountSlot, 'AMAZON.FOUR_DIGIT_NUMBER')) ){
    return buildValidationResult( false, 'fromAccount', 'Sorry the account number is incorrect');
  }
  if ( !( isValidSlot(paymentDateSlot, 'AMAZON.DATE')) ){
    return buildValidationResult( false, 'paymentDate', 'Sorry wrong date');
  }
  return buildValidationResult( true, null, null) ;
}
