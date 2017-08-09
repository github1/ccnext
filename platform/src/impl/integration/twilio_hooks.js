import * as normalizeUrl from 'normalize-url';
import * as uuid from 'uuid';
const cookieParser = require('cookie-parser');
const twilio = require('twilio');

/**
 * Builds a service integration for twilio hooks
 *
 * @param {string} baseUrl
 * @param {string} contextPath
 * @param {string} phoneNumberSid
 * @param {string} accountSid
 * @param {string} authToken
 * @param {ChatService} chatService
 * @param {EventBus} eventBus
 * @returns {object} server configurator
 */
export default (baseUrl, contextPath, phoneNumberSid, accountSid, authToken, chatService, eventBus) => {

  const twilioClient = twilio(accountSid, authToken);

  const twilioContext = {
    chats: {}
  };

  const refreshChatContext = (event) => {
    twilioContext.chats[event.stream] = twilioContext.chats[event.stream] || {};
    twilioContext.chats[event.stream].isIncoming = false;
    if ((event.payload.source || '').indexOf('sms-incoming::') === 0) {
      twilioContext.chats[event.stream].isIncoming = true;
      twilioContext.chats[event.stream].incoming = event.payload.source;
      twilioContext.chats[event.stream].incomingNumber = (twilioContext.chats[event.stream].incoming + '').split(/::/)[1];
    }
    return twilioContext.chats[event.stream];
  };

  // Reply to chat messages with sms
  eventBus.subscribe((event) => {
    if (event.name === 'ChatMessagePostedEvent') {
      const chatContext = refreshChatContext(event);
      if (!chatContext.isIncoming && chatContext.incomingNumber) {
        twilioClient.messages.create({
          to: chatContext.incomingNumber,
          from: twilioContext.phoneNumber,
          body: event.payload.text
        });
      }
    } else if (event.name === 'ChatEndedEvent') {
      delete twilioContext.chats[event.stream];
    }
  });

  return {

    // Define twilio webhook endpoints
    preConfigure(server) {

      server.use(cookieParser());

      server.use(function (req, res, next) {
        if (req.path.indexOf(contextPath) === 0) {
          // validate the x-twilio-signature header
          if (twilio.validateExpressRequest(req, authToken, {protocol: req.headers['x-forwarded-proto']})) {
            next();
          } else {
            res
              .status(403)
              .type('text/plain')
              .send('Invalid signature!');
          }
        } else {
          next();
        }
      });

      server.post(`${contextPath}/:channel`, (req, res) => {
        res
          .type('text/xml');
        switch (req.params.channel) {
          case 'sms':
          {
            const source = `sms-incoming::${req.body.From}`;
            const text = req.body.Body;
            let chatId = req.cookies['x-conversation-id'];
            if (!req.cookies['x-conversation-id']) {
              res.cookie('x-conversation-id', chatId = uuid.v4());
            }
            chatService
              .postMessage(chatId, source, text);
            res.send('<Response></Response>');
            break;
          }
          case 'voice':
            res.send(new twilio.twiml.VoiceResponse()
              .say({}, 'Not configured')
              .toString());
            break;
          default:
            res.status(404);
            break;
        }
      });

    },

    // Update the voiceURLs on the provided phoneNumberSid
    // after the service has started.
    postConfigure() {
      return twilioClient
        .incomingPhoneNumbers(phoneNumberSid)
        .update({
          voiceUrl: normalizeUrl(`${baseUrl}/${contextPath}/voice`),
          voiceMethod: 'POST',
          smsUrl: normalizeUrl(`${baseUrl}/${contextPath}/sms`),
          smsMethod: 'POST'
        }, (err, data) => {
          twilioContext.phoneNumber = data.phoneNumber;
          console.log('Using twilio phoneNumber:', twilioContext.phoneNumber);
        });
    }

  };
};
