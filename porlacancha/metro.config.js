const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [path.join(workspaceRoot, "shared")];
config.resolver.sourceExts = [...new Set([...(config.resolver.sourceExts ?? []), "mjs"])];
config.resolver.unstable_enablePackageExports = false;
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@shared": path.join(workspaceRoot, "shared"),
};
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
