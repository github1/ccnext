const path = require('path');
const isDevelopment = process.env.NODE_ENV !== 'production';
const baseDir = path.resolve(isDevelopment ? path.join('./', 'dist') : './');

const jwtutil = require('jwt-simple');
const JWT_SECRET = Buffer.from('supersecret', 'utf8');

const port = process.env.PORT || 8181;
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use((req, res, next) => {
  if (req.path.indexOf('/api') === 0) {
    const bypass = ['/api/authenticate']
      .map(path => req.path.indexOf(path) === 0)
      .filter(result => result)[0];
    if (bypass) {
      next();
    } else {
      // enforce jwt verification for apis
      if (req.headers['jwt']) {
        try {
          const jwt = jwtutil.decode(req.headers['jwt'], JWT_SECRET, void 0, void 0);
          req.headers['user-id'] = jwt.userId;
          next();
        } catch (err) {
          res.status(401).send({});
        }
      } else {
        res.status(401).send({});
      }
    }
  } else if (path.extname(req.path).length > 0) {
    // assume static content here
    next();
  } else {
    // send everything else to index.html
    req.url = '/index.html';
    next();
  }
});

const users = {
  demouser: {
    password: "password"
  }
};

app.post('/api/authenticate', (req, res) => {
  res.type('application/json');
  const username = req.body.username;
  const password = req.body.password;
  if (username &&
    users[username] &&
    users[username].password === password) {
    const payload = {
      username: username
    };
    res
      .send({
        token: jwtutil.encode(payload, JWT_SECRET, void 0, void 0)
      });
  } else {
    res
      .status(403)
      .send({});
  }
});

if (isDevelopment) {
  const webpack = require('webpack');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const webpackConfig = require('./webpack.config.js');
  const compiler = webpack(webpackConfig);

  app.use(webpackDevMiddleware(compiler, {
    publicPath: webpackConfig.output.publicPath
  }));
  app.use(webpackHotMiddleware(compiler));
} else {
  app.use(express.static(baseDir));
}

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
