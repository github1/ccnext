import * as normalizeUrl from 'normalize-url';
const twilio = require('twilio');

/**
 * Builds a service integration for twilio hooks
 *
 * @param {string} baseUrl
 * @param {string} contextPath
 * @param {string} phoneNumberSid
 * @param {string} accountSid
 * @param {string} authToken
 * @param {ChatProvider} chatProvider
 * @returns {object} server configurator
 */
export default (baseUrl,
                contextPath,
                phoneNumberSid,
                accountSid,
                authToken,
                chatProvider) => {


  const twilioClient = twilio(accountSid, authToken);

  return {

    // Define twilio webhook endpoints
    preConfigure(server) {

      server.use(function (req, res, next) {
        if (req.path.indexOf(contextPath) === 0) {
          // validate the x-twilio-signature header
          if (twilio.validateExpressRequest(req, authToken, {
              protocol: req.headers['x-forwarded-proto']
            })) {
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
            chatProvider.getChat("OrderFlowers").send({
                dialogCorrelationId: req.body.From.replace(/[^0-9a-z._:-]+/i, '_'),
                message: req.body.Body
              })
              .then(response => {
                // @TODO - factor fulfillment code out
                if(response.state === 'ReadyForFulfillment') {
                  res.send(`<Response><Sms>Your order has been placed.</Sms></Response>`);
                } else {
                  res.send(`<Response><Sms>${response.message}</Sms></Response>`);
                }
              })
              .catch(error => {
                console.log(error);
                res.send(`<Response><Sms>${error.message}</Sms></Response>`);
              });
            break;
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
        });

    }

  };
};
