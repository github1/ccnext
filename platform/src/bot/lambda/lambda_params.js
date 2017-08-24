const lambdaParams = {
  Code: {
  },
  Environment: {
    Variables: {}
  },
  Description: "Handles requests for CCaaSBot",
  FunctionName: "CCaaSRequestProcessor",
  Handler: "soft_validation_lambda.handler", // is of the form of the name of your source file and then name of your function handler
  MemorySize: 128,
  Publish: false,
  Runtime: "nodejs4.3",
};

module.exports = lambdaParams;
