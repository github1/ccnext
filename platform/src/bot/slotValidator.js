const topic = require("./slots/Topic.js");
const accountHolder = require("./slots/AccountHolder.js");
const character = require("./slots/Character.js");
const cardType = require("./slots/CardType.js");


//"transform_to_const()" assign to every slotType the adequate variable required
function transform_to_const (slot_type ){
    switch (slot_type) {
        case 'Topic':
            return topic ;
          break;
        case 'AccountHolder':
            return accountHolder ;
          break;
        case 'Character':
            return character
          break;
        case 'CardType':
            return cardType ;
          break;


    }
}
/*The function "is_valid_slot()"" checks whether a slot is valid or not, whatever its type.
 It returns a boolean. */
function is_valid_slot( slot, slot_type ) {

    switch (slot_type) {

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
            return !(isNan(parseLocaleDate(slot).getTime()));
          }catch (err){
            return false;
          }
        break;


      case 'AMAZON.NUMBER':
            return true;
        break;


      case 'AMAZON.FOUR_DIGIT_NUMBER':
            return true;
      break;

      default :
            let set = new Set ;
            transform_to_const(slot_type).enumerationValues.forEach( (val) => {
                set.add ( val.value.toLowerCase() )
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

/*Slots validation for the AskQuestion intent */
function validate_ask_question ( slots ){
  const question_topic = slots.QuestionTopic ;

  if ( !(is_valid_slot(question_topic, 'Topic')) ){
      return buildValidationResult ( false, 'QuestionTopic', `Sorry,  did not understand your request.You can ask me questions about your account such as "What is my balance?" or questions about our services like "How can I pay my bill?"`);
  } else {
    return buildValidationResult( true, null, null) ;
  }
}


/*Slots validation for the GetAccountBalance intent */
function validate_get_account_balance ( slots ) {
  const char_one = slots.charOne ;
  const char_two = slots.charTwo ;

  if ( !is_valid_slot(char_one, 'Character') ) {
    return buildValidationResult( false, 'charOne', `Sorry, that was incorrect, please give me the second character from your memorable word`) ;
  }
  if ( !is_valid_slot(char_two, 'Character') ) {
    return buildValidationResult( false, 'charOne', `Sorry, that was incorrect, please give me the fifth character from your memorable word`) ;
  }
  if (is_valid_slot(char_one, 'Character') && is_valid_slot(char_two, 'Character')){
    return buildValidationResult( true, null, null) ;
  }
}


/*Slots validation for the GetTransactions intent */
function validate_get_transactions ( slots ) {
  const char_one = slots.charOne ;
  const char_two = slots.charTwo ;

  if ( !is_valid_slot(char_one, 'Character') ) {
    return buildValidationResult( false, 'charOne', `Sorry, that was incorrect, please give me the second character from your memorable word`) ;
  }
  if ( !is_valid_slot(char_two, 'Character') ) {
    return buildValidationResult( false, 'charOne', `Sorry, that was incorrect, please give me the fifth character from your memorable word`) ;
  }

  return buildValidationResult( true, null, null) ;

}


/*Slots validation for the LostCard intent */
function validate_lost_card ( slots ) {
  const card_owner = slots.cardOwner ;
  const date_of_birth = slots.dateOfBirth ;
  const incident_date = slots.incidentDate ;
  const card_type = slots.cardType ;


  if ( !(is_valid_slot(card_owner, 'AccountHolder')) ){
    return buildValidationResult ( false, 'cardOwner', `Sorry, the name you entered is incorrect`);
  }
  if ( !(is_valid_slot( date_of_birth, 'AMAZON.DATE')) || !is_valid_slot(incident_date, 'AMAZON.DATE') ) {
    return buildValidationResult ( false, 'dateOfBirth', 'Sorry, the date of birth you entered is incorrect');
  }
  if ( !(is_valid_slot( card_type , 'CardType')) ) {
    return buildValidationResult ( false, 'cardType', ` Sorry, the card's type you entered is incorrect` );
  }
  return buildValidationResult( true, null, null) ;
}


/*Slots validation for the MakePayment intent */
function validate_make_payment (slots) {
  const payee_slot = slots.payee ;
  const amount_slot = slots.amount ;
  const from_account = slots.fromAccount ;
  const payment_date = slots.paymentDate ;

  if ( !(is_valid_slot( payee_slot, 'AccountHolder')) ){
    return buildValidationResult (false, 'payee', 'Sorry the account holder you entered is not valid.')
  }
  if ( !(is_valid_slot(amount_slot, 'AMAZON.NUMBER')) ){
    return buildValidationResult ( false, 'amount', 'Sorry the number you entered is incorrect');
  }
  if ( !(is_valid_slot(from_account, 'AMAZON.FOUR_DIGIT_NUMBER')) ){
    return buildValidationResult( false, 'fromAccount', 'Sorry the account number is incorrect');
  }
  if ( !( is_valid_slot(payment_date, 'AMAZON.DATE')) ){
    return buildValidationResult( false, 'paymentDate', 'Sorry wrong date')
  }
  return buildValidationResult( true, null, null) ;
}
