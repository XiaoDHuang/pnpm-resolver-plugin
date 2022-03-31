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

- 1. webpack解析模块路径为软链路径，会造成在webpack模块向上层查找node_module下依赖时， 与模块的实际文件位置查找路径不一致， 会照成模块解析不到及出错的问题。
- 2. 在实际的公共模块解析中， 同一个模块， 被软链接到不同模块下面时， webpack根据软链的路径， 把相同模块解析成了两个bundle
> 在实际的项目， react-router 和 react-router-dom 使用中 由于react-router软连在两个不同的地方， react-router初始化了两次，造成两次不同的context上下文，最终影响了react-router中组件无法配合react-router-dom组件进行使用的问题。

# 解决方案
> 就是在webpack构建NormalModule模块时， 重新解析下模块文件实际位置即可。
```js
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
```