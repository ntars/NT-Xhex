#!/usr/bin/env python3
# 玄玖灵犀 logo 生成器（可重复运行，零网络，仅 Pillow）
# 源：玄玖灵犀Logo.svg 的 N / T 两个纯直线多边形（viewBox 内 apply translate(-480.385,-400)）
# 产出（透明底 PNG）：
#   static/icons/logo.png        —— 纯黑 N+T（浅色主题）
#   static/icons/logo-white.png  —— 纯白 N+T（深色主题反色）
# 高分渲染（6 倍超采样）+ LANCZOS 降采样，保证边缘抗锯齿。
# 用法：python tools/gen-logo.py
import os
from PIL import Image, ImageDraw

# ---- 多边形顶点（原 SVG path，viewBox 坐标系）----
T_RAW = [
    (1454.685, 662.49), (1519.615, 700), (1519.615, 1300), (1064.95, 1562.501),
    (1064.95, 1409.808), (1389.524, 1225.109), (1389.524, 1064.951),
    (1037.531, 1065.006), (1112.592, 934.996), (1389.524, 934.996),
    (1389.716, 700.001), (1454.685, 662.491),
]
N_RAW = [
    (480.385, 700), (545.355, 662.49), (935.051, 887.498), (935.051, 437.499),
    (1000.001, 400), (1064.951, 437.499), (1064.951, 962.501), (935.051, 1037.499),
    (610.29, 849.984), (610.29, 1225), (480.386, 1300), (480.386, 700),
]
TX, TY = -480.385, -400.0          # SVG 外层矩阵
N = [(x + TX, y + TY) for (x, y) in N_RAW]
T = [(x + TX, y + TY) for (x, y) in T_RAW]

def render(fill_rgb):
    """透明底 N+T 词标，宽 1024（按 N/T 实际宽高比出高）。"""
    xs = [p[0] for p in N + T]
    ys = [p[1] for p in N + T]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    box_w, box_h = maxx - minx, maxy - miny
    OUT_W = 1024
    SCALE = 6
    ss_w = int(round(OUT_W * SCALE))
    ss_h = int(round((box_h / box_w) * OUT_W * SCALE))
    img = Image.new("RGBA", (ss_w + 1, ss_h + 1), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    for poly in (N, T):
        pts = [(round((x - minx) * (ss_w / box_w)), round((y - miny) * (ss_h / box_h))) for (x, y) in poly]
        dr.polygon(pts, fill=fill_rgb + (255,))
    out_h = int(round((box_h / box_w) * OUT_W))
    return img.resize((OUT_W, out_h), Image.LANCZOS)


def app_icon(size, maskable=False):
    """方形 App 图标：纯黑底 + 白色 N+T 词标（居中，maskable 留安全区）。"""
    base = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    target_w = int(size * (0.50 if maskable else 0.62))
    mark_full = render((255, 255, 255))                       # 宽 1024
    ratio = mark_full.size[1] / mark_full.size[0]
    mark = mark_full.resize((target_w, int(round(target_w * ratio))), Image.LANCZOS)
    x = (size - mark.width) // 2
    y = (size - mark.height) // 2
    base.alpha_composite(mark, (x, y))
    return base


out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "icons")
render((0, 0, 0)).save(os.path.join(out_dir, "logo.png"), "PNG")
render((255, 255, 255)).save(os.path.join(out_dir, "logo-white.png"), "PNG")
app_icon(192).save(os.path.join(out_dir, "icon-192.png"), "PNG")
app_icon(512).save(os.path.join(out_dir, "icon-512.png"), "PNG")
app_icon(512, maskable=True).save(os.path.join(out_dir, "icon-512-maskable.png"), "PNG")
print("logo.png / logo-white.png / icon-192 / icon-512 / icon-512-maskable 已生成 →", out_dir)
