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
    // do nothing
  }
  return {username: 'visitor', role: 'visitor'};
};

const storeUserToken = (token) => {
  fallbackStorage.setItem('user-token', token);
  return jwts.decode(token, null, true);
};

export const authenticateAnonymous = () => {
  return ajax({
    url: '/api/authenticate',
    method: 'post',
    data: {}
  }).then(res => storeUserToken(res.token));
};

export const authenticate = (username, password) => {
  return ajax({
    url: '/api/authenticate',
    method: 'post',
    data: {username: username, password: password}
  }).then(res => storeUserToken(res.token));
};

export const requestIdentityVerification = (identityId) => {
  return ajax({
    url: `/api/verification/${identityId}`,
    method: 'post'
  });
};

export const profile = () => {
  return ajax({
    url: '/api/profile',
    method: 'get'
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


