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
  SIGN_IN_REQUIRED,
  SIGN_IN,
  SIGN_OUT,
  AUTHENTICATION_STARTED,
  AUTHENTICATION_FAILED,
  AUTHENTICATION_SUCCESS
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
    isPending: false
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

const sideEffect = (command, model) => {
  switch (command.type) {
    case NAVIGATE:
    case INIT:
      const perform = () => {
        if (command.view) {
          dispatch({
            type: NAVIGATION_REQUESTED,
            view: command.view
          });
        } else {
          page.redirect('/home');
        }
      };
      const id = identity();
      if (id) {
        dispatch({
          type: AUTHENTICATION_SUCCESS,
          user: id
        }).then(() => {
          perform()
        });
      } else {
        if (window.location.pathname.indexOf('/register') < 0 || command.force) {
          page.redirect('/login');
        } else {
          perform();
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
        type: INIT,
        force: true
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
      model.view = event.view
      break;
    case SIGN_IN_REQUIRED:
      delete model.user;
      model.view = 'login';
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
      });
    } else {
      pendingEvents.push(event);
    }
  });
};

window.addEventListener('load', function () {

  page('/', () => {
    window.dispatch({
      type: INIT
    });
  });

  page('/login', () => {
    window.dispatch({
      type: SIGN_IN_REQUIRED,
      view: 'login'
    });
  });

  page('/register', () => {
    window.dispatch({
      type: NAVIGATE,
      view: 'register'
    });
  });

  page('/home', () => {
    window.dispatch({
      type: NAVIGATE,
      view: 'home'
    });
  });

  page.start();

  setInterval(() => {
    dispatch({
      type: TIME_TICK
    });
  }, 1000);

});
