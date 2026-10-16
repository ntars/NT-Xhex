<script>
/**
 * NT-Xhex 玄玖灵犀 · 应用根组件
 * 条件编译：
 *  - H5 形态：注册 Service Worker、启动 PWA 安装引导
 *  - 小程序/原生：仅打印形态，无 DOM 操作
 */
// #ifdef H5
import ENV from '@/modules/EnvModule/env.js'
// #endif

export default {
  name: 'App',
  onLaunch() {
    // #ifdef H5
    ENV.registerServiceWorker()
    ENV.initInstallPrompt()
    // #endif
    // #ifdef MP-WEIXIN
    this.log('mp-weixin')
    // #endif
    // #ifdef APP-PLUS
    this.log('app')
    // #endif
  },
  onShow() {
    this.log('show')
  },
  onHide() {
    this.log('hide')
  },
  methods: {
    log(t) {
      console.log('[NT-Xhex] App.', t)
    }
  }
}
</script>

<style>
/* 全局基底（token 全部来自 theme.css，单一真源；.nt-dark 时自动反色） */
@import '@/modules/UIModule/theme.css';

/* 机身边界带：theme.css 给了设计稿值（顶 59 / 底 34）；H5 端升为「设计带 与 设备安全区取大者」，
   真机上不被刘海/手势条遮挡，无安全区的设备上仍保留设计稿留白。画布总高不变，只是占位不绘制。
   （小程序端 WXSS 不支持 env()，由 safe-area.js 以行内值注入，见各视图的 navStyle/pageStyle） */
/* #ifdef H5 */
:root {
  --safe-top: max(59px, env(safe-area-inset-top, 0px));
  --safe-bottom: max(34px, env(safe-area-inset-bottom, 0px));
}
/* #endif */

/* uni-app 构建会把 theme.css 内联进各端产物，url() 相对路径会失配；
   用 /static/ 绝对路径覆盖 3 个源 SVG 图标（H5 站点根 = 小程序包根，两端一致） */
.nt-i-back { background-image: url('/static/icons/icon-back.svg'); }
.nt-i-chev { background-image: url('/static/icons/icon-forward.svg'); }
.nt-i-search { background-image: url('/static/icons/icon-search.svg'); }

page, body {
  margin: 0;
  padding: 0;
  background: var(--nt-bg);
  color: var(--nt-ink);
  font-family: -apple-system, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
  scrollbar-width: none; -ms-overflow-style: none;   /* WXSS 安全（不用 `*`）：隐藏页面滚动条 */
}
/* 浏览器端（uni-H5）用 `*` 全量隐藏滚动条；MP-WEIXIN/APP 不编译这段 */
/* #ifdef H5 */
* { scrollbar-width: none; -ms-overflow-style: none; }
*::-webkit-scrollbar { width: 0; height: 0; display: none; }
/* #endif */

</style>
