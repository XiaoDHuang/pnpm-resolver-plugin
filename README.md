
# 说明
> 本文档主要提供， 如果项目引用pnpm， 遇到模块解析的问题， 提供的一些思路， 对于老旧的项目， 因为内部脚手架，等等出现的影子依赖问题， 建议使用 pnpm install ----shamefully-hoist， 但也会有可能遇到package.lock锁定版本结构， 跟pnpm版本提升的版本结构不一致。 
总体而言： 因为先前npm模块提升, 影子依赖， package锁定版本结构等问提， 在旧有项目使用pnpm 会出现这样或那样问题， 模块解析不到， 本插件基本上解决一些通用解析路径问题， 如遇到问题， 需要根据根据自己项目情况，去解决， 但总体思路都是一样的。  
最后， 可以不用本插件下， 对常规项目简单配置即可使用pnpm

[关联文档](https://codemao.yuque.com/docs/share/31bd05d7-d1d2-4d87-bb62-d45c49eb571e)

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

# 终极解决方案
## 问题
- webpack软链解析问题
- 公司内部脚手架对loader及babel相关库相对项目而言造成的影子依赖问题
- 项目中影子依赖问题，
- package-lock带来锁版本问题, 如何在pnpm中锁定版本

> 一个提升带来的锁版本问题，一个语义化版本号带来锁版本问题

## 老旧项目迁移pnpm
### 第一种情况(平滑迁移)
- 解决webpack 软链问题提
- 解决所有影子依赖问题
- 解决package-lock 锁版本问题
webpack配置
```js
options.resolve.symlinks = true 
```
命令行
```bash
# 将packaage-lock 文件转为 pnpm-lock.yml
pnpm import 
```
.npmrc 配置
```bash
# 扁平方式安装
shamefully-hoist=true
```
或
```bash
pnpm install --shamefully-hoist
```

### 第二种情况(解决部分脚手架loader及babel影子依赖问题)

webpack配置
```js
options.resolve.symlinks = true 
```

.npmrc配置
```bash
# 把脚手架中loader提升到公共(项目)node_modules下
public-hoist-pattern[]=*loader*
# 把babel相关库提升到公共(项目)node_modules下
public-hoist-pattern[]=*babel*

# 如果构建过程中还发现其他影子依赖问题 要么安装上去， 要不在这里提升上来

# 不使用扁平方式， 默认false 可以不配置
shamefully-hoist=false
```