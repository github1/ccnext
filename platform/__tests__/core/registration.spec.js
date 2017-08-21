import {
  Registration,
  IdentityRegisteredEvent
} from '../../src/core/identity';
import { Clock } from '../../src/core/clock';

describe('Registration', () => {

  let registration;

  beforeEach(() => {
    Clock.freeze(0);
    registration = new Registration('someId');
    registration.dispatch = jest.fn((id, event) => {
      registration.apply(event);
    });
  });

  afterEach(() => {
    Clock.unfreeze();
  });

  it('can be registered once', () => {
    registration.register('somePassword', 'aFirstName', 'aLastName', 'aPhoneNumber', 'aRole');
    registration.register('somePassword', 'aFirstName', 'aLastName', 'aPhoneNumber', 'aRole');
    expect(registration.dispatch)
      .toBeCalledWith('someId',
        new IdentityRegisteredEvent('someId', 'somePassword', 'aFirstName', 'aLastName', 'aPhoneNumber', 'aRole'));
    expect(registration.dispatch.mock.calls.length).toBe(1);
  });

});
