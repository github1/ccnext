const AWS = require('aws-sdk');
const fs = require('fs');

const { createLambdaRole, createLambdaFunction, updateLambdaPolicy } = require('../functions/put.js');
const serviceRole = require('../roles/service_role.js');
const policyRole = require('../roles/policy_role.js');
const lambda_params = require('./lambda_params.js');

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: "AKIAJKMZZUDTZBX6BF3A",
  secretAccessKey: "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"
});

const lambda = new AWS.Lambda();
const lexmodelbuildingservice = new AWS.LexModelBuildingService();
const iam = new AWS.IAM();

let lexmodel = {
  intent: {
    GetBalance: {},
    MakePayment: {},
    GetTransactions: {}
  }
};

createLambdaRole(iam, lexmodel, serviceRole, policyRole).then(() => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      fs.readFile('./request_processor.zip', (err, data) => {
          resolve(createLambdaFunction(lambda, lexmodel, data, lambda_params));
      });
    }, 10000);
  });
}).then(() => {
  return updateLambdaPolicy(lambda, lexmodel);
});
