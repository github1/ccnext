import * as awsSdk from 'aws-sdk';
import { LexChatBot } from '../../../src/impl/integration/lex_chatbot';
import uuid from 'uuid';

describe('LexChatBot', () => {

  const dialogCorrelationId = uuid.v4();
  const bot = new LexChatBot('CCaaSBot', 'prod', new awsSdk.LexRuntime({
    credentials: new awsSdk.Credentials(
      process.env.AWS_ACCESS_KEY_ID,
      process.env.AWS_SECRET_ACCESS_KEY),
    region: process.env.AWS_DEFAULT_REGION
  }));


  it('helps the user work out how to use the bot', () => {
    return bot.send({ dialogCorrelationId: dialogCorrelationId, message: 'How does this work?' })
      .then((result) => {
        expect(result.payload.intentName).toBe('Welcome');
        expect(result.state).toBe('ReadyForFulfillment');
      });
  });

});
