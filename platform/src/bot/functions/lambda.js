const createLambdaRole = (iam, lexmodel, role, policy) => {
    return new Promise((resolve, reject) => {
      console.log(`Checking if role "${role.RoleName}"exists`);
      iam.getRole({RoleName: role.RoleName}, (err, data) => {
        if (err) {
          console.log(`${role.RoleName} does not exist, attempting to create role`)
          iam.createRole(role, function(err, data) {
          if (err) {
            console.log(`Could not create role`);
            console.log(err, err.stack); // an error occurred
            reject();
          }
          else {
            console.log(`${role.RoleName} created`);
            lexmodel.role = data.Role;
            iam.attachRolePolicy(policy, (err, data) => {
              if (err) {
                console.log(`Policy could not be attached to ${role.RoleName}`);
                reject();
              } else {
                console.log(`Policy attached to ${role.RoleName}`);
                resolve();
              }
            });
          };
        })
      } else {
        lexmodel.role = data.Role;
        resolve();
      }
    });
  });
};


const createLambdaFunction = (lambda, lexmodel, zipFile, params) => {
  return new Promise((resolve, reject) => {
    params.Code.ZipFile = zipFile;
    params.Role = lexmodel.role.Arn;
    console.log(`Checking if function ${params.FunctionName} exists`);
    lambda.getFunction({FunctionName: params.FunctionName}, (err, data) => {
      if (err) {
        console.log(`${params.FunctionName} does not exist, attempting to create it`);
        lambda.createFunction(params, function (err, data) {
          if (err) {
            console.log(err, err.stack);
            reject();
          } else {
            console.log(`Function created`);
            lexmodel.lambdaFunction = data.Function;
            resolve();
          };
        });
      } else {
        console.log(`${params.FunctionName} already exists`);
        lexmodel.lambdaFunction = data.Configuration;
        resolve();
      }
    });
  });
};


const addPermission = (lambda, intent, sourceAccount, lambdaArn) => {
  let StatementId = "lex-us-east-1-" + intent;
  let intentArn = "arn:aws:lex:us-east-1:"+sourceAccount+":intent:"+intent
  let params = {
    Action: "lambda:InvokeFunction",
    FunctionName: lambdaArn,
    Principal: "lex.amazonaws.com",
    SourceArn: intentArn,
    StatementId
  };
  lambda.addPermission(params, function(err, data) {
    if (err) console.log(err, err.stack);
    else console.log(`${intent} intent added to permissions`);
  });
};

const updateLambdaPolicy = (lambda, lexmodel) => {
  return new Promise((resolve, reject) => {
    console.log(lexmodel);
    let intents = Object.keys(lexmodel.intent).map(key => key);
    let lambdaArn = lexmodel.lambdaFunction.FunctionArn;
    let sourceAccount = lambdaArn.split(":",7)[4];
    lambda.getPolicy({FunctionName: lexmodel.lambdaFunction.FunctionName}, (err, data) => {
      if (err) {
        console.log(`The policy could not be found. Adding permissions to the function`);
        intents.map(intent => {
          addPermission(lambda, intent, sourceAccount, lambdaArn);
        });
        resolve();
      } else {
        console.log(`Policy already exists, updating policy to add new intents`);
        let policy = JSON.parse(data.Policy);
        let sids = policy.Statement.map(statement => statement.Sid);
        console.log(sids);
        intents.map(intent => {
        let StatementId = "lex-us-east-1-" + intent;
          if (!sids.includes(StatementId)) {
            addPermission(lambda, intent, sourceAccount, lambdaArn);
          }
        });
        resolve();
      }
    });
  });
};

module.exports.createLambdaRole = createLambdaRole;
module.exports.createLambdaFunction = createLambdaFunction;
module.exports.updateLambdaPolicy = updateLambdaPolicy;
