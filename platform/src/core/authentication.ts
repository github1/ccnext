import { uuid } from './entity/entity';

export interface AuthenticationResult {
  username : string;
  role : string;
  success? : boolean;
}

export interface Authenticator {
  authenticateUsernamePassword(username : string, password : string) : Promise<AuthenticationResult>;
}

export abstract class Credentials {
  private internalSessionId : string;

  constructor(sessionId? : string) {
    this.internalSessionId = sessionId || uuid();
  }

  public sessionId() : string {
    return this.internalSessionId;
  }

  public abstract authenticate(authenticator : Authenticator) : Promise<AuthenticationResult>;
}

export class AnonymousCredentials extends Credentials {
  constructor() {
    super();
  }

  public authenticate() : Promise<AuthenticationResult> {
    return Promise.resolve({
      username: 'visitor',
      role: 'visitor',
      success: true
    });
  }
}

export class UsernamePasswordCredentials extends Credentials {
  private username : string;
  private password : string;

  constructor(username : string, password : string, sessionId? : string) {
    super(sessionId);
    this.username = username;
    this.password = password;
  }

  public authenticate(authenticator : Authenticator) : Promise<AuthenticationResult> {
    return authenticator.authenticateUsernamePassword(this.username, this.password);
  }
}
