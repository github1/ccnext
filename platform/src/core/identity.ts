import {
  Authenticator,
  AuthenticationResult,
  Credentials
} from './authentication';
import { Entity, EntityEvent, uuid } from 'ddd-es-node';

export class AuthenticationEvent extends EntityEvent {
  constructor() {
    super();
  }
}

export class AuthenticationAttemptedEvent extends AuthenticationEvent {
}

export class AuthenticationSucceededEvent extends AuthenticationEvent {
  public username : string;
  public role : string;
  constructor(username : string, role : string) {
    super();
    this.username = username;
    this.role = role;
  }
}

export class AuthenticationFailedEvent extends AuthenticationEvent {
}

export class AuthenticationErrorEvent extends AuthenticationEvent {
}

export class AuthenticationLockedEvent extends AuthenticationEvent {
}

export class AuthenticationVerificationRequestedEvent extends AuthenticationEvent {
  public requestId : string;
  constructor(requestId : string) {
    super();
    this.requestId = requestId;
  }
}

export class AuthenticationVerificationSucceededEvent extends AuthenticationEvent {
  public requestId : string;
  public username : string;
  public role : string;
  constructor(requestId : string, username : string, role : string) {
    super();
    this.requestId = requestId;
    this.username = username;
    this.role = role;
  }
}

export class IdentityRegisteredEvent extends AuthenticationEvent {
  public username : string;
  public password : string;
  public firstName : string;
  public lastName : string;
  public phoneNumber : string;
  public memorableWord : string;
  public role : string;

  constructor(username : string,
              password : string,
              firstName : string,
              lastName : string,
              phoneNumber : string,
              role : string,
              memorableWord : string) {
    super();
    this.username = username;
    this.password = password;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phoneNumber = phoneNumber;
    this.role = role;
    this.memorableWord = memorableWord;
  }
}

export class Identity extends Entity {

  private pendingVerificationRequestId : string = null;
  private verified : boolean = false;
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
        } else if (event instanceof AuthenticationVerificationRequestedEvent) {
          self.pendingVerificationRequestId = event.requestId;
          self.verified = false;
        } else if(event instanceof AuthenticationVerificationSucceededEvent) {
          self.pendingVerificationRequestId = null;
          self.verified = true;
        }
        self.lastState = event.constructor.name;
      }
    }));
  }

  public requestVerification() : string {
    const requestId : string = this.pendingVerificationRequestId === null ? uuid() : this.pendingVerificationRequestId;
    this.dispatch(this.id, new AuthenticationVerificationRequestedEvent(requestId));
    return requestId;
  }

  public authenticate(credentials : Credentials, authenticator : Authenticator) : Promise<AuthenticationResult> {
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
                new AuthenticationSucceededEvent(result.username, result.role)
              );
              if(this.pendingVerificationRequestId !== null && !this.verified) {
                this.dispatch(
                  this.id,
                  new AuthenticationVerificationSucceededEvent(this.pendingVerificationRequestId, result.username, result.role)
                );
              }
              resolve(result);
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

export class Registration extends Entity {

  private registered : boolean = false;

  constructor(id : string) {
    super(id, Entity.CONFIG((self : Registration, event : EntityEvent) : void => {
      if (event instanceof AuthenticationEvent) {
        if (event instanceof IdentityRegisteredEvent) {
          self.registered = true;
        }
      }
    }));
  }

  public register(password : string,
                  firstName : string,
                  lastName : string,
                  phoneNumber : string,
                  role : string,
                  memorableWord : string) : void {
    if (!this.registered) {
      this.dispatch(this.id,
        new IdentityRegisteredEvent(this.id, password, firstName, lastName, phoneNumber, role, memorableWord));
    }
  }

}
