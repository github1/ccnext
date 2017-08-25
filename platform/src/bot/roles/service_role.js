let serviceRole = {
  AssumeRolePolicyDocument: `{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "sts:AssumeRole"
        ],
        "Principal": {
          "Service": "lambda.amazonaws.com"
        }
      }
    ]
  }`,
  RoleName: 'CCaaSBotRole',
  Description: 'role for lambda function for lex',
  Path: '/service-role/'
};

module.exports = serviceRole;
