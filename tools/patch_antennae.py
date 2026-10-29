"""把 src/antennae.js 注入 index.html 的打包代码，并接上潜伏/探头逻辑。

用法：python3 tools/patch_antennae.py   （可重复执行，已注入过会先还原再注入）
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
HTML = ROOT / "index.html"
SRC = ROOT / "src" / "antennae.js"
BEGIN, END = "/*RA_BEGIN*/", "/*RA_END*/"

# (原文, 替换后)
PATCHES = [
    # 新参数：触须长度（相对体长）
    ("fleeRadius:170,sound:!0}", "fleeRadius:170,sound:!0,antenna:1.15}"),
    # 加载模型后隐藏原触须
    ('Dd=Gr.tracks.some(c=>c.name.startsWith("head3_01."));',
     'Dd=Gr.tracks.some(c=>c.name.startsWith("head3_01."));RA_prep(Gs);'),
    # 每只蟑螂挂上程序化触须，并把触须算进"完全藏起来"的距离
    ("this.headBase=this.head?this.head.quaternion.clone():null,",
     "this.headBase=this.head?this.head.quaternion.clone():null,"
     "this.ant=this.head&&RA_ANT.length?new RA_Ant(this):null,"
     "this.ant&&(this.reach=Math.max(this.reach,this.ant.reachX)),"),
    # 潜伏时头缩在屏幕外更深，只露触须
    ("this.hx=r.x-i.x*(this.front+4),this.hy=r.y-i.y*(this.front+4)",
     "this.hide=tt(.07*this.L+4,.32*this.L),"
     "this.hx=r.x-i.x*(this.front+this.hide),this.hy=r.y-i.y*(this.front+this.hide)"),
    # 探头要先越过藏身深度才露出头
    ("depth:tt(.12,.3)*this.L", "depth:this.hide+tt(.1,.3)*this.L"),
    # 每帧更新触须
    (".multiply(Id)}this.pivot.visible", ".multiply(Id)}this.ant&&this.ant.update(e);this.pivot.visible"),
]
ANCHOR = "var au=class{"


def main():
    html = HTML.read_text(encoding="utf-8")
    # 还原旧注入
    html = re.sub(r"\n" + re.escape(BEGIN) + r".*?" + re.escape(END) + "\n", "", html, flags=re.S)
    for old, new in PATCHES:
        html = html.replace(new, old)
    for old, new in PATCHES:
        assert html.count(old) == 1, f"锚点不唯一或不存在: {old[:50]}"
        html = html.replace(old, new)
    assert html.count(ANCHOR) == 1
    code = SRC.read_text(encoding="utf-8")
    html = html.replace(ANCHOR, f"\n{BEGIN}\n{code}\n{END}\n{ANCHOR}")
    HTML.write_text(html, encoding="utf-8")
    print("ok")


main()
