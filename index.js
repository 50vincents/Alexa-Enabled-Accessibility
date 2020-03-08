const express = require('express');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk')
const port = process.env.PORT || 3000;
const app = express();

const awsConfig = require("./config")

AWS.config.update({
  region: "us-east-1",
  endpoint: "https://dynamodb.us-east-1.amazonaws.com",
  accessKeyId: awsConfig.accessKey,
  secretAccessKey: awsConfig.secretKey,
});

const docClient = new AWS.DynamoDB.DocumentClient();

function addToDb(frequency) {
    const table = "frequencies";
    const params = {
        TableName:table,
        Item:{
            "frequency_level": frequency,
        }
    };
    
    docClient.put(params, function(err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Added item:", JSON.stringify(data, null, 2));
        }
    });
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
      const speakOutput = 'Welcome. Which device would you like to set up?';
   
      return handlerInput.responseBuilder
          .speak(speakOutput)
          .getResponse();
  }
};

// Gets the device and location of device to set up
const SetUpDeviceIntentHandler = {
  canHandle(handlerInput) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
          && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetUpDeviceIntent';
  },
  handle(handlerInput) {
      const device = handlerInput.requestEnvelope.request.intent.slots.device.value;
      const location = handlerInput.requestEnvelope.request.intent.slots.location.value;

      const speakOutput = `Great, let's set up your ${location} ${device}. Aim the remote at the IR device and press any button.`;      
      const repromptOutput = `Please aim the remote at the IR device.`;

      return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
  }
};

// Handler should take in IR frequency and store in DynamoDB
const SetUpIRFrequencyIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetUpIRFrequencyIntent';
      },
      handle(handlerInput) {
          const frequency = handlerInput.requestEnvelope.request.intent.slots.frequency.value;
          addToDb(frequency);

          const speakOutput = `Got it, what does this button do?`;      
          const repromptOutput = `What action should this button do?`;
    
          return handlerInput.responseBuilder
              .speak(speakOutput)
              .reprompt(repromptOutput)
              .getResponse();
      }
};

// Should take in action of specified button and prompt user for more actions
const SetUpActionIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
        && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetUpActionIntent';
  },
  handle(handlerInput) {
      const speakOutput = `Understood, would you like to set up more actions?`;      
      //const repromptOutput = handlerInput.t('WELCOME_REPROMPT_MSG');

      return handlerInput.responseBuilder
          .speak(speakOutput)
        // .reprompt(repromptOutput)
          .getResponse();
  }
};

/**
 * Handles AMAZON.HelpIntent requests sent by Alexa 
 * Note : this request is sent when the user makes a request that corresponds to AMAZON.HelpIntent intent defined in your intent schema.
 */
const HelpIntentHandler = {
  canHandle(handlerInput) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
          && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
      const speakOutput = handlerInput.t('HELP_MSG');

      return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(speakOutput)
          .getResponse();
  }
};

/**
 * Handles AMAZON.CancelIntent & AMAZON.StopIntent requests sent by Alexa 
 * Note : this request is sent when the user makes a request that corresponds to AMAZON.CancelIntent & AMAZON.StopIntent intents defined in your intent schema.
 */
const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
          && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
              || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
      const speakOutput = handlerInput.t('GOODBYE_MSG');

      return handlerInput.responseBuilder
          .speak(speakOutput)
          .getResponse();
  }
};

/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
      // Any cleanup logic goes here.
      return handlerInput.responseBuilder.getResponse();
  }
};

/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
  canHandle(handlerInput) {
      return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  handle(handlerInput) {
      const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
      const speakOutput = handlerInput.t('REFLECTOR_MSG', { intentName: intentName });

      return handlerInput.responseBuilder
          .speak(speakOutput)
          //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
          .getResponse();
  }
};

/**
* Generic error handling to capture any syntax or routing errors. If you receive an error
* stating the request handler chain is not found, you have not implemented a handler for
* the intent being invoked or included it in the skill builder below 
* */
const ErrorHandler = {
  canHandle() {
      return true;
  },
  handle(handlerInput, error) {
      console.log(`~~~~ Error handled: ${error.message}`);
      const speakOutput = handlerInput.t('ERROR_MSG');

      return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(speakOutput)
          .getResponse();
  }
};

// ExpressAdapter class registers skill instance from SkillBuilder object
// Also provides getRequestHandlers method that returns an array of request handler which can be registered to Express app
const skillBuilder = Alexa.SkillBuilders.custom();
skillBuilder
    .addRequestHandlers(
        LaunchRequestHandler,
        SetUpDeviceIntentHandler,
        SetUpActionIntentHandler,
        SetUpIRFrequencyIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .lambda();

const skill = skillBuilder.create();
const adapter = new ExpressAdapter(skill, true, true);

app.post('/', adapter.getRequestHandlers());
app.listen(port);