<template>
  <view class="res nt-page-safe">
    <!-- 统一固定上导航栏（.nt-nav，theme.css 单一真源）：返回「‹」（源 后退.svg 放大 13×26）+ 标题居中；元素绝对定位、无左右槽 -->
    <view class="nt-nav" :style="navStyle">
      <view class="nt-nav-back nt-press" @click="$emit('back')">
        <view class="nt-icon nt-i-back"></view>
      </view>
      <text class="nt-nav-title">{{ result.title || '分析结果' }}</text>
    </view>

    <scroll-view class="res-body" scroll-y enhanced :show-scrollbar="false">
      <!-- 提问回显（二级页样式：正文范围卡 发丝线0.6pt + 顶格排版） -->
      <view class="nt-dl-card">
        <text class="nt-dl-h1">你的提问</text>
        <text class="nt-dl-text">{{ result.question }}</text>
      </view>

      <!-- 分析结果：导语 + 分节段落（§4.5：15pt 苹方黑·顶格；左侧 2px 黑竖线标记保留） -->
      <view class="nt-dl-card">
        <text class="nt-dl-h1" v-if="result.lead">{{ result.lead }}</text>
        <view class="res-block nt-mark" v-for="(b, i) in result.blocks" :key="i">
          <text class="res-block-label" v-if="b.label">{{ b.label }}</text>
          <text class="nt-dl-text res-block-text">{{ b.text }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部：再问一个 -->
    <view class="res-bar">
      <view class="nt-pill-btn res-again" @click="$emit('back')">再问一个</view>
    </view>

    <!-- 底部信息条（§4.6：固定底条，与首页页脚同规格同位置；免责+版本，版本取 settings 真值） -->
    <view class="nt-foot">
      <text class="nt-setfoot-line" v-for="(l, i) in footLines" :key="i">{{ l }}</text>
    </view>
  </view>
</template>

<script>
// 结果页：只负责展示 result-format.js 加工好的结构化结果。
// 排版结构与小程序结果页完全一致（同一套类名与 theme.css 变量）。
// 安全区统一走 modules/UIModule/safe-area.js（单一真源）。
import Settings from '@/modules/SettingsModule/settings.js'
import SafeArea from '@/modules/UIModule/safe-area.js'
import '@/modules/UIModule/theme.css'

export default {
  name: 'ResultView',
  props: {
    result: { type: Object, default: function () { return { title: '', lead: '', blocks: [], question: '' } } }
  },
  data() {
    return { nav: SafeArea.DEFAULTS }
  },
  computed: {
    // 底部两行说明（定稿v3 §4.6：与关于页同，版本取 settings 真值）
    footLines() { return Settings.about().aboutFoot },
    // 小程序端行内避让状态栏/胶囊（margin-top 顶在 .nt-nav 上）；H5/APP 走 CSS env()
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
  }
}
</script>

<style scoped>
/* 布局仅此一处；视觉规范全部走 theme.css 的 --nt-* 变量与 .nt-* 类（定稿v3 §4） */
.res { display: flex; flex-direction: column; flex: 1; min-height: 0; background: var(--nt-bg); color: var(--nt-ink); }

/* 顶栏规格走 theme.css 的 .nt-nav（单一真源）；此处只留本页正文布局 */

/* scroll-view 在 flex 列里必须 flex:1 + min-height:0 + height:0（基线），否则高度不确定无法滚动 */
.res-body { flex: 1; min-height: 0; height: 0; padding: 0 24px; box-sizing: border-box; }
/* 两张正文范围卡（§4.3/§4.4：卡间 8pt 节奏） */
.res-body .nt-dl-card + .nt-dl-card { margin-top: 8px; }

/* 分节段落（左侧 2px 纯黑竖线标记保留；正文 15pt 顶格） */
.res-block { margin-bottom: 12px; }
.res-block + .res-block { padding-top: 12px; border-top: 0.8px solid var(--nt-line); }
.res-block-label { display: block; font-size: var(--fs-note); font-weight: var(--fw-mid); color: var(--nt-text-2); letter-spacing: 0.4px; margin-bottom: 4px; }

/* 「再问一个」按钮条 + 底部信息条（.nt-foot 固定底条；底部手势条避让移到 foot 上，位置与首页一致） */
.res-bar { display: flex; justify-content: center; padding: 12px 16px; flex-shrink: 0; }
.res-again { width: 100%; max-width: 320px; }
.res .nt-foot { padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }

/* 平板/电脑：限宽居中（§6.2） */
@media screen and (min-width: 768px) { .res { max-width: 640px; margin: 0 auto; width: 100%; } }
@media screen and (min-width: 1024px) { .res { max-width: 720px; } }
</style>
