/* tools/qimen-yang-capture.cjs —— 驱动 qimen.pro 抓奇门盘，交叉验证八神顺逆（阳遁顺布）
 * 用法：NODE_PATH=<workspace>/node_modules node tools/qimen-yang-capture.cjs
 * 合规：只读渲染结果（DOM/HTML 文本），不复制目标 JS 代码，不触发付费逻辑。
 * 若前端无起局算法（SSR-only）或需付费 → 如实打印未取得，内核阳遁盘保持「待验证」标注（不臆造）。
 */
var WS = '/Users/ntars/.workbuddy/binaries/node/workspace/node_modules';
var { chromium } = require(WS + '/playwright-core');
var fs = require('fs');
var EXEC = process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell';
var TARGET = { date: '2026-02-10', time: '09:00' }; // 阳遁时段（立春后）

(async function () {
  var browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: EXEC });
    var page = await (await browser.newContext()).newPage();
    await page.goto('https://www.qimen.pro/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000); // 让客户端 JS 渲染九宫
    var html0 = await page.content();
    fs.writeFileSync('/tmp/qmp-yang-default.html', html0);
    var cell0 = (html0.match(/data-gong="[巽离坤震中兑艮坎乾]"/g) || []).length;
    console.log('默认盘 .pan-cell 数：' + cell0 + '（>0 表示九宫已渲染）');

    // 尝试改阳遁时刻并重排（若前端有起局逻辑）
    var dEl = await page.$('#qd'); var tEl = await page.$('#qt');
    var didChange = false;
    if (dEl) { await dEl.fill(TARGET.date); didChange = true; }
    if (tEl) { await tEl.fill(TARGET.time); didChange = true; }
    var btn = await page.locator('button').filter({ hasText: /起局|排盘|重新起局/ }).first();
    if (didChange && (await btn.count())) { await btn.click(); await page.waitForTimeout(3000); }
    var htmlY = await page.content();
    fs.writeFileSync('/tmp/qmp-yang.html', htmlY);

    // 解析 summary（阴阳遁/局/值符/值使）
    var m = htmlY.match(/pan-summary[\s\S]{0,400}?(?=pan-pillars|<div class="pan-)/);
    var summary = m ? m[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
    var isYang = /阳遁/.test(summary);
    console.log('重排后 summary：' + summary.slice(0, 120));
    console.log('阳遁判定：' + (isYang ? '✓ 阳遁（可作八神阳遁顺布实证）' : '⚠️ 未取得阳遁盘（前端无起局算法/需付费/时刻未生效）'));

    // 抓阳遁盘九宫（原始块，供人工核对）
    var cells = [];
    var re = /class="pan-cell[^"]*"\s+data-gong="([巽离坤震中兑艮坎乾])"([\s\S]*?)(?=<div class="pan-cell|<div class="pan-foot|$)/g;
    var hm = htmlY; var last = 0;
    var idxs = [];
    var mm; while ((mm = re.exec(htmlY))) idxs.push([mm.index + mm[0].length - 0, mm[1]]);
    // 简化：按 data-gong 顺序切
    var parts = htmlY.split(/data-gong="([巽离坤震中兑艮坎乾])"/);
    // parts[0]=前导, parts[1]=宫名1, parts[2]=宫1内容, parts[3]=宫名2, ...
    for (var i = 1; i < parts.length - 1; i += 2) {
      var g = parts[i]; var body = parts[i + 1];
      var txt = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      cells.push(g + ' | ' + txt.slice(0, 60));
    }
    console.log('=== 阳遁盘九宫（' + TARGET.date + ' ' + TARGET.time + '）===');
    cells.forEach(function (c) { console.log('  ' + c); });

    // 与内核比对
    var Q = require('/Users/ntars/Documents/Github/NT-Xhex/modules/CoreModule/qimen.js');
    var mine = Q.chart({ y: 2026, m: 2, d: 10, h: 9 });
    console.log('\n内核 2026-02-10 09时 →', mine.err ? mine.err : mine.阴阳遁 + mine.局数 + '局 ' + mine.节气 + mine.元 + ' 值符' + mine.值符星 + ' 值使' + mine.值使门);
    if (!mine.err && isYang) {
      console.log('  内核八神：' + JSON.stringify(mine.八神));
      console.log('  外部八神：' + cells.map(function (c) { return c.split(' ')[0] + c.match(/[\u9000-\u9fff]/); }).join(' '));
    }
  } catch (e) {
    console.log('驱动失败（如实记录，内核阳遁盘保持待验证）：' + e.message.slice(0, 200));
  } finally {
    if (browser) await browser.close();
  }
})();
