import { render } from 'react-dom';
import jwtutil from 'jwt-simple';
import reqwest from 'reqwest';
import page from 'page';
import Container from './component/container';
import './style/theme.scss';

import {
  INIT,
  TIME_TICK,
  NAVIGATE,
  NAVIGATION_REQUESTED,
  CLEAR_USER,
  SIGN_IN,
  SIGN_OUT,
  AUTHENTICATION_STARTED,
  AUTHENTICATION_FAILED,
  AUTHENTICATION_SUCCESS,
  START_CHAT,
  CHAT_STARTED,
  END_CHAT,
  CHAT_ENDED,
  POST_OUTGOING_CHAT_MESSAGE,
  OUTGOING_CHAT_MESSAGE_POSTED
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
    chatSessions: {}
  }
};

const identity = () => {
  try {
    const token = localStorage.getItem('user-token');
    if (token) {
      return jwtutil.decode(token, null, true);
    }
  } finally {
    // ignore
  }
  return false;
};

const sideEffect = (command) => {
  switch (command.type) {
    case NAVIGATE:
    case INIT:
      const perform = () => {
        dispatch({
          type: NAVIGATION_REQUESTED,
          view: command.view || 'home'
        });
      };
      const id = identity();
      if (command.insecure) {
        perform();
      } else {
        if (id) {
          dispatch({
            type: AUTHENTICATION_SUCCESS,
            user: id
          }).then(() => {
            perform()
          });
        } else {
          const redirect = command.redirect || '/login';
          if (window.location.pathname.indexOf(redirect) === -1) {
            page.redirect(redirect);
          } else {
            perform();
          }
        }
      }
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
            localStorage.setItem('user-token', resp.token);
            const token = jwtutil.decode(resp.token, null, true);
            dispatch({
              type: AUTHENTICATION_SUCCESS,
              user: token
            }).then(() => {
              page.redirect('/home');
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
      localStorage.removeItem('user-token');
      dispatch({
        type: CLEAR_USER
      }).then(() => {
        dispatch({
          type: INIT,
          redirect: '/login'
        });
      });
      break;
    case START_CHAT:
      // @TODO - integrate with service
      dispatch({
        type: CHAT_STARTED,
        id: command.id
      });
      break;
    case END_CHAT:
      // @TODO - integrate with service
      dispatch({
        type: CHAT_ENDED,
        id: command.id
      });
      break;
    case POST_OUTGOING_CHAT_MESSAGE:
      // @TODO - integrate with service
      dispatch({
        type: OUTGOING_CHAT_MESSAGE_POSTED,
        id: command.id,
        from: identity().username,
        text: command.text
      });
      break;
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
    case AUTHENTICATION_STARTED:
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
      const chatSession = model.chatSessions[event.id];
      chatSession.messages = chatSession.messages || [];
      chatSession.messages.push({
        from: event.from,
        source: 'you',
        text: event.text
      });
      break;
  }
  return model;
};

let rendering = false;
let latestModel = {};
window.dispatch = (event) => {
  if (event.type !== TIME_TICK) {
    console.log(event);
  }
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
      });
    } else {
      pendingEvents.push(event);
    }
  });
};

window.onload = function () {

  page('/', () => {
    window.dispatch({
      type: INIT
    });
  });

  page('/:view', (ctx) => {
    window.dispatch({
      type: NAVIGATE,
      view: ctx.params.view,
      insecure: ['register', 'dev'].indexOf(ctx.params.view) > -1
    });
  });

  page.start();

};
