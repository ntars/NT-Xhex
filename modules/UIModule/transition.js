/**
 * modules/UIModule/transition.js —— 页面转场【单一真源】（纯逻辑，平台无关）
 *
 * 两种模式（视觉 keyframe 全在 theme.css，本模块只判方向 + 给时长 + 给类名）：
 *   · 双层视差（小程序）：isBack(from,to) 判方向 → 壳据此渲染 back(旧页)/front(新页) 两层
 *     + 挂 stage-fwd/stage-back，视觉见 theme.css（旧页左移压暗、新页右滑入）。
 *   · 单层右滑入（PWA/uni，无"上一页"DOM）：single() 直接挂 nt-slide-in。
 *
 * 职责边界（动画与布局分离）：本模块只产出方向/类名/时长，不含 DOM/WXML/CSS。
 * 加载：UMD —— 小程序被 require（dist 由 sync-mp.js 生成）；浏览器挂全局 NT.transition。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.transition = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  // 视图层级深度：浅 → 深 为前进；深 → 浅 为返回。
  // ⚠️ 必须反映真实父子关系，否则方向会判反：
  //   home(0) 起始页
  //   ├ result(1) 结果页            ← 点「再问一个」回 home
  //   └ about(1) 关于页             ← 左上「‹」回 home
  //       └ us(2) 关于我们页         ← 左上「‹」回 about（**不能与 about 同级**：
  //            · about→us 深度 1→2 = 前进（新页自右滑入）✓
  //            · us→about 深度 2→1 = 返回（新页自左滑回）✓
  //            若 us 与 about 同为 1，两者深度相等会被判成前进 —— 从「关于我们」返回时
  //            会播成「起始页→关于」那种前进动画，用户实测反馈过。）
  //       └ detail(3) 内容详情页   ← 父页可能是 about 或 us，回任一个都算返回 ✓
  var DEPTH = { home: 0, result: 1, about: 1, us: 2, detail: 3 };
  var DURATION = 320; // 与 theme.css --d-page 保持一致
  // 总开关：false = 不播任何转场动画（布局/双层结构保留，静止态可正常跑，方便调试其他功能）
  var ANIM_ENABLED = true;

  /** 是否返回（目标比当前浅） */
  function isBack(from, to) { return (DEPTH[to] || 0) < (DEPTH[from] || 0); }

  /** 双层视差方向类：前进 stage-fwd / 返回 stage-back（ANIM_ENABLED=false 时返回空类=不播动画） */
  function dirClass(from, to) {
    if (!ANIM_ENABLED) return '';
    return isBack(from, to) ? 'stage-back' : 'stage-fwd';
  }

  /**
   * 单层滑入（PWA / uni-app，无"上一页"DOM）：按方向给类名，DURATION 后清除。
   *   前进 → nt-slide-in（新页自右滑入）
   *   返回 → nt-slide-in-back（新页自左滑回，方向与前进相反，才符合"返回"的直觉）
   * ANIM_ENABLED=false 时直接不挂类（不播动画）。
   * @param {string} from   上一视图（from===to 时调用方应不调用）
   * @param {string} to     目标视图
   * @param {Function} apply  把类名/空串写回，如 setData({enterClass: cls})
   * @returns {number} 定时句柄
   */
  function single(from, to, apply) {
    if (!ANIM_ENABLED) { apply(''); return; }
    apply(slideClass(from, to));
    var t = setTimeout(function () { apply(''); }, DURATION);
    return t;
  }

  /** 单层滑入的类名（供各壳自行挂/摘类时复用，避免各写一遍方向判断） */
  function slideClass(from, to) { return isBack(from, to) ? 'nt-slide-in-back' : 'nt-slide-in'; }

  return { DEPTH: DEPTH, DURATION: DURATION, isBack: isBack, dirClass: dirClass, single: single, slideClass: slideClass };
});
