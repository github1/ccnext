import {
  Chat,
  ChatStartedEvent,
  ChatParticipantJoinedEvent,
  ChatParticipantLeftEvent,
  ChatParticipantModifiedEvent,
  ChatEndedEvent,
  ChatMessagePostedEvent,
  ChatTransferredEvent,
  ChatParticipantVO
} from '../../src/core/chat';
import { Clock } from 'ddd-es-node';
import { useIncrementalUUID } from 'ddd-es-node';

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
        .toBeCalledWith('chatId', new ChatStartedEvent());
    });
    it('only dispatches one chat started event', () => {
      chat.start('someUser');
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatStartedEvent());
      expect(chat.dispatch.mock.calls.length).toEqual(1);
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
          .toBeCalledWith('chatId', new ChatStartedEvent());
        expect(chat.dispatch)
          .toBeCalledWith('chatId', new ChatMessagePostedEvent('1', 'chatId_1', 'fromSomeone', 'aMessage'));
      });
    });
  });

  describe('when a chat participant joins', () => {
    it('dispatches a chat participant joined event', () => {
      chat.join(new ChatParticipantVO('someone', 'customer', '1234'));
      chat.join(new ChatParticipantVO('someone', 'customer', '1234'));
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantJoinedEvent(new ChatParticipantVO('someone', 'customer', '1234')));
      expect(chat.dispatch.mock.calls.length).toEqual(1);
    });
  });

  describe('when a chat participant is modified', () => {
    beforeEach(() => {
      chat.join(new ChatParticipantVO('visitor', 'visitor', '1234'));
      chat.join(new ChatParticipantVO('someone', 'customer', '1234'));
    });
    it('dispatches a chat participant modified event', () => {
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantModifiedEvent(
          new ChatParticipantVO('visitor', 'visitor', '1234'),
          new ChatParticipantVO('someone', 'customer', '1234')));
    });
    it('records the modification event once', () => {
      chat.join(new ChatParticipantVO('someone', 'customer', '1234'));
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantModifiedEvent(
          new ChatParticipantVO('visitor', 'visitor', '1234'),
          new ChatParticipantVO('someone', 'customer', '1234')));
      expect(chat.dispatch.mock.calls.filter((call) => call[1] instanceof ChatParticipantModifiedEvent).length).toBe(1);
    });
  });

  describe('when a chat participant leaves', () => {
    it('dispatches a chat participant left event', () => {
      chat.join(new ChatParticipantVO('visitor', 'visitor', '1234'));
      chat.leave('1234');
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantJoinedEvent(new ChatParticipantVO('visitor', 'visitor', '1234')));
      expect(chat.dispatch)
        .toBeCalledWith('chatId', new ChatParticipantLeftEvent(new ChatParticipantVO('visitor', 'visitor', '1234')));
      expect(chat.dispatch.mock.calls.length).toEqual(2);
    });
    describe('when the chat participant has already left', ()=> {
      it('does not dispatch an another chat participant left event', () => {
        chat.join(new ChatParticipantVO('visitor', 'visitor', '1234'));
        chat.leave('1234');
        chat.leave('1234');
        expect(chat.dispatch)
          .toBeCalledWith('chatId', new ChatParticipantJoinedEvent(new ChatParticipantVO('visitor', 'visitor', '1234')));
        expect(chat.dispatch)
          .toBeCalledWith('chatId', new ChatParticipantLeftEvent(new ChatParticipantVO('visitor', 'visitor', '1234')));
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
