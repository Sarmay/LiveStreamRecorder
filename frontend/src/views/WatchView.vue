<template>
  <div id="mse" :style="{ height: height + 'px', width: width + 'px' }"></div>
</template>

<script>
import 'xgplayer/dist/index.min.css'
import posterImg from '@/assets/poster.jpg'

export default {
  name: 'WatchView',
  data () {
    return {
      url: '',
      width: window.innerWidth,
      height: window.innerHeight,
      poster: posterImg,
      player: null
    }
  },
  async mounted () {
    const url = decodeURIComponent(this.$route.query.url)
    const isLive = this.$route.query.isLive === 'true'
    // 判断链接是 hls协议还是flv协议
    const isHls = url.startsWith('http') && url.includes('.m3u8')
    const isFlv = url.startsWith('rtmp') || url.startsWith('rtsp') || (url.startsWith('http') && url.includes('.flv'))
    const isShaka = url.startsWith('http') && url.includes('.m4v')

    const playerPluginImports = []
    if (isHls) {
      playerPluginImports.push(import('xgplayer-hls.js').then(module => module.default))
    }
    if (isFlv) {
      playerPluginImports.push(import('xgplayer-flv.js').then(module => module.default))
    }
    if (isShaka) {
      playerPluginImports.push(import('xgplayer-shaka').then(module => module.default))
    }

    const [{ default: Player }, playerPlugins] = await Promise.all([
      import('xgplayer'),
      Promise.all(playerPluginImports)
    ])

    this.player = new Player({
      id: 'mse',
      url: url,
      isLive: isLive,
      autoplay: true,
      playsinline: true,
      plugins: playerPlugins,
      poster: this.poster,
      cors: true,
      crossorigin: 'anonymous',
      width: window.innerWidth,
      height: window.innerHeight
    })
  },
  beforeDestroy () {
    if (this.player) {
      this.player.destroy()
      this.player = null
    }
  }
}
</script>

<style>
#mse {
  height: 100%;
  width: 100%;
}
</style>
