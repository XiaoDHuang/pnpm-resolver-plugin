
const fs = require('fs');


class PnpmResolverPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('PnpmResolverPlugin', (compilation, {normalModuleFactory}) => {
      normalModuleFactory.hooks.afterResolve.tap('PnpmResolverPlugin', (result) => {
        try {
          const resource = fs.realpathSync(result.resource);
          const context = getContext(resource);

          if (result.userRequest === result.resource) {
            result.userRequest = resource;
          }

          if (result.request === result.resource) {
            result.request = resource;
          }

          result.resource = resource;
          result.context = context;

          result.resourceResolveData.descriptionFilePath = fs.realpathSync(result.resourceResolveData.descriptionFilePath);
          result.resourceResolveData.descriptionFileRoot = fs.realpathSync(result.resourceResolveData.descriptionFileRoot);
          result.resourceResolveData.path = fs.realpathSync(result.resourceResolveData.path);

        } catch(err) {
          // debugger;
        }
      })

    });
  }
}

function splitQuery(req) {
  var i = req.indexOf('?');
  if(i < 0) return [req, ''];
  return [req.substr(0, i), req.substr(i)];
}

function dirname(path) {
  if(path === '/') return '/';
  var i = path.lastIndexOf('/');
  var j = path.lastIndexOf('\\');
  var i2 = path.indexOf('/');
  var j2 = path.indexOf('\\');
  var idx = i > j ? i : j;
  var idx2 = i > j ? i2 : j2;
  if(idx < 0) return path;
  if(idx === idx2) return path.substr(0, idx + 1);
  return path.substr(0, idx);
}

function getContext(resource) {
  var splitted = splitQuery(resource);
  return dirname(splitted[0]);
};


module.exports = PnpmResolverPlugin;
