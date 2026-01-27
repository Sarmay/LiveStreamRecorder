const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  outputDir: 'dist',
  configureWebpack: {
    devtool: 'source-map' // 开发环境开启源码映射，生产环境注释掉
  },
  devServer: {
    port: 8080,
    client: {
      overlay: false
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000/api',
        changeOrigin: true,
        ws: true,
        secure: false,
        logLevel: 'debug',
        pathRewrite: {
          '^/api': '' // 重写路径，去除/api
        }
      }
    }
  }
})
