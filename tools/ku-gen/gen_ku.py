# 고려대 캠퍼스 장면(client/src/world/render/ku.ts)을 만드는 생성기.
# ku.ts는 손으로 고치지 않는다: 이 폴더의 scene2.txt / extra_helpers.txt / ku-mockup.html을 고치고 다시 돌린다.
#   python tools/ku-gen/gen_ku.py     (저장소 어디에서 실행해도 된다)
import io, os, re

os.chdir(os.path.dirname(os.path.abspath(__file__)))
SRC = 'ku-mockup.html'
OUT = '../../client/src/world/render/ku.ts'
html = io.open(SRC, encoding='utf-8').read()

# ---- 1) 도구 함수 구간 추출
a = html.index("const GRASS =")
b = html.index("/* ---------- 바닥: 광장 · 잔디 ---------- */")
helpers = html[a:b]

# 불필요한 함수 제거 (modern, lamp)
def cut_function(text, name, next_marker):
    i = text.index("function " + name)
    j = text.index(next_marker, i)
    # 함수 앞의 주석 줄까지 같이 제거
    k = text.rfind("\n", 0, i)
    k2 = text.rfind("\n", 0, k)
    prev = text[k2 + 1:k]
    if prev.strip().startswith("/*") or prev.strip().startswith("//"):
        i = k2 + 1
    return text[:i] + text[j:]

helpers = cut_function(helpers, "modern", "function tiger")

# 주석 제거(한글 주석 → 포르투갈어 주석은 손으로 다시 단다)
helpers = re.sub(r"/\*[^*]*\*+(?:[^/*][^*]*\*+)*/", "", helpers)
helpers = re.sub(r"[ \t]*//[^\n]*", "", helpers)
helpers = re.sub(r"\n{3,}", "\n\n", helpers)

# ---- 2) 시그니처에 타입 달기
sig = {
    "function blob(cx, cy, rx, ry, pal, seed, n = 7)": "function blob(cx: number, cy: number, rx: number, ry: number, pal: string[], seed: number, n = 7)",
    "function shadow(cx, cy, rx, ry, a = 0.2)": "function shadow(cx: number, cy: number, rx: number, ry: number, a = 0.2)",
    "function disc(cx, cy, r, col)": "function disc(cx: number, cy: number, r: number, col: string)",
    "function tree(x, y, pal, s = 1, seed = 1)": "function tree(x: number, y: number, pal: string[], s = 1, seed = 1)",
    "function hedge(x, y, w, h = 6, pal = GREEN, seed = 5)": "function hedge(x: number, y: number, w: number, h = 6, pal: string[] = GREEN, seed = 5)",
    "function letters(str, x, y, col)": "function letters(str: string, x: number, y: number, col: string)",
    "function ashlar(x, y, w, h, base = STONE[1])": "function ashlar(x: number, y: number, w: number, h: number, base = STONE[1])",
    "function arch(x, y, w, h, glass = '#27384f')": "function arch(x: number, y: number, w: number, h: number, glass = '#27384f')",
    "function rect(x, y, w, h, glass = '#27384f')": "function rect(x: number, y: number, w: number, h: number, glass = '#27384f')",
    "function roof(x, y, w, h)": "function roof(x: number, y: number, w: number, h: number)",
    "function dormer(cx, y)": "function dormer(cx: number, y: number)",
    "function gable(px, top, w, h)": "function gable(px: number, top: number, w: number, h: number)",
    "function ivy(x, y, p, seed)": "function ivy(x: number, y: number, p: string[], seed: number)",
    "function gothicHall(x, w, base, floors, o = {})": "function gothicHall(x: number, w: number, base: number, floors: number, o: { door?: boolean; gable?: number; spire?: boolean; spireRight?: boolean } = {})",
    "function tiger(x, y)": "function tiger(x: number, y: number)",
    "function bench(x, y, w = 24)": "function bench(x: number, y: number, w = 24)",
    "function lamp(x, y)": "function lamp(x: number, y: number)",
    "function bikeRack(x, y)": "function bikeRack(x: number, y: number)",
    "function bin(x, y)": "function bin(x: number, y: number)",
    "function student(x, y, jacket = CRIMSON, o = {})": "function student(x: number, y: number, jacket = CRIMSON, o: { skin?: string; hair?: string; pants?: string; bag?: string } = {})",
    "function stoneGable(px, top, w, h)": "function stoneGable(px: number, top: number, w: number, h: number)",
    "function mound(cx, cy, rx, ry, seed)": "function mound(cx: number, cy: number, rx: number, ry: number, seed: number)",
    "function pine(x, y, seed)": "function pine(x: number, y: number, seed: number)",
    "function libraryHall(x, w, base)": "function libraryHall(x: number, w: number, base: number)",
    "function castleHall(x, w, base)": "function castleHall(x: number, w: number, base: number)",
    "function tigerEmblem(cx, cy)": "function tigerEmblem(cx: number, cy: number)",
    "function statue(cx, base)": "function statue(cx: number, base: number)",
}
for k, v in sig.items():
    assert k in helpers, k
    helpers = helpers.replace(k, v, 1)

helpers = helpers.replace("const GLY = {", "const GLY: Record<string, string[]> = {", 1)
helpers = helpers.replace("const M = (dx, y, w, h, col) =>", "const M = (dx: number, y: number, w: number, h: number, col: string) =>", 1)
helpers = helpers.replace("const at = (x, y) =>", "const at = (x: number, y: number) =>", 1)
# 담쟁이 목록: [x, y, 팔레트] 튜플 배열로 고정
helpers = helpers.replace("for (const [ix, iy, p] of [[x + 12, base - 6, CRIM], [x + w - 14, base - 4, MAPLE], [x + w * 0.45, base - 5, GREEN]])",
                          "for (const [ix, iy, p] of [[x + 12, base - 6, CRIM], [x + w - 14, base - 4, MAPLE], [x + w * 0.45, base - 5, GREEN]] as [number, number, string[]][])")
helpers = helpers.replace("for (const [ix, iy, p] of [[x + 10, base - 6, MAPLE], [x + w - 12, base - 5, CRIM], [x + 40, base - 4, GREEN]])",
                          "for (const [ix, iy, p] of [[x + 10, base - 6, MAPLE], [x + w - 12, base - 5, CRIM], [x + 40, base - 4, GREEN]] as [number, number, string[]][])")
helpers = helpers.replace("for (const [ix, iy, p] of [[x + 40, base - 5, CRIM], [x + w - 44, base - 4, GREEN]])",
                          "for (const [ix, iy, p] of [[x + 40, base - 5, CRIM], [x + w - 44, base - 4, GREEN]] as [number, number, string[]][])")
# 개발용 들여쓰기(함수 안으로)
helpers = "\n".join(("  " + l if l.strip() else l) for l in helpers.strip("\n").split("\n"))

# 팔레트는 모듈 상단으로 올린다
pal_names = ["GRASS", "GINKGO", "MAPLE", "GREEN", "DEEP", "STONE", "PAVE", "MOUND", "PINE"]
pal_lines = []
rest_lines = []
for line in helpers.split("\n"):
    m = re.match(r"\s*const (\w+) = (\[.*\]);\s*$", line)
    if m and m.group(1) in pal_names:
        pal_lines.append("const %s = %s;" % (m.group(1), m.group(2)))
    else:
        rest_lines.append(line)
helpers = "\n".join(rest_lines)

header = """// Campus "KU Edition": pinta, na camada base, o entorno do prédio como um campus de pedra gótica
// (bosque ao fundo, fileira de edifícios com o prédio principal no centro, praça, edifícios laterais).
// Desenha em "pixel de arte" de 2x2 px de mundo numa tela pequena e amplia sem suavizar; o retângulo do
// prédio fica transparente, então salas, jardins dos slots, rua e calçada continuam como antes.
import { mulberry32 } from '../../../../shared/hash';
import type { KuBench, KuDoor, KuMap, Pt } from './ku-map';

/** Tamanho, em px de mundo, de um pixel de arte desta cena. */
export const KU_SCALE = 2;
const S = KU_SCALE;

const CRIMSON = '#8b0029';
const CRIM = ['#c23a58', '#9c1236', '#6f0a27', '#4a0618'];
"""
header += "\n".join(pal_lines) + "\n"

geometry = """
export interface KuGeometry {
  /** Origem e tamanho da camada base (px de mundo). */
  bx: number;
  by: number;
  bw: number;
  bh: number;
  /** Retângulo do prédio (px de mundo). */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** Topo da calçada sul (px de mundo): o campus termina aqui. */
  sidewalkY: number;
  /** Início da faixa ao sul da rua (px de mundo). */
  southStripY: number;
  /** Topo e base da pista da rua (px de mundo), para a faixa de pedestres. */
  streetY0: number;
  streetY1: number;
}

/** Objeto em pé (árvore, banco, mastro...) desenhado em tempo real, na ordem de profundidade com pessoas e veículos. */
export interface KuSprite {
  canvas: HTMLCanvasElement;
  /** Canto superior esquerdo e profundidade (y dos pés), em px de mundo. */
  x: number;
  y: number;
  depth: number;
}

export interface KuScene {
  lo: HTMLCanvasElement;
  sprites: KuSprite[];
  /** Onde se pode andar, portas, bancos e a faixa de pedestres (ver ku-map.ts). */
  map: KuMap;
}

const cache = new Map<string, KuScene>();

/** Pinta o campus na camada base (ctx já transladado para coordenadas de mundo) e devolve o que é desenhado em tempo real. */
export function paintKuCampus(ctx: CanvasRenderingContext2D, g: KuGeometry): KuScene {
  const key = [g.bx, g.by, g.bw, g.bh, g.x0, g.x1, g.y0, g.y1, g.sidewalkY, g.southStripY, g.streetY0, g.streetY1].join(',');
  let scene = cache.get(key);
  if (!scene) {
    scene = renderScene(g);
    if (cache.size >= 2) cache.clear();
    cache.set(key, scene);
  }
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scene.lo, g.bx, g.by, scene.lo.width * S, scene.lo.height * S);
  ctx.imageSmoothingEnabled = smooth;
  return scene;
}

function renderScene(g: KuGeometry): KuScene {
  const LW = Math.ceil(g.bw / S);
  const LH = Math.ceil(g.bh / S);
  const lo = document.createElement('canvas');
  lo.width = LW;
  lo.height = LH;
  let c = lo.getContext('2d')!;
  const R = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const rnd = mulberry32(0x4b55);

  // Geometria em pixels de arte: prédio, topo da calçada e centro da fileira de edifícios.
  const xL = (g.x0 - g.bx) / S;
  const xR = (g.x1 - g.bx) / S;
  const yT = (g.y0 - g.by) / S;
  const sidewalkA = (g.sidewalkY - g.by) / S;
  const cxA = (xL + xR) / 2;
  // a cena foi desenhada com o centro em x=400 e o topo do prédio em y=350
  const ox = cxA - 400;
  const oy = yT - 350;
  const HB = 240;

"""

scene = io.open("scene2.txt", encoding="utf-8").read()

# renderScene
# renderScene 안으로 들어갈 도구 함수는 scene 앞에 둔다
extra = io.open("extra_helpers.txt", encoding="utf-8").read()
body = header + geometry + helpers + "\n" + extra + "\n" + scene
io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
print('written', len(body))
