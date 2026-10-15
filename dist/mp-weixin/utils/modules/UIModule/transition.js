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
  // 视图层级深度：浅 → 深 为前进；深 → 浅 为返回
  var DEPTH = { home: 0, result: 1, about: 1, us: 1, detail: 2 };
  var DURATION = 320; // 与 theme.css --d-page 保持一致
  // 调试开关：false = 不播任何转场动画（布局/双层结构保留、静止态可正常跑，方便调试其他功能）；改回 true 即恢复
  var ANIM_ENABLED = false;

  /** 是否返回（目标比当前浅） */
  function isBack(from, to) { return (DEPTH[to] || 0) < (DEPTH[from] || 0); }

  /** 双层视差方向类：前进 stage-fwd / 返回 stage-back（ANIM_ENABLED=false 时返回空类=不播动画） */
  function dirClass(from, to) {
    if (!ANIM_ENABLED) return '';
    return isBack(from, to) ? 'stage-back' : 'stage-fwd';
  }

  /**
   * 单层右滑入（PWA / uni-app）：立即挂 nt-slide-in，DURATION 后清除。
   * ANIM_ENABLED=false 时直接不挂类（不播动画）。
   * @param {string} from   上一视图（from===to 时调用方应不调用）
   * @param {string} to     目标视图
   * @param {Function} apply  把类名/空串写回，如 setData({enterClass: cls})
   * @returns {number} 定时句柄
   */
  function single(from, to, apply) {
    if (!ANIM_ENABLED) { apply(''); return; }
    apply('nt-slide-in');
    var t = setTimeout(function () { apply(''); }, DURATION);
    return t;
  }

  return { DEPTH: DEPTH, DURATION: DURATION, isBack: isBack, dirClass: dirClass, single: single };
});
