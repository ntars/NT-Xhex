# -*- coding: utf-8 -*-
"""tools/astro-gen-ref.py —— 七政「当回归经」黄金基准（ephem，JPL 级）
口径：ephem.Ecliptic(body, epoch=dt)（当年平黄道 = tropical mean，与 astronomy-engine 的 Ecliptic() 对齐）。
ephem 默认 Ecliptic(body) 是 J2000 平春分（差岁差累积），**别用**；一定带 epoch=dt。
用途：给 astro.test.js 提供 7 政对拍真值（astronomy-engine 内核应与此 Δ<0.5°，实为 <0.01°）。
"""
import ephem, math, json

SAMPLES = [(2000, 1, 1, 12.0), (1950, 6, 15, 0.0), (1900, 3, 20, 18.0), (2026, 10, 16, 14.0)]
BODIES = [("太阳", ephem.Sun), ("太阴", ephem.Moon), ("水星", ephem.Mercury),
          ("金星", ephem.Venus), ("火星", ephem.Mars), ("木星", ephem.Jupiter), ("土星", ephem.Saturn)]

def main():
    out = {}
    for (y, mo, d, hr) in SAMPLES:
        hh, mm = int(hr), int((hr % 1) * 60)
        dt = ephem.Date(f"{y:04d}/{mo:02d}/{d:02d} {hh:02d}:{mm:02d}.00")
        row = {}
        for nm, cls in BODIES:
            b = cls(dt); b.compute(dt)
            row[nm] = round(math.degrees(ephem.Ecliptic(b, epoch=dt).lon) % 360, 3)
        out[f"{y}-{mo:02d}-{d:02d}T{hh:02d}"] = row
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
