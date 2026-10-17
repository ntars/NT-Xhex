/* tools/astro-check.js —— astronomy-engine（JPL级, MIT, 纯JS可内嵌） 11 曜对拍 ephem 基准
 * 七政/四余要的是「地心回归黄经」。统一 GeoVector(body,t) → Ecliptic(state) → elon（度）。
 * 跑法：NODE_PATH=<workspace>/node_modules node tools/astro-check.js
 */
var A = require('/Users/ntars/.workbuddy/binaries/node/workspace/node_modules/astronomy-engine/astronomy.js');

var REF7 = {
  '2000/1/1 12': { 太阳: 280.379, 太阴: 223.328, 水星: 271.899, 金星: 241.574, 火星: 327.971, 木星: 25.256, 土星: 40.397 },
  '1950/6/15 0': { 太阳: 83.338, 太阴: 75.945, 水星: 60.483, 金星: 45.465, 火星: 181.18, 木星: 337.22, 土星: 163.379 },
  '1900/3/20 18': { 太阳: 359.685, 太阴: 228.556, 水星: 7.433, 金星: 41.574, 火星: 345.605, 木星: 250.783, 土星: 274.54 },
  '2026/10/16 14': { 太阳: 203.23, 太阴: 270.517, 水星: 227.749, 金星: 215.076, 火星: 130.506, 木星: 142.194, 土星: 10.357 }
};
var MAP = { 太阳: A.Body.Sun, 太阴: A.Body.Moon, 水星: A.Body.Mercury, 金星: A.Body.Venus, 火星: A.Body.Mars, 木星: A.Body.Jupiter, 土星: A.Body.Saturn };

function tOf(s) { var p = s.split(' '); var d = p[0].split('/'); var tm = p[1].split(':');
  var mm = tm.length > 1 ? +tm[1] : 0;
  return A.MakeTime(new Date(Date.UTC(+d[0], +d[1] - 1, +d[2], +(+tm[0]), mm))); }
function d(a, b) { var x = Math.abs(a - b); return Math.min(x, 360 - x); }
function geoLon(body, t) { var sv = A.GeoVector(body, t, false); var e = A.Ecliptic(sv); return e.elon; }

var maxErr = 0, ok = true;
Object.keys(REF7).forEach(function (k) {
  var t = tOf(k);
  Object.keys(MAP).forEach(function (zh) {
    var lon = geoLon(MAP[zh], t);
    var e = d(lon, REF7[k][zh]);
    if (e > maxErr) maxErr = e; if (e >= 0.5) ok = false;
    console.log(k, zh, 'astro=' + lon.toFixed(2), 'ephem=' + REF7[k][zh], 'Δ=' + e.toFixed(2));
  });
});
console.log('=== 7政 最大Δ =', maxErr.toFixed(3), '° =>', ok ? 'PASS(<0.5°)' : 'FAIL');

console.log('\n=== 4余 API 探测（罗睺=月升交点/北交点、计都=南交点、月孛=月远地点、紫炁=地球远地点）===');
try {
  var t = tOf('2000/1/1 12');
  var node = A.NextMoonNode(A.Body.Moon, t);
  console.log('NextMoonNode →', JSON.stringify({ jd: node.jdTime ? +node.jdTime.toFixed(5) : node, kind: node.kind }));
  var apa = A.SearchPlanetApsis(A.Body.Moon, A.ApsisKind.Apocenter, t, 0.2);
  console.log('月远地点(月孛) →', apa ? apa.jdTime.toFixed(5) : '无');
  console.log('ApsisKind =', JSON.stringify(A.ApsisKind));
} catch (e) { console.log('4余 API:', e.message); }
