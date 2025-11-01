const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Force disable New Architecture by modifying build.gradle
 * This overrides gradle.properties at build time
 */
const withForceDisableNewArch = (config) => {
  // Modify app/build.gradle to force newArchEnabled=false
  config = withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    
    // Add override at the top of the react {} block
    if (buildGradle.includes('react {')) {
      buildGradle = buildGradle.replace(
        'react {',
        `react {
    // FORCE DISABLE NEW ARCHITECTURE FOR CALLKEEP COMPATIBILITY
    // This overrides gradle.properties
    newArchEnabled = false`
      );
    }
    
    config.modResults.contents = buildGradle;
    console.log('[withForceDisableNewArch] Added newArchEnabled=false to app/build.gradle');
    return config;
  });

  return config;
};

module.exports = withForceDisableNewArch;
