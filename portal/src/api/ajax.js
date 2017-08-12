import reqwest from 'reqwest';

const ajax = (opts) => {
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
