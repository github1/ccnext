import BrowserWebSocket from 'browser-websocket';
import ajax from './ajax';
import uuid from 'uuid';

let instance;

const initialize = (onOpen, onMessage, onError) => {

  let autoReconnectInterval = 5000;

  let config;

  const getConfig = () => {
    if (!config) {
      config = {uuid: uuid.v4()};
    }
    return config;
  };

  const open = () => {
    ajax({
      url: `/api/events/connectionUrl?id=${getConfig().uuid}`,
      method: 'get',
      type: 'json'
    }).then((res) => openWS(res.connectionUrl)).catch((err) => reconnect(err));
  };

  const openWS = (url) => {
    const connection = new BrowserWebSocket(url);
    connection.on('open', () => {
      if (onOpen) {
        onOpen();
      }
    });
    connection.on('message', (data) => {
      if (onMessage) {
        onMessage(data);
      }
    });
    connection.on('close', (status)=> {
      if (status !== 1000) {
        reconnect(status);
      }
    });
    connection.on('error', (e)=> {
      switch (e.code) {
        case 'ECONNREFUSED':
          reconnect(e);
          break;
        default:
          if (onError) {
            onError(e);
          }
          break;
      }
    });
  };

  const reconnect = (status) => {
    console.log(`eventsAPI: retry in ${autoReconnectInterval}ms`, status);
    setTimeout(() => {
      console.log("eventsAPI: reconnecting...");
      open();
    }, autoReconnectInterval);
  };

  const subscribeTo = (streamId, callback) => {
    ajax({
      url: `/api/events/${streamId}/${getConfig().uuid}`,
      method: 'post'
    }).then(() => {
      if (callback) {
        callback();
      }
    });
  };

  const unsubscribe = (callback) => {
    ajax({
      url: `/api/events/subscriptions/${getConfig().uuid}`,
      method: 'delete'
    }).then(() => {
      if (callback) {
        callback();
      }
    });
  };

  open();

  return {
    subscribeTo: subscribeTo,
    unsubscribe: unsubscribe
  }

};

export const openEventStream = (opts) => {
  if (!instance) {
    instance = initialize(opts.open, opts.message, opts.error);
  }
};

export const subscribeTo = (streamId) => {
  return new Promise((resolve) => {
    if (instance) {
      instance.subscribeTo(streamId, () => {
        resolve();
      });
    }
  });
};

export const unsubscribe = () => {
  return new Promise((resolve) => {
    if (instance) {
      instance.unsubscribe(() => {
        resolve();
      });
    }
  });
};
