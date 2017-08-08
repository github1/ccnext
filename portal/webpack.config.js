const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
require('sass-resources-loader');

const extractSass = new ExtractTextPlugin({
  filename: '[name].css',
  disable: process.env.NODE_ENV !== 'production'
});


module.exports = {
  context: path.resolve(__dirname),
  entry: {
    app: [
      './src/index.js'
    ]
  },
  resolve: {
    modules: ['src', 'node_modules']
  },
  module: {
    rules: [{
      test: /\.(js|jsx)$/,
      exclude: /node_modules/,
      use: [
        'babel-loader'
      ]
    }, {
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader'
      ]
    }, {
      test: /\.scss$/,
      use: extractSass.extract({
        use: ['css-loader',
          'sass-loader', {
            loader: 'sass-resources-loader',
            options: {
              resources: './src/style/sass-resources.scss'
            }
          }],
        fallback: 'style-loader'
      })
    }, {
      test: /\.(woff2?|svg)$/,
      use: [
        'url-loader?limit=10000'
      ]
    }, {
      test: /\.(ttf|eot|jpe?g)$/,
      use: [
        'file-loader'
      ]
    }]
  },
  plugins: [
    new webpack.ProvidePlugin({
      'window.Tether': 'tether',
      $: 'jquery',
      jQuery: 'jquery',
      React: 'react'
    }),
    new HtmlWebpackPlugin({
      title: 'DemoBank',
      template: './src/index.ejs'
    }),
    extractSass,
    new CopyWebpackPlugin([{
      from: './src/assets'
    }])
  ],
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name].bundle.js'
  },
  devtool: 'source-map'
};
