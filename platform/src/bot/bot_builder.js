const AWS = require('aws-sdk');

const {putSlot, putIntent, putBot} = require("./functions/put.js");

const topic = require("./slots/topic.js");
const accountHolder = require("./slots/account_holder.js");
const character = require("./slots/character.js");
const cardType = require("./slots/card_type.js");

const Welcome = require("./intents/welcome.js");
const AskQuestion = require("./intents/ask_question.js");
const GetAccountBalance = require("./intents/get_account_balance.js");
const GetTransactions = require("./intents/get_transactions.js");
const MakePayment = require("./intents/make_payment.js");
const LostCard = require("./intents/lost_card.js");

const CCaaS = require("./bots/CCaaS.js");

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_DEFAULT_REGION = process.env.AWS_DEFAULT_REGION;

AWS.config.update({
  region: AWS_DEFAULT_REGION,
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY
});


const lexmodelbuildingservice = new AWS.LexModelBuildingService();

putSlot(lexmodelbuildingservice, topic).then(() => {
  return putSlot(lexmodelbuildingservice, accountHolder);
}).then(() => {
  return putSlot(lexmodelbuildingservice, character);
}).then(() => {
  return putSlot(lexmodelbuildingservice, cardType);
}).then(() => {
  return putIntent(lexmodelbuildingservice, Welcome);
}).then(() => {
  return putIntent(lexmodelbuildingservice, AskQuestion);
}).then(() => {
  return putIntent(lexmodelbuildingservice, MakePayment);
}).then(() => {
  return putIntent(lexmodelbuildingservice, GetAccountBalance);
}).then(() => {
  return putIntent(lexmodelbuildingservice, GetTransactions);
}).then(() => {
  return putIntent(lexmodelbuildingservice, LostCard);
}).then(() => {
  return putBot(lexmodelbuildingservice, CCaaS);
});
