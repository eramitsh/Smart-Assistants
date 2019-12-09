'use strict';
const functions = require('firebase-functions');
const {smarthome} = require('actions-on-google');
const {google} = require('googleapis');
const util = require('util');
const admin = require('firebase-admin');
const axios = require('axios');
const Client = require('node-rest-client').Client
// Initialize Firebase
admin.initializeApp();
const firebaseRef = admin.database().ref('/');
// Initialize Homegraph
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/homegraph']
});
const homegraph = google.homegraph({
  version: 'v1',
  auth: auth
});
const app = smarthome({
  debug: true,
});

app.onSync((body, headers) => {
  // TODO Get devices for user
  return {
    requestId: body.requestId,
    payload: {
      agentUserId: "1836.15267389",
      devices: [{
        id: "00000300000600010000C44F331657D9",
        type: "action.devices.types.WATERHEATER",
        traits: [
          "action.devices.traits.OnOff",
          "action.devices.traits.TemperatureControl"
        ],
        name: {
          defaultNames: ["Device Monza"],
          name: "Monza geyser",
          nicknames: ["Monza"]
        },
        willReportState: true,
        attributes: {
          temperatureRange: {
            minThresholdCelsius: 10,
            maxThresholdCelsius: 75
          },
          temperatureUnitForUX: 'C'
        },
        roomHint: "Bathroom",
        deviceInfo: {
          manufacturer: "Havells",
          model: "hs1234",
          hwVersion: "3.2",
          swVersion: "11.4"
        },
        otherDeviceIds: [{
          deviceId: "local-device-id"
        }],
        customData: {
          fooValue: 74,
          barValue: true,
          bazValue: "foo"
        }
      }]
    }
  };
});
let device_Data = {payload: {
  devices: {
    '00000300000600010000C44F331657D9':{
      on: true,
      online: true,
      temperatureSetpointCelsius: 177,
      temperatureAmbientCelsius: 150
    }
  }}};
app.onQuery((body, headers) => {
  // TODO Get device state
  return {
    requestId: body.requestId,
    device_Data
    }
  });
function CallturnOnGeyser(deviceId,execution,token){
    let power = (execution.params.on)?"true":"false";
    //console.log(execution.params.temprature);
    var data={  
      "deviceId":deviceId,
      "power":power
   };
var config = {
  headers: {'Authorization': token}
}; 
     if(execution == '' ) {
      temp=execution.params.temperature;
      console.log(temp);
      data["temp"]=temp;
     }

    console.log(data);
  return new Promise((resolve,reject)=>{
    //console.log('in function')
      
     //console.log(config);    
     axios.put('https://azr-dev-fa01.azurewebsites.net/api/deviceControlGeyserMonza?code=PC43/wpxBL58CgWEZNvMVxwR9TAvbQxorWqSGnJAi83aZPyHLmUV2A==', 
     data,config)
     .then(response => {
         
         console.log('in suceess');
         //device_Data.payload.devices.SLALoadTest552.on = execution.params.on;
         resolve('SUCCESS');
     }).catch((error)=>{
      console.error(error);
         resolve('ERROR');
     });
  });
}

app.onExecute(async (body, headers) => {
  // TODO Send command to device
console.log('In Execute');
let token =  headers.authorization;
console.log(token)
const {requestId} = body;
let result = {
  ids: [],
  status: 'SUCCESS',
  states: {
    online: true,
  }
};  
  const executePromises = [];
  const intent = body.inputs[0];
  console.log(intent);
  for (const command of intent.payload.commands) {
    for (const device of command.devices) {
      for (const execution of command.execution) {
        
        executePromises.push(
          CallturnOnGeyser(device.id,execution,token)  // calling device control method
            .then((data) => {
              result.ids.push(device.id);  // adding to result
              Object.assign(result.status, data) // status of method call
              Object.assign(result.states.online, true); // device is offline or online
            })
            .catch(() => console.error(`Unable to update ${device.id}`))
        );
      }
    }
  }

  await Promise.all(executePromises)
  return {
    requestId: requestId,
    payload: {
      commands: [result],
    },
  };
});

app.onDisconnect((body, headers) => {
  // TODO Disconnect user account from Google Assistant
  // You can return an empty body
  return {};
});

exports.smarthome = functions.https.onRequest(app);

exports.requestsync = functions.https.onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  console.info('Request SYNC for user 123');

  // TODO: Call HomeGraph API for user '123'
  response.status(500).send(`Request SYNC not implemented`);
});

/**
 * Send a REPORT STATE call to the homegraph when data for any device id
 * has been changed.
 */
exports.reportstate = functions.database.ref('{deviceId}').onWrite((change, context) => {
  console.info('Firebase write event triggered this cloud function');

  // TODO: Get latest state and call HomeGraph API
});

