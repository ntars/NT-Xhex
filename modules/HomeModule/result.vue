<template>
  <!-- 结果页（设计稿「搜索结果页」，画布 402×874pt）
       顶栏标题「玄玖灵犀」+ 页名「搜索结果」（140,130 122×44）+ 单张正文范围卡
       （24,174 354×528，卡高 = 剩余空间，非魔数）+ 底部双按钮「导出图片 / 再问一个」
       （24/225,726 各 153×48，间距 48）+ 页脚两行。 -->
  <view class="res" :style="pageStyle">
    <view class="nt-nav" :style="navStyle">
      <view class="nt-nav-back nt-press" @click="$emit('back')">
        <view class="nt-icon nt-i-back"></view>
      </view>
      <text class="nt-nav-title">{{ about.navTitle }}</text>
    </view>

    <!-- 页名：单算法时用该算法标题（设计稿「搜索结果」是兜底）；多算法/全套排盘时
         沿用「搜索结果」—— 否则页名会变成第一个算法的名字，看着像只算了一样。 -->
    <text class="nt-page-h">{{ (result.multi ? '' : result.title) || about.resultPageTitle }}</text>

    <scroll-view class="nt-pgbody" scroll-y enhanced :show-scrollbar="false">
      <view class="nt-dl-card">
        <text class="nt-dl-h1">{{ about.questionLabel }}</text>
        <text class="nt-dl-text nt-dl-text-light">{{ result.question }}</text>
        <!-- 全套排盘：八大类分组（用户规定顺序：万年历黄历 / 八字命理 / 紫微斗数 /
             六爻占卜 / 奇门遁甲 / 梅花易数 / 风水堪舆 / 解梦）。
             三级结构 = 类 → 块 → 段落。类名与块名都用 .nt-dl-h1（17pt 半粗），
             块名缩进一级、字号降为 15pt 只用中粗，靠字号与缩进分层，不加描边底色。 -->
        <template v-if="result.grouped">
          <view class="res-group" v-for="(g, gi) in result.groups" :key="gi">
            <text class="nt-dl-h1 res-group-title">{{ g.name }}</text>
            <view class="res-group-block" v-for="(s, si) in g.blocks" :key="si">
              <text class="res-block-head" v-if="s.title">{{ s.title }}</text>
              <text class="nt-dl-text nt-dl-text-light" v-if="s.lead">{{ s.lead }}</text>
              <view class="res-block" v-for="(b, bi) in s.blocks" :key="bi">
                <text class="res-block-label" v-if="b.label">{{ b.label }}</text>
                <text class="nt-dl-text nt-dl-text-light">{{ b.text }}</text>
              </view>
            </view>
          </view>
          <!-- 类外尾巴：哪几块因缺额外条件没排（解梦要梦境、阳宅要户型…），
               不归入任何一类，放最末一行，用户可直接追问。 -->
          <text class="res-tail-note" v-if="result.note">{{ result.note }}</text>
        </template>
        <!-- 多算法并列（用户点名多个算法时）：每个【标题】一小节 -->
        <template v-else-if="result.multi">
          <view class="res-section" v-for="(s, si) in result.sections" :key="si">
            <text class="res-section-title nt-dl-h1" v-if="s.title">{{ s.title }}</text>
            <text class="nt-dl-text nt-dl-text-light" v-if="s.lead">{{ s.lead }}</text>
            <view class="res-block" v-for="(b, bi) in s.blocks" :key="bi">
              <text class="res-block-label" v-if="b.label">{{ b.label }}</text>
              <text class="nt-dl-text nt-dl-text-light">{{ b.text }}</text>
            </view>
          </view>
        </template>
        <!-- 单算法：原有结构不变 -->
        <template v-else>
          <text class="nt-dl-h1 res-lead-h" v-if="result.lead">{{ result.lead }}</text>
          <view class="res-block" v-for="(b, i) in result.blocks" :key="i">
            <text class="res-block-label" v-if="b.label">{{ b.label }}</text>
            <text class="nt-dl-text nt-dl-text-light">{{ b.text }}</text>
          </view>
        </template>
      </view>
    </scroll-view>

    <!-- 底部双按钮（设计稿：导出图片 = 描边；再问一个 = 黑底） -->
    <view class="nt-dual">
      <view class="nt-pill-btn ghost" @click="exportImage">{{ about.resultActions.export }}</view>
      <view class="nt-pill-btn" @click="$emit('back')">{{ about.resultActions.again }}</view>
    </view>

    <view class="nt-foot">
      <text class="nt-setfoot-line" v-for="(l, i) in about.aboutFoot" :key="i">{{ l }}</text>
    </view>

    <!-- 导出图片专用离屏画布（小程序端走 Canvas 2D 接口；H5 端另用 document.createElement 建画布） -->
    <canvas type="2d" id="ntExportCanvas" class="nt-export-canvas"></canvas>

    <view class="nt-toast" v-if="toastOpen">{{ toastText }}</view>
  </view>
</template>

<script>
// 结果页：只负责展示 result-format.js 加工好的结构化结果 + 导出图片。
// 排版结构与小程序结果页、PWA 结果页完全一致（同一套类名与 theme.css 变量）。
// 导出图片的**版式与绘制**走共享 ExportModule/export-image.js（三端同一份），本组件只做「取画布 / 出文件」。
import Settings from '@/modules/SettingsModule/settings.js'
import SafeArea from '@/modules/UIModule/safe-area.js'
import ExportImage from '@/modules/ExportModule/export-image.js'
import '@/modules/UIModule/theme.css'

var EMPTY = { title: '', lead: '', blocks: [], question: '' }

export default {
  name: 'ResultView',
  props: {
    result: { type: Object, default: function () { return EMPTY } }
  },
  emits: ['back'],
  data() {
    return { about: Settings.about(), nav: SafeArea.DEFAULTS, toastOpen: false, toastText: '' }
  },
  computed: {
    // 小程序端行内避让状态栏/胶囊（.nt-nav 顶部 = margin-top nav.top）；H5/APP 走 CSS env()
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
  onLoad() {
    // 安全区：单一真源一次算全
    this.nav = SafeArea.calc()
  },
  methods: {
    /**
     * 「导出图片」：把当前结果渲染成 PNG 并保存。
     *   · 版式与绘制一律走 export-image.js（build 出计划、paint 落笔），本组件不重画。
     *   · H5 → 建 canvas 出 blob 触发下载；MP-WEIXIN → 离屏 canvas + canvasToTempFilePath + 存相册；
     *     APP-PLUS → 提示改用网页版/小程序（原生相册 API 未接）。
     */
    exportImage() {
      var r = this.result
      // 多算法（grouped / multi）时正文在 groups/sections 里，判定要一并看，否则会误报「暂无可导出」
      if (!r || (!r.question && !(r.blocks && r.blocks.length) && !(r.sections && r.sections.length)
        && !(r.groups && r.groups.length))) { this.toast('暂无可导出的内容'); return }
      // meta 统一走 optsFrom（about 的单一装配，三端同一份；含二维码指向 exportMeta.qrUrl）
      var meta = ExportImage.optsFrom(this.about)

      // #ifdef H5
      var dpr = Math.min(window.devicePixelRatio || 1, 3)
      var measure = document.createElement('canvas').getContext('2d')
      var plan = ExportImage.build(r, meta, measure)
      var cv = document.createElement('canvas')
      cv.width = Math.round(plan.width * dpr)
      cv.height = Math.round(plan.height * dpr)
      var ctx = cv.getContext('2d')
      ctx.scale(dpr, dpr)
      // ⚠ paint 返回 Promise：须等位图（设计稿小程序码）加载完再出图，否则首次导出会缺码
      var self = this
      ExportImage.paint(ctx, plan).then(function () {
        var name = '玄玖灵犀-' + (r.title || '分析结果') + '.png'
        function save(url) {
          var a = document.createElement('a')
          a.href = url; a.download = name
          document.body.appendChild(a); a.click()
          setTimeout(function () { document.body.removeChild(a); if (url.indexOf('blob:') === 0) URL.revokeObjectURL(url) }, 0)
        }
        if (cv.toBlob) {
          cv.toBlob(function (blob) {
            if (!blob) { save(cv.toDataURL('image/png')) } else { save(URL.createObjectURL(blob)) }
            self.toast('已导出图片')
          }, 'image/png')
        } else {
          save(cv.toDataURL('image/png')); self.toast('已导出图片')
        }
      })
      // #endif

      // #ifdef MP-WEIXIN
      // ⚠️ 隐私红线：不主动写相册（uni.saveImageToPhotosAlbum 会触发 writePhotosAlbum 隐私授权），
      //    改为出临时 PNG 后 uni.previewImage 预览，用户长按走系统菜单自存 —— 不申请、不记录任何权限。
      var selfMp = this
      uni.showLoading({ title: '正在生成', mask: true })
      uni.createSelectorQuery().in(this).select('#ntExportCanvas').fields({ node: true, size: true }).exec(function (res) {
        var node = res && res[0] && res[0].node
        if (!node) { selfMp.fail('导出失败，请重试'); return }
        var canvas = node
        var cx = canvas.getContext('2d')
        var dprMp = 2
        try { dprMp = Math.min(uni.getWindowInfo().pixelRatio || 2, 3) } catch (e) { /* 取不到就 2 倍 */ }
        var planMp = ExportImage.build(r, meta, cx)          // ① 先量字排版
        canvas.width = Math.round(planMp.width * dprMp)      // ② 按计划定尺寸并落笔
        canvas.height = Math.round(planMp.height * dprMp)
        cx.scale(dprMp, dprMp)
        // ⚠ 同上：等位图加载完再 canvasToTempFilePath，否则码缺失
        ExportImage.paint(cx, planMp).then(function () {
          uni.canvasToTempFilePath({                          // ③ 出临时 PNG → 预览（不写相册、不申请权限）
            canvas: canvas,
            x: 0, y: 0, width: planMp.width, height: planMp.height,
            destWidth: planMp.width * dprMp, destHeight: planMp.height * dprMp,
            fileType: 'png',
            success: function (out) {
              uni.hideLoading()
              uni.previewImage({ urls: [out.tempFilePath], current: out.tempFilePath })
              selfMp.toast('长按图片可保存到相册')
            },
            fail: function () { selfMp.fail('导出失败，请重试') }
          })
        })
      })
      // #endif

      // #ifdef APP-PLUS
      this.toast('请在网页版或小程序中导出图片')
      // #endif
    },
    fail(text) { uni.hideLoading(); this.toast(text) },
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
   结果页答案分区（.res-lead-h / .res-block / .res-block-label）与视图容器 .res 的版式
   已集中在 theme.css（v3.1.0 去重），本壳只留「页面根 .res 的背景色 + 离屏画布 + 响应式限宽」。 */
.res {
  background: var(--nt-bg); color: var(--nt-ink);
}

/* 多算法并列的小节（一次提问命中多个功能块）：节间距与节标题样式已集中在
   theme.css 的 .res-section / .res-section-title（三端共用，见 v3.2.1），
   本壳不再重复定义，只留平台专属规则（离屏画布、响应式限宽）。 */

/* 导出图片离屏画布（移出可视区，不参与布局；实际尺寸由 JS 按版式计划设定） */
.nt-export-canvas { position: fixed; left: -9999px; top: 0; width: 402px; height: 640px; }

/* 响应式（HIG）：平板 768+ 限宽 640 居中，电脑 1024+ 限宽 720 */
@media screen and (min-width: 768px) { .res { max-width: var(--w-tablet); margin: 0 auto; width: 100%; } }
@media screen and (min-width: 1024px) { .res { max-width: var(--w-desktop); } }
</style>
