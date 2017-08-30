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
const phoneNumber = require("./slots/phone_number.js");

const Welcome = require("./intents/welcome.js");
const AskQuestion = require("./intents/ask_question.js");
const GetAccountBalance = require("./intents/get_account_balance.js");
const GetTransactions = require("./intents/get_transactions.js");
const MakePayment = require("./intents/make_payment.js");
const LostCard = require("./intents/lost_card.js");
const RequestCallback = require("./intents/request_callback.js");

const CCaaS = require("./bots/CCaaS.js");

const serviceRole = require('./lambda/roles/service_role.js');
const policyRole = require('./lambda/roles/policy_role.js');
const lambdaParams = require('./lambda/lambda_params.js');

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_DEFAULT_REGION = process.env.AWS_DEFAULT_REGION;

const PUBLIC_URL = process.env.PUBLIC_URL;

AWS.config.update({
  region: AWS_ACCESS_KEY_ID,
  accessKeyId: AWS_SECRET_ACCESS_KEY,
  secretAccessKey: AWS_DEFAULT_REGION
});

const lexmodelbuildingservice = new AWS.LexModelBuildingService();
const lambda = new AWS.Lambda();
const iam = new AWS.IAM();

const lexmodel = {};

let intents = [
  Welcome(''),
  AskQuestion(''),
  MakePayment(''),
  GetAccountBalance(''),
  GetTransactions(''),
  LostCard(''),
  RequestCallback('')
].map(intent => intent.name);

createLambdaRole(iam, lexmodel, serviceRole, policyRole).then(() => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      fs.readFile('./lambda/soft_validation_lambda.zip', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(createLambdaFunction(lambda, lexmodel, lambdaParams, PUBLIC_URL, data));
        }
      });
    }, 10000);
  });
}).then(() => {
  return updateLambdaPolicy(lambda, lexmodel, intents);
}).then(() => {
  return Promise.all([
    topic,
    accountHolder,
    character,
    cardType,
    phoneNumber
  ].map(slot => {
    return putSlot(lexmodelbuildingservice, lexmodel, slot);
  }));
}).then(() => {
  let arn = lexmodel.lambdaFunction.FunctionArn;
  return Promise.all([
    Welcome(arn),
    AskQuestion(arn),
    MakePayment(arn),
    GetAccountBalance(arn),
    GetTransactions(arn),
    LostCard(arn),
    RequestCallback(arn)
  ].map(intent=> {
    return putIntent(lexmodelbuildingservice, lexmodel, intent);
  }));
}).then(() => {
  return putBot(lexmodelbuildingservice, lexmodel, CCaaS(lexmodel));
}).then(() => {
  return putBotAlias(lexmodelbuildingservice, lexmodel, {
    botName: CCaaS.name,
    name: 'prod'
  });
}).then(() => {
  console.log('Published');
  Object.keys(lexmodel).map((type) => {
    if (type == 'lambdaFunction') {
      console.log(`  ${type} ${lexmodel[type].FunctionName} v${lexmodel[type].Version}`);
    } else if (type !== 'role') {
      Object.keys(lexmodel[type]).map((key) => {
        console.log(`  ${type} ${key} v${lexmodel[type][key].version}`);
      });
    }
  });
}).catch(err => {
  console.error(err);
});
