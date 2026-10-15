<template>
  <view class="home nt-page-safe">
    <!-- 统一固定上导航栏（.nt-nav，theme.css 单一真源）：首页只显「关于」（元素绝对定位、无左右槽；顶格 24pt 留白边） -->
    <view class="nt-nav" :style="navStyle">
      <text class="nt-nav-about nt-press" @click="$emit('about')">关于</text>
    </view>

    <!-- 空态：Logo + 标题 + 搜索胶囊（内含放大镜发送键）+ 免责声明（flex 垂直居中） -->
    <view class="home-hero">
      <image class="home-hero-logo" :src="themeLogo" mode="aspectFit" />
      <text class="home-hero-title">玄玖灵犀</text>
      <view class="home-hero-pill nt-pill">
        <input
          class="nt-pill-input"
          :value="input"
          :placeholder="placeholder"
          placeholder-style="color:#8E8E93;font-size:17px"
          type="text"
          confirm-type="send"
          @input="onInput"
          @confirm="send"
        />
        <view class="nt-pill-search nt-press" @click="send">
          <view class="nt-icon nt-i-search"></view>
        </view>
      </view>
      <text class="home-hero-disclaimer">{{ homeDisclaimer }}</text>
    </view>

    <!-- H5：PWA 安装引导 -->
    <!-- #ifdef H5 -->
    <view v-if="platform === 'h5' && canInstall" class="home-install">
      <view>
        <text class="home-install-t">安装「玄玖灵犀」到桌面</text>
        <text class="home-install-d">可离线运行，安装为 APP</text>
      </view>
      <view class="home-install-btn" @click="installApp">安装</view>
    </view>
    <!-- #endif -->

    <!-- 底部：ICP + 版权 -->
    <view class="home-footer">
      <text class="home-footer-icp">{{ icp }}</text>
      <text class="home-footer-copy">{{ footerCopy }}</text>
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
  emits: ['about', 'result'],
  data() {
    var about = Settings.about()
    var th = Theme.current()
    return {
      input: '',
      platform: 'native',
      canInstall: false,
      nav: SafeArea.DEFAULTS,
      themeLogo: Theme.logoFor(th),
      icp: about.icp,
      footerCopy: about.footerCopy,
      homeDisclaimer: about.homeDisclaimer,
      placeholder: about.placeholder
    }
  },
  computed: {
    // 小程序端用行内避让状态栏/胶囊（.nt-nav 顶部 = margin-top nav.top）；H5/APP 走 CSS env()
    navStyle() {
      // #ifdef MP-WEIXIN
      return { marginTop: this.nav.top + 'px' }
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
    send() {
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
/* 布局仅此一处；视觉规范全部走 theme.css 的 --nt-* 变量与 .nt-* 类 */
.home { display: flex; flex-direction: column; flex: 1; min-height: 0; background: var(--nt-bg); color: var(--nt-ink); }

/* 顶栏规格走 theme.css 的 .nt-nav（单一真源）；此处只留本页正文布局 */

.home-hero { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 32px; }
.home-hero-logo { width: 72px; height: 80.4px; }
/* 定稿v3 §2：品牌名 22.9pt/600；搜索胶囊 1.3pt/内文15.6pt/放大镜14.7pt（走 theme.css） */
.home-hero-title { margin-top: 16px; font-size: var(--fs-xl); font-weight: var(--fw-mid); letter-spacing: 1.6px; line-height: 1.15; }
.home-hero-pill { margin-top: 16px; width: 272px; max-width: 100%; }
.home-hero-disclaimer { margin-top: 16px; font-size: var(--fs-note); font-weight: var(--fw-mid); color: var(--nt-foot); text-align: center; }

/* PWA 安装（H5） */
.home-install { display: flex; align-items: center; justify-content: space-between; margin: 0 16px 12px; padding: 12px 16px; background: var(--nt-ink); color: var(--nt-paper); border-radius: var(--r-md); }
.home-install-t { display: block; font-size: var(--fs-sub); font-weight: var(--fw-mid); }
.home-install-d { display: block; font-size: var(--fs-cap); opacity: .8; }
.home-install-btn { padding: 6px 16px; border: 1px solid var(--nt-paper); border-radius: var(--r-pill); font-size: var(--fs-cap); }

/* 底部：ICP + 版权（定稿v3 §2：12.5pt/600、纯黑 30%；避让手势条由 nt-page-safe 处理） */
.home-footer { padding: 16px 24px 46px; text-align: center; flex-shrink: 0; }
.home-footer-icp { display: block; font-size: var(--fs-note); font-weight: var(--fw-mid); color: var(--nt-foot); line-height: 15px; }
.home-footer-copy { display: block; font-size: var(--fs-note); font-weight: var(--fw-mid); color: var(--nt-foot); line-height: 15px; }

/* 平板/电脑：限宽居中（规范 §6.2） */
@media screen and (min-width: 768px) { .home { max-width: 640px; margin: 0 auto; } }
@media screen and (min-width: 1024px) { .home { max-width: 720px; } }
</style>
