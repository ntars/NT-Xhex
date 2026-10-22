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

    /** 提问：返回 {ok, question, answer, hits, reject}
     *  hits   = 本次分析命中的功能块数（analyzer 命中单块时为 1）。
     *           壳层据此决定 result-format 是否按【标题】切小节（多算法并列展示）。
     *  reject = null 正常出结果；非 null 时表示被拦下，壳层**不跳结果页**、改为弹窗：
     *           'birth' 没有出生信息（也不是黄历查询）→「请输入农历、国历、四柱、八字」
     *           'lunar' 农历日期不存在 / 'pillar' 四柱查不到 / 'nonmeta' 非玄学话题
     *  只有 reject 为空的结果才写进持久化 —— 弹窗提醒不该覆盖上一条真结果，
     *  否则用户点「再问一个」返回时会看到那条被拦下的文案。 */
    function ask(text) {
      text = (text || '').trim();
      if (!text) return { ok: false, reason: 'empty' };
      var answer = (analyzer && analyzer.analyze) ? analyzer.analyze(text) : '引擎未加载。';
      var hits = 1;
      if (analyzer && analyzer.lastHits) {
        try { hits = analyzer.lastHits() || 1; } catch (e) { hits = 1; }
      }
      var reject = null;
      if (analyzer && analyzer.lastReject) {
        try { reject = analyzer.lastReject() || null; } catch (e) { reject = null; }
      }
      if (reject) return { ok: true, question: text, answer: answer, hits: 1, reject: reject };
      current = { question: text, answer: answer, hits: hits };
      persist();
      return { ok: true, question: text, answer: answer, hits: hits, reject: null };
    }

    /** 恢复上次的结果（刷新/重进时用）；无则返回 null。
     *  带上持久化的 hits（旧数据无此字段时回落 1 → 单算法形态，与旧行为一致）。 */
    function restore() {
      if (current) return current;
      if (storage && storage.getConversation) {
        try {
          var v = storage.getConversation();
          if (Array.isArray(v) && v.length && v[v.length - 1] && v[v.length - 1].answer) {
            current = { question: v[v.length - 1].question || '', answer: v[v.length - 1].answer, hits: v[v.length - 1].hits || 1 };
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
