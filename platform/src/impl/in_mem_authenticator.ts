import { Authenticator, AuthenticationResult} from '../core/authentication';
import { Identity, IdentityRegisteredEvent } from '../core/identity';
import { EntityRepository, EventBus, EventRecord } from '../core/entity/entity';

const users : {} = {};

export class InMemoryAuthenticator implements Authenticator {

  constructor(entityRepository : EntityRepository, eventBus : EventBus) {

    // Load user data into map
    eventBus.subscribe((event : EventRecord) => {
      if (event.name === 'IdentityRegisteredEvent') {
        const identityRegisteredEvent : IdentityRegisteredEvent = (<IdentityRegisteredEvent>event.payload);
        users[event.stream] = identityRegisteredEvent.password;
      }
    }, {replay: true});

    // Register some users ...
    entityRepository.load(Identity, 'demouser')
      .then((identity : Identity) => {
        identity.register('password1', 'John', 'Doe', '+15555555555', 'customer');
      })
      .catch((err : Error) => {
        console.error(err);
      });

    entityRepository.load(Identity, 'demoagent')
      .then((identity : Identity) => {
        identity.register('password1', 'Kermit', 'Frog', process.env.DEMO_AGENT_PHONE_NUMBER || '+15555555555', 'agent');
      })
      .catch((err : Error) => {
        console.error(err);
      });
  }

  public authenticateUsernamePassword(username : string, password : string) : Promise<AuthenticationResult> {
    return Promise.resolve({
      success: users[username] === password
    });
  }

}
