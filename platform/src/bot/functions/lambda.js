const createLambdaRole = (iam, lexmodel, role, policy) => {
  return new Promise((resolve, reject) => {
    console.log(`Checking if role "${role.RoleName}" exists`);
    iam.getRole({RoleName: role.RoleName}, (err, data) => {
      if (err) {
        console.log(`${role.RoleName} does not exist, attempting to create role`);
        iam.createRole(role, function(err, data) {
          if (err) {
            console.log(`Could not create role`);
            reject(err);
          }
          else {
            console.log(`${role.RoleName} created`);
            lexmodel.role = data.Role;
            iam.attachRolePolicy(policy, (err, data) => {
              if (err) {
                console.log(`Policy could not be attached to ${role.RoleName}`);
                reject(err);
              } else {
                console.log(`Policy attached to ${role.RoleName}`);
                resolve(data);
              }
            });
          }
        });
      } else {
        lexmodel.role = data.Role;
        resolve(data);
      }
    });
  });
};


const createLambdaFunction = (lambda, lexmodel, params, publicUrl, zipFile) => {
  return new Promise((resolve, reject) => {
    params.Environment.Variables.PUBLIC_URL = publicUrl;
    params.Code.ZipFile = zipFile;
    params.Role = lexmodel.role.Arn;
    console.log(`Checking if function ${params.FunctionName} exists`);
    lambda.getFunction({FunctionName: params.FunctionName}, (err, data) => {
      if (err) {
        console.log(`${params.FunctionName} does not exist, attemping to create it`);
        lambda.createFunction(params, (err, data) => {
          if (err) {
            console.log(err, err.stack);
            reject(err);
          } else {
            console.log(`Function ${params.FunctionName} created`);
            resolve(data);
          }
        });
      } else {
        console.log(`${data.Configuration.FunctionName} already exists, trying to update`);
        lambda.updateFunctionCode({FunctionName: params.FunctionName, ZipFile: zipFile}, (err, data) => {
          if (err) {
            console.log(`Unable to update ${params.FunctionName}`);
            reject(err);
          } else {
            resolve(data);
          }
        });
      }
    });
  }).then((data) => {
    return new Promise((resolve, reject) => {
      lambda.publishVersion({FunctionName:data.FunctionName, CodeSha256: data.CodeSha256}, (err, data) => {
        if (err) {
          console.log(`Could not publish a new version of the function`);
          reject(err);
        } else {
          console.log(`Updating the "$LATEST" version of ${data.FunctionName}`);
          lexmodel.lambdaFunction = data;
          resolve();
        }
      });
    });
  });
};


const addPermission = (lambda, intent, sourceAccount, lambdaArn, reject) => {
  let StatementId = "lex-us-east-1-" + intent;
  let intentArn = "arn:aws:lex:us-east-1:"+sourceAccount+":intent:"+intent+":*";
  let params = {
    Action: "lambda:InvokeFunction",
    FunctionName: lambdaArn,
    Principal: "lex.amazonaws.com",
    SourceArn: intentArn,
    StatementId
  };
  lambda.addPermission(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);
      reject();
    }
    else console.log(`${data.Statement} intent added to permissions`);
  });
};

const updateLambdaPolicy = (lambda, lexmodel, intents) => {
  return new Promise((resolve, reject) => {
    let lambdaArn = lexmodel.lambdaFunction.FunctionArn.slice(0,lexmodel.lambdaFunction.FunctionArn.lastIndexOf(":"));
    let sourceAccount = lambdaArn.split(":",7)[4];
    lambda.getPolicy({FunctionName: lambdaArn}, (err, data) => {
      if (err) {
        console.log(`The policy could not be found. Adding permissions to the function`);
        intents.map(intent => {
          addPermission(lambda, intent, sourceAccount, lambdaArn, reject);
        });
        resolve();
      } else {
        console.log(`Policy already exists, updating policy to add new intents`);
        let policy = JSON.parse(data.Policy);
        let sids = policy.Statement.map(statement => statement.Sid);
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
