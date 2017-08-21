const getResource = (lexmodelbuildingservice, resourceType, params, opts) => {
  opts = opts || {};
  const getParams = (opts.processOnGet || ((params) => {
    return {
      name: params.name,
      version: '$LATEST'
    };
  }))(params);
  const resourceMethodName = resourceType.substring(0, 1).toUpperCase() + resourceType.substring(1);
  return new Promise((resolve, reject) => {
    lexmodelbuildingservice[`get${resourceMethodName}`](getParams, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const putResource = (lexmodelbuildingservice, lexmodel, resourceType, params, opts) => {
  opts = opts || {};
  opts.processOnCreate = opts.processOnCreate || ((params) => params);
  opts.processOnUpdate = opts.processOnUpdate || ((params, data) => { params.checksum = data.checksum; return params; });
  const resourceMethodName = resourceType.substring(0, 1).toUpperCase() + resourceType.substring(1);
  console.log(`Checking if ${resourceType} ${params.name} already exists`);
  return getResource(lexmodelbuildingservice, resourceType, params, opts).then((data) => {
    if (data.version) {
      console.log(`Updating the "${data.version}" version of ${resourceType} ${params.name}`);
    } else {
      console.log(`Updating ${resourceType} ${params.name}`);
    }
    params = opts.processOnUpdate(params, data);
  }).catch((err) => {
    if (err.name === 'NotFoundException') {
      console.log(`${params.name} does not exist, attempting to create the ${resourceType}`);
      params = opts.processOnCreate(params);
    } else {
      throw err;
    }
  }).then(() => {
    return new Promise((resolve, reject) => {
      lexmodelbuildingservice[`put${resourceMethodName}`](params, function (err, data) {
        if (err) {
          reject(err);
        } else {
          if (resourceType === 'botAlias') {
            resolve(data);
          } else {
            const publishParams = {name: params.name, checksum: data.checksum};
            lexmodelbuildingservice[`create${resourceMethodName}Version`](publishParams, function (err, data) {
              if (err) {
                reject(err);
              }
              else {
                lexmodel[resourceType] = lexmodel[resourceType] || {};
                lexmodel[resourceType][params.name] = data;
                resolve(data);
              }
            });
          }
        }
      });
    });
  });
};

const untilBotReady = (lexmodelbuildingservice, name, version) => {
  let times = 120;
  return new Promise((resolve, reject) => {
    const checkStatus = () => {
      getResource(lexmodelbuildingservice, 'bot', {}, {
        processOnGet: () => {
          return {
            name: name,
            versionOrAlias: version
          };
        }
      }).then((data) => {
        times--;
        console.log(`Bot status: ${data.status}`);
        if (data.status !== 'READY') {
          if (times === 0) {
            reject(new Error('Timeout waiting for bot to be ready'));
          } else {
            if(data.status === 'FAILED') {
              reject(new Error(data.failureReason));
            } else {
              setTimeout(checkStatus, 1000);
            }
          }
        } else {
          resolve(data);
        }
      }).catch((err) => {
        reject(err);
      });
    };
    checkStatus();
  });
};

const putSlot = (lexmodelbuildingservice, lexmodel, params) => {
  return putResource(lexmodelbuildingservice, lexmodel, 'slotType', params);
};

const putIntent = (lexmodelbuildingservice, lexmodel, params) => {
  params.slots.forEach((slot) => {
    if (lexmodel.slotType[slot.slotType]) {
      slot.slotTypeVersion = lexmodel.slotType[slot.slotType].version;
    }
  });
  return putResource(lexmodelbuildingservice, lexmodel, 'intent', params);
};

const putBot = (lexmodelbuildingservice, lexmodel, params) => {
  params.intents.forEach((intent) => {
    if (lexmodel.intent[intent.intentName]) {
      intent.intentVersion = lexmodel.intent[intent.intentName].version;
    }
  });
  return putResource(lexmodelbuildingservice, lexmodel, 'bot', params, {
    processOnGet: (params) => {
      return {
        name: params.name,
        versionOrAlias: "$LATEST"
      };
    }
  });
};

const putBotAlias = (lexmodelbuildingservice, lexmodel, params) => {
  return untilBotReady(
    lexmodelbuildingservice,
    lexmodel.bot[params.botName].name,
    lexmodel.bot[params.botName].version).then(() => {
    return putResource(lexmodelbuildingservice, lexmodel, 'botAlias', params, {
      processOnGet: (params) => {
        return {
          botName: params.botName,
          name: params.name
        };
      },
      processOnCreate: (params) => {
        params.botVersion = lexmodel.bot[params.botName].version;
        params.checksum = lexmodel.bot[params.botName].checksum;
        return params;
      },
      processOnUpdate: (params, data) => {
        params.botVersion = lexmodel.bot[params.botName].version;
        params.checksum = data.checksum;
        return params;
      }
    });
  });
};

module.exports.putSlot = putSlot;
module.exports.putIntent = putIntent;
module.exports.putBot = putBot;
module.exports.putBotAlias = putBotAlias;
