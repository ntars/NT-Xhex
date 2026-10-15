/**
 * modules/StorageModule/storage.js —— 本地存储（统一封装，无后端）
 * 提供 settings（设置项）与 conversation（当前一轮问答结果缓存）两类键。
 * 跨形态统一 API：uni-app/小程序走 wx.getStorageSync/setStorageSync；H5 走 localStorage；
 * 无可用存储时降级为内存缓存（会话内有效）。全部数据只落在用户设备本地，不外传、不联网。
 * 加载：UMD —— 小程序被 require；浏览器挂到全局 NT.storage。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.storage = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {

  var NS = 'nt_';
  // 内存兜底（无本地存储能力时）
  var mem = {};

  function canUseWx() { return typeof wx !== 'undefined' && wx && wx.getStorageSync; }
  function canUseLS() {
    try { var t = '__nt__'; localStorage.setItem(t, t); localStorage.removeItem(t); return true; }
    catch (e) { return false; }
  }

  // 底层：统一的 get/set/remove/clear
  function raw(key, val) {
    var full = NS + key;
    if (canUseWx()) {
      if (val === undefined) return wx.getStorageSync(full);
      if (val === null) { wx.removeStorageSync(full); return; }
      wx.setStorageSync(full, val);
      return;
    }
    if (canUseLS()) {
      if (val === undefined) return localStorage.getItem(full);
      if (val === null) { localStorage.removeItem(full); return; }
      localStorage.setItem(full, JSON.stringify(val));
      return;
    }
    // 内存兜底
    if (val === undefined) return mem[key];
    if (val === null) { delete mem[key]; return; }
    mem[key] = val;
  }

  function parse(v) {
    if (v === undefined || v === null) return undefined;
    if (typeof v === 'object') return v; // wx 返回的对象
    try { return JSON.parse(v); } catch (e) { return v; }
  }

  // 默认设置项（3.1 起设置项精简，此处不预留死数据；后续加设置时再补对应默认值）
  var DEFAULTS = {};

  // 读出时：defaults 补缺 —— src(DEFAULTS) 只填 target 里缺失的键（target 的值优先）
  function fillDefaults(target, src) {
    for (var k in src) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
        target[k] = target[k] || {};
        fillDefaults(target[k], src[k]);
      } else if (target[k] === undefined) {
        target[k] = src[k];
      }
    }
    return target;
  }

  // 写入时：patch 覆盖 —— src(patch) 覆盖 target 的同名键（src 优先，可覆盖默认值）
  function applyPatch(target, src) {
    for (var k in src) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
        target[k] = target[k] && typeof target[k] === 'object' && !Array.isArray(target[k]) ? target[k] : {};
        applyPatch(target[k], src[k]);
      } else {
        target[k] = src[k];
      }
    }
    return target;
  }

  // ---------- settings ----------
  function getSettings() {
    var stored = parse(raw('settings'));
    var v = stored && typeof stored === 'object' ? stored : {};
    // 存储值优先，DEFAULTS 只补缺失项；每次返回全新副本
    return fillDefaults(v, DEFAULTS);
  }
  function setSettings(patch) {
    var cur = getSettings(); // 已是补全后的完整对象
    applyPatch(cur, patch || {});
    raw('settings', JSON.parse(JSON.stringify(cur)));
    return getSettings();
  }

  // ---------- conversation cache ----------
  function getConversation() {
    var v = parse(raw('conversation'));
    return Array.isArray(v) ? v : [];
  }
  function setConversation(list) {
    raw('conversation', JSON.parse(JSON.stringify(list || [])));
  }
  function clearAll() {
    raw('settings', null);
    raw('conversation', null);
    if (canUseWx()) { /* 保留其它键 */ }
  }

  return {
    getSettings: getSettings,
    setSettings: setSettings,
    getConversation: getConversation,
    setConversation: setConversation,
    clearAll: clearAll,
    _raw: raw
  };
});
