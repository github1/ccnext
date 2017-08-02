const path = require('path');
const isDevelopment = process.env.NODE_ENV !== 'production';
const baseDir = path.resolve(isDevelopment ? path.join('./', 'dist') : './');

const port = process.env.PORT || 8181;

const proxy = require('express-http-proxy');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use((req, res, next) => {
  if (req.path.indexOf('/api') === 0) {
    req.headers['content-type'] = 'application/json';
    // @TODO URL needs to be configurable
    const platformURL = 'http://localhost:9999';
    proxy(platformURL)(req, res, next);
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
