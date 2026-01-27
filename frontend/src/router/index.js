import Vue from 'vue'
import VueRouter from 'vue-router'
import HomeView from '../views/HomeView.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    meta: { title: 'Live Stream Recorder' },
    component: HomeView
  },
  {
    path: '/watch',
    name: 'watch',
    meta: { title: '观看直播' },
    // route level code-splitting
    // this generates a separate chunk (watch.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "watch" */ '../views/WatchView.vue')
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'Live Stream Recorder'
  next()
})

export default router
