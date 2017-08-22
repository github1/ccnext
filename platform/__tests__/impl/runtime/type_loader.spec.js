import {
  resolveInstanceFromJson
} from '../../../src/impl/runtime/type_loader';
import {
  ChatParticipantJoinedEvent,
  ChatParticipantVO
} from '../../../src/core/chat';


describe('typeLoader', () => {

  describe('resolveInstanceFromJson', () => {
    describe('with an object with nested types', () => {
      it('it loads the type and child types from JSON based on type metadata', () => {
        return resolveInstanceFromJson(
          JSON.stringify(
            new ChatParticipantJoinedEvent(
              new ChatParticipantVO('handle', 'role', 'sessionId')
            )
          )
        ).then((result) => {
          expect(result.constructor).toEqual(ChatParticipantJoinedEvent);
          expect(result.name).toEqual('ChatParticipantJoinedEvent');
          expect(result.participant.constructor).toEqual(ChatParticipantVO);
          expect(result.participant.handle).toEqual('handle');
        });
      });
    });
    describe('with an object with multiple nested types', () => {
      it('it loads the type and all child types from JSON based on type metadata', () => {
        return resolveInstanceFromJson({
          typeNameMetaData: ChatParticipantJoinedEvent.name,
          participant1: {
            typeNameMetaData: ChatParticipantVO.name
          },
          participant2: {
            typeNameMetaData: ChatParticipantVO.name
          }
        }).then((result) => {
          expect(result.constructor).toEqual(ChatParticipantJoinedEvent);
          expect(result.participant1.constructor).toEqual(ChatParticipantVO);
          expect(result.participant2.constructor).toEqual(ChatParticipantVO);
        });
      });
    });
    describe('with an object without nested types', () => {
      it('it loads a type from JSON based on type metadata', () => {
        return resolveInstanceFromJson(
          JSON.stringify(new ChatParticipantVO('handle', 'role', 'sessionId'))
        ).then((result) => {
          expect(result.constructor).toEqual(ChatParticipantVO);
        });
      });
    });
    describe('with an object already resolved', () => {
      it('it returns the object', () => {
        return resolveInstanceFromJson(new ChatParticipantJoinedEvent(
          new ChatParticipantVO('handle', 'role', 'sessionId')
        )).then((result) => {
          expect(result.constructor).toEqual(ChatParticipantJoinedEvent);
          expect(result.participant.constructor).toEqual(ChatParticipantVO);
          expect(result.participant.handle).toEqual('handle');
        });
      });
    });
    describe('without any type metadata', () => {
      it('returns the json', () => {
        return resolveInstanceFromJson({
          handle: 'someHandle',
          role: 'someRole'
        }).then((result) => {
          expect(result.constructor).toEqual(Object);
        });
      });
    });
    describe('when a type does not exist', () => {
      it('throws an error', () => {
        let errorThrown = false;
        return resolveInstanceFromJson({
          typeNameMetaData: 'FakeTestType'
        }).then((result) => {
          expect(result.constructor).toEqual(Object);
        }).catch(() => {
          errorThrown = true;
        }).then(() => {
          expect(errorThrown).toEqual(true);
        });
      });
    });
    describe('when json not passed', () => {
      it('throws an error', () => {
        let errorThrown = false;
        return resolveInstanceFromJson('ljahsdj').then((result) => {
          expect(result.constructor).toEqual(Object);
        }).catch(() => {
          errorThrown = true;
        }).then(() => {
          expect(errorThrown).toEqual(true);
        });
      });
    });
  });

});
