const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Allow Metro to watch files outside of the project root (i.e., your library's src folder)
config.watchFolders = [projectRoot, workspaceRoot];

// Let Metro know where to resolve packages that are dependencies of your library
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Prevent Metro from complaining about duplicate packages
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
