import {
  Identity,
  AuthenticationAttemptedEvent,
  AuthenticationSucceededEvent,
  AuthenticationFailedEvent,
  AuthenticationLockedEvent,
  AuthenticationErrorEvent,
  AuthenticationVerificationRequestedEvent
} from '../../src/core/identity';
import { UsernamePasswordCredentials } from '../../src/core/authentication';
import { Clock, useIncrementalUUID } from 'ddd-es-node';

describe('Identity', () => {

  let identity;

  beforeEach(() => {
    useIncrementalUUID(true);
    Clock.freeze(0);
    identity = new Identity('someId');
    identity.dispatch = jest.fn((id, event) => {
      identity.apply(event);
    });
  });

  afterEach(() => {
    useIncrementalUUID(false);
    Clock.unfreeze();
  });

  const authenticatorYields = (result) => ({
    authenticateUsernamePassword: (username) => {
      return result instanceof Error ? Promise.reject(result) : Promise.resolve({
        username: username,
        success: result
      });
    }
  });

  describe('when credentials are valid', () => {
    it('dispatches an authentication succeeded event', () => {
      return identity.authenticate(
        new UsernamePasswordCredentials('a', 'b'), authenticatorYields(true))
        .then(() => {
          expect(identity.dispatch)
            .toBeCalledWith('someId', new AuthenticationAttemptedEvent());
          expect(identity.dispatch)
            .toBeCalledWith('someId', new AuthenticationSucceededEvent('a'));
        });
    });
  });

  describe('when credentials are invalid', () => {
    it('dispatches an authentication failed event', () => {
      return identity.authenticate(
        new UsernamePasswordCredentials('a', 'b'), authenticatorYields(false))
        .catch(() => {
          expect(identity.dispatch)
            .toBeCalledWith('someId', new AuthenticationAttemptedEvent());
          expect(identity.dispatch)
            .toBeCalledWith('someId', new AuthenticationFailedEvent());
        });
    });
  });

  describe('when authentication fails more than three times', () => {
    it('locks the account', () => {
      return identity.authenticate(
        new UsernamePasswordCredentials('a', 'b'), authenticatorYields(false))
        .catch(() => {
          return identity.authenticate(
            new UsernamePasswordCredentials('a', 'b'), authenticatorYields(false));
        })
        .catch(() => {
          return identity.authenticate(
            new UsernamePasswordCredentials('a', 'b'), authenticatorYields(false));
        })
        .catch(() => {
          return identity.authenticate(
            new UsernamePasswordCredentials('a', 'b'), authenticatorYields(false));
        })
        .catch(() => {
          expect(identity.dispatch)
            .toBeCalledWith('someId', new AuthenticationLockedEvent());
        });
    });
  });

  describe('when the authenticator throws an error', () => {
    it('dispatches an authentication error event', () => {
      return identity.authenticate(
        new UsernamePasswordCredentials('a', 'b'), authenticatorYields(new Error('some error')))
        .catch(() => {
          expect(identity.dispatch)
            .toBeCalledWith('someId', new AuthenticationErrorEvent());
        });
    });
  });

  describe('when identity verification is requested', () => {
    it('dispatches an identity verification requested event', () => {
      identity.requestVerification();
      expect(identity.dispatch).toBeCalledWith('someId', new AuthenticationVerificationRequestedEvent("7"));
    });
  });

});
