import * as awsSdk from 'aws-sdk';
import { LexChatBot } from '../../../src/impl/integration/lex_chatbot';
import uuid from 'uuid';

describe('LexChatBot', () => {

  const dialogCorrelationId = uuid.v4();
  const bot = new LexChatBot('OrderFlowers', 'prod', 'user123', new awsSdk.LexRuntime({
    credentials: new awsSdk.Credentials(
      process.env.AWS_ACCESS_KEY_ID,
      process.env.AWS_SECRET_ACCESS_KEY),
    region: process.env.AWS_DEFAULT_REGION
  }));


  it('asks what type of flowers', (done) => {
    bot.send({
        dialogCorrelationId: dialogCorrelationId,
        message: 'I would like to order some flowers'
      })
      .then((result) => {
        expect(result.message).toBe('What type of flowers would you like to order?');
        done();
      })
      .catch(() => {
        done();
      });
  });

});
