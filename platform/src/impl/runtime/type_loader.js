import * as walk from 'walk';
import * as fs from 'fs';
import * as path from 'path';

const types = {};
const loaded = {};

export const typeLoader = (typeName, callback) => {
  if (types.hasOwnProperty(typeName)) {
    callback(null, types[typeName]);
  } else {
    walk.walk(path.resolve(__dirname + '/../../../src/core'))
      .on('file', (root, fileStats, next) => {
        if (/\.(js|ts)$/.test(fileStats.name)) {
          const fullpath = path.join(root, fileStats.name);
          fs.readFile(fullpath, (err, data) => {
            if (err) {
              callback(err);
            } else {
              if (data.toString().indexOf(`class ${typeName}`) > -1) {
                if (!loaded.hasOwnProperty(fullpath)) {
                  loaded[fullpath] = require(fullpath);
                }
                if (!types.hasOwnProperty(typeName)) {
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
        callback(null, types[typeName]);
      });
  }
};

export const createInstanceFromJson = (objType, json) => {
  json = typeof json === 'string' ? JSON.parse(json) : json;
  try {
    const newObj = new objType();
    for (const prop in json) {
      if (json.hasOwnProperty(prop)) {
        newObj[prop] = json[prop];
      }
    }
    return newObj;
  } finally {
    // nothing
  }
};

export const resolveInstanceFromJson = (json, stack) => {
  if(!stack) {
    stack = [];
    json = typeof json === 'string' ? JSON.parse(json) : json;
    const parent = { resolved: json };
    stack.push({ parent: parent, field : 'resolved' });
    return resolveInstanceFromJson(json, stack);
  } else if(stack.length === 0) {
    return Promise.resolve(json.resolved);
  }
  const childTypes = Object.keys(json).filter((key) => {
    return json[key] && (json[key].constructor.name === 'Object' && json[key].hasOwnProperty('typeNameMetaData'));
  });
  if (childTypes.length > 0) {
    return Promise.all(childTypes.map(key => {
      return resolveInstanceFromJson(json[key], stack.concat([{ parent: json, field: key }]));
    })).then((results) => {
      return results[0];
    });
  } else {
    const typeNameMetaData = json.typeNameMetaData;
    if (typeNameMetaData) {
      return new Promise((resolve, reject) => {
        typeLoader(typeNameMetaData, (err, type) => {
          if(err)  {
            reject(err);
          } else {
            const rel = stack.pop();
            try {
              rel.parent[rel.field] = createInstanceFromJson(type, json);
              resolve(resolveInstanceFromJson(rel.parent, stack));
            } catch (err) {
              reject(err);
            }
          }
        });
      });
    } else {
      return Promise.resolve(json);
    }
  }
};
