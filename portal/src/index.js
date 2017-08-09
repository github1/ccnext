import { render } from 'react-dom';
import jwts from 'jwt-simple';
import reqwest from 'reqwest';
import page from 'page';
import Container from './component/container';
import './style/theme.scss';
import BrowserWebSocket from 'browser-websocket';
import {
  isMobile,
  resetScroll,
  preventZoom,
  fallbackStorage
} from './browser_utils';

import {
  INIT,
  TIME_TICK,
  NAVIGATE,
  NAVIGATION_REQUESTED,
  CLEAR_USER,
  SIGN_IN,
  SIGN_OUT,
  REGISTER_USER,
  USER_REGISTERED,
  AUTHENTICATION_STARTED,
  AUTHENTICATION_FAILED,
  AUTHENTICATION_SUCCESS,
  INIT_CHAT,
  START_CHAT,
  CHAT_STARTED,
  END_CHAT,
  CHAT_ENDED,
  POST_OUTGOING_CHAT_MESSAGE,
  OUTGOING_CHAT_MESSAGE_POSTED,
  INCOMING_CHAT_MESSAGE_POSTED
} from './constants';

let element = document.getElementById('main');
if (!element) {
  element = document.createElement('div');
  document.body.className = 'layout';
  document.body.appendChild(element);
}

const pendingEvents = [];
const events = [];
const model = () => {
  return {
    messages: [],
    isPending: false,
    chatSessions: {},
    device: {
      isMobile: isMobile(),
      screen: {
        height: window.innerHeight
      }
    }
  }
};

const CHANNEL_INSTANCES = {};

const identity = () => {
  try {
    const token = fallbackStorage.getItem('user-token');
    if (token) {
      return jwts.decode(token, null, true);
    }
  } finally {
    // ignore
  }
  return false;
};

const sideEffect = (command, model) => {
  switch (command.type) {
    case NAVIGATE:
    case INIT:
      const id = identity();
      if(!command.redirect && !command.view) {
        command.redirect = '/account';
      }
      const redirectOnly = command.redirect && !command.view;
      const perform = () => {
        if (redirectOnly) {
          if (window.location.pathname.indexOf(command.redirect) === -1) {
            page.redirect(command.redirect);
          }
        } else {
          dispatch({
            type: NAVIGATION_REQUESTED,
            view: command.view
          });
        }
      };
      if (redirectOnly || command.insecure) {
        perform();
      } else {
        if (id) {
          dispatch({
            type: AUTHENTICATION_SUCCESS,
            user: id
          }).then(() => {
            perform();
          });
        } else {
          dispatch({
            type: NAVIGATE,
            redirect: '/home'
          });
        }
      }
      break;
    case REGISTER_USER:
      reqwest({
        url: '/api/register',
        method: 'post',
        data: command,
        success: () => {
          dispatch({
            type: USER_REGISTERED
          }).then(() => {
            page.redirect('/home');
          });
        }
      });
      break;
    case SIGN_IN:
      if (command.username.trim().length === 0 ||
        command.password.trim().length === 0) {
        dispatch({
          type: AUTHENTICATION_FAILED
        });
      } else {
        dispatch({
          type: AUTHENTICATION_STARTED
        });
        reqwest({
          url: '/api/authenticate',
          method: 'post',
          data: command,
          success: (resp) => {
            fallbackStorage.setItem('user-token', resp.token);
            const identity = jwts.decode(resp.token, null, true);
            dispatch({
              type: AUTHENTICATION_SUCCESS,
              user: identity
            }).then(() => {
              page.redirect('/account');
            });
          },
          error: () => {
            dispatch({
              type: AUTHENTICATION_FAILED
            });
          }
        });
      }
      break;
    case SIGN_OUT:
      fallbackStorage.removeItem('user-token');
      dispatch({
        type: CLEAR_USER
      }).then(() => {
        dispatch({
          type: INIT,
          redirect: '/landing'
        });
      });
      break;
    case INIT_CHAT:
      if (!CHANNEL_INSTANCES[command.id]) {
        let wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        let wsHost = window.location.host;
        wsHost = `${window.location.hostname}:9999`;
        //wsHost = '73463add.ngrok.io';
        let wsUrl = `${wsProtocol}://${wsHost}/ws/register?=${command.id}`;
        CHANNEL_INSTANCES[command.id] = new BrowserWebSocket(wsUrl);

        const ws = CHANNEL_INSTANCES[command.id];

        ws.on('open', () => {
          let source = identity();
          source = source ? source.username : 'visitor';
          ws.emit(JSON.stringify({
            register: true,
            chatId: command.id,
            source: source
          }));
        });

        ws.on('message', msg => {
          const chatMessage = JSON.parse(msg.data);
          if (chatMessage.from !== identity().username && chatMessage.from !== 'visitor') {
            setTimeout(() => {
              dispatch({
                type: INCOMING_CHAT_MESSAGE_POSTED,
                id: command.id,
                from: chatMessage.from,
                text: chatMessage.text
              });
            }, 500);
          }
        });
      }
      break;
    case START_CHAT:
      if (CHANNEL_INSTANCES[command.id]) {
        dispatch({
          type: CHAT_STARTED,
          id: command.id
        });
      } else {
        dispatch({
          type: INIT_CHAT,
          id: command.id
        }).then(() => {
          dispatch({
            type: START_CHAT,
            id: command.id
          });
        });
      }
      break;
    case END_CHAT:
    {
      Object.keys(CHANNEL_INSTANCES).forEach((key) => {
        if (key === command.id || typeof command.id === 'undefined') {
          const ws = CHANNEL_INSTANCES[key];
          if (ws) {
            delete CHANNEL_INSTANCES[key];
            ws.emit(JSON.stringify({chatId: key, end: true}));
            ws.close();
            dispatch({
              type: CHAT_ENDED,
              id: key
            });
          }
        }
      });
      break;
    }
    case POST_OUTGOING_CHAT_MESSAGE:
    {
      let source = identity();
      source = source ? source.username : 'visitor';
      const ws = CHANNEL_INSTANCES[command.id];
      ws.emit(JSON.stringify({
        chatId: command.id,
        source: source,
        text: command.text
      }));
      dispatch({
        type: OUTGOING_CHAT_MESSAGE_POSTED,
        id: command.id,
        from: source,
        text: command.text
      });
      break;
    }
    case TIME_TICK:
      break;
  }
};

const update = (event, model) => {
  model.invalid_credentials = false;
  switch (event.type) {
    case NAVIGATION_REQUESTED:
      delete model.messages['invalid_credentials'];
      model.view = event.view;
      break;
    case CLEAR_USER:
      delete model.user;
      break;
    case USER_REGISTERED:
      model.messages['user_registered'] = {
        type: 'success',
        text: 'Enrollment complete',
        global: true
      };
      break;
    case AUTHENTICATION_STARTED:
      delete model.messages['user_registered'];
      delete model.messages['invalid_credentials'];
      model.isPending = true;
      break;
    case AUTHENTICATION_FAILED:
      model.isPending = false;
      model.messages['invalid_credentials'] = {
        type: 'danger',
        text: 'Wrong username or password'
      };
      break;
    case AUTHENTICATION_SUCCESS:
      model.isPending = false;
      model.user = event.user;
      break;
    case CHAT_STARTED:
      model.chatSessions[event.id] = {};
      break;
    case CHAT_ENDED:
      delete model.chatSessions[event.id];
      break;
    case OUTGOING_CHAT_MESSAGE_POSTED:
    {
      const chatSession = model.chatSessions[event.id];
      chatSession.messages = chatSession.messages || [];
      chatSession.messages.push({
        from: event.from,
        source: 'you',
        text: event.text
      });
      break;
    }
    case INCOMING_CHAT_MESSAGE_POSTED:
    {
      const chatSession = model.chatSessions[event.id];
      chatSession.messages = chatSession.messages || [];
      chatSession.messages.push({
        from: event.from,
        source: 'me',
        text: event.text
      });
      break;
    }
  }
  return model;
};

let rendering = false;
let latestModel = {};
window.dispatch = (event) => {
  return new Promise((resolve) => {
    sideEffect(event, latestModel);
    if (!rendering) {
      rendering = true;
      while (pendingEvents.length > 0) {
        events.push(pendingEvents.pop());
      }
      events.push(event);
      latestModel = events.reduce((updated, event) => {
        return update(event, updated);
      }, JSON.parse(JSON.stringify(model())));
      render(<Container model={ latestModel }/>, element, () => {
        rendering = false;
        resolve(latestModel);

        if (latestModel.device.isMobile) {
          let focused = null;
          $('*').on('focusin', function (e) {
            focused = e.target;
          });
          $('.form-control').on('focusout', function (e) {
            focused = null;
            setTimeout(function () {
              if (focused === null || !focused.classList.contains('form-control')) {
                resetScroll();
              }
            }, 0);
          });
        }

      });
    } else {
      pendingEvents.push(event);
    }
  });
};

window.onload = function () {

  document.addEventListener('keyup',
    function (e) {
      if (e.key === 'Escape') {
        dispatch({
          type: END_CHAT
        });
      }
    }, true);

  preventZoom();

  page('/', () => {
    window.dispatch({
      type: INIT
    });
  });

  page('/:view', (ctx) => {
    window.dispatch({
      type: NAVIGATE,
      view: ctx.params.view,
      insecure: ['home', 'enroll', 'dev'].indexOf(ctx.params.view) > -1
    });
  });

  page.start();

};
