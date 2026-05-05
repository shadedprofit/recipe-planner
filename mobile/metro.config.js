/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Keep Expo Web on the mobile workspace's React DOM 18 build. The workspace
// root can contain a React DOM 19 RC peer copy via Jest/Expo dependencies.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-dom') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('react-dom', { paths: [projectRoot] }),
    };
  }

  if (moduleName === 'react-dom/client') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('react-dom/client', { paths: [projectRoot] }),
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
