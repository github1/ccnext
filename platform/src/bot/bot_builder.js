const AWS = require('aws-sdk');
const fs = require('fs');

const {
  putSlot,
  putIntent,
  putBot,
  putBotAlias } = require("./functions/put.js");

  const {
    createLambdaRole,
    createLambdaFunction,
    updateLambdaPolicy } = require('./functions/lambda.js');

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

const serviceRole = require('./roles/service_role.js');
const policyRole = require('./roles/policy_role.js');
const lambda_params = require('./lambda/lambda_params.js');

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_DEFAULT_REGION = process.env.AWS_DEFAULT_REGION;

AWS.config.update({
  region: AWS_ACCESS_KEY_ID,
  accessKeyId: AWS_SECRET_ACCESS_KEY,
  secretAccessKey: AWS_DEFAULT_REGION
});

const lexmodelbuildingservice = new AWS.LexModelBuildingService();
const lambda = new AWS.Lambda();
const iam = new AWS.IAM();

const lexmodel = {};

createLambdaRole(iam, lexmodel, serviceRole, policyRole).then(() => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      fs.readFile('./lambda/soft_validation_lambda.zip', (err, data) => {
          resolve(createLambdaFunction(lambda, lexmodel, data, lambda_params));
      });
    }, 10000);
  });
}).then(() => {
  return Promise.all([
    topic,
    accountHolder,
    character,
    cardType
  ].map(slot => {
    return putSlot(lexmodelbuildingservice, lexmodel, slot);
  }));
}).then(() => {
  return Promise.all([
    Welcome,
    AskQuestion,
    MakePayment,
    GetAccountBalance,
    GetTransactions,
    LostCard
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
  return updateLambdaPolicy(lambda, lexmodel);
}).then(() => {
  console.log('Published');
  Object.keys(lexmodel).map((type) => {
    Object.keys(lexmodel[type]).map((key) => {
      console.log(`  ${type} ${key} v${lexmodel[type][key].version}`);
    });
  });
}).then(() => {
  console.log('lexmodel is:');
  console.log(lexmodel);
}).catch(err => {
  console.error(err);
});
