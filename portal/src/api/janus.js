import ajax from './ajax';

export const getRegistrationToken = () => {
  return ajax({
    url: '/registrationtoken',
    method: 'get'
  }).then((result) => {
    return result.token;
  });
};

/*eslint-disable */
let started = false;
const calls = {};
export const initSIPPhone = (opts) => {
  Janus.init({
    debug: "all", callback: () => {
      if (started) {
        return;
      }
      started = true;
      const opaqueId = `session-${Janus.randomString(12)}`;
      if (!Janus.isWebrtcSupported()) {
        if (opts.onNotSupported) {
          opts.onNotSupported();
        }
      } else {
        if (opts.onInitSuccess) {
          opts.onInitSuccess({
            register: (identity, domain, secret) => {
              register(opts.server, opaqueId, identity, domain, secret, (incomingCall) => {
                const callId = incomingCall.id;
                calls[callId] = incomingCall;
                if (opts.onCallReceived) {
                  opts.onCallReceived(callId);
                }
              }, () => {
                if (opts.onCallAccepted) {
                  opts.onCallAccepted();
                }
              }, () => {
                if (opts.onCallHungUp) {
                  opts.onCallHungUp();
                }
              });
            }
          });
        }
      }
    }
  });
};

export const declineSIPCall = (callId) => {
  if (calls[callId]) {
    calls[callId].decline();
  }
};

export const answerSIPCall = (callId) => {
  if (calls[callId]) {
    calls[callId].answer();
  }
};

export const hangUpSIPCall = (callId) => {
  if (calls[callId]) {
    calls[callId].hangup();
  }
};

const register = (server, opaqueId, identity, domain, secret, onCallReceived, onCallAccepted, onCallHungUp) => {
  const registration = {
    "request": "register",
    "username": `sip:${identity}@${domain}`,
    "proxy": `sip:${domain}`,
    "display_name": identity,
    "secret": secret,
    "authuser": identity
  };
  let janus, sipcall, registered;
  const doHangUp = (sipcall) => {
    return () => {
      sipcall.send({"message": {"request": "hangup"}});
      sipcall.hangup();
    };
  };
  return janus = new Janus(
    {
      server: server,
      success: function () {
        // Attach to echo test plugin
        janus.attach(
          {
            plugin: "janus.plugin.sip",
            opaqueId: opaqueId,
            success: function (pluginHandle) {
              sipcall = pluginHandle;
              Janus.debug("Plugin attached! (" + sipcall.getPlugin() + ", id=" + sipcall.getId() + ")");
              sipcall.send({message: registration});
              //janus.destroy();
            },
            error: function (error) {
              Janus.debug("  -- Error attaching plugin...", error);
            },
            consentDialog: function (on) {
              Janus.debug("Consent dialog should be " + (on ? "on" : "off") + " now");
            },
            onmessage: function (msg, jsep) {
              Janus.debug(" ::: Got a message :::");
              Janus.debug('msg', msg);
              Janus.debug('jsep', jsep);
              // Any error?
              var error = msg["error"];
              if (error != null && error != undefined) {
                if (!registered) {
                  Janus.debug('not registered');
                } else {
                  // Reset status
                  sipcall.hangup();
                }
                return;
              }
              var result = msg["result"];
              if (result !== null && result !== undefined && result["event"] !== undefined && result["event"] !== null) {
                var event = result["event"];
                if (event === 'registration_failed') {
                  Janus.debug("Registration failed: " + result["code"] + " " + result["reason"]);
                  return;
                }
                if (event === 'registered') {
                  Janus.debug("Successfully registered as " + result["username"] + "!");
                  // TODO Enable buttons to call now
                  if (!registered) {
                    registered = true;
                  }
                } else if (event === 'calling') {
                  Janus.debug("Waiting for the peer to answer...");
                  // TODO Any ringtone?
                } else if (event === 'incomingcall') {
                  Janus.debug("Incoming call from " + result["username"] + "!");
                  var doAudio = true, doVideo = true;
                  var offerlessInvite = false;
                  if (jsep !== null && jsep !== undefined) {
                    Janus.debug('jsep', jsep.sdp);
                    // What has been negotiated?
                    doAudio = (jsep.sdp.indexOf("m=audio ") > -1);
                    doVideo = (jsep.sdp.indexOf("m=video ") > -1);
                    Janus.debug("Audio " + (doAudio ? "has" : "has NOT") + " been negotiated");
                    Janus.debug("Video " + (doVideo ? "has" : "has NOT") + " been negotiated");
                  } else {
                    Janus.debug("This call doesn't contain an offer... we'll need to provide one ourselves");
                    offerlessInvite = true;
                    // In case you want to offer video when reacting to an offerless call, set this to true
                    doVideo = false;
                  }
                  const doAnswer = (jsep, sipcall) => {
                    return () => {
                      //$('#peer').val(result["username"]).attr('disabled', true);
                      // Notice that we can only answer if we got an offer: if this was
                      // an offerless call, we'll need to create an offer ourselves
                      var sipcallAction = (offerlessInvite ? sipcall.createOffer : sipcall.createAnswer);
                      sipcallAction(
                        {
                          jsep: jsep,
                          media: {audio: doAudio, video: doVideo},
                          success: (jsep) => {
                            Janus.debug("Got SDP " + jsep.type + "! audio=" + doAudio + ", video=" + doVideo);
                            Janus.debug(jsep);
                            var body = {request: "accept"};
                            sipcall.send({"message": body, "jsep": jsep});
                          },
                          error: (error) => {
                            Janus.debug("WebRTC error:", error);
                            // Don't keep the caller waiting any longer, but use a 480 instead of the default 486 to clarify the cause
                            var body = {"request": "decline", "code": 480};
                            sipcall.send({"message": body});
                          }
                        });
                    };
                  };

                  const doDecline = (sipcall) => {
                    return () => {
                      var body = {"request": "decline"};
                      sipcall.send({"message": body});
                    };
                  };

                  onCallReceived({
                    id: `call-${Janus.randomString(12)}`,
                    answer: doAnswer(jsep, sipcall),
                    decline: doDecline(sipcall),
                    hangup: doHangUp(sipcall)
                  });

                } else if (event === 'accepting') {
                  // Response to an offerless INVITE, let's wait for an 'accepted'
                } else if (event === 'progress') {
                  Janus.debug("There's early media from " + result["username"] + ", wairing for the call!");
                  Janus.debug(jsep);
                  // Call can start already: handle the remote answer
                  if (jsep !== null && jsep !== undefined) {
                    sipcall.handleRemoteJsep({
                      jsep: jsep,
                      error: doHangUp(sipcall)
                    });
                  }
                } else if (event === 'accepted') {
                  Janus.debug(result["username"] + " accepted the call!", result);
                  Janus.debug(jsep);
                  onCallAccepted();
                  // Call can start, now: handle the remote answer
                  if (jsep !== null && jsep !== undefined) {
                    sipcall.handleRemoteJsep({
                      jsep: jsep,
                      error: doHangUp(sipcall)
                    });
                  }
                } else if (event === 'hangup') {
                  Janus.debug("Call hung up (" + result["code"] + " " + result["reason"] + ")!");
                  sipcall.hangup();
                  onCallHungUp();
                }
              }
            },
            onlocalstream: function (stream) {
              Janus.debug(" ::: Got a local stream :::");
              Janus.debug(stream);
              $('#videos').removeClass('hide').show();
              if ($('#myvideo').length === 0) {
                $('#videoleft').append('<video class="rounded centered" id="myvideo" width=320 height=240 autoplay muted="muted"/>');
              }
              Janus.attachMediaStream($('#myvideo').get(0), stream);
              $("#myvideo").get(0).muted = "muted";
              // No remote video yet
              $('#videoright').append('<video class="rounded centered" id="waitingvideo" width=320 height=240 />');

              let videoTracks = stream.getVideoTracks();
              if (videoTracks === null || videoTracks === undefined || videoTracks.length === 0) {
                // No webcam
                $('#myvideo').hide();
                $('#videoleft').append(
                  '<div class="no-video-container">' +
                  '<i class="fa fa-video-camera fa-5 no-video-icon"></i>' +
                  '<span class="no-video-text">No webcam available</span>' +
                  '</div>');
              }
            },
            onremotestream: function (stream) {
              Janus.debug(" ::: Got a remote stream :::");
              Janus.debug(stream);
              if ($('#remotevideo').length > 0) {
                let videoTracks = stream.getVideoTracks();
                if (videoTracks && videoTracks.length > 0 && !videoTracks[0].muted) {
                  $('#novideo').remove();
                  if ($("#remotevideo").get(0).videoWidth) {
                    $('#remotevideo').show();
                  }
                }
                return;
              }
              // Show the peer and hide the spinner when we get a playing event
              $("#remotevideo").bind("playing", function () {
                $('#waitingvideo').remove();
                if (this.videoWidth) {
                  $('#remotevideo').removeClass('hide').show();
                }
              });
              Janus.attachMediaStream($('#remotevideo').get(0), stream);
              var videoTracks = stream.getVideoTracks();
              if (videoTracks === null || videoTracks === undefined || videoTracks.length === 0 || videoTracks[0].muted) {
                $('#remotevideo').hide();
                $('#videoright').append(
                  '<div id="novideo" class="no-video-container">' +
                  '<i class="fa fa-video-camera fa-5 no-video-icon"></i>' +
                  '<span class="no-video-text">No remote video available</span>' +
                  '</div>');
              }
            },
            oncleanup: function () {
              Janus.debug(" ::: Got a cleanup notification :::");
            }
          });
      },
      error: function (error) {
        Janus.debug(error);
      },
      destroyed: function () {
        Janus.debug('unregistered');
      }
    });
};
