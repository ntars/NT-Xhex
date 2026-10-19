<template>
  <view class="page nt-theme-fade" :class="pageClass">
    <!-- 开屏页（冷启动品牌瞬间：品牌组 Logo + 玄玖灵犀 + 副标 演乾坤·知天命，停留后退场）。
         整屏 overlay（z-index 200，在一切之上），文案单一真源 = Settings.about().splash，
         Logo 复用 themeLogo（随主题换白版），视觉 = theme.css 的 .nt-splash*。
         退场：splashOut 挂 .nt-splash-out → 品牌组(logo+名)缩放到起始页比例淡出、背景/副标后段淡出，
         播完(--d-splash)再卸载 splashShow（先播后摘，同弹窗）。 -->
    <view class="nt-splash" :class="{ 'nt-splash-out': splashOut }" v-if="splashShow">
      <view class="nt-splash-brand">
        <image class="nt-splash-logo" :src="themeLogo" mode="aspectFit" />
        <text class="nt-splash-name">{{ about.splash.title }}</text>
      </view>
      <text class="nt-splash-sub">{{ about.splash.sub }}</text>
    </view>

    <!-- ⚠️ nt-theme-fade 是「主题切换过渡」的门控类（theme.css），**必须常挂**：带上它，
         换主题时底色/纸面/文字/图标才会在 320ms 内交叉渐变，而不是硬切一下。
         （uni-app 页首帧的 isDark 就是正确主题，静态挂不会有冷启动闪烁。）
         详见 theme.css「主题切换过渡」整段注释。 -->
    <!-- 首页：输入 -->
    <HomeModule v-if="view === 'home'" @about="goAbout" @result="onResult" @themechange="onThemeChange" />
    <!-- 结果页：展示分析，可返回 -->
    <ResultView v-else-if="view === 'result'" :result="result" @back="goHome" />
    <!-- 关于页（顶级 4 卡）：refs/intro 点进内容详情页；us 点进「关于我们」页；清除项只弹窗 -->
    <SettingsView v-else-if="view === 'about'" @back="goHome" @detail="openDetail" @us="openUs" @themechange="onThemeChange" />
    <!-- 关于我们页（二级 3 卡）：星玖工作室 / 协议条款 / 开源声明 各自点进内容详情页 -->
    <UsView v-else-if="view === 'us'" @back="goAbout" @detail="openDetail" />
    <!-- 二级内容详情页（一稿两用，5 个子页：refs/intro 回「关于」，studio/terms/open 回「关于我们」） -->
    <DetailModule v-else-if="view === 'detail'" :panel-id="detailId" @back="goDetailBack" />
  </view>
</template>

<script>
// 单页壳：首页（输入）→ 结果页（展示）→ 关于页 → 二级页（板块详情），无底部导航栏。
// 业务逻辑全在 modules 里（纯 JS），此处只做视图组装。
import HomeModule from '@/modules/HomeModule/index.vue'
import ResultView from '@/modules/HomeModule/result.vue'
import SettingsView from '@/modules/SettingsModule/settings.vue'
import UsView from '@/modules/SettingsModule/us.vue'
import DetailModule from '@/modules/SettingsModule/detail.vue'
import Settings from '@/modules/SettingsModule/settings.js'
import Conversation from '@/modules/HomeModule/conversation.js'
import ResultFormat from '@/modules/HomeModule/result-format.js'
import Analyzer from '@/modules/AnalyzerModule/analyzer.js'
import Storage from '@/modules/StorageModule/storage.js'
import Theme from '@/modules/UIModule/theme.js'
import Transition from '@/modules/UIModule/transition.js'
// 视觉规范单一真源（与 PWA/小程序同一份 theme.css）
import '@/modules/UIModule/theme.css'

var EMPTY_RESULT = { title: '', lead: '', blocks: [], question: '' }

export default {
  name: 'NtPage',
  components: { HomeModule, ResultView, SettingsView, UsView, DetailModule },
  data() {
    // 黑白主题：.nt-dark 挂在 shell 根上包住各视图；首页/结果/关于/关于我们/二级页整体一致
    return {
      view: 'home',
      result: EMPTY_RESULT,
      detailId: 'intro',
      detailBack: 'about',   // 内容详情页「‹」回哪一级：about（关于）/ us（关于我们），由 backTarget 决定
      isDark: (Theme.current() === 'dark'),
      about: Settings.about(),
      themeLogo: Theme.logoFor(Theme.current()),   // 开屏 Logo 与首页同一份，随主题换白版
      splashShow: true,   // 开屏 overlay 是否挂载（冷启动 true，淡出后卸载）
      splashOut: false,   // 开屏退场门控：true 时挂 .nt-splash-out（品牌组缩放到起始页比例 + 背景/副标淡出）
      enterClass: '',  // 转场动画类（nt-slide-in/back），由 transition 模块驱动；布局不动
      // 内容错落入场开关：只在冷启动首屏为 true（给 .page 挂 .nt-cascade），首次切页即置 false。
      // 切页已有整层滑入承担位移，若内容再各自上浮一次，两种动效叠加会看成"重影"。
      // 只降不清（一次性）：反过来用"切页加抑制类、结束再摘"，摘掉那一刻 animation-name
      // 由 none 变回 nt-rise，会凭空重启一次动画，就是"切换完还有一个动画重复播放"。
      boot: true
    }
  },
  computed: {
    // .page 容器 = 主题类 + 转场类 + 首屏入场门控类（动画集中在容器，各视图布局不受影响）
    pageClass() {
      var c = { 'nt-dark': this.isDark }
      if (this.enterClass) c[this.enterClass] = true
      if (this.boot) c['nt-cascade'] = true
      return c
    }
  },
  onLoad() {
    // 共享问答实例（与 HomeModule 用同一份装配方式，返回时清空它）
    // ⚠ v3.1.41：加判空。小程序壳的 analyzer 在分包里、会话器是「延迟创建」的，onLoad 时可能是 null；
    //   uni-app/H5 壳静态 import 了 analyzer、此处必成功。但**三端同一份 onLoad 逻辑**，统一判空最稳
    //   （真机实测：null 上直接 .restore() 会抛「Cannot read property 'restore' of null」整页崩）。
    this.conv = Conversation.createConversation({ analyzer: Analyzer, storage: Storage })
    this.syncWindowTheme()
    this.runSplash()
    // 恢复上次这一问（刷新/重进不丢）
    var last = this.conv ? this.conv.restore() : null
    if (last) {
      var f = ResultFormat.format(last.answer)
      f.question = last.question
      this.result = f
      this.view = 'result'
    }
  },
  methods: {
    // 开屏页：停留 → 挂 .nt-splash-out 播退场（theme.css --d-splash）→ 摘 overlay。
    // 退场手法同弹窗：先播后摘（splashOut 触发品牌组缩放到起始页比例 nt-splash-brand-out +
    // 背景/副标淡出 nt-splash-bg），直接卸载则动画来不及播。停留/退场时长走 transition.js 的
    // TIMING（单一真源，三端共用，镜像 theme.css 令牌）。
    runSplash() {
      var self = this
      var hold = Transition.TIMING ? Transition.TIMING.SPLASH_HOLD : 1200
      var fade = Transition.TIMING ? Transition.TIMING.SPLASH_FADE : 400
      this._splashTimer = setTimeout(function () {
        self.splashOut = true                       // 品牌组缩放到起始页比例并淡出
        self._splashUnload = setTimeout(function () {
          self.splashShow = false                    // 退场结束再卸载
          self.splashOut = false
        }, fade)
      }, hold)
    },
    /**
     * H5：把主题落到 <html>/<body> 与浏览器色条上。
     *
     * 为什么必须做：主题变量定义在 .nt-dark 里，而 .nt-dark 只挂在页面根节点上，
     * 只能染「页面自己」。但用户上下滑动越界（橡皮筋 / 下拉回弹 / 滚动链）时露出的是
     * <html>/<body> 的底色和浏览器原生 UI（滚动条、表单控件）—— 它们不跟页面走，
     * 于是深色模式下就会从边缘闪出一条白色底（用户实测反馈）。
     * 各端等价手段：小程序用 wx.setBackgroundColor（见 dist/mp-weixin/app.js）。
     * 反色根（.nt-dark 挂 documentElement）本身走 theme.js 的 apply()，单一真源不重复实现。
     */
    syncWindowTheme() {
      // #ifdef H5
      if (typeof document === 'undefined' || !document.documentElement) return
      var dark = Theme.apply()   // 返回当前是否深色，并把 .nt-dark 挂到 documentElement
      // 窗口底色 = theme.css 的 --nt-bg 同值（#000000 / #ffffff）。
      // 用行内样式是为了不受 uni-app 基础样式的层叠顺序影响 —— 这里只有两个值，不值得绕一圈读变量。
      var bg = dark ? '#000000' : '#ffffff'
      document.documentElement.style.backgroundColor = bg
      if (document.body) document.body.style.backgroundColor = bg
      // 浏览器自身色条（地址栏 / 状态栏区域）跟着主题，避免深色下顶部留一条白
      var meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', bg)
      // #endif
    },
    // 统一切视图：单层滑入转场（transition.js 判方向 → theme.css 出 keyframe；前进自右入、返回自左回；布局不动）
    // 模块缺失时降级为无动画直切（view 切换本身仍生效，绝不影响运行）
    go(to, prep) {
      var from = this.view
      if (from === to) return
      if (prep) { for (var k in prep) this[k] = prep[k] }
      this.view = to
      this.boot = false   // 首屏入场到此为止，之后切页只播整层滑入（两种动效不叠加）
      var self = this
      clearTimeout(this._navTimer)   // 连续切页时先掐掉上一轮的收尾定时器，否则新动画会被提前清类打断
      if (Transition && typeof Transition.single === 'function') {
        this._navTimer = Transition.single(from, to, function (cls) { self.enterClass = cls })
      } else {
        self.enterClass = ''
      }
    },
    onResult(r) { this.result = r; this.go('result') },
    // 关于页点设置项 → 内容详情页；「关于我们」卡 → 关于我们页；清除项由 SettingsView 内部弹窗处理（不走这里）
    openDetail(id) {
      var bt = (Settings.about().backTarget || {})[id]
      this.detailId = id
      this.detailBack = bt || 'about'   // 内容详情页「‹」回哪一级（单一真源 backTarget）
      this.go('detail')
    },
    openUs() { this.go('us') },
    goAbout() { this.go('about') },
    // 内容详情页「‹」：回上一级（about 关于 / us 关于我们，由 detailBack 决定）
    goDetailBack() { this.go(this.detailBack || 'about') },
    // 清除缓存后主题偏好回落跟随系统 → 同步根元素反色态（settings.vue 内发 themechange）
    onThemeChange(theme) {
      this.isDark = theme === 'dark'
      this.themeLogo = Theme.logoFor(theme)   // 开屏/首页 Logo 随主题换白版
      this.syncWindowTheme()
    },
    onUnload() {
      // 清掉开屏的两个定时器，避免组件卸载后还在改 data
      clearTimeout(this._splashTimer)
      clearTimeout(this._splashUnload)
    },
    // 返回输入页：清空共享问答实例的当前结果
    goHome() {
      if (this.conv) this.conv.clear()
      this.result = EMPTY_RESULT
      this.go('home')
    }
  }
}
</script>

<style scoped>
/* 布局仅此一处；尺寸/字色/圆角/间距全部走 theme.css 的 --nt-* 与 .nt-*（单一真源）。
   本容器只负责「满视口纵向弹性 + 宽屏限宽居中」；顶部/底部安全区避让由各视图根节点承担
   （H5/APP 走 .nt-page-safe 的 env()；小程序走 safe-area.js 行内注入）。 */
.page {
  position: relative;
  height: 100vh;
  background: var(--nt-bg);
  color: var(--nt-ink);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
/* 响应式（HIG）：平板 768–1023 内容居中不超 640，电脑/网页 ≥1024 不超 720 */
@media screen and (min-width: 768px) { .page { max-width: var(--w-tablet); margin: 0 auto; } }
@media screen and (min-width: 1024px) { .page { max-width: var(--w-desktop); } }
</style>
