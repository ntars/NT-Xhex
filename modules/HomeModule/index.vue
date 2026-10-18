<template>
  <!-- 首页（设计稿「起始页」，画布 402×874pt）
       导航「关于」左上（24,62）+ 空态块（Logo 64.27×72 → 玄玖灵犀 22pt → 搜索胶囊 272×48
       → 内容仅供交流学习 12pt，间距恒 16、整块垂直居中）+ 页脚两行（798 起，12pt 黑30%）。
       注意：起始页**没有**「演乾坤 · 知天命」副标（以设计稿文档为准，其内嵌缩略图是旧版）。 -->
  <view class="home nt-page-safe" :style="pageStyle">
    <view class="nt-nav" :style="navStyle">
      <text class="nt-nav-about nt-press" @click="$emit('about')">关于</text>
    </view>

    <view class="nt-hero">
      <image class="nt-hero-logo" :src="themeLogo" mode="aspectFit" />
      <text class="nt-hero-title">{{ about.name }}</text>
      <view class="nt-hero-pill nt-pill" :class="{ 'nt-ph-off': !!input || focused }">
        <!-- 常驻强调光环：独立子节点（第一个孩子），只管呼吸，不参与点击与布局。
             ⚠️ 不能把呼吸动画写到 .nt-hero-pill 自身上：一个元素只有一个 animation 槽位，
                会与首屏入场动画 nt-rise 互相覆盖（详见 theme.css 的 .nt-halo 注释）。 -->
        <view class="nt-halo"></view>
        <input
          class="nt-pill-input"
          :value="input"
          type="text"
          confirm-type="send"
          @input="onInput"
          @confirm="send"
          @focus="onFocus"
          @blur="onBlur"
        />
        <!-- 滚动搜索建议（真实词条，内容来自 settings.js 的 searchHints 单一真源）。
             结构：.nt-ph（裁切窗，48pt 高）> .nt-ph-track（整列）> N 个 .nt-ph-item + 1 个首词条副本。
             轮换节奏（停留 5s → 上滑一行 0.5s，同百度首页）与分档 keyframe `nt-ph-step`
             全在 theme.css，本壳不写任何动画值；该 keyframe 与词条条数绑定（当前 9 条）。
             末尾副本是无缝衔接的关键（滑到 -N×48 时窗口里那行与第一行逐像素相同）。
             输入非空或已聚焦 → 根节点带 .nt-ph-off，整体隐去（HIG：占位提示不与真实输入重叠；
             聚焦时也让位，因为微信里聚焦态的 input 是原生组件、层级更高）。 -->
        <view class="nt-ph" v-if="about.searchHints && about.searchHints.length">
          <view class="nt-ph-track">
            <text class="nt-ph-item" v-for="(t, i) in phItems" :key="i">{{ t }}</text>
          </view>
        </view>
        <view class="nt-pill-search nt-press" @click="send">
          <view class="nt-icon nt-i-search"></view>
        </view>
      </view>
      <text class="nt-hero-note">{{ about.homeDisclaimer }}</text>
    </view>

    <!-- H5：PWA 安装引导（非设计稿元素，仅浏览器形态） -->
    <!-- #ifdef H5 -->
    <view v-if="platform === 'h5' && canInstall" class="home-install">
      <view>
        <text class="home-install-t">安装「玄玖灵犀」到桌面</text>
        <text class="home-install-d">可离线运行，安装为 APP</text>
      </view>
      <view class="home-install-btn" @click="installApp">安装</view>
    </view>
    <!-- #endif -->

    <view class="nt-foot">
      <text class="nt-setfoot-line">{{ about.icp }}</text>
      <text class="nt-setfoot-line">{{ about.footerCopy }}</text>
    </view>
  </view>
</template>

<script>
// 首页（输入页）：只负责收集输入并发出提问；结果展示在独立结果页。
// 问答流转走共享 conversation.js（单轮）；结果排版走共享 result-format.js；视觉规范走 theme.css。
import Settings from '@/modules/SettingsModule/settings.js'
import Storage from '@/modules/StorageModule/storage.js'
import Analyzer from '@/modules/AnalyzerModule/analyzer.js'
import Conversation from '@/modules/HomeModule/conversation.js'
import ResultFormat from '@/modules/HomeModule/result-format.js'
import SafeArea from '@/modules/UIModule/safe-area.js'
import Theme from '@/modules/UIModule/theme.js'
import '@/modules/UIModule/theme.css'

// #ifdef H5
import Env from '@/modules/EnvModule/env.js'
// #endif

export default {
  name: 'HomeModule',
  emits: ['about', 'result', 'themechange'],
  data() {
    var th = Theme.current()
    return {
      input: '',
      focused: false,     // 是否已聚焦（聚焦即隐去滚动词条，见模板注释）
      platform: 'native',
      canInstall: false,
      nav: SafeArea.DEFAULTS,
      themeLogo: Theme.logoFor(th),
      about: Settings.about()
    }
  },
  computed: {
    // 滚动词条渲染列表 = searchHints + 首词条副本（副本是实现"无缝循环"的像素级对位，见模板注释）
    phItems() {
      var h = this.about.searchHints || []
      return h.length ? h.concat([h[0]]) : []
    },
    // 小程序端用行内避让状态栏/胶囊（.nt-nav 顶部 = margin-top nav.top）；H5/APP 走 CSS env()
    navStyle() {
      // #ifdef MP-WEIXIN
      return { marginTop: this.nav.top + 'px' }
      // #endif
      // #ifndef MP-WEIXIN
      return {}
      // #endif
    },
    // 小程序端 WXSS 不支持 env() → 手势条避让由 safe-area.js 行内注入；H5/APP 走 .nt-page-safe 的 env()
    pageStyle() {
      // #ifdef MP-WEIXIN
      return { paddingBottom: this.nav.bottom + 'px' }
      // #endif
      // #ifndef MP-WEIXIN
      return {}
      // #endif
    }
  },
  onLoad() {
    // 共享问答实例（引擎 + 存储 装配一次）
    this.conv = Conversation.createConversation({ analyzer: Analyzer, storage: Storage })
    // 安全区：状态栏/胶囊/手势条，单一真源一次算全
    this.nav = SafeArea.calc()
    // 形态检测
    // #ifdef H5
    this.platform = Env.detectPlatform()
    this.canInstall = Env.canInstall()
    var onAvail = function () { this.canInstall = true }.bind(this)
    var onGone = function () { this.canInstall = false }.bind(this)
    window.addEventListener('nt:installavailable', onAvail)
    window.addEventListener('nt:installed', onGone)
    this._cleanup = function () {
      window.removeEventListener('nt:installavailable', onAvail)
      window.removeEventListener('nt:installed', onGone)
    }
    // #endif
    // #ifdef MP-WEIXIN
    this.platform = 'mp-weixin'
    // #endif
    // #ifdef APP-PLUS
    this.platform = 'app'
    // #endif
  },
  onUnload() {
    // #ifdef H5
    if (this._cleanup) this._cleanup()
    // #endif
  },
  methods: {
    onInput(e) {
      this.input = (e && e.detail ? e.detail.value : (e.target && e.target.value)) || ''
    },
    onFocus() { this.focused = true },
    onBlur() { this.focused = false },
    send() {
      // 主题切换只在搜索框内实现（单一真源 theme.js；三端一致）：命中切换词 → 切主题、清输入、提示，不进结果页
      if (Theme.isToggleCommand && Theme.isToggleCommand(this.input)) {
        var next = Theme.toggle()
        this.themeLogo = Theme.logoFor(next)
        this.input = ''
        this.$emit('themechange', next)   // 壳层把 .nt-dark / 窗口底色同步到位（pages/index 的 onThemeChange）
        return
      }
      // 问答流转走共享 conversation.js；命中后把结构化结果抛给壳层切到结果页
      var r = this.conv.ask(this.input)
      if (!r.ok) return
      var shaped = ResultFormat.format(r.answer)
      shaped.question = r.question
      this.input = ''
      this.$emit('result', shaped)
    },
    // #ifdef H5
    installApp() { Env.promptInstall() },
    // #endif
  }
}
</script>

<style scoped>
/* 布局仅此一处；尺寸/字色/间距/图标全部走 theme.css 的 --nt-* 与 .nt-*（单一真源） */
.home {
  display: flex; flex-direction: column; flex: 1; min-height: 0;
  background: var(--nt-bg); color: var(--nt-ink);
}

/* PWA 安装引导（H5，非设计稿元素）：反白字用 --nt-bg（与 --nt-ink 对拉的那一端），
   按钮不画描边（同全站规则），改用半透明白底表达可点。 */
.home-install { display: flex; align-items: center; justify-content: space-between; margin: 0 16px 12px; padding: 12px 16px; background: var(--nt-ink); color: var(--nt-bg); border-radius: var(--r-md); }
.home-install-t { display: block; font-size: var(--fs-sub); font-weight: var(--fw-mid); }
.home-install-d { display: block; font-size: var(--fs-cap); opacity: .8; }
.home-install-btn { padding: 6px 16px; background: rgba(255, 255, 255, .18); border-radius: var(--r-pill); font-size: var(--fs-cap); }
.nt-dark .home-install-btn { background: rgba(0, 0, 0, .12); }

/* 响应式（HIG）：平板 768+ 限宽 640 居中，电脑 1024+ 限宽 720（token 见 theme.css 文末） */
@media screen and (min-width: 768px) { .home { max-width: var(--w-tablet); margin: 0 auto; width: 100%; } }
@media screen and (min-width: 1024px) { .home { max-width: var(--w-desktop); } }
</style>
