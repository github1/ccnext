import { uuid } from 'ddd-es-node';

export interface AuthenticationResult {
  username : string;
  role : string;
  success? : boolean;
}

export interface Authenticator {
  authenticateUsernamePassword(username : string, password : string) : Promise<AuthenticationResult>;
  authenticateMemorableWord(username : string, positionsRequested : number[], positionChars : string[]) : Promise<AuthenticationResult>;
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

export class MemorableWordCredentials extends Credentials {
  private username : string;
  private positionsRequested : number[];
  private positionChars : string[];

  constructor(username : string, positionsRequested : number[], positionChars : string[], sessionId? : string) {
    super(sessionId);
    this.username = username;
    this.positionsRequested = positionsRequested;
    this.positionChars = positionChars;
  }

  public authenticate(authenticator : Authenticator) : Promise<AuthenticationResult> {
    return authenticator.authenticateMemorableWord(this.username, this.positionsRequested, this.positionChars);
  }
}
