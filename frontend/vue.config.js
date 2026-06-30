const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  productionSourceMap: false,
  outputDir: 'dist',
  configureWebpack: config => {
    if (process.env.NODE_ENV !== 'production') {
      config.devtool = 'source-map'
    }
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
