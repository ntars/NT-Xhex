# -*- coding: utf-8 -*-
"""tools/astro-gen-ref4.py —— 四余「当回归黄经」JPL 级真值（数值扫描 ephem）
四余占星标准 = 平均位置：罗睺=月升交点、计都=月降交点(罗睺+180)、月孛=月远地点、紫炁=地远地点(EMB拱点)。
数值法：节点扫月亮黄纬β过零；拱点扫 r 极大。取「目标时刻前最近事件」黄经，作落宿粒度裁判（误差<0.5°）。
"""
import ephem, math

def lon_of(body, dt):
    e = ephem.Ecliptic(body, epoch=dt)
    return math.degrees(e.lon) % 360

def lat_of_moon(dt):
    m = ephem.Moon(dt); m.compute(dt)
    return ephem.Ecliptic(m, epoch=dt).lat

def moon_r(dt):  # 月地距离（月孛=月远地点=地距极大）
    m = ephem.Moon(dt); m.compute(dt)
    return m.earth_distance

def emb_r(dt):  # EMB 日心距（紫炁=地球拱点=EMB 距离极大）
    e = ephem.Earth(dt); s = ephem.Sun(dt)
    e.compute(dt); s.compute(dt)
    return e - s, abs(e - s)

def scan_prev(fn, dt, step_days=2.0, window_days=400.0):
    """向前找 fn 的最近过零/极值事件，返回事件时刻。粗扫+细扫。"""
    import ephem as E
    t = dt - window_days * 86400.0
    # 粗扫找区间
    prev = fn(t)
    best_t = None; best_v = prev
    while t < dt:
        t += step_days * 86400.0
        v = fn(t)
        if fn.is_extremum and fn.is_extremum(prev, best_v, v):
            best_v = v; best_t = t - (step_days/2)*86400.0
        prev = v
    # 对 best 区间细扫
    if best_t:
        lo = best_t - step_days*86400.0/2; hi = best_t + step_days*86400.0/2
        for _ in range(60):
            c = lo + (hi-lo)*0.5; fc = fn(c)
            if (fn.dir*fc) > (fn.dir*best_v): best_v = fc; best_t = c
            elif fn.dir > 0: lo = c
            else: hi = c
    return best_t

def emb_r2(dt):  # 日地距离（紫炁=太阳拱点=日距极大时太阳黄经）
    e = ephem.Earth(dt); e.compute(dt)
    return e.sun_distance

def find_prev_zerosign(f, dt, step=1.0, window=400.0):
    ts = [dt - window*86400.0 + i*step*86400.0 for i in range(int(window/step)+1)]
    vals = [f(t) for t in ts]
    last = None
    for i in range(1, len(vals)):
        if vals[i-1] <= 0 < vals[i]:
            last = i
    if last is None:
        return None
    lo, hi = ts[last-1], ts[last]
    for _ in range(50):
        m = (lo+hi)/2
        if f(m) > 0: hi = m
        else: lo = m
    return (lo+hi)/2

def find_prev_max(g, dt, step=1.0, window=400.0):
    ts = [dt - window*86400.0 + i*step*86400.0 for i in range(int(window/step)+1)]
    vals = [g(t) for t in ts]
    best = None
    for i in range(1, len(vals)-1):
        if vals[i] > vals[i-1] and vals[i] >= vals[i+1]:   # 局部极大，取 dt 前最近一个
            lo, hi = ts[i-1], ts[i+1]
            for _ in range(50):
                m = (lo+hi)/2; m1=(lo+m)/2; m2=(m+hi)/2
                if g(m1) > g(m2): hi = m
                else: lo = m
            best = (lo+hi)/2
    return best

SAMPLES = [(2000,1,1,12),(1950,6,15,0),(1900,3,20,18),(2026,10,16,14)]
def main():
    out = {}
    for (y,mo,d,h) in SAMPLES:
        dt = ephem.Date(f'{y:04d}/{mo:02d}/{d:02d} {h:02d}:00')
        row = {}
        # 罗睺：月亮黄纬β由负转正（升交点）最近一次
        tn = find_prev_zerosign(lat_of_moon, dt, step=2.0, window=400)
        row['罗睺'] = round(lon_of(ephem.Moon(tn), tn), 3) if tn else None
        row['计都'] = round((row['罗睺']+180)%360, 3) if row['罗睺'] is not None else None
        # 月孛：月地距离 r 极大（前最近）
        tA = find_prev_max(moon_r, dt, step=2.0, window=400)
        row['月孛'] = round(lon_of(ephem.Moon(tA), tA), 3) if tA else None
        # 紫炁（=地球远日点/Chiron，占星七政四余用「平均值」，数值扫描留待 mean 公式对拍）
        row['紫炁'] = None
        out[f"{y}-{mo:02d}-{d:02d}T{h:02d}"] = row
    import json
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == '__main__':
    main()
