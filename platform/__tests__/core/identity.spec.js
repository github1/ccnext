import {
  Identity,
  AuthenticationAttemptedEvent,
  AuthenticationSucceededEvent,
  AuthenticationFailedEvent,
  AuthenticationLockedEvent,
  AuthenticationErrorEvent
} from '../../src/core/identity';
import { UsernamePasswordCredentials } from '../../src/core/authentication';
import { Clock } from '../../src/core/clock';

describe('Identity', () => {

  let identity;

  beforeEach(() => {
    Clock.freeze(0);
    identity = new Identity('someId');
    identity.dispatch = jest.fn((id, event) => {
      identity.apply(event);
    });
  });

  afterEach(() => {
    Clock.unfreeze();
  });

  const authenticatorYields = (result) => ({
    authenticateUsernamePassword: () => {
      return result instanceof Error ? Promise.reject(result) : Promise.resolve({
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
            .toBeCalledWith('someId', new AuthenticationSucceededEvent());
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


});
