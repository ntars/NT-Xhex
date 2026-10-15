/**
 * modules/HomeModule/conversation.js —— 共享「问答行为」（平台无关，纯 JS）
 *
 * 作用：把「输入 → 引擎分析 → 结果」这套公共行为收敛到一份，供各壳统一调用。
 * 设计为**单轮问答**：不累积历史、不做聊天区，每次提问只产出当前这一条结果；
 * 结果可持久化到本地（刷新/重进可恢复当前这一问），也可随时清空。
 *
 * 本文件不含任何 DOM / 平台 API；引擎与存储经 deps 注入。
 * 各壳只负责「渲染 / 绑定交互」，问答流转全走这里。
 *
 * 加载：UMD —— 小程序被 require；浏览器挂全局 NT.conversation。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.NT = root.NT || {}; root.NT.conversation = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  /**
   * @param {Object} deps
   *   deps.analyzer {analyze(text):string}  引擎（AnalyzerModule/analyzer.js）
   *   deps.storage  {getConversation,setConversation}  可选，本地存储（StorageModule/storage.js）
   * @returns {{ask, restore, clear}}
   */
  function createConversation(deps) {
    var analyzer = deps && deps.analyzer;
    var storage = deps && deps.storage;
    // 单轮：仅保存「当前这一问这一答」
    var current = null;

    function persist() {
      if (storage && storage.setConversation) {
        try { storage.setConversation(current ? [current] : []); } catch (e) { /* 存储不可用仍可继续 */ }
      }
    }

    /** 提问：返回 {ok, question, answer} */
    function ask(text) {
      text = (text || '').trim();
      if (!text) return { ok: false, reason: 'empty' };
      var answer = (analyzer && analyzer.analyze) ? analyzer.analyze(text) : '引擎未加载。';
      current = { question: text, answer: answer };
      persist();
      return { ok: true, question: text, answer: answer };
    }

    /** 恢复上次的结果（刷新/重进时用）；无则返回 null */
    function restore() {
      if (current) return current;
      if (storage && storage.getConversation) {
        try {
          var v = storage.getConversation();
          if (Array.isArray(v) && v.length && v[v.length - 1] && v[v.length - 1].answer) {
            current = { question: v[v.length - 1].question || '', answer: v[v.length - 1].answer };
            return current;
          }
        } catch (e) { /* noop */ }
      }
      return null;
    }

    /** 清空当前结果（返回输入页时调用） */
    function clear() {
      current = null;
      persist();
    }

    return { ask: ask, restore: restore, clear: clear };
  }

  return { createConversation: createConversation };
});
