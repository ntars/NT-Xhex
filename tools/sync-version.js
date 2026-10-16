'use strict'
/**
 * tools/sync-version.js —— 版本收敛【单一真值 → 全仓散落处】
 *
 * 背景：版本号散在 7 处（package.json / manifest.json 的 versionName+versionCode /
 *   settings.js 的 var version / 根 sw.js 与 public/pwa/sw.js 的 CACHE /
 *   platform-modules.json 的 _版本 / README 标题），改版本易漏（v3.0.5 时就漏过 platform-modules）。
 * 做法：version.json 是唯一真值；本脚本把它写进上面 7 处。改版本 = 改 version.json + 跑本脚本。
 *   描述性文案（settings.js「更新日志」、platform-modules.json 的长描述）本脚本**不动**，人工维护。
 * 校验：node tools/sync-version.js --check 只读不写，发现漂移就列出来并退出 1（接 CI）。
 */
var fs = require('fs')
var path = require('path')

var ROOT = path.resolve(__dirname, '..')
var ver = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8')).version
var code = ver.replace(/\D/g, '')           // 3.0.7 → 307（去非数字）
var CHECK = process.argv.indexOf('--check') >= 0

function patch(rel, pattern, replacement) {
  var p = path.join(ROOT, rel)
  var s = fs.readFileSync(p, 'utf8')
  var out = s.replace(pattern, replacement)
  if (out === s) {
    if (CHECK) {
      // 已一致也算通过（幂等）；只在「需要改却匹配不上」时报漂移
      console.log('  ✓ ' + rel + '（已是 ' + (s.match(pattern) ? '最新' : '需更新') + '）')
    }
    return out
  }
  if (!CHECK) fs.writeFileSync(p, out, 'utf8')
  console.log((CHECK ? '  △ ' : '  ✓ ') + rel + ' → ' + replacement.replace(/\n/g, ' '))
  return out
}

console.log('[sync-version] ' + (CHECK ? '校验 ' : '写入 ') + ver + '（code ' + code + '）')
// 1) package.json
patch('package.json', /"version"\s*:\s*"[^"]*"/, '"version": "' + ver + '"')
// 2) manifest.json versionName + versionCode
patch('manifest.json', /"versionName"\s*:\s*"[^"]*"/, '"versionName": "' + ver + '"')
patch('manifest.json', /"versionCode"\s*:\s*"[^"]*"/, '"versionCode": "' + code + '"')
// 3) settings.js 的 var version（只替换版本号字面量，保留行尾注释；勿在替换串里再写注释，否则叠加）
patch('modules/SettingsModule/settings.js',
  /var version = 'v[^']*'/, "var version = 'v" + ver + "'")
// 4) 两份 SW 的 CACHE 名（内嵌版本号；逻辑已收敛进 sw-core.js，这里只同步 cache 字符串）
patch('sw.js', /cache:\s*'nt-xhex-v[^']*'/, "cache: 'nt-xhex-v" + ver + "'")
patch('public/pwa/sw.js', /cache:\s*'nt-xhex-pwa-v[^']*'/, "cache: 'nt-xhex-pwa-v" + ver + "'")
// 5) platform-modules.json 的 _版本 前导号（"3.0.7 —— 描述…"），只改前导版本号，长描述不动
patch('tools/platform-modules.json', /"_版本"\s*:\s*"\d[\d.]* /, '"_版本": "' + ver + ' ')
// 6) README 标题
patch('README.md', /^# .*NT-Xhex v[\d.]+$/m, '# 玄玖灵犀 NT-Xhex v' + ver)

if (CHECK) {
  // 校验模式：重新扫一遍，凡「需要改却改不动」的才算漂移
  var stillDrift = 0
  function expect(rel, re) {
    var s = fs.readFileSync(path.join(ROOT, rel), 'utf8')
    if (!re.test(s)) { console.log('  ✗ 漂移 ' + rel); stillDrift++ }
  }
  expect('package.json', new RegExp('"version"\\s*:\\s*"' + ver + '"'))
  expect('manifest.json', new RegExp('"versionName"\\s*:\\s*"' + ver + '"'))
  expect('manifest.json', new RegExp('"versionCode"\\s*:\\s*"' + code + '"'))
  expect('modules/SettingsModule/settings.js', new RegExp("var version = 'v" + ver + "'"))
  expect('sw.js', new RegExp("cache: 'nt-xhex-v" + ver + "'"))
  expect('public/pwa/sw.js', new RegExp("cache: 'nt-xhex-pwa-v" + ver + "'"))
  expect('tools/platform-modules.json', new RegExp('"_版本": "' + ver + ' '))
  expect('README.md', new RegExp('NT-Xhex v' + ver + '$', 'm'))
  console.log(stillDrift === 0 ? '[sync-version] 7 处与 version.json 一致 ✓' : '[sync-version] 发现 ' + stillDrift + ' 处漂移，跑 node tools/sync-version.js 修复')
  process.exit(stillDrift === 0 ? 0 : 1)
} else {
  console.log('[sync-version] 完成：' + ver + ' 已写入全部 7 处')
}
