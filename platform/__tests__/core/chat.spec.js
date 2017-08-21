import {
  Chat,
  ChatStartedEvent,
  ChatParticipantIdentityLinkedEvent,
  ChatParticipantJoinedEvent,
  ChatParticipantLeftEvent,
  ChatEndedEvent,
  ChatMessagePostedEvent,
  ChatTransferredEvent
} from '../../src/core/chat';
import { Clock } from '../../src/core/clock';
import { useIncrementalUUID } from '../../src/core/entity/entity';

describe('Chat', () => {

  let chat;

  beforeEach(() => {
    useIncrementalUUID(true);
    Clock.freeze(0);
    chat = new Chat('chatId');
    chat.dispatch = jest.fn((id, event) => {
      chat.apply(event);
    });
  });

  afterEach(() => {
    useIncrementalUUID(false);
    Clock.unfreeze();
  });

  describe('when a chat is started', () => {
    beforeEach(() => {
      chat.start('someUser');
    });
    it('dispatches a chat started event', () => {
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatStartedEvent('someUser'));
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantJoinedEvent('someUser'));
    });
    it('only dispatches one chat started event', () => {
      chat.start('someUser');
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatStartedEvent('someUser'));
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantJoinedEvent('someUser'));
      expect(chat.dispatch.mock.calls.length).toEqual(2);
    });
  });

  describe('when a chat message is posted', () => {
    describe('and there is no queue set', () => {
      it('throws an error', () => {
        try {
          chat.postMessage('fromSomeone', 'aMessage');
        } catch (err) {
          expect(err).not.toBeUndefined();
        }
      });
    });
    describe('and there is a queue set', () => {
      it('sends the message', () => {
        chat.transferTo('someQueue');
        chat.postMessage('fromSomeone', 'aMessage');
        expect(chat.dispatch)
          .toBeCalledWith('chatId', new ChatStartedEvent('fromSomeone'));
        expect(chat.dispatch)
          .toBeCalledWith('chatId', new ChatParticipantJoinedEvent('fromSomeone'));
        expect(chat.dispatch)
          .toBeCalledWith('chatId', new ChatMessagePostedEvent('0', 'chatId_1', 'fromSomeone', 'aMessage'));
      });
    });
  });

  describe('when a chat participant joins', () => {
    it('dispatches a chat participant joined event', () => {
      chat.join('someone');
      chat.join('someone');
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantJoinedEvent('someone'));
      expect(chat.dispatch.mock.calls.length).toEqual(1);
    });
  });

  describe('when a chat participant identity is linked', () => {
    beforeEach(() => {
      chat.join('someone');
      chat.linkIdentity('someone', 'someIdentity');
    });
    it('dispatches a chat participant identity linked event', () => {
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantIdentityLinkedEvent('someone', 'someIdentity'));
    });
    it('links an identity only once', () => {
      chat.linkIdentity('someone', 'someIdentity');
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantIdentityLinkedEvent('someone', 'someIdentity'));
      expect(chat.dispatch.mock.calls.filter((call) => call[1] instanceof ChatParticipantIdentityLinkedEvent).length).toBe(1);
    });
    it('dispatches an event when an identity link changes', () => {
      chat.linkIdentity('someone', 'someOtherIdentity');
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantIdentityLinkedEvent('someone', 'someIdentity'));
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantIdentityLinkedEvent('someone', 'someOtherIdentity'));
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantIdentityLinkedEvent('someone', 'someOtherIdentity'));
      expect(chat.dispatch.mock.calls.filter((call) => call[1] instanceof ChatParticipantIdentityLinkedEvent).length).toBe(2);
    });
  });

  describe('when a chat participant leaves', () => {
    it('dispatches a chat participant left event', () => {
      chat.join('someone');
      chat.leave('someone');
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantJoinedEvent('someone'));
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantLeftEvent('someone'));
      expect(chat.dispatch.mock.calls.length).toEqual(2);
    });
    describe('when the chat participant has already left', ()=> {
      it('does not dispatch an another chat participant left event', () => {
        chat.join('someone');
        chat.leave('someone');
        chat.leave('someone');
        expect(chat.dispatch)
          .toBeCalledWith('chatId', new ChatParticipantJoinedEvent('someone'));
        expect(chat.dispatch)
          .toBeCalledWith('chatId', new ChatParticipantLeftEvent('someone'));
        expect(chat.dispatch.mock.calls.length).toEqual(2);
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

  describe('when a chat is ended', () => {
    it('dispatches a chat ended event', () => {
      chat.end();
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatEndedEvent());
    });
  });

});
