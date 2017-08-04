import {
  Authenticator,
  AuthenticationResult,
  Credentials
} from './authentication';
import { Entity, EntityEvent } from './entity/entity';
import { Clock } from './clock';

export class AuthenticationEvent implements EntityEvent {
  public timestamp : number;
  public name : string;

  constructor() {
    this.timestamp = Clock.now();
    this.name = this.constructor.name;
  }
}

export class AuthenticationAttemptedEvent extends AuthenticationEvent {
}

export class AuthenticationSucceededEvent extends AuthenticationEvent {
}

export class AuthenticationFailedEvent extends AuthenticationEvent {
}

export class AuthenticationErrorEvent extends AuthenticationEvent {
}

export class AuthenticationLockedEvent extends AuthenticationEvent {
}

export class Identity extends Entity {

  private lastState : string;
  private failedAuthenticationAttempts : number = 0;

  constructor(id : string) {
    super(id, Entity.CONFIG((self : Identity, event : EntityEvent) : void => {
      if (event instanceof AuthenticationEvent) {
        if (event instanceof AuthenticationFailedEvent) {
          if (self.lastState === 'AuthenticationFailedEvent'
            || self.lastState === 'AuthenticationAttemptedEvent') {
            self.failedAuthenticationAttempts++;
          } else {
            self.failedAuthenticationAttempts = 0;
          }
        }
        self.lastState = event.constructor.name;
      }
    }));
  }

  public authenticate(credentials : Credentials, authenticator : Authenticator) : Promise<{}> {
    this.dispatch(
      this.id,
      new AuthenticationAttemptedEvent());
    return new Promise((resolve : Function, reject : Function) => {
      if (this.failedAuthenticationAttempts === 3) {
        this.dispatch(
          this.id,
          new AuthenticationLockedEvent());
        reject(new Error('locked'));
      } else {
        credentials
          .authenticate(authenticator)
          .then((result : AuthenticationResult) => {
            if (result.success) {
              this.dispatch(
                this.id,
                new AuthenticationSucceededEvent()
              );
              resolve();
            } else {
              this.dispatch(
                this.id,
                new AuthenticationFailedEvent()
              );
              reject(new Error('auth failed'));
            }
          })
          .catch((error : Error) => {
            this.dispatch(
              this.id,
              new AuthenticationErrorEvent()
            );
            reject(error);
          });
      }
    });
  }

}
