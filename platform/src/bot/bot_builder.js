const AWS = require('aws-sdk');

const {
  putSlot,
  putIntent,
  putBot,
  putBotAlias } = require("./functions/put.js");

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
const SpeakToAgent = require("./intents/speak_to_agent.js");

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

const lexmodel = {};

Promise.all([
  topic,
  accountHolder,
  character,
  cardType
].map(slot => {
  return putSlot(lexmodelbuildingservice, lexmodel, slot);
})).then(() => {
  return Promise.all([
    Welcome,
    AskQuestion,
    MakePayment,
    GetAccountBalance,
    GetTransactions,
    LostCard,
    SpeakToAgent
  ].map(intent=> {
    return putIntent(lexmodelbuildingservice, lexmodel, intent);
  }));
}).then(() => {
  return putBot(lexmodelbuildingservice, lexmodel, CCaaS);
}).then(() => {
  return putBotAlias(lexmodelbuildingservice, lexmodel, {
    botName: CCaaS.name,
    name: 'prod'
  });
}).then(() => {
  console.log('Published');
  Object.keys(lexmodel).map((type) => {
    Object.keys(lexmodel[type]).map((key) => {
      console.log(`  ${type} ${key} v${lexmodel[type][key].version}`);
    });
  });
}).catch(err => {
  console.error(err);
});

