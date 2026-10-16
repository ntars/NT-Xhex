<template>
  <!-- 内容详情页（一稿两用 5 个子页：参考文献 / 功能介绍 / 星玖工作室 / 协议条款 / 开源声明）
       设计稿：顶栏标题「玄玖灵犀」+ 页名（140,130 122×44）+ 正文范围卡（24,174 354×600）
       + 页脚两行。文案全部取自 settings.js 单一真源（navTitle / resTitle / aboutNotes / aboutFoot）。 -->
  <view class="dl nt-page-safe" :style="pageStyle">
    <view class="nt-nav" :style="navStyle">
      <view class="nt-nav-back nt-press" @click="$emit('back')">
        <view class="nt-icon nt-i-back"></view>
      </view>
      <text class="nt-nav-title">{{ about.navTitle }}</text>
    </view>

    <text class="nt-page-h">{{ about.resTitle[panelId] }}</text>

    <scroll-view class="nt-pgbody" scroll-y enhanced :show-scrollbar="false">
      <view class="nt-dl-card">
        <view v-for="(item, i) in items" :key="i" class="nt-dl-item">
          <text class="nt-dl-h1" v-if="item.h">{{ item.h }}</text>
          <text class="nt-dl-text">{{ item.text }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="nt-foot">
      <text class="nt-setfoot-line" v-for="(l, i) in about.aboutFoot" :key="i">{{ l }}</text>
    </view>
  </view>
</template>

<script>
// 内容详情页（一稿两用）：按 panelId 展示 settings.js 的板块内容（aboutNotes[panelId] = [{h,text}]）。
// 排版走 theme.css 的 .nt-dl-*；「‹」回哪一级由壳（pages/index）按 backTarget 决定，本组件只发 back。
import Settings from '@/modules/SettingsModule/settings.js'
import SafeArea from '@/modules/UIModule/safe-area.js'
import '@/modules/UIModule/theme.css'

export default {
  name: 'DetailModule',
  props: {
    // 板块 id：refs | intro | studio | terms | open（清除项只弹窗，不走此页）
    panelId: { type: String, default: 'intro' }
  },
  emits: ['back'],
  data() {
    return { about: Settings.about(), nav: SafeArea.DEFAULTS }
  },
  computed: {
    // 板块内容 = aboutNotes[panelId] 的 [{h,text}] 数组（多段逐段渲染）
    items() {
      var a = this.about
      return (a.aboutNotes && a.aboutNotes[this.panelId]) || []
    },
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
    this.nav = SafeArea.calc()
  }
}
</script>

<style scoped>
/* 布局仅此一处；尺寸/字色/圆角/间距全部走 theme.css 的 --nt-* 与 .nt-*（单一真源） */
.dl {
  display: flex; flex-direction: column; flex: 1; min-height: 0;
  background: var(--nt-bg); color: var(--nt-ink);
}

/* 响应式（HIG）：平板 768+ 限宽 640 居中，电脑 1024+ 限宽 720 */
@media screen and (min-width: 768px) { .dl { max-width: var(--w-tablet); margin: 0 auto; width: 100%; } }
@media screen and (min-width: 1024px) { .dl { max-width: var(--w-desktop); } }
</style>
