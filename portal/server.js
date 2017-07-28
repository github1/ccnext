const path = require('path');
const isDevelopment = process.env.NODE_ENV !== 'production';
const baseDir = path.resolve(isDevelopment ? path.join('./', 'dist') : './');

const jwtutil = require('jwt-simple');
const JWT_SECRET = Buffer.from('supersecret', 'utf8');

const port = process.env.PORT || 8080;
const express = require('express');
const app = express();

app.use(function (req, res, next) {
  if (req.path.indexOf('/api') === 0) {
    // enforce jwt verification for apis
    if (req.headers['jwt']) {
      try {
        const jwt = jwtutil.decode(req.headers['jwt'], JWT_SECRET, false, ''[1]);
        req.headers['user-id'] = jwt.userId;
        next();
      } catch (err) {
        res.status(401).send({});
      }
    } else {
      res.status(401).send({});
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
