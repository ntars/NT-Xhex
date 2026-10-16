<template>
  <!-- 关于页（设计稿「关于页」，画布 402×874pt）
       导航「关于」+ 品牌区（信息组 24,130 354×148：Logo 64.27×72 → 玄玖灵犀 22pt → 演乾坤·知天命 12pt，间距 16）
       + 4 张设置卡（302/402/502/602 各 354×84，卡距 16，第 4 张全红态）+ 页脚两行。 -->
  <view class="ab nt-page-safe" :style="pageStyle">
    <view class="nt-nav" :style="navStyle">
      <view class="nt-nav-back nt-press" @click="$emit('back')">
        <view class="nt-icon nt-i-back"></view>
      </view>
      <text class="nt-nav-title">关于</text>
    </view>

    <!-- 无页名：首块内容直接从导航内容底 +24 起排（= 设计稿品牌区 y130）→ .nt-pt -->
    <scroll-view class="nt-pgbody nt-pt" scroll-y enhanced :show-scrollbar="false">
      <view class="nt-brand">
        <image class="nt-brand-logo" :src="themeLogo" mode="aspectFit" />
        <text class="nt-brand-name">{{ about.name }}</text>
        <text class="nt-brand-sub">{{ about.slogan }}</text>
      </view>

      <!-- 设置区 4 卡：refs/intro → 内容详情页；us → 关于我们页；清除项 → 就地弹窗（不走二级页） -->
      <view class="nt-setlist ab-setlist">
        <view
          class="nt-setrow"
          :class="{ danger: row.danger }"
          v-for="row in about.aboutRows"
          :key="row.id"
          @click="onRow(row)"
        >
          <view class="nt-setl">
            <text class="nt-setl-title">{{ row.title }}</text>
            <text class="nt-setl-desc">{{ row.desc }}</text>
          </view>
          <view class="nt-icon nt-i-chev"></view>
        </view>
      </view>
    </scroll-view>

    <view class="nt-foot">
      <text class="nt-setfoot-line" v-for="(l, i) in about.aboutFoot" :key="i">{{ l }}</text>
    </view>

    <!-- 清除缓存确认弹窗（设计稿「弹窗」：面板 354×184 圆角 24 白底描边 1pt；标题 22pt / 描述 15pt / 双按钮 135×44 间距 36） -->
    <!-- 出场动画：clearOpen 管「卸载」，clearClosing 管「播 nt-fall」。关闭时先挂退场类播 200ms，
         播完再卸载（见 closeModal）——直接 clearOpen=false 会把节点摘掉，退场动画来不及播。 -->
    <view class="nt-mask" :class="{ 'nt-mask-out': clearClosing }" v-if="clearOpen" @click="closeModal">
      <view class="nt-modal" @click.stop>
        <text class="nt-modal-title">{{ about.clearModal.title }}</text>
        <text class="nt-modal-desc">{{ about.clearModal.desc }}</text>
        <view class="nt-modal-btns">
          <view class="nt-pill-btn ghost" @click="closeModal">{{ about.clearModal.cancel }}</view>
          <view class="nt-pill-btn" @click="doClear">{{ about.clearModal.confirm }}</view>
        </view>
      </view>
    </view>

    <view class="nt-toast" v-if="toastOpen">{{ toastText }}</view>
  </view>
</template>

<script>
// 关于页（顶级 4 卡）：文案/标题/底部行全取 settings.js 单一真源；视觉走 theme.css；安全区走 safe-area.js。
import Settings from '@/modules/SettingsModule/settings.js'
import Conversation from '@/modules/HomeModule/conversation.js'
import Analyzer from '@/modules/AnalyzerModule/analyzer.js'
import Storage from '@/modules/StorageModule/storage.js'
import SafeArea from '@/modules/UIModule/safe-area.js'
import Theme from '@/modules/UIModule/theme.js'
import '@/modules/UIModule/theme.css'

export default {
  name: 'SettingsModule',
  emits: ['back', 'detail', 'us', 'themechange'],
  data() {
    return {
      about: Settings.about(),
      clearOpen: false,
      clearClosing: false,   // 退场动画门控：true 时给 .nt-mask 挂 .nt-mask-out 播 nt-fall
      toastOpen: false,
      toastText: '',
      nav: SafeArea.DEFAULTS,
      themeLogo: Theme.logoFor(Theme.current())
    }
  },
  computed: {
    // 小程序端行内避让状态栏/胶囊；H5/APP 走 CSS env()
    navStyle() {
      // #ifdef MP-WEIXIN
      return { marginTop: this.nav.top + 'px' }
      // #endif
      // #ifndef MP-WEIXIN
      return {}
      // #endif
    },
    // 小程序端 WXSS 不支持 env() → 手势条避让由 safe-area.js 行内注入
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
    // 安全区：单一真源一次算全
    this.nav = SafeArea.calc()
  },
  methods: {
    onBack() { this.$emit('back') },
    // 点设置项：路由判定走 Settings.rowAction（单一真源，与 PWA/小程序同一份）
    onRow(row) {
      var act = Settings.rowAction(row)
      if (act === 'clear') { this.clearOpen = true; return }
      if (act === 'us') { this.$emit('us'); return }
      this.$emit('detail', row.id)
    },
    // 退场时长：与 theme.css 的 --d-modal-out(200ms) 保持一致（三端各写一个带注释常量，见 app.js 同处说明）
    MODAL_OUT_MS: 200,
    // 统一的「播退场 → 再卸载」收尾：cancel / Esc / 点遮罩 / 确认 都走这里，避免各写一遍。
    closeModal(then) {
      if (this._modalClosing) return
      this._modalClosing = true
      this.clearClosing = true                    // 挂 .nt-mask-out，播 nt-fall（淡出 + 下沉 200ms）
      var self = this
      setTimeout(function () {
        self.clearOpen = false                    // 卸载节点
        self.clearClosing = false
        self._modalClosing = false
        if (then) then()
      }, self.MODAL_OUT_MS)
    },
    doClear() {
      // 先清数据/同步状态，再走统一的退场收尾（then 里不再动弹窗相关状态）
      Settings.clearData()
      // 同步清空共享问答实例的当前结果
      var conv = Conversation.createConversation({ analyzer: Analyzer, storage: Storage })
      conv.clear()
      // 清缓存会重置主题偏好（回落跟随系统）→ 重读主题、刷新品牌 logo；
      // 并 emit themechange，让页面根元素（.page/.nt-dark）同步反色，否则清完主题看着没变
      var next = Theme.current()
      this.themeLogo = Theme.logoFor(next)
      this.$emit('themechange', next)
      this.closeModal()
      this.toast(this.about.clearModal.done)
    },
    toast(text) {
      var self = this
      this.toastText = text
      this.toastOpen = true
      clearTimeout(this._toastTimer)
      this._toastTimer = setTimeout(function () { self.toastOpen = false }, 2000)
    }
  }
}
</script>

<style scoped>
/* 布局仅此一处；尺寸/字色/圆角/间距全部走 theme.css 的 --nt-* 与 .nt-*（单一真源）。
   视图容器 .ab 的 flex 版式与 .ab-setlist 节奏已集中在 theme.css（v3.1.0 去重），
   本壳只留「页面根 .ab 的背景色 + 响应式限宽」。 */
.ab {
  background: var(--nt-bg); color: var(--nt-ink);
}

/* 响应式（HIG）：平板 768+ 限宽 640 居中，电脑 1024+ 限宽 720 */
@media screen and (min-width: 768px) { .ab { max-width: var(--w-tablet); margin: 0 auto; width: 100%; } }
@media screen and (min-width: 1024px) { .ab { max-width: var(--w-desktop); } }
</style>
