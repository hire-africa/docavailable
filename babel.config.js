module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Handle reanimated
      'react-native-reanimated/plugin',
      // Add runtime transform
      ['@babel/plugin-transform-runtime', {
        helpers: true,
        regenerator: true,
        useESModules: false,
      }],
    ],
  };
}; 