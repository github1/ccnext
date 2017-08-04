import {
  Chat,
  ChatStartedEvent,
  ChatEndedEvent,
  ChatMessagePostedEvent,
  ChatTransferredEvent,
  ChatReadyForFulfillmentEvent
} from '../../src/core/chat';
import { Clock } from '../../src/core/clock';

describe('Chat', () => {

  let chat;

  const chatDestinationProvider = {
    getChat() {
      return {
        send() {
          return Promise.resolve({});
        }
      }
    }
  };

  beforeEach(() => {
    Clock.freeze(0);
    chat = new Chat('chatId');
    chat.dispatch = jest.fn((id, event) => {
      chat.apply(event);
    });
  });

  afterEach(() => {
    Clock.unfreeze();
  });

  describe('when a chat message is posted', () => {
    describe('and there is no queue set', () => {
      it('throws an error', () => {
        try {
          chat.postMessage('fromSomeone', 'aMessage', chatDestinationProvider);
        } catch (err) {
          expect(err).not.toBeUndefined();
        }
      });
    });
    describe('and there is a queue set', () => {
      it('sends the message', () => {
        chat.transferTo('someQueue');
        chat.postMessage('fromSomeone', 'aMessage', chatDestinationProvider);
        expect(chat.dispatch)
          .toBeCalledWith('chatId', new ChatStartedEvent('someQueue'));
        expect(chat.dispatch)
          .toBeCalledWith('chatId', new ChatMessagePostedEvent('fromSomeone', 'aMessage'));
      });
    });
  });

  describe('when a chat is transferred', () => {
    it('dispatches a chat transferred event', () => {
      chat.transferTo('someQueue');
      chat.transferTo('aDifferentQueue');
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatTransferredEvent('someQueue', 'aDifferentQueue'));
    });
    describe('if the new queue is the same as the current queue', () => {
      it('does not perform the transfer', () => {
        chat.transferTo('aDifferentQueue');
        chat.transferTo('aDifferentQueue');
        expect(chat.dispatch)
          .not.toBeCalledWith('chatId', new ChatTransferredEvent('aDifferentQueue', 'aDifferentQueue'));
      });
    });
  });

  describe('when a chat is ready for fulfillment', () => {
    it('dispatches a ready for fulfillment event', () => {
      chat.transferTo('someQueue');
      return chat.postMessage('fromSomeone', 'aMessage', {
        getChat() {
          return {
            send() {
              return Promise.resolve({
                state: 'ReadyForFulfillment',
                payload: {
                  slots: {
                    Blarp: 'Blap'
                  }
                }
              })
            }
          }
        }
      }).then(() => {
        expect(chat.dispatch)
          .toBeCalledWith('chatId', new ChatReadyForFulfillmentEvent({
            slots: {
              Blarp: 'Blap'
            }
          }));
      });
    });
  });

  describe('when a chat is ended', () => {
    it('dispatches a chat ended event', () => {
      chat.end();
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatEndedEvent());
    });
  });

});
