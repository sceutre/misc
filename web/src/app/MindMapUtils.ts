import {MapNode, Direction, newMapNode, MapNodeStore} from "./MindMapStore.js";

const VERTICAL_PAD = [0,10,15,15, 5];
const HORIZONTAL_PAD = [0,10,80];
const NODE_PAD_HORIZ = [0,40,30,10];
const NODE_PAD_VERT = [0,34,24,10];

export function layoutAll(st: MapNodeStore): MapNode[] {
   let changed: MapNode[] = [];
   let sizes = measure(st);
   // root is a special case
   let root = st.nodes.get(st.rootId)!;
   let rootSz = sizes.get(root.id)!;
   updateChanged(root, st.originX, st.originY, rootSz.height, rootSz.width, rootSz.recursiveHeight, changed);

   let lefties: MapNode[] = [];
   let righties: MapNode[] = [];
   let leftH=0, rightH = 0;
   for (let [k,n] of st.nodes) {
      if (n.level == 2) {
         if (n.dir == Direction.LEFT) {lefties.push(n); leftH += sizes.get(n.id)!.recursiveHeight + getVPad(n.level);}
         if (n.dir == Direction.RIGHT) {righties.push(n); rightH += sizes.get(n.id)!.recursiveHeight + getVPad(n.level);}
      }
   }
   if (leftH > 0) leftH -= getVPad(2);
   if (rightH > 0) rightH -= getVPad(2);
   let leftY = st.originY - (leftH / 2), leftX = st.originX - getHPad(2);
   let rightY = st.originY - (rightH / 2), rightX = st.originX + rootSz.width + getHPad(2);

   for (let e of lefties) { 
      subtree(e, leftX, leftY);
      leftY += sizes.get(e.id)!.recursiveHeight + getVPad(e.level);
   }
   for (let e of righties) { 
      subtree(e, rightX, rightY);
      rightY += sizes.get(e.id)!.recursiveHeight + getVPad(e.level);
   }

   function subtree(node:MapNode, x:number, y:number) {
      let tm = sizes.get(node.id)!;
      let deltaY = (tm.recursiveHeight - tm.height) / 2;
      let deltaX = (node.dir == Direction.LEFT ? -tm.width : 0);
      updateChanged(node, x + deltaX, y + deltaY, tm.height, tm.width, tm.recursiveHeight, changed);
      let kidX = node.dir == Direction.RIGHT ? (x + tm.width + getHPad(node.level)) : (x - tm.width - getHPad(node.level));
      let kidY = y;
      for (let id of st.kids.get(node.id)!) {
         let kid = st.nodes.get(id)!;
         subtree(kid, kidX, kidY);
         kidY += sizes.get(kid.id)!.recursiveHeight + getVPad(kid.level);
      }
   }
   
   return changed;
}


function getVPad(i: number) {
   let n = VERTICAL_PAD.length;
   return VERTICAL_PAD[i < n ? i : n - 1];
}

function getHPad(i: number) {
   let n = HORIZONTAL_PAD.length;
   return HORIZONTAL_PAD[i < n ? i : n - 1];
}

export function getNodeHorizPad(i: number) {
   let n = NODE_PAD_HORIZ.length;
   return NODE_PAD_HORIZ[i < n ? i : n - 1];
}

export function getNodeVertPad(i: number) {
   let n = NODE_PAD_VERT.length;
   return NODE_PAD_VERT[i < n ? i : n - 1];
}

function measure(st: MapNodeStore) {
   let sizes: Map<number, TextMeasurement> = new Map();
   for (let [k, v] of st.nodes) {
      sizes.set(v.id, measureText(v.level, v.text));
   }
   recurse(st.rootId);
   function recurse(id: number) {
      let array = st.kids.get(id)!;
      let h = 0;
      for (let i of array) {
         h += recurse(i);
      }
      h += getVPad(st.nodes.get(id)!.level + 1) * (array.length-1);
      let val = Math.max(h, sizes.get(id)!.height);
      sizes.get(id)!.recursiveHeight = val;
      return val;
   }
   return sizes;
}

function updateChanged(root: MapNode, x: number, y: number, height: number, width: number, heightFull: number, changed: MapNode[]) {
   if (root.x != x || root.y != y || root.width != width || root.height != height
      || root.heightFull != heightFull ) {
      changed.push(Object.assign({}, root, {x, y, width, height, heightFull}));
   }

}

export function parseWikiMap(text: string) {
   function parseLine(line: string) {
      let level = (line.length - line.trimLeft().length) + 1;
      let label = line.trim().replace("\\n", "\n");
      if (label.startsWith("*")) {
         level = Math.floor(level / 3);
         label = label.substring(1).trimLeft();
      }
      return {level, label};
   }

   let id = 1;
   let parents: MapNode[] = [];
   let all: MapNode[] = [];
   let kids: Map<number, number[]> = new Map();
   let lines = text.split("\n");
   let L2 = 0;

   for (let line of lines) {
      let {level, label} = parseLine(line);
      if (!label) continue;
      if (level == 2) L2++;
      let node: MapNode = newMapNode(level, label, id++, L2);
      kids.set(node.id, []);
      if (parents.length == 0) {
         all.push(node);
         parents.push(node);
      } else {
         let p = parents[parents.length - 1];
         if (p.level + 1 == level) {
            node.parentId = p.id;
         } else if (p.level + 1 < level) {
            parents.push(all[all.length - 1]);
            p = parents[parents.length - 1];
            node.parentId = p.id;
         } else {
            while (p.level + 1 > level) {
               p = parents.pop()!;
            }
            parents.push(p);
            node.parentId = p.id;
         }
         all.push(node);
         kids.get(p.id)!.push(node.id);
         node.ordinal = kids.get(p.id)!.length;
         node.dir = level == 2 ? (node.ordinal % 2 == 0 ? Direction.RIGHT : Direction.LEFT) : p.dir;
      }
   }

   return {all, kids, id}
}


const nbsp = String.fromCharCode(160);

interface TextMeasurement {
   ascent: number;
   descent: number;
   height: number;
   width: number;
   recursiveHeight: number;
}

/*  Returns width, height, ascent, descent in pixels for the specified text and font.
    The ascent and descent are measured from the baseline. Note that we add/remove
    all the DOM elements used for a measurement each time - this is not a significant
    part of the cost, and if we left the hidden measuring node in the DOM then it
    would affect the dimensions of the whole page.
 */
function measureTextImpl(level: number, text: string): TextMeasurement {
   var span, block, div;

   span = document.createElement('span');
   block = document.createElement('div');
   div = document.createElement('div');

   block.style.display = 'inline-block';
   block.style.width = '1px';
   block.style.height = '0';

   div.style.visibility = 'hidden';
   div.style.position = 'absolute';
   div.style.top = '0';
   div.style.left = '0';
   div.style.width = '320px';
   div.style.height = '200px';
   div.style.whiteSpace = "pre-line";

   div.appendChild(span);
   div.appendChild(block);
   document.body.appendChild(div);
   let result = {} as TextMeasurement;
   try {
      span.className = "level" + level;
      span.innerHTML = '';
      span.appendChild(document.createTextNode(text));
      block.style.verticalAlign = 'baseline';
      result.ascent = (block.offsetTop - span.offsetTop);
      block.style.verticalAlign = 'bottom';
      result.height = (block.offsetTop - span.offsetTop) + getNodeVertPad(level);
      result.descent = result.height - result.ascent;
      result.width = span.offsetWidth + getNodeHorizPad(level);
   } finally {
      div.parentNode!.removeChild(div);
      div = null;
   }
   return result;
};

const measureCache = new Map<string, TextMeasurement>();

function measureText(level: number, text: string) {
   let k = text + level;
   let rez = measureCache.get(k);
   if (!rez) {
      rez = measureTextImpl(level, text);
      if (measureCache.size > 10000) {
         measureCache.clear();
      }
      measureCache.set(k, rez);
   }
   return rez;
}

const palette = 
`hsl(165.6, 27.78%, 75%)
hsl(34.34, 85.8%, 75%)
hsl(0, 82.76%, 75%)
hsl(285.6, 27.78%, 75%)
hsl(214.34, 85.8%, 75%)
hsl(345.6, 27.78%, 75%)`;

interface Coloring {
   fg:string;
   bg:string;
   selected:string;
   lines:string;
}

function computeColoring(val:string, darkMode:boolean):Coloring {
   let match = val.match(/\(([0-9.]+), ([0-9.]+)%, ([0-9.]+)%\)/);
   if (match) {
      let h = +match[1];
      let s = +match[2];
      let L = +match[3];
      return {
         fg: darkMode ? "#ffffffdd" : "black",
         bg: `hsl(${h}, ${s}%, ${darkMode ? 40 : 75}%)`,
         selected: darkMode ?  "hsl(37, 7%, 24%)" : "hsl(37, 7%, 76%)",
         lines: `hsl(${h}, ${s}%, ${darkMode ? 60 : 40}%)`,
      }
   }
   throw "bad input " + val;
}

export const NormalColors:Coloring[] = [];
export const DarkColors:Coloring[] = [];

palette.split("\n").forEach(s => {
   if (s) {
      NormalColors.push(computeColoring(s, false));
      DarkColors.push(computeColoring(s, true));
   }
});
