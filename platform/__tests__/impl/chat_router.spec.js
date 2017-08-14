import { chatRouter } from '../../src/impl/chat_router';
import {
  ChatTransferredEvent,
  ChatMessagePostedEvent
} from '../../src/core/chat';

describe('ChatRouter', () => {

  let chatResponse = {};
  let events = [];
  let chatService = {};

  const chatDestinationProvider = {
    getChat() {
      return {
        send() {
          return Promise.resolve(chatResponse);
        }
      };
    }
  };

  const eventBus = {
    subscribe(handler) {
      while (events.length > 0) {
        handler([events.pop()].map((event) => {
          return {
            name: event.constructor.name,
            stream: 'someChatId',
            payload: event
          };
        })[0]);
      }
    }
  };

  beforeEach(() => {
    events.push(new ChatMessagePostedEvent('aMessageId', 'aCorrelationId', 'fromSomeone', 'hi'));
    events.push(new ChatTransferredEvent('', 'aChatDest'));
    chatService = {
      postMessage: jest.fn(),
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
      chatResponse = {
        message: 'some response'
      };
    });
    it('posts the response to the chat', () => {
      expect(chatService.postMessage).toBeCalledWith('someChatId', 'aChatDest', 'some response');
    });
  });

  describe('when a response is failed', () => {
    beforeAll(() => {
      chatResponse = {
        message: 'some response',
        state: 'Failed'
      };
      events.push(new ChatMessagePostedEvent('aMessageId', 'aCorrelationId', 'fromSomeone', 'hi'));
    });
    it('transfers to an agent queue', () => {
      expect(chatService.transferTo).toBeCalledWith('someChatId', 'agentChatQueue');
    });
  });

  describe('when a response is ready for fulfillment', () => {
    beforeAll(() => {
      chatResponse = {
        state: 'ReadyForFulfillment',
        payload: {
          slots: {
            Blarp: 'Blap'
          }
        }
      };
    });
    it('it signals the chat is ready for fulfillment', () => {
      expect(chatService.signalReadyForFulfillment)
        .toBeCalledWith('someChatId', 'fromSomeone', {slots: {Blarp: 'Blap'}});
    });
  });


});
