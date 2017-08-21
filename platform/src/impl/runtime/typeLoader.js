import * as walk from 'walk';
import * as fs from 'fs';
import * as path from 'path';

const types = {};
const loaded = {};

export const typeLoader = (typeName, callback) => {
  if (types.hasOwnProperty(typeName)) {
    callback(types[typeName]);
  } else {
    walk.walk(path.resolve(__dirname + '/../../../src/core'))
      .on('file', (root, fileStats, next) => {
        if (/\.js$/.test(fileStats.name)) {
          const fullpath = path.join(root, fileStats.name);
          fs.readFile(fullpath, (err, data) => {
            if (err) {
              console.error(err);
            } else {
              if (data.toString().indexOf(`class ${typeName}`) > -1) {
                if (!loaded.hasOwnProperty(fullpath)) {
                  loaded[fullpath] = require(fullpath);
                }
                if(!types.hasOwnProperty(typeName)) {
                  types[typeName] = loaded[fullpath][typeName];
                }
              }
            }
            next();
          });
        } else {
          next();
        }
      })
      .on('end', () => {
        callback(types[typeName]);
      });
  }
};

export const createInstanceFromJson = (objType, json) => {
  try {
    const newObj = new objType();
    json = typeof json === 'string' ? JSON.parse(json) : json;
    for (const prop in json) {
      if (json.hasOwnProperty(prop)) {
        newObj[prop] = json[prop];
      }
    }
    return newObj;
  } catch (err) {
    console.error(err, objType, json);
  }
};
