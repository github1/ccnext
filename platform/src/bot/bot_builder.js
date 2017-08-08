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

AWS.config.update({
  region:'us-east-1',
  accessKeyId: "AKIAIA6PWONQ7HCTPQYQ",
  secretAccessKey: "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"
});


const lexmodelbuildingservice = new AWS.LexModelBuildingService();

putSlot(lexmodelbuildingservice, topic).then(() => {
  return putSlot(lexmodelbuildingservice, accountHolder);
}).then(() => {
  return putSlot(lexmodelbuildingservice, character);
}).then(() => {
  putSlot(lexmodelbuildingservice, cardType);
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
})
