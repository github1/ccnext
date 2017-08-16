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


  it('helps the user work out how to use the bot', (done) => {

    const notExpected = () => {
      expect(true).toEqual(false);
    };
    const expected = [];
    const expectCall = () => {
      let r;
      expected.push(new Promise((resolve) => {
        r = resolve;
      }));
      return () => {
        r();
      };
    };

    const chatResponse = {
      reply: jest.fn(notExpected),
      signalReadyForFulfillment: jest.fn(expectCall()),
      signalFailed: jest.fn(notExpected),
      nothing: jest.fn(notExpected),
      storeConversationData: jest.fn(expectCall())
    };

    bot.send({
      correlationId: dialogCorrelationId,
      message: 'How does this work?'
    }, chatResponse);

    return Promise.all(expected).then(() => {
      expect(chatResponse.signalReadyForFulfillment).toBeCalledWith({
        dialogState: 'ReadyForFulfillment',
        intentName: 'Welcome',
        message: null,
        sessionAttributes: {},
        slotToElicit: null,
        slots: {}
      });
      done();
    });

  });

});
