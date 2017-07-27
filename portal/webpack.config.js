const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
require('sass-resources-loader');

module.exports = {
    context: path.resolve(__dirname),
    entry: {
        app: [
            'bootstrap-loader',
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
                'css-loader?modules&importLoaders=1&localIdentName=[name]__[local]__[hash:base64:5]'
            ]
        }, {
            test: /\.scss$/,
            use: [
                'style-loader',
                'css-loader?modules&importLoaders=2&localIdentName=[name]__[local]__[hash:base64:5]',
                'sass-loader', {
                    loader: 'sass-resources-loader',
                    options: {
                        resources: './src/style/sass-resources.scss'
                    }
                }
            ]
        }, {
            test: /\.(woff2?|svg)$/,
            use: [
                'url-loader?limit=10000'
            ]
        }, {
            test: /\.(ttf|eot)$/,
            use: [
                'file-loader'
            ]
        }]
    },
    plugins: [
        new webpack.ProvidePlugin({
            'window.Tether': 'tether',
            $: "jquery",
            jQuery: "jquery",
            React: "react"
        }),
        new HtmlWebpackPlugin({
            title: 'Portal',
            template: './src/index.ejs'
        })
    ],
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: '[name].bundle.js'
    },
    devtool: 'source-map'
};
