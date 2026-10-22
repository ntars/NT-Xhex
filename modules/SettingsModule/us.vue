<template>
  <!-- 「关于我们」页（设计稿 关于我们，画布 402×874pt）
       导航「关于我们」+ 3 张卡（星玖工作室 / 协议条款 / 开源声明，130/230/330 各 354×84，卡距 16）
       + 页脚两行。
       ⚠️ 设计稿此页**没有品牌区**：3 张卡直接从 y130 起（与关于页品牌区同一 y），别照抄关于页。 -->
  <view class="us" :style="pageStyle">
    <view class="nt-nav" :style="navStyle">
      <view class="nt-nav-back nt-press" @click="$emit('back')">
        <view class="nt-icon nt-i-back"></view>
      </view>
      <text class="nt-nav-title">{{ about.usPageTitle }}</text>
    </view>

    <!-- 无页名：首块内容直接从导航内容底 +24 起排（= 设计稿首卡 y130）→ .nt-pt -->
    <scroll-view class="nt-pgbody nt-pt" scroll-y enhanced :show-scrollbar="false">
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

    <view class="nt-foot">
      <text class="nt-setfoot-line" v-for="(l, i) in about.aboutFoot" :key="i">{{ l }}</text>
    </view>
  </view>
</template>

<script>
// 「关于我们」页（二级 3 卡）：只负责展示 usRows，点项交壳切内容详情页。
// 文案/标题/底部行全取 settings.js 单一真源；视觉走 theme.css；安全区走 safe-area.js。
import Settings from '@/modules/SettingsModule/settings.js'
import SafeArea from '@/modules/UIModule/safe-area.js'
import '@/modules/UIModule/theme.css'

export default {
  name: 'UsView',
  emits: ['back', 'detail'],
  data() {
    return { about: Settings.about(), nav: SafeArea.DEFAULTS }
  },
  computed: {
    navStyle() {
      // #ifdef MP-WEIXIN
      return { marginTop: this.nav.top + 'px' }
      // #endif
      // #ifndef MP-WEIXIN
      return {}
      // #endif
    },
    // 手势条避让：H5/APP 走 CSS env(safe-area-inset-bottom)（theme.css H5 样式块已升为
    // 「设计带 与 设备安全区取大者」）；小程序端 WXSS 不支持 env()，由 safe-area.js 算出行内注入。
    // ⚠️ 不要再给页面根挂 .nt-page-safe：那个类的 34px 会与这里的行内值叠加成双重避让
    //    （v3.1.35 起因：小程序侧避让已改由 .nt-layer 每层承担，页面根留底正是「手势条白边」病灶）。
    pageStyle() {
      // #ifdef MP-WEIXIN
      return { paddingBottom: this.nav.bottom + 'px' }
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
/* 布局仅此一处；尺寸/字色/圆角/间距全部走 theme.css 的 --nt-* 与 .nt-*（单一真源） */
.us {
  display: flex; flex-direction: column; flex: 1; min-height: 0;
  background: var(--nt-bg); color: var(--nt-ink);
}

/* 响应式（HIG）：平板 768+ 限宽 640 居中，电脑 1024+ 限宽 720 */
@media screen and (min-width: 768px) { .us { max-width: var(--w-tablet); margin: 0 auto; width: 100%; } }
@media screen and (min-width: 1024px) { .us { max-width: var(--w-desktop); } }
</style>
