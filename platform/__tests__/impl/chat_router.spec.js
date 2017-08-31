import { chatRouter } from '../../src/impl/chat_router';
import {
  ChatTransferredEvent,
  ChatMessagePostedEvent,
  ChatParticipantVO
} from '../../src/core/chat';
import {
  TaskSubmittedEvent,
  TaskAssignedEvent
} from '../../src/core/task';
import {
  Projection
} from '../../src/core/projection/projection';

describe('ChatRouter', () => {

  let chatResponse = (res) => {
    res.nothing();
  };
  let events = [];
  let chatService = {};
  let chatCustomer = new ChatParticipantVO('fromSomeone', 'customer', 'theSessionId');
  let chatBot = new ChatParticipantVO('aChatDest', 'bot', 'aChatDest');
  let taskService = {};

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
      events.map((event) => {
        return [event].map((event) => {
          event.name = event.constructor.name;
          event.streamId = 'someChatId';
          return event;
        })[0];
      }).forEach((event) => {
        handler(event);
      });
    }
  };

  beforeEach(() => {
    events.push(new TaskSubmittedEvent({
      channel: 'chat',
      chatId: 'someChatId'
    }));
    events.push(new TaskAssignedEvent(chatBot.handle, {
      channel: 'chat',
      chatId: 'someChatId'
    }));
    events.push(new ChatMessagePostedEvent('aMessageId', 'aCorrelationId', chatCustomer, 'hi'));
    events.push(new ChatTransferredEvent('', 'aChatDest'));
    chatService = {
      postMessage: jest.fn(),
      joinChat: () => Promise.resolve(),
      transferTo: jest.fn(),
      leaveChat: jest.fn(),
      signalReadyForFulfillment: jest.fn()
    };
    taskService = {
      submitTask: () => Promise.resolve()
    };
    Projection(eventBus);
    chatRouter(eventBus, chatDestinationProvider, chatService, taskService);
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
