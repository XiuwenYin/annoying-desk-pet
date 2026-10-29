"""把 src/ 下的模块注入 index.html 的打包代码，并接上触须和性能相关的改动。

用法：python3 tools/patch.py   （可重复执行，已注入过会先还原再注入）
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
HTML = ROOT / "index.html"
MODULES = ["perf.js", "antennae.js"]
BEGIN, END = "/*RA_BEGIN*/", "/*RA_END*/"

# (原文, 替换后)
PATCHES = [
    # 新参数：触须长度（相对体长）、lite 省电模式
    ("fleeRadius:170,sound:!0}", "fleeRadius:170,sound:!0,antenna:1.15,lite:!1}"),
    ("on.setPixelRatio(Math.min(devicePixelRatio||1,2));",
     "on.setPixelRatio(Rt.lite?1:Math.min(devicePixelRatio||1,2));"),
    ("ii.shadow.mapSize.set(4096,4096);", "ii.shadow.mapSize.set(Rt.lite?2048:4096,Rt.lite?2048:4096);"),
    # 全屏的接影平面不再渲染，改成每只蟑螂脚下一块小平面，省掉整屏的阴影采样
    ("Yi.add(kr);", "Yi.add(kr);kr.visible=!1;"),
    # 加载模型后隐藏原触须
    ('Dd=Gr.tracks.some(c=>c.name.startsWith("head3_01."));',
     'Dd=Gr.tracks.some(c=>c.name.startsWith("head3_01."));RA_prep(Gs);'),
    # 每只蟑螂挂上程序化触须，并把触须算进"完全藏起来"的距离；再配一块跟随的接影平面
    ("this.headBase=this.head?this.head.quaternion.clone():null,",
     "this.headBase=this.head?this.head.quaternion.clone():null,"
     "this.ant=this.head&&RA_ANT.length?new RA_Ant(this):null,"
     "this.ant&&(this.reach=Math.max(this.reach,this.ant.reachX)),"
     "this.sh=kr.clone(),this.sh.visible=!0,this.sh.scale.set(2*(this.reach+this.back)+60,2*(this.reach+this.back)+60,1),Yi.add(this.sh),"),
    # 潜伏时头缩在屏幕外更深，只露触须
    ("this.hx=r.x-i.x*(this.front+4),this.hy=r.y-i.y*(this.front+4)",
     "this.hide=tt(.07*this.L+4,.32*this.L),"
     "this.hx=r.x-i.x*(this.front+this.hide),this.hy=r.y-i.y*(this.front+this.hide)"),
    # 探头要先越过藏身深度才露出头
    ("depth:tt(.12,.3)*this.L", "depth:this.hide+tt(.1,.3)*this.L"),
    # 每帧更新触须
    (".multiply(Id)}this.pivot.visible", ".multiply(Id)}this.ant&&this.ant.update(e);this.pivot.visible"),
    # 接影平面跟着蟑螂走
    ('this.pivot.visible=this.state!=="gone",',
     'this.pivot.visible=this.state!=="gone",this.sh.visible=this.pivot.visible,this.sh.position.set(this.x,0,this.y),'),
    # 帧率统计、lite 隔帧渲染
    ("for(let h of i)h.update(l);", "for(let h of i)h.update(l);RA_perf();"),
    ("u&&a||on.render(Yi,Hs)", "u&&a||RA_skip(i)||on.render(Yi,Hs)"),
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
    code = "\n".join((ROOT / "src" / m).read_text(encoding="utf-8") for m in MODULES)
    html = html.replace(ANCHOR, f"\n{BEGIN}\n{code}\n{END}\n{ANCHOR}")
    HTML.write_text(html, encoding="utf-8")
    print("ok")


main()
