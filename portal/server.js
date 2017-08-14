const path = require('path');
const isDevelopment = process.env.NODE_ENV !== 'production';
const baseDir = path.resolve(path.join('./', 'dist'));

const port = process.env.PORT || 8181;

const publicUrl = process.env.PUBLIC_URL;
const platformUrl = process.env.PLATFORM_URL || 'http://localhost:9999';

const proxy = require('express-http-proxy');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use((req, res, next) => {
  if ((/\/api\//).test(req.path)) {
    let proxyUrl = platformUrl;
    req.headers['content-type'] = 'application/json';
    proxy(proxyUrl)(req, res, next);
  } else if (path.extname(req.path).length > 0) {
    req.url = `/${path.basename(req.path)}`;
    // assume static content here
    next();
  } else {
    req.path = '/';
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
  if (publicUrl) {
    console.log(`Served from ${publicUrl}`);
  }
});
