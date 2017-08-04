const AWS = require('aws-sdk');

const {putSlot, putIntent, putBot} = require("./functions/put.js");

const topic = require("./slots/Topic.js");
const accountHolder = require("./slots/AccountHolder.js");
const character = require("./slots/Character.js");
const cardType = require("./slots/CardType.js");

const Welcome = require("./intents/Welcome.js");
const AskQuestion = require("./intents/AskQuestion.js");
const GetAccountBalance = require("./intents/GetAccountBalance.js");
const GetTransactions = require("./intents/GetTransactions.js");
const MakePayment = require("./intents/MakePayment.js");
const LostCard = require("./intents/LostCard.js");

const CCaaS = require("./bots/CCaaS.js");

AWS.config.update({
  region:'us-east-1',
  accessKeyId: "",
  secretAccessKey: ""
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
