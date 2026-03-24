const path = require('path');

module.exports = (env, argv) => {
  const isProduction = process.env.NODE_ENV === 'production' || argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/renderer.js',
    output: {
      path: path.resolve(__dirname, 'src'),
      filename: 'renderer.bundle.js',
      clean: false, // Don't clean to avoid conflicts with existing files
    },
    optimization: {
      minimize: isProduction,
      usedExports: true,
      sideEffects: false,
      // Simplified optimization without code splitting to avoid filename conflicts
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    electron: '36.1.0'
                  },
                  modules: false,
                  useBuiltIns: 'usage',
                  corejs: 3
                }],
                '@babel/preset-react'
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.jsx']
    },
    devtool: isProduction ? false : 'source-map'
  };
};
