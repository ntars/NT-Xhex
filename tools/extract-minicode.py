#!/usr/bin/env python3
"""
tools/extract-minicode.py —— 从《玄玖灵犀 NT-Xhex.sketch》提取「小程序码」矢量图 → SVG

为什么需要（清单第 3 项）：
  主人指示「导出图片格式不对，**小程序码直接按照设计稿来就行，无需考虑是否能离线扫出来**」。
  设计稿里的「玄玖灵犀小程序码」是一张**真·小程序码矢量图**（64×64，嵌套 5 层、168 个 shapePath），
  而代码 drawMiniCode() 画的是「圆角框 + N·T 字标」矢量占位 —— 两者根本不是一张图。
  本脚本把设计稿的真码矢量**提取成 SVG**（构建期一次性产物），导出图片时直接绘制它，
  从而「和设计稿一模一样」。注意：SVG 只是**视觉**还原，码本身不保证可扫（主人明确说不用管）。

用法：
  python3 tools/extract-minicode.py \
      "/Users/ntars/Documents/Github/玄玖灵犀/玄玖灵犀 NT-Xhex.sketch" \
      static/icons/export-minicode.svg

只读设计稿、不改它；输出单个 SVG 到 static/icons/（单一真源，三端共用）。
"""
import json
import os
import re
import shutil
import sys
import tempfile
import zipfile


def pt(s):
    """sketch 坐标字符串 '{1.5, -2}' → (1.5, -2)"""
    m = re.match(r'^\{\s*(-?[\d.eE+]+)\s*,\s*(-?[\d.eE+]+)\s*\}$', str(s).strip())
    return (float(m.group(1)), float(m.group(2))) if m else (0.0, 0.0)


def color_of(style, key):
    """从 style 里取颜色；深色模式下设计稿可能是 0~1 白。返回 '#rrggbb' 或 None。"""
    fills = style.get('fills') or []
    for f in fills:
        if f.get('isEnabled') is False:
            continue
        c = f.get('color') or {}
        r, g, b = [int(round((c.get(k) or 0) * 255)) for k in ('red', 'green', 'blue')]
        a = f.get('alpha')
        alpha = 1.0 if a is None else a
        if alpha <= 0.01:
            continue
        return '#%02x%02x%02x' % (r, g, b)
    return None


def path_d(points, closed, fw, fh, ox=0.0, oy=0.0):
    """curvePoint 列表 → SVG path d。

    ⚠ sketch 的 shapePath 把 points 存成**归一化坐标（0~1）**，真实坐标 = point × 该层 frame 的宽高
      **再加该层 frame 相对小程序的偏移 (ox, oy)**。忘了乘 frame 会挤成左上角 1×1 的点（本脚本第一版踩过），
      忘了加偏移会让所有图形叠在左上角（本脚本第二版踩过）。
    """
    if not points or not fw or not fh:
        return ''
    cmds = []
    first = pt(points[0].get('point'))
    cmds.append('M%.3f %.3f' % (first[0] * fw + ox, first[1] * fh + oy))
    n = len(points)
    last = n if closed else n - 1
    for i in range(last):
        cur = points[i]
        nxt = points[(i + 1) % n]
        p0 = pt(cur.get('point'))
        p1 = pt(nxt.get('point'))
        cf = pt(cur.get('curveFrom')) if cur.get('hasCurveFrom') else (0, 0)
        ct = pt(nxt.get('curveTo')) if nxt.get('hasCurveTo') else (0, 0)
        p0 = (p0[0] * fw + ox, p0[1] * fh + oy)
        p1 = (p1[0] * fw + ox, p1[1] * fh + oy)
        c1 = (p0[0] + cf[0] * fw, p0[1] + cf[1] * fh)
        c2 = (p1[0] + ct[0] * fw, p1[1] + ct[1] * fh)
        if abs(c1[0] - p0[0]) > 1e-6 or abs(c1[1] - p0[1]) > 1e-6 or \
           abs(c2[0] - p1[0]) > 1e-6 or abs(c2[1] - p1[1]) > 1e-6:
            cmds.append('C%.3f %.3f %.3f %.3f %.3f %.3f' % (c1[0], c1[1], c2[0], c2[1], p1[0], p1[1]))
        else:
            cmds.append('L%.3f %.3f' % (p1[0], p1[1]))
    if closed:
        cmds.append('Z')
    return ' '.join(cmds)


def emit(layer, ox, oy, out, depth=0):
    """递归把 sketch 图层转成 SVG 片段。ox/oy = 该层 frame 相对「小程序码」左上角的偏移。"""
    cls = (layer.get('_class') or '').split('/')[-1]
    fr = layer.get('frame') or {}
    x, y = ox + (fr.get('x') or 0), oy + (fr.get('y') or 0)

    if layer.get('isVisible') is False:
        return

    if cls in ('shapePath', 'rectangle', 'oval', 'star', 'polygon'):
        d = path_d(layer.get('points') or [], bool(layer.get('isClosed')),
                   fr.get('width') or 0, fr.get('height') or 0, x, y)
        if d:
            style = layer.get('style') or {}
            fill = color_of(style, 'fills')
            stroke = color_of(style, 'borders')
            parts = ['<path d="%s" ' % d]
            parts.append(' fill="%s"' % (fill or 'none'))
            if stroke:
                bw = (style.get('borders') or [{}])[0].get('thickness') or 0
                parts.append(' stroke="%s" stroke-width="%.3f"' % (stroke, bw))
            parts.append(' />')
            out.append(''.join(parts))
        # shapePath 里可能还嵌着子层
        for c in layer.get('layers') or []:
            emit(c, x, y, out, depth + 1)
        return

    if cls == 'shapeGroup':
        # shapeGroup 自己是一条复合路径（points 在子层里），先画自己的，再递归
        for c in layer.get('layers') or []:
            emit(c, x, y, out, depth + 1)
        return

    # group / shapeGroup / 其它容器
    for c in layer.get('layers') or []:
        emit(c, x, y, out, depth + 1)


def find_by_name(layers, name):
    for l in layers or []:
        if l.get('name') == name:
            return l
        r = find_by_name(l.get('layers') or [], name)
        if r:
            return r
    return None


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    sketch, out_svg = sys.argv[1], sys.argv[2]

    tmp = tempfile.mkdtemp(prefix='ntsketch-')
    try:
        with zipfile.ZipFile(sketch) as z:
            z.extractall(tmp)
        page_file = None
        pdir = os.path.join(tmp, 'pages')
        if os.path.isdir(pdir):
            for f in os.listdir(pdir):
                if f.endswith('.json'):
                    page_file = os.path.join(pdir, f)
                    break
        if not page_file:
            page_file = os.path.join(tmp, 'document.json')
        doc = json.load(open(page_file, encoding='utf-8'))

        mini = find_by_name(doc.get('layers'), '玄玖灵犀小程序码')
        if not mini:
            print('✗ 设计稿里找不到图层「玄玖灵犀小程序码」', file=sys.stderr)
            sys.exit(1)

        fr = mini['frame']
        w = fr.get('width') or 64
        h = fr.get('height') or 64

        out = []
        for c in mini.get('layers') or []:
            emit(c, 0, 0, out)

        svg = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<!-- 由 tools/extract-minicode.py 从《玄玖灵犀 NT-Xhex.sketch》提取（构建期产物，勿手改）。',
               '     小程序码矢量图 = 设计稿原样；visual only，未保证可扫。 -->',
               '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %g %g" width="%g" height="%g">' % (w, h, w, h),
               '<rect x="0" y="0" width="%g" height="%g" fill="#FFFFFF"/>' % (w, h)]
        svg.extend(out)
        svg.append('</svg>')

        os.makedirs(os.path.dirname(out_svg) or '.', exist_ok=True)
        with open(out_svg, 'w', encoding='utf-8') as f:
            f.write('\n'.join(svg))
        print('✓ 已提取小程序码矢量 → %s（%g×%g，%d 个路径）' % (out_svg, w, h, len(out)))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    main()