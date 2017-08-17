import reqwest from 'reqwest';
import { jwt } from './identity';

const ajax = (opts) => {
  opts = opts || {};
  const token = jwt();
  if(token) {
    opts.headers = opts.headers || {};
    opts.headers.jwt = token;
  }
  return new Promise((resolve, reject) => {
    opts.success = (res) => {
      resolve(res);
    };
    opts.error = (err) => {
      reject(err);
    };
    reqwest(opts);
  });
};

export default ajax;
