const path = require('path');

const isDevelopment = process.env.NODE_ENV !== 'production';
const baseDir = path.resolve(isDevelopment ? path.join('./', 'dist') : './');

const port = process.env.PORT || 9999;
const express = require('express');
const app = express();

app.use(function (req, res, next) {
  if (path.extname(req.path).length > 0) {
    next();
  }
  else {
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
