#!/usr/bin/env python3
# 干净版：给定 SVG 文件名，计算其中所有 <text> 与所有 <path> 完整 transform 累乘后
# 相对 402x874pt 屏幕的「距顶 / 距左 / 宽 / 高」，用于写零偏差 UI 复刻提示词。
import re, sys
from xml.etree import ElementTree as ET
NS = '{http://www.w3.org/2000/svg}'
def compose(M1,M2):
    a,b,c,d,e,f=M1; a2,b2,c2,d2,e2,f2=M2
    return (a*a2+b*c2,a*b2+b*d2,c*a2+d*c2,c*b2+d*d2,e*a2+f*c2+e2,e*b2+f*d2+f2)
def parse(s):
    M=(1,0,0,1,0,0)
    for t in re.findall(r'(matrix|translate|scale)\(([^)]*)\)',s):
        kind=t[0]; arg=t[1].replace(' ','').split(',')
        if kind=='matrix': T=tuple(float(x) for x in arg)
        elif kind=='translate': T=(1,0,0,1,float(arg[0]),float(arg[1]) if len(arg)>1 else 0)
        else:
            sx=float(arg[0]); sy=float(arg[1]) if len(arg)>1 else sx; T=(sx,0,0,sy,0,0)
        M=compose(M,T)
    return M
def apply(M,x,y):
    a,b,c,d,e,f=M; return (a*x+c*y+e, b*x+d*y+f)
def pbox(d,M):
    seq=re.findall(r'[MLCmcl]|[-+]?\d*\.?\d+',d); pts=[]; i=0
    while i<len(seq):
        t=seq[i]
        if t in 'MLCmcl':
            k=2 if t in 'MLml' else 6; nums=[]; i+=1
            while i<len(seq) and seq[i] not in 'MLCmcl':
                nums.append(float(seq[i])); i+=1
                if len(nums)>=k: break
            vn=nums
            off=0
            while off+k<=len(vn):
                if t in 'MLml': pts.append((vn[off],vn[off+1]))
                else:
                    pts.append((vn[off],vn[off+1])); pts.append((vn[off+4],vn[off+5]))
                off+=k
    if not pts: return None
    xs=[apply(M,px,py)[0] for px,py in pts]; ys=[apply(M,px,py)[1] for px,py in pts]
    x0,x1,y0,y1=min(xs)/4,max(xs)/4,min(ys)/4,max(ys)/4
    return f"顶{y0:.0f} 左{x0:.0f} 右{402-x1:.0f} 高{(y1-y0):.0f}"
def run(fn):
    root=ET.fromstring(open(fn,encoding='utf-8').read())
    def rec(el,M):
        M=compose(M,parse(el.get('transform'))) if el.get('transform') else M
        tag=el.tag.replace(NS,'')
        if tag=='text' and el.text and el.text.strip():
            x=float(re.sub('px','',el.get('x','0'))); y=float(re.sub('px','',el.get('y','0')))
            ax,ay=apply(M,x,y); m=re.search(r'font-size:([\d.]+)px',el.get('style',''))
            fs=float(m.group(1)) if m else 0; op=re.search(r'fill-opacity:([\d.]+)',el.get('style',''))
            print(f'  TEXT "{el.text.strip()}" 顶{ay/4:.0f} 左{ax/4:.0f} 字号{fs*abs(M[0])/4:.1f}pt 透明{op.group(1) if op else 1}')
        elif tag=='path':
            pid=el.get('id') or el.get('serif:id') or ''
            r=pbox(el.get('d',''),M)
            if r: print(f'  PATH [{pid}] {r}')
        for ch in el: rec(ch,M)
    print('==== '+fn.split('/')[-1]+' ===='); rec(root,(1,0,0,1,0,0))
for f in sys.argv[1:]: run(f)
