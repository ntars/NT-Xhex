/**
 * modules/UIModule/theme.js —— 黑白双色主题【单一真源】（纯逻辑，平台无关）
 *
 * 设计：项目视觉为黑白冷淡风（Normcore）。提供「浅色 / 深色」两套主题：
 *   · 浅色（默认）：纯白底 + 纯黑字
 *   · 深色：纯黑底 + 纯白字（整体反色）
 *   · 全局反色只作用于「界面色板」（背景/文字/描边/阴影/线性图标）；
 *     宜忌、五行等语义色例外（见 theme.css 的 --nt-yi/--nt-ji/--wx-* 与深色块）。
 *
 * 判定规则（用户规定，**全部离线、不联网**；v3.1.0 起只有两种来源，无日出日落判定）：
 *   ① 系统界面模式：浏览器 matchMedia(prefers-color-scheme) / 小程序 wx.getWindowInfo().theme，
 *      以及 uni-app H5/APP 的 uni.getSystemInfoSync().theme。
 *      —— 读得出系统深浅时，**默认跟随系统**（系统深色 → 深色界面，系统浅色 → 浅色界面）。
 *   ② 搜索框关键词切换（手动）：输入命中「切换主题」等切换词 → 立即翻转并写 storage.settings.theme。
 *      手动值优先于系统模式（用户主动选择过的，就记住；清除缓存后回落 ①）。
 *
 * 优先级：手动偏好（②写入的） > 系统界面模式（①） > 默认浅色。
 *
 * 行为规则：
 *   1. 手动切换（搜索框命中）→ 写 storage.settings.theme，本次立即生效并 320ms 过渡
 *   2. 清除缓存（storage.clearAll）→ 回落 ① 系统界面模式
 *   3. 三端（小程序 / uni-app / PWA）共用本模块与 theme.css 的 .nt-dark 变量，绝不各写一份。
 *
 * 应用方式：在「根元素」上挂 .nt-dark 类，theme.css 的变量覆盖即整体生效。
 *   · 小程序：page 的根 <view>（.page）；uni-app：页面根 view；PWA：document.documentElement
 *
 * 加载：UMD —— 小程序被 require；浏览器挂全局 NT.theme。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../StorageModule/storage.js'));
  else { root.NT = root.NT || {}; root.NT.theme = factory(root.NT && root.NT.storage); }
})(typeof self !== 'undefined' ? self : this, function (Storage) {

  function getPref() {
    try { return (Storage.getSettings() || {}).theme || null; } catch (e) { return null; }
  }
  function setPref(t) {
    try { Storage.setSettings({ theme: t }); } catch (e) { /* noop */ }
  }

  // ① 系统界面模式（跨形态：浏览器/uni-H5 走 matchMedia；小程序走 wx.getWindowInfo().theme；uni-APP 走 uni）
  function systemDark() {
    try {
      if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches) return true;
    } catch (e) { /* ignore */ }
    try {
      if (typeof wx !== 'undefined' && wx && wx.getWindowInfo) {
        var info = wx.getWindowInfo();
        if (info && (info.theme === 'dark' || info.theme === 'light')) {
          return info.theme === 'dark';
        }
      }
    } catch (e) { /* ignore */ }
    try {
      // uni-app APP-PLUS：uni.getSystemInfoSync() 在 Android 高版本 / iOS 报 theme（'dark'/'light'）
      if (typeof uni !== 'undefined' && uni && uni.getSystemInfoSync) {
        var u = uni.getSystemInfoSync();
        if (u && (u.theme === 'dark' || u.theme === 'light')) {
          return u.theme === 'dark';
        }
      }
    } catch (e) { /* ignore */ }
    return null;   // null = 「读不出系统模式」（老系统/老基础库），此时回落手动偏好 → 默认浅色
  }

  // 当前生效主题：② 手动偏好（搜索框切换写入，最高优先）→ ① 系统界面模式 → 默认浅色
  function current() {
    var p = getPref();                       // ② 手动（清除缓存后消失）
    if (p === 'light' || p === 'dark') return p;
    var sys = systemDark();                   // ① 系统（null = 读不出）
    if (sys !== null) return sys ? 'dark' : 'light';
    return 'light';                          // 都没有 → 浅色默认
  }

  function isDark() { return current() === 'dark'; }

  // 把当前主题应用到「反色根」。深色时挂 .nt-dark（token 覆盖 + 图标反白）。
  // 浏览器/PWA/uni-H5：挂在 document.documentElement（全局根，三视图都继承）；
  // 传入的 rootEl（若自带 classList，如小程序 .page）也同步挂上，保证无 document 端可用。
  function apply(rootEl) {
    var dark = isDark();
    try {
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.classList.toggle('nt-dark', dark);
      }
    } catch (e) { /* noop */ }
    if (rootEl && rootEl.classList) rootEl.classList.toggle('nt-dark', dark);
    return dark;
  }

  // 切换（持久化 + 应用），返回切换后的主题
  // ⚠️ 「切换主题的动画」不在这里做：视觉过渡由 theme.css 的 `.nt-theme-fade` 门控块负责 ——
  //   只要根节点带着那个类，主题变量一变，底色/纸面/文字/图标就会自己 320ms 交叉渐变。
  //   本模块只负责「换主题」这件事本身（改值 + 挂 .nt-dark），动画是它的自然结果，
  //   所以三端（PWA / 小程序 / uni-app）不需要各写一份过渡逻辑。根节点挂类的位置见 theme.css 注释。
  // 彩蛋：切换成功后壳层会 toast「已切换为 X 主题」；这是全端一致唯一的彩蛋文案，
  //   由壳统一负责（本模块保持纯逻辑，不碰 DOM）。
  function toggle(rootEl) {
    var next = current() === 'dark' ? 'light' : 'dark';
    setPref(next);
    apply(rootEl);
    return next;
  }

  // ==================== 搜索框触发切换（单一真源：三壳统一）====================
  // 主题切换**只在搜索框内实现**（无独立按钮）：输入命中下列任一场景词即触发切换。
  // 规则：短命令精确匹配（整句），或长句包含关键词，避免吞掉正常玄学提问。
  var TOGGLE_EXACT = ['切换主题', '换个主题', '换主题', '主题切换', '切换', '切换颜色', '切换配色', '深浅色', '切换深浅', '暗黑', '反色'];
  var TOGGLE_CONTAIN = ['深色模式', '浅色模式', '黑色主题', '白色主题', '深色', '浅色', '黑模式', '白模式', '主题'];
  function isToggleCommand(text) {
    var t = String(text == null ? '' : text).trim();
    if (!t) return false;
    var low = t.toLowerCase();
    for (var i = 0; i < TOGGLE_EXACT.length; i++) if (low === TOGGLE_EXACT[i].toLowerCase()) return true;
    for (var j = 0; j < TOGGLE_CONTAIN.length; j++) if (low.indexOf(TOGGLE_CONTAIN[j].toLowerCase()) >= 0) return true;
    return false;
  }
  // 说明：曾经的 toggleFromInput（命中词→toggle 的合一步）已删 —— 三壳实际都是
  // 「先 isToggleCommand 判命中、命中再 Theme.toggle() 并各自 toast/清输入」的两步写法，
  // 合并版反而要壳再把命中与否分出来做提示，故留两步、不保留无人调用的合一步。

  return {
    current: current,
    apply: apply,
    toggle: toggle,
    isToggleCommand: isToggleCommand,
    // 说明：isDark() 保留为**模块内部**函数（apply() 依赖它），不再对外导出——
    //   各壳判深色都用 current() === 'dark'，从未调用过导出的 isDark，故移除该导出。
    // 根元素按主题取 logo（深色用白色词标）
    logoFor: function (theme) {
      return theme === 'dark' ? '/static/icons/logo-white.png' : '/static/icons/logo.png';
    }
  };
});
