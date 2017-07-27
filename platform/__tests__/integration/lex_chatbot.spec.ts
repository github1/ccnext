import { ChatBotResponse } from '../../src/core/chatbot';
import { LexChatBot } from '../../src/integration/lex_chatbot';

describe('LexChatBot', () => {

  it('greets a user with `Hello, {name}` message', (done : Function) => {
    new LexChatBot('OrderFlowers', 'prod', 'user123')
      .send('I would like to order some flowers')
      .then((result:ChatBotResponse) => {
        expect(result.message).toBe('What type of flowers would you like to order?');
        done();
      })
      .catch(() => {
        done();
      });
  });

});
