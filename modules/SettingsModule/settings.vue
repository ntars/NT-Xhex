<template>
  <view class="ab nt-page-safe">
    <!-- 统一固定上导航栏（.nt-nav，theme.css 单一真源）：返回「‹」（源 后退.svg）+ 标题「关于」居中；元素绝对定位、无左右槽 -->
    <view class="nt-nav" :style="navStyle">
      <view class="nt-nav-back nt-press" @click="onBack">
        <view class="nt-icon nt-i-back"></view>
      </view>
      <text class="nt-nav-title">关于</text>
    </view>

    <scroll-view class="ab-body" scroll-y enhanced :show-scrollbar="false">
      <!-- 品牌区（定稿v3 §3.2：Logo 72×80.6 → 玄玖灵犀 22.9/600 → 副标题 12.5/600/黑30%；居中普通区，非卡片） -->
      <view class="ab-brand">
        <image class="ab-brand-logo" :src="themeLogo" mode="aspectFit" />
        <text class="ab-brand-name">玄玖灵犀</text>
        <text class="ab-brand-sub">{{ about.slogan }}</text>
      </view>

      <!-- 设置区（原型：4 张独立卡 354×84、16pt 间距、发丝线 0.4pt；清除项全红态。
           3 项点进二级页面（§4 一稿两用）；清除项只弹通用弹窗（§5），不走二级页） -->
      <view class="nt-setlist">
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

    <!-- 底部信息条（定稿v3 §3.4：固定底条，与首页页脚同规格同位置；免责+版本，版本号取 settings 真值） -->
    <view class="nt-foot">
      <text class="nt-setfoot-line" v-for="(l, i) in footLines" :key="i">{{ l }}</text>
    </view>

    <!-- 清除缓存通用弹窗（定稿v3 §5：面板 354×192、双按钮 141×49 间距 24pt；取消=白底黑边、清除=黑底白字） -->
    <view class="nt-mask" v-if="clearOpen" @click="clearOpen = false">
      <view class="nt-modal" @click.stop>
        <text class="nt-modal-title">{{ about.clearModal.title }}</text>
        <text class="nt-modal-desc">{{ about.clearModal.desc }}</text>
        <view class="nt-modal-btns">
          <view class="nt-pill-btn ghost" @click="clearOpen = false">{{ about.clearModal.cancel }}</view>
          <view class="nt-pill-btn" @click="doClear">{{ about.clearModal.confirm }}</view>
        </view>
      </view>
    </view>

    <!-- 清除完成 Toast -->
    <view class="nt-toast" v-if="toastOpen">{{ toastText }}</view>
  </view>
</template>

<script>
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
    var th = Theme.current()
    return { about: Settings.about(), clearOpen: false, toastOpen: false, toastText: '', nav: SafeArea.DEFAULTS, themeLogo: Theme.logoFor(th) }
  },
  computed: {
    // 底部两行说明（版本号已在 about().aboutFoot 内取真值）
    footLines() { return this.about.aboutFoot },
    // 小程序端行内避让状态栏/胶囊；H5/APP 走 CSS env()
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
    // 安全区：单一真源一次算全
    this.nav = SafeArea.calc()
  },
  methods: {
    onBack() { this.$emit('back') },
    // 点设置项（定稿v3 §3.3/§4）：4 个内容项 → 二级页面（emit detail 交 shell 切视图）；清除项 → 通用弹窗（§5，不走二级页）
    onRow(row) {
      if (row.danger) { this.clearOpen = true; return }
      if (row.id === 'us') { this.$emit('us'); return }
      this.$emit('detail', row.id)
    },
    doClear() {
      Settings.clearData()
      // 同步清空共享问答实例的当前结果
      var conv = Conversation.createConversation({ analyzer: Analyzer, storage: Storage })
      conv.clear()
      this.clearOpen = false
      this.toastText = '已恢复出厂设置'
      this.toastOpen = true
      // 清缓存会重置主题偏好（回落跟随系统）→ 重读主题、刷新品牌 logo；
      // 并 emit themechange，让页面根元素（.page/.nt-dark）同步反色，否则清完主题看着没变
      var next = Theme.current()
      this.themeLogo = Theme.logoFor(next)
      this.$emit('themechange', next)
      var self = this
      clearTimeout(this._toastTimer)
      this._toastTimer = setTimeout(function () { self.toastOpen = false }, 2000)
    }
  }
}
</script>

<style scoped>
/* 布局仅此一处；视觉规范全部走 theme.css 的 --nt-* 变量与 .nt-* 类 */
.ab { display: flex; flex-direction: column; flex: 1; min-height: 0; background: var(--nt-bg); color: var(--nt-ink); }

/* 顶栏规格走 theme.css 的 .nt-nav（单一真源）；此处只留本页布局 */

/* scroll-view 在 flex 列里必须 flex:1 + min-height:0 + height:0（基线），否则高度不确定无法滚动 */
.ab-body { flex: 1; min-height: 0; height: 0; padding: 0 24px; box-sizing: border-box; }

/* 品牌区（定稿v3 §3.2：居中普通区，非卡片 —— Logo 72×80.6 → 玄玖灵犀 22.9/600 → 副标题 12.5/600/黑30%） */
.ab-brand { display: flex; flex-direction: column; align-items: center; padding: 32px 16px 20px; }
.ab-brand-logo { width: 72px; height: 80.4px; }
.ab-brand-name { margin-top: 12px; font-size: var(--fs-xl); font-weight: var(--fw-mid); letter-spacing: 1.6px; }
.ab-brand-sub { margin-top: 8px; font-size: var(--fs-note); font-weight: var(--fw-mid); color: var(--nt-foot); letter-spacing: 0.8px; }

/* 设置区下方留白（与底部说明拉开节奏；定稿 §3.3/§3.4） */
.nt-setlist { margin-bottom: 8px; }
.ab-body .nt-setfoot { margin-top: 24px; }

/* 平板/电脑：限宽居中（§6.2） */
@media screen and (min-width: 768px) { .ab { max-width: 640px; margin: 0 auto; width: 100%; } }
@media screen and (min-width: 1024px) { .ab { max-width: 720px; } }
</style>
