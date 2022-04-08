
# 支持的安装模式
> 目前该插件支持pnpm安装模块的两种模式， 提升模式与和不提升模式
- 项目根目录下
```sh
# 该模式下只会把项目根目录下package.json中dependencies和devDependencies列出模块放入项目根目录下node_modules中，其他间接模块统一软链到相关依赖.pnpm目录中
pnpm install
```
```sh
# 该模式会向npm一样把所有模块提升到项目根目录下node_modules, 所以该项目下会存在大量依赖包
pnpm install ----shamefully-hoist
```



# Pnpm Resolver Webpack Plugin
这是一个关于webpack解析pnpm模块的插件

![](https://mmbiz.qpic.cn/mmbiz_png/QRibyjewM1IBx7Dbic6nPLTMSYG0KhTEAMQge0ib1sQrKmEWAvp5HHWZttZic2LJO13Cd0QLWa8qChOqjSuZDEmTSw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)
![](https://mmbiz.qpic.cn/mmbiz_png/QRibyjewM1IBx7Dbic6nPLTMSYG0KhTEAM0DytKmH8VdJvvaxmM8woYcx33CUXtthC8Ru95icv8MB8Y6qInpAcZOg/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)
![](https://picgoimg.oss-cn-beijing.aliyuncs.com/WX20220331-125558%402x.png)


# 使用中遇到问题
由于pnpm使用软链的形式来组织依赖关系， 抛弃先前node_modules依赖提升扁平化，及多版本依赖嵌套的形式如下图
![](https://mmbiz.qpic.cn/mmbiz_png/QRibyjewM1IBx7Dbic6nPLTMSYG0KhTEAM1jiaL8iaCQLz4vk44aQia5IkyKLfMyCxDGknLtoibwQGzsplS0XIJXUMAw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)
![](https://mmbiz.qpic.cn/mmbiz_png/QRibyjewM1IBx7Dbic6nPLTMSYG0KhTEAMaAmJ2Cvvz5dE2T8KwicJnZeASOk0Bt0sVXYL4CD3uDQ4ZuEjXyjnEJg/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)
![](https://mmbiz.qpic.cn/mmbiz_png/QRibyjewM1IBx7Dbic6nPLTMSYG0KhTEAM1PXwNrRwXPrRITNAUibciaAy85Io5NYxEicwerGsjlwr2DuL7MGjrpPmw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)
![](https://mmbiz.qpic.cn/mmbiz_png/QRibyjewM1IBx7Dbic6nPLTMSYG0KhTEAMJhsfkT6KT5y7b5RqAcUr9b8fYkylI4VGiburHtyS8cs64rDQJibJ0ic7g/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

- webpack解析模块路径为软链路径，会造成在webpack模块向上层查找node_module下依赖时， 与模块的实际文件位置查找路径不一致， 会照成模块解析不到及出错的问题。
- 在实际的公共模块解析中， 同一个模块， 被软链接到不同模块下面时， webpack根据软链的路径， 把相同模块解析成了两个bundle
> 在实际的项目， react-router 和 react-router-dom 使用中 由于react-router软连在两个不同的地方， react-router初始化了两次，造成两次不同的context上下文，最终影响了react-router中组件无法配合react-router-dom组件进行使用的问题。

# 解决方案
> 就是在webpack构建NormalModule模块时， 重新解析下模块文件实际位置即可。
```js

const fs = require('fs');


class PnpmResolverPlugin {
  apply(compiler) {
    // 这里判断是否为pnpm构建的模块
    const loaderContext = `${compiler.context}/node_modules/.pnpm`;
    const isPnpmModule = fs.existsSync(loaderContext);
    if (!isPnpmModule) return;

    // 这里主要处理 如果因为先前的依赖提升， 没被安装模块， 提供一个扁平的模块解析路径。 主要针对pnpm 非----shamefully-hoist 模式的安装(注意：有可能会遇到版本问题)
    compiler.options.resolve.modules.push(`${loaderContext}/node_modules`);
    compiler.options.resolve.symlinks = true;

    compiler.hooks.compilation.tap('PnpmResolverPlugin', (compilation, {normalModuleFactory}) => {
    
      // 这里主要处理 css-loader babel-loader 内置到公司内部脚手架的问题
      normalModuleFactory.context = loaderContext;
      
      // compiler.options.resolve.symlinks = true; 解决实际路径问题
      /**
      // 这里主要处理模块真实路径问题
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
      **/
    });
  }
}

module.exports = PnpmResolverPlugin;

```