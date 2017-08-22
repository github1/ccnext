import { chatRouter } from '../../src/impl/chat_router';
import {
  ChatTransferredEvent,
  ChatMessagePostedEvent,
  ChatParticipantVO
} from '../../src/core/chat';

describe('ChatRouter', () => {

  let chatResponse = (res) => {
    res.nothing();
  };
  let events = [];
  let chatService = {};
  let chatCustomer = new ChatParticipantVO('fromSomeone', 'customer', 'theSessionId');
  let chatBot = new ChatParticipantVO('aChatDest', 'bot', 'aChatDest');

  const chatDestinationProvider = {
    getChat() {
      return {
        send(req, res) {
          if (req) {
            chatResponse(res);
          }
        }
      };
    }
  };

  const eventBus = {
    subscribe(handler) {
      while (events.length > 0) {
        handler([events.pop()].map((event) => {
          event.name = event.constructor.name;
          event.streamId = 'someChatId';
          return event;
        })[0]);
      }
    }
  };

  beforeEach(() => {
    events.push(new ChatMessagePostedEvent('aMessageId', 'aCorrelationId', chatCustomer, 'hi'));
    events.push(new ChatTransferredEvent('', 'aChatDest'));
    chatService = {
      postMessage: jest.fn(),
      joinChat: () => Promise.resolve(),
      transferTo: jest.fn(),
      leaveChat: jest.fn(),
      signalReadyForFulfillment: jest.fn()
    };
    chatRouter(eventBus, chatDestinationProvider, chatService);
  });

  afterEach(() => {
    while (events.length > 0) {
      events.pop();
    }
  });

  describe('when a chat message is posted', () => {
    beforeAll(() => {
      chatResponse = (res) => res.reply('some response');
    });
    it('posts the response to the chat', () => {
      expect(chatService.postMessage).toBeCalledWith('someChatId', chatBot, 'some response');
    });
  });

  describe('when a response is failed', () => {
    beforeAll(() => {
      chatResponse = (res) => res.signalFailed();
      events.push(new ChatMessagePostedEvent('aMessageId', 'aCorrelationId', chatCustomer, 'hi'));
    });
    it('transfers to an agent queue', () => {
      expect(chatService.transferTo).toBeCalledWith('someChatId', 'agentChatQueue');
    });
  });

  describe('when a response is ready for fulfillment', () => {
    beforeAll(() => {
      chatResponse = (res) => res.signalReadyForFulfillment({
        state: 'ReadyForFulfillment',
        payload: {
          slots: {
            Blarp: 'Blap'
          }
        }
      });
    });
    it('it signals the chat is ready for fulfillment', () => {
      expect(chatService.signalReadyForFulfillment)
        .toBeCalledWith('someChatId', chatCustomer, chatBot, {
          state: 'ReadyForFulfillment',
          payload: {
            slots: {
              Blarp: 'Blap'
            }
          }
        });
    });
  });


});
