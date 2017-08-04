const putSlot = (lexmodelbuildingservice, params) => {
  let getParams = {
    version: "$LATEST",
    name: params.name
  };
  console.log(`Checking if ${params.name} already exists`);
  return new Promise((resolve, reject) => {
    lexmodelbuildingservice.getSlotType(getParams, function(err, data) {
     if (err) {
       console.log(`${params.name} does not exist, attempting to create the slot`)
       lexmodelbuildingservice.putSlotType(params, function(err, data) {
         if (err) {
           console.log(err, err.stack);
           reject();
         } else {
           console.log(`Slot successfully created`);
           console.log(data);
           resolve();
         }  // successful response
       });
     } else {
       console.log(`Updating the "$LATEST" version of ${params.name}`);
       params.checksum = data.checksum;
       lexmodelbuildingservice.putSlotType(params, function(err, data) {
         if (err) {
           console.log(err, err.stack);
           reject();
         } else {
           publishParams = {name: params.name, checksum: data.checksum};
           lexmodelbuildingservice.createSlotTypeVersion(publishParams, function(err, data) {
             if (err) {
               console.log(err, err.stack);
               reject();
             }
             else {
               console.log(data);
               resolve();
             }
           });
         };           // successful response
       });
     }
   });
  });
};

const putIntent = (lexmodelbuildingservice, params) => {
  let getParams = {
    version: "$LATEST",
    name: params.name
  };
  console.log(getParams);
  console.log(`Checking if ${params.name} already exists`);
  return new Promise((resolve,reject) => {
    lexmodelbuildingservice.getIntent(getParams, function(err, data) {
     if (err) {
       //console.log(err, err.stack)
       console.log(`${params.name} does not exist, attempting to create the intent`)
       lexmodelbuildingservice.putIntent(params, function(err, data) {
         if (err) {
           console.log(err, err.stack);
           reject();
         } else {
           console.log(`Intent successfully created`);
           console.log(data);
           resolve();
         }
       });
     } else {
       console.log(`Updating the "$LATEST" version of ${params.name}`);
       params.checksum = data.checksum;
       lexmodelbuildingservice.putIntent(params, function(err, data) {
         if (err) {
           console.log(err, err.stack);
           reject();
         } else {
           publishParams = {name: params.name, checksum: data.checksum};
           lexmodelbuildingservice.createIntentVersion(publishParams, function(err, data) {
             if (err) {
               console.log(err, err.stack);
               reject();
             }
             else {
               console.log(data);
               resolve();
             }
           });
         };                     // successful response
       });
     }
   });
 });
};

const putBot = (lexmodelbuildingservice, params) => {
  let getParams = {
    version: "$LATEST",
    name: params.name
  };
  console.log(getParams);
  console.log(`Checking if ${params.name} already exists`);
  return new Promise((resolve, reject) => {
    lexmodelbuildingservice.getBot(getParams, function(err, data) {
     if (err) {
       console.log(`${params.name} does not exist, attempting to create the Bot`)
       lexmodelbuildingservice.putBot(params, function(err, data) {
         if (err) {
           console.log(err, err.stack);
           reject();
         } else {
           console.log(`Bot successfully created`);
           console.log(data);
           resolve();
         }
       });
     } else {
       console.log(`Updating the "$LATEST" version of ${params.name}`);
       params.checksum = data.checksum;
       lexmodelbuildingservice.putBot(params, function(err, data) {
         if (err) {
           console.log(err, err.stack);
           reject();
         }
         else {
           publishParams = {name: params.name, checksum: data.checksum};
           lexmodelbuildingservice.createBotVersion(publishParams, function(err, data) {
             if (err) {
               console.log(err, err.stack);
               reject();
             } else {
               console.log(data);
               resolve();
             }
           });
         };
       });
     }
   });
  })
};

module.exports.putSlot = putSlot;
module.exports.putIntent = putIntent;
module.exports.putBot = putBot;
