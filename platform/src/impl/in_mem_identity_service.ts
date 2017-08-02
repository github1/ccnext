import { IdentityService, IdentityVO} from '../core/identity_service';

export class InMemoryIdentityService implements IdentityService {
  public authenticate(username : string, password : string) : Promise<IdentityVO> {
    if ([username, password]
        .filter((value : string) : boolean => typeof value === undefined
          || value.trim().length === 0).length > 0) {
      return Promise.reject(new Error('Invalid request'));
    }
    return Promise.resolve(new IdentityVO(username));
  }
}
