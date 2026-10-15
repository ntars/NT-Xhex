<template>
  <view class="page" :class="pageClass">
    <!-- 首页：输入 -->
    <HomeModule v-if="view === 'home'" @about="goAbout" @result="onResult" />
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
      enterClass: ''   // 转场动画类（nt-slide-in/back），由 transition 模块驱动；布局不动
    }
  },
  computed: {
    // .page 容器 = 主题类 + 转场类（动画集中在容器，各视图布局不受影响）
    pageClass() {
      var c = { 'nt-dark': this.isDark }
      if (this.enterClass) c[this.enterClass] = true
      return c
    }
  },
  onLoad() {
    // 共享问答实例（与 HomeModule 用同一份装配方式，返回时清空它）
    this.conv = Conversation.createConversation({ analyzer: Analyzer, storage: Storage })
    // 恢复上次这一问（刷新/重进不丢）
    var last = this.conv.restore()
    if (last) {
      var f = ResultFormat.format(last.answer)
      f.question = last.question
      this.result = f
      this.view = 'result'
    }
  },
  methods: {
    // 统一切视图：右滑入转场（transition.js 模块 single()；uni/PWA 无"上一页"DOM，用单层右滑入；布局不动，只挂 .page 容器）
    // 模块缺失时降级为无动画直切（view 切换本身仍生效，绝不影响运行）
    go(to, prep) {
      var from = this.view
      if (from === to) return
      if (prep) { for (var k in prep) this[k] = prep[k] }
      this.view = to
      var self = this
      if (Transition && typeof Transition.single === 'function') {
        Transition.single(from, to, function (cls) { self.enterClass = cls })
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
    onThemeChange(theme) { this.isDark = theme === 'dark' },
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
/* 布局仅此一处；视觉规范全部走 theme.css 的 --nt-* 变量与 .nt-* 类 */
.page {
  position: relative;
  height: 100vh;
  background: var(--nt-bg);
  color: var(--nt-ink);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
/* 平板/电脑：居中容器（规范 §6.2） */
@media screen and (min-width: 768px) { .page { max-width: 640px; margin: 0 auto; } }
@media screen and (min-width: 1024px) { .page { max-width: 720px; } }
</style>
