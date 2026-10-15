/**
 * modules/UIModule/theme.js —— 黑白双色主题【单一真源】（纯逻辑，平台无关）
 *
 * 设计：项目视觉为黑白冷淡风（Normcore）。提供「浅色 / 深色」两套主题：
 *   · 浅色（默认）：纯白底 + 纯黑字
 *   · 深色：纯黑底 + 纯白字（整体反色）
 *   · 全局反色只作用于「界面色板」（背景/文字/描边/阴影/线性图标）；
 *     宜忌、五行等业务内容的语义色不随主题翻转（见 theme.css 深色块说明）。
 *
 * 行为规则：
 *   1. 首次/未手动选择 → 跟随系统深浅（matchMedia / wx.getWindowInfo().theme）
 *   2. 用户手动切换 → 持久化到本地（storage.settings.theme）
 *   3. 清除缓存（storage.clearAll）→ 回落为跟随系统
 *   4. 三端（小程序 / uni-app / PWA）共用本模块与 theme.css 的 .nt-dark 变量，绝不各写一份。
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

  // 系统深浅（跨形态：浏览器 matchMedia；小程序 getWindowInfo().theme；都没有则浅色）
  function systemDark() {
    try {
      if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches) return true;
    } catch (e) { /* ignore */ }
    try {
      if (typeof wx !== 'undefined' && wx && wx.getWindowInfo) {
        var info = wx.getWindowInfo();
        if (info && info.theme === 'dark') return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  // 当前生效主题（手动优先，否则跟随系统）
  function current() {
    var p = getPref();
    if (p === 'light' || p === 'dark') return p;
    return systemDark() ? 'dark' : 'light';
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
  // 由搜索框文本触发切换；命中则应用并返回新主题，否则返回 null（不改动）
  function toggleFromInput(text, rootEl) {
    if (!isToggleCommand(text)) return null;
    return toggle(rootEl);
  }

  return {
    current: current,
    isDark: isDark,
    apply: apply,
    toggle: toggle,
    isToggleCommand: isToggleCommand,
    toggleFromInput: toggleFromInput,
    // 根元素按主题取 logo（深色用白色词标）
    logoFor: function (theme) {
      return theme === 'dark' ? '/static/icons/logo-white.png' : '/static/icons/logo.png';
    }
  };
});
