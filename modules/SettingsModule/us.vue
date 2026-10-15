<template>
  <view class="us nt-page-safe">
    <!-- 统一固定上导航栏（.nt-nav，theme.css 单一真源）：返回「‹」（源 后退.svg）+ 标题「关于我们」居中 -->
    <view class="nt-nav" :style="navStyle">
      <view class="nt-nav-back nt-press" @click="$emit('back')">
        <view class="nt-icon nt-i-back"></view>
      </view>
      <text class="nt-nav-title">{{ about.usPageTitle }}</text>
    </view>

    <scroll-view class="us-body" scroll-y enhanced :show-scrollbar="false">
      <!-- 「关于我们」页（设计稿 关于我们）：品牌区 + 3 张卡（星玖工作室 / 协议条款 / 开源声明）
           3 项点进各自内容详情页；文案全部取自 settings.js 单一真源，壳不另写。 -->
      <view class="us-brand">
        <image class="us-brand-logo" :src="themeLogo" mode="aspectFit" />
        <text class="us-brand-name">{{ about.name }}</text>
        <text class="us-brand-sub">{{ about.slogan }}</text>
      </view>

      <view class="nt-setlist">
        <view
          class="nt-setrow"
          v-for="row in about.usRows"
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

    <!-- 底部信息条（与设计稿内容页固定底条一致：免责 + 版本） -->
    <view class="nt-foot">
      <text class="nt-setfoot-line" v-for="(l, i) in footLines" :key="i">{{ l }}</text>
    </view>
  </view>
</template>

<script>
// 「关于我们」页（设计稿 关于我们）：只负责展示 usRows 3 张卡，点项交壳切内容详情页。
// 文案/标题/底部行全取 settings.js 单一真源；视觉走 theme.css。安全区走 safe-area.js。
import Settings from '@/modules/SettingsModule/settings.js'
import SafeArea from '@/modules/UIModule/safe-area.js'
import Theme from '@/modules/UIModule/theme.js'
import '@/modules/UIModule/theme.css'
export default {
  name: 'UsView',
  emits: ['back', 'detail'],
  data() {
    var th = Theme.current()
    return { about: Settings.about(), nav: SafeArea.DEFAULTS, themeLogo: Theme.logoFor(th) }
  },
  computed: {
    footLines() { return this.about.aboutFoot },
    navStyle() {
      // #ifdef MP-WEIXIN
      return { marginTop: this.nav.top + 'px' }
      // #endif
      // #ifndef MP-WEIXIN
      return {}
      // #endif
    }
  },
  onLoad() { this.nav = SafeArea.calc() },
  methods: {
    onRow(row) { this.$emit('detail', row.id) }
  }
}
</script>

<style scoped>
/* 布局仅此一处；视觉规范全部走 theme.css 的 --nt-* 变量与 .nt-* 类 */
.us { display: flex; flex-direction: column; flex: 1; min-height: 0; background: var(--nt-bg); color: var(--nt-ink); }

/* scroll-view 在 flex 列里必须 flex:1 + min-height:0 + height:0（基线），否则高度不确定无法滚动 */
.us-body { flex: 1; min-height: 0; height: 0; padding: 0 24px; box-sizing: border-box; }

/* 品牌区（与关于页同规格：Logo 72×80.4 → 玄玖灵犀 22pt/600 → 副标题 12pt 黑30%） */
.us-brand { display: flex; flex-direction: column; align-items: center; padding: 32px 16px 20px; }
.us-brand-logo { width: 72px; height: 80.4px; }
.us-brand-name { margin-top: 12px; font-size: var(--fs-xl); font-weight: var(--fw-mid); letter-spacing: 1.6px; }
.us-brand-sub { margin-top: 8px; font-size: var(--fs-note); font-weight: var(--fw-mid); color: var(--nt-foot); letter-spacing: 0.8px; }

.nt-setlist { margin-bottom: 8px; }

/* 平板/电脑：限宽居中（规范 §6.2） */
@media screen and (min-width: 768px) { .us { max-width: 640px; margin: 0 auto; width: 100%; } }
@media screen and (min-width: 1024px) { .us { max-width: 720px; } }
</style>
