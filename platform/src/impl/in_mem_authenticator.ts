import { Authenticator, AuthenticationResult} from '../core/authentication';
import { Registration, IdentityRegisteredEvent } from '../core/identity';
import { EntityRepository, EventBus, EntityEvent } from 'ddd-es-node';

const registrations : { [key:string]:IdentityRegisteredEvent } = {};

export class InMemoryAuthenticator implements Authenticator {

  constructor(entityRepository : EntityRepository, eventBus : EventBus) {

    // Load user data into map
    eventBus.subscribe((event : EntityEvent) => {
      if (event instanceof IdentityRegisteredEvent) {
        registrations[event.streamId] = event;
      }
    }, {replay: true});

    // Register some users ...
    entityRepository.load(Registration, 'demouser')
      .then((registration : Registration) => {
        registration.register('password1', 'John', 'Doe', '+15555555555', 'customer', 'someword');
      })
      .catch((err : Error) => {
        console.error(err);
      });

    entityRepository.load(Registration, 'demoagent')
      .then((registration : Registration) => {
        registration.register('password1', 'Kermit', 'Frog', process.env.DEMO_AGENT_PHONE_NUMBER || '+15555555555', 'agent', 'someword');
      })
      .catch((err : Error) => {
        console.error(err);
      });

    entityRepository.load(Registration, 'CCaaSBot')
      .then((registration : Registration) => {
        registration.register('password1', 'CCaaS', 'Bot', '+15555555555', 'bot', 'someword');
      })
      .catch((err : Error) => {
        console.error(err);
      });
  }

  public authenticateUsernamePassword(username : string, password : string) : Promise<AuthenticationResult> {
    return Promise.resolve(!registrations[username] ? {
      username: username,
      role: 'unknown',
      success: false
    } : {
      username: username,
      role: registrations[username].role,
      success: registrations[username].password === password
    });
  }

  public authenticateMemorableWord(username : string,
                                   positionsRequested : number[],
                                   positionChars : string[]) : Promise<AuthenticationResult> {
    const validatePositions = (word : string) : boolean => {
      return JSON.stringify(positionChars) === JSON.stringify(positionsRequested
        .map((pos : number) => word[pos]));
    };
    return Promise.resolve(!registrations[username] ? {
      username: username,
      role: 'unknown',
      success: false
    } : {
      username: username,
      role: registrations[username].role,
      success: validatePositions(registrations[username].memorableWord)
    });
  }

}
