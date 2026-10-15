<template>
  <!-- 二级页面（定稿v3 §4：一稿两用 = 关于页 4 板块详情页；清除缓存不走此页，只弹 §5 弹窗）
       文案全部取自 settings.js 单一真源（resTitle / aboutNotes / aboutFoot），壳不另写。 -->
  <view class="dl nt-page-safe">
    <!-- 统一固定上导航栏（.nt-nav，theme.css 单一真源）：返回「‹」（源 后退.svg）+ 板块标题居中；元素绝对定位、无左右槽 -->
    <view class="nt-nav" :style="navStyle">
      <view class="nt-nav-back nt-press" @click="$emit('back')">
        <view class="nt-icon nt-i-back"></view>
      </view>
      <text class="nt-nav-title">{{ about.resTitle[panelId] }}</text>
    </view>

    <scroll-view class="dl-body" scroll-y enhanced :show-scrollbar="false">
      <!-- 正文范围卡（设计稿内容页：发丝线 0.4pt、卡内边 24pt）+ 正文（15pt 黑50%·顶格） -->
      <view class="nt-dl-card">
        <view v-for="(item, i) in items" :key="i" class="nt-dl-item">
          <text class="nt-dl-h1" v-if="item.h">{{ item.h }}</text>
          <text class="nt-dl-text">{{ item.text }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部信息条（固定底条，与首页页脚同规格同位置；免责+版本） -->
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
  data() {
    return { about: Settings.about(), nav: SafeArea.DEFAULTS }
  },
  computed: {
    // 板块内容 = aboutNotes[panelId] 的 [{h,text}] 数组（多段，逐段渲染；REF 页含算法示例）
    items() {
      var a = this.about
      return (a.aboutNotes && a.aboutNotes[this.panelId]) || []
    },
    // 小程序端行内避让状态栏/胶囊（.nt-nav 顶部 = margin-top nav.top）；H5/APP 走 CSS env()
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
    this.nav = SafeArea.calc()
  }
}
</script>

<style scoped>
/* 布局仅此一处；视觉规范全部走 theme.css 的 --nt-* 变量与 .nt-* 类（定稿v3 §4） */
.dl { display: flex; flex-direction: column; flex: 1; min-height: 0; background: var(--nt-bg); color: var(--nt-ink); }

/* 顶栏规格走 theme.css 的 .nt-nav（单一真源）；此处只留本页布局 */

/* 正文滚动区（§4.3/§4.4：左右 24pt） */
.dl-body { flex: 1; min-height: 0; height: 0; padding: 0 24px; box-sizing: border-box; }
.dl-body .nt-dl-card { margin-top: 24px; }
.dl-body .nt-setfoot { margin-top: 24px; }

/* 平板/电脑：限宽居中（§6.2） */
@media screen and (min-width: 768px) { .dl { max-width: 640px; margin: 0 auto; width: 100%; } }
@media screen and (min-width: 1024px) { .dl { max-width: 720px; } }
</style>
