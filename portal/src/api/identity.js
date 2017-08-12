import jwts from 'jwt-simple';
import ajax from './ajax';
import { fallbackStorage } from './../browser_utils';

export const jwt = () => {
  return fallbackStorage.getItem('user-token');
};

export const identity = () => {
  try {
    const token = fallbackStorage.getItem('user-token');
    if (token) {
      return jwts.decode(token, null, true);
    }
  } finally {
  }
  return {username: 'visitor', role: 'visitor', invalid: true};
};

export const authenticate = (username, password) => {
  return ajax({
    url: '/api/authenticate',
    method: 'post',
    data: {username: username, password: password}
  }).then((res) => {
    fallbackStorage.setItem('user-token', res.token);
    return jwts.decode(res.token, null, true);
  });
};

export const signout = () => {
  fallbackStorage.removeItem('user-token');
};

export const register = (registration) => {
  return ajax({
    url: '/api/register',
    method: 'post',
    data: registration
  });
};


