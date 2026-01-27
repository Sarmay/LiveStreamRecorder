<template>
  <div id="mse" :style="{ height: height + 'px', width: width + 'px' }"></div>
</template>

<script>
import 'xgplayer/dist/index.min.css'
import Player from 'xgplayer'
import HlsJsPlayer from 'xgplayer-hls.js'
import FlvPlayer from 'xgplayer-flv.js'
import ShakaJsPlayer from 'xgplayer-shaka'
import posterImg from '@/assets/poster.jpg'

export default {
  name: 'WatchView',
  data () {
    return {
      url: '',
      width: window.innerWidth,
      height: window.innerHeight,
      poster: posterImg
    }
  },
  mounted () {
    const url = decodeURIComponent(this.$route.query.url)
    const isLive = this.$route.query.isLive === 'true'
    console.log(url, isLive)
    // 判断链接是 hls协议还是flv协议
    const isHls = url.startsWith('http') && url.includes('.m3u8')
    const isFlv = url.startsWith('rtmp') || url.startsWith('rtsp') || (url.startsWith('http') && url.includes('.flv'))
    const isShaka = url.startsWith('http') && url.includes('.m4v')

    const playerPlugins = []
    if (isHls) {
      playerPlugins.push(HlsJsPlayer)
    }
    if (isFlv) {
      playerPlugins.push(FlvPlayer)
    }
    if (isShaka) {
      playerPlugins.push(ShakaJsPlayer)
    }

    const player = new Player({
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
    console.log(player)
  }
}
</script>

<style>
#mse {
  height: 100%;
  width: 100%;
}
</style>
