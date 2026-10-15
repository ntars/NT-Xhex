#!/usr/bin/env python3
# 解析玄玖灵犀 UI 设计稿 SVG：累乘嵌套 <g> transform，把每个 <text>/<path>/<rect>/<ellipse>
# 落到 1608x3496 画布坐标，再 ÷4 换算成 402x874pt（iPhone 16 Pro 4x）相对屏幕的距离。
import re, sys
from xml.etree import ElementTree as ET
NS = '{http://www.w3.org/2000/svg}'

def compose(M1, M2):
    a,b,c,d,e,f = M1; a2,b2,c2,d2,e2,f2 = M2
    return (a*a2+b*c2, a*b2+b*d2, c*a2+d*c2, c*b2+d*d2, e*a2+f*c2+e2, e*b2+f*d2+f2)

def parse_transforms(s):
    M = (1,0,0,1,0,0)
    for t in re.findall(r'(matrix|translate|scale)\(([^)]*)\)', s):
        kind = t[0]
        arg = t[1].replace(' ', '').split(',')
        if kind == 'matrix':
            T = tuple(float(x) for x in arg)
        elif kind == 'translate':
            e = float(arg[0]); f = float(arg[1]) if len(arg) > 1 else 0.0
            T = (1,0,0,1,e,f)
        elif kind == 'scale':
            sx = float(arg[0]); sy = float(arg[1]) if len(arg) > 1 else sx
            T = (sx,0,0,sy,0,0)
        else:
            continue
        M = compose(M, T)
    return M

def apply(M, x, y):
    a,b,c,d,e,f = M
    return (a*x+c*y+e, b*x+d*y+f)

def path_bbox(d, M):
    """解析 path d：按命令字母切分，数字以逗号/空格分隔；M/L 取点，C 取首尾端点。
    求 M 作用后的画布包围盒（pt）。"""
    if not d:
        return None
    tokens = re.findall(r'[a-zA-Z]((?:\s*|\s?,?)[-\d.]+)*', d)
    # 更稳妥：把命令字母和数字都抽出来
    seq = re.findall(r'[MLCmcl]|[-+]?\d*\.?\d+', d)
    pts = []
    i = 0
    while i < len(seq):
        t = seq[i]
        if t in 'MLCmcl':
            k = 2 if t in 'MLml' else 6
            nums = []
            i += 1
            while i < len(seq) and t not in seq[i] and seq[i] not in 'MLCmcl':
                nums.append(float(seq[i])); i += 1
                if len(nums) >= k:
                    break
            if not nums:
                continue
            # implicit repeats
            rep = 1
            j = i
            extra = []
            while j < len(seq) and seq[j] not in 'MLCmcl':
                extra.append(float(seq[j])); j += 1
            i = j
            allnums = nums + extra
            off = 0
            while off + k <= len(allnums):
                if t in 'MLml':
                    pts.append((allnums[off], allnums[off+1]))
                else:
                    pts.append((allnums[off], allnums[off+1]))
                    pts.append((allnums[off+4], allnums[off+5]))
                off += k
    if not pts:
        return None
    xs = [apply(M, px, py)[0] for px, py in pts]
    ys = [apply(M, px, py)[1] for px, py in pts]
    return (min(xs), min(ys), max(xs), max(ys))

def scale_of(M):
    return abs(M[0])

def strip_px(v):
    return float(re.sub(r'px$', '', v.strip() or '0'))

rows_out = {}
def walk(svg_text):
    root = ET.fromstring(svg_text)
    rows = []
    def rec(el, M):
        M2 = compose(M, parse_transforms(el.get('transform'))) if el.get('transform') else M
        tag = el.tag.replace(NS, '')
        if tag == 'text':
            x = strip_px(el.get('x', '0')); y = strip_px(el.get('y', '0'))
            m = re.search(r'font-size:([\d.]+)px', el.get('style', ''))
            fs = float(m.group(1)) if m else 0
            rows.append(('TEXT', el.text or '', fs, M2, x, y))
        elif tag == 'path':
            st = el.get('style', '')
            sw = re.search(r'stroke-width:([\d.]+)px', st)
            fill = re.search(r'fill:([^;]+)', st)
            d = el.get('d', '')
            rows.append(('PATH', el.get('id') or el.get('serif:id') or '', sw.group(1) if sw else None, fill.group(1).strip() if fill else None, M2, d))
        elif tag == 'rect':
            rows.append(('RECT', el.get('id') or '', strip_px(el.get('x')), strip_px(el.get('y')), strip_px(el.get('width')), strip_px(el.get('height')), M2))
        elif tag == 'ellipse':
            rows.append(('ELLIPSE', strip_px(el.get('cx')), strip_px(el.get('cy')), strip_px(el.get('rx')), strip_px(el.get('ry')), M2))
        for ch in el:
            rec(ch, M2)
    rec(root, (1,0,0,1,0,0))
    return rows

for p in sys.argv[1:]:
    txt = open(p, encoding='utf-8').read()
    print('\n===== ' + p.split('/')[-1] + ' =====')
    for r in walk(txt):
        if r[0] == 'TEXT':
            _, content, fs, M, lx, ly = r
            ax, ay = apply(M, lx, ly)          # 文字锚点画布坐标
            rendered = fs * scale_of(M)         # 实际渲染字号（画布px）
            # 距屏幕上/左 距离（pt）
            print(f'TEXT "{content}" | 字号 {rendered/4:.1f}pt(画布{rendered:.0f}px) | 锚点距屏幕 上{ay/4:.0f}pt 左{ax/4:.0f}pt')
        elif r[0] == 'PATH':
            _, idn, sw, fill, M, d = r
            bb = path_bbox(d, M)
            if bb:
                x0, y0, x1, y1 = bb
                print(f'PATH id={idn} strokeW={sw} fill={fill} | 包围盒 距屏幕 上{y0/4:.0f} 左{x0/4:.0f} 右{402-x1/4:.0f} 下{874-y1/4:.0f} | 尺寸 {(x1-x0)/4:.1f}x{(y1-y0)/4:.1f}pt')
            else:
                print(f'PATH id={idn} strokeW={sw} (no bbox)')
        elif r[0] == 'RECT':
            _, idn, x, y, w, h, M = r
            ax, ay = apply(M, x, y); bx, by = apply(M, x+w, y+h)
            print(f'RECT id={idn} | 画布({ax:.0f},{ay:.0f})~({bx:.0f},{by:.0f}) → 距屏幕上{min(ay,by)/4:.0f} 左{min(ax,bx)/4:.0f} 右{402-max(bx,ax)/4:.0f} | 尺寸 {abs(bx-ax)/4:.1f}x{abs(by-ay)/4:.1f}pt')
        elif r[0] == 'ELLIPSE':
            _, cx, cy, rx, ry, M = r
            ax, ay = apply(M, cx, cy)
            print(f'ELLIPSE | 中心距屏幕上{ay/4:.0f} 左{ax/4:.0f} | r≈{rx*scale_of(M)/4:.1f}pt')
