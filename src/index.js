
const fs = require('fs');


class PnpmResolverPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('PnpmResolverPlugin', (compilation, options) => {
      const hander = (module) => {
        if (!module.resource) return;

        if (module.resource.match(/\.(ejs)$/)) return;

        try {
          const resource = fs.realpathSync(module.resource);
          const context = getContext(resource);

          if (module.request === module.resource && module.userRequest === module.resource) {
            module.request = resource;
            module.userRequest = resource;
          }

          module.context = context;
          module.resource = resource;
        } catch(err) {
          // debugger;
        }
      };

      compilation.hooks.buildModule.tap('PnpmResolverPlugin', hander);
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
