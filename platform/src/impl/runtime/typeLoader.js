import * as fs from 'fs';
import * as path from 'path';

const readdirPromise = (dir) => {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, list) => {
      if (err) {
        reject(err);
      } else {
        resolve(list);
      }
    });
  });
};

const statPromise = (file) => {
  return new Promise((resolve, reject) => {
    fs.stat(file, (err, stat) => {
      if (err) {
        reject(err);
      } else {
        resolve(stat);
      }
    });
  });
};


const walk = (dir) => {
  return readdirPromise(dir).then((list) => {
    return Promise.all(list.map((file) => {
      file = path.resolve(dir, file);
      return statPromise(file).then((stat) => {
        if (stat.isDirectory()) {
          return walk(file);
        } else {
          return file;
        }
      });
    }));
  }).then((results) => {
    return Array.prototype.concat.apply([], results);
  });
};

const loaded = {};
const maxOpen = 3;

export const typeLoader = (typeName, callback) => {
  let open = 0;
  if (loaded.hasOwnProperty(typeName)) {
    callback(loaded[typeName]);
    return;
  }
  const dir = path.resolve(__dirname + '/../../../');
  walk(dir)
    .then((results) => {
      return Promise.all(results
        .filter((file) => /\.js$/.test(file))
        .map((file) => {
          return new Promise((resolve) => {
            const read = () => {
              fs.readFile(file, (err, data) => {
                open--;
                if (err) {
                  console.log(file, err);
                }
                resolve({
                  name: file,
                  data: data.toString()
                });
              });
            };
            const tryRead = () => {
              if (open < maxOpen) {
                open++;
                read();
              } else {
                setTimeout(() => tryRead(), 1000);
              }
            };
            tryRead();
          });
        }));
    })
    .then((results) => {
      return results.filter(item => {
        return item.data.indexOf('class ' + typeName + ' ') > -1;
      });
    })
    .then((results) => {
      loaded[typeName] = require(results[0].name)[typeName];
      callback(loaded[typeName]);
    });
};

export const createInstanceFromJson = (objType, json) => {
  const newObj = new objType();
  json = typeof json === 'string' ? JSON.parse(json) : json;
  for (const prop in json) {
    if (json.hasOwnProperty(prop)) {
      newObj[prop] = json[prop];
    }
  }
  return newObj;
};
