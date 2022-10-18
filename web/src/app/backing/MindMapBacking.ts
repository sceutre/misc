import {Action, Store} from "../../utils/flux.js";
import {getKey, isPrintableKey} from "../../utils/keyboard.js";
import {stableStringify} from "../../utils/stringify.js";
import {divide, path} from "../../utils/utils.js";
import {actionUpdateDownloaded, appSave, AppStore, GLOBAL_KEY_HANDLERS} from "./AppBacking.js";

export interface MapNode {
   id: number;
   parentId: number;
   level: number;
   text: string;
   dirIsLeft: boolean;
   x: number;
   y: number;
   height: number;
   width: number;
   heightFull: number;
   widthFull: number;
   collapsed:boolean;
   showing:boolean;
}

export const ROOT_ID = 1;

interface MindMapStoreData {
   root: MapNode;
   allNodes: number[];
   $nonRootNodes: {[id:number]:MapNode}; 
   $kids: {[id:number]:number[]}
   cursorIx:number;
   originX:number;
   originY:number;
   selectedId:number;
   maxId:number;
}

interface MindMapExportData {
   root: MapNode;
   $nonRootNodes: {[id:number]:MapNode}; 
   $kids: {[id:number]:number[]}
   originX:number;
   originY:number;
}

export const MindMapStore = new Store<MindMapStoreData>("MindMapStore", defaultData());

function defaultData() {
   return {
      root: newMapNode(path(), 1, null),
      allNodes: [1],
      $nonRootNodes: {},
      $kids: {1: []},
      selectedId: -1,
      maxId: 1,
      cursorIx: -1,
      originX: 800,
      originY: 300,
   }
}

export function getNode(id:number) {
   return id == ROOT_ID ? MindMapStore.data.root : MindMapStore.data.$nonRootNodes[id];
}

export function getColors(node:MapNode) {
   if (node.id == ROOT_ID) 
      return AllColors[0];
   while (node.level > 2) {
      node = getNode(node.parentId);
   }
   let ix = MindMapStore.data.$kids[ROOT_ID].indexOf(node.id);
   return AllColors[(ix + 1) % AllColors.length];
}

actionUpdateDownloaded.add((arg) => {
   if (AppStore.data.content.type == "mindmap" && !arg.viaSave) {
      let newData:MindMapExportData = defaultData();
      if (typeof AppStore.data.content.exportData != "string") {
         newData = AppStore.data.content.exportData;
      }
      const curData = exportData(MindMapStore.data);
      if (!deepEq(newData, curData)) {
         MindMapStore.update(x => {
            x.root = newData.root;
            x.$kids = newData.$kids;
            x.originX = newData.originX;
            x.originY = newData.originY;
            x.$nonRootNodes = newData.$nonRootNodes;
            x.cursorIx = -1;
            x.allNodes = [ROOT_ID];
            x.maxId = ROOT_ID;
            for (let k in x.$nonRootNodes) {
               x.allNodes.push(+k);
               x.maxId = Math.max(x.maxId, +k);
            }
            layout(x, false);
         });
      }
   }
});

GLOBAL_KEY_HANDLERS.push((ev) => {
   if (AppStore.data.content.type == "mindmap") mindMapOnKey(ev);
})

export const actionMindAddKid = Action("actionMindAddKid", (arg:{parentId:number, afterId:number}) => {
   let parent = getNode(arg.parentId);
   let node = newMapNode("", MindMapStore.data.maxId + 1, parent);
   MindMapStore.update(x => {
      x.allNodes = x.allNodes.concat([node.id]);
      x.maxId = node.id;
      x.selectedId = node.id;
      x.cursorIx = 0;
      x.$nonRootNodes[node.id] = node;
      x.$kids[node.id] = [];
      let arr = x.$kids[parent.id];
      let ix = arr.indexOf(arg.afterId);
      if (ix >= 0) arr.splice(ix + 1, 0, node.id);
      else arr.push(node.id);
      layout(x, true);
   });
});

export const actionMindDelete = Action("actionMindDelete", (arg:{id:number}) => {
   if (arg.id != ROOT_ID && MindMapStore.data.$kids[arg.id].length == 0) {
      let node = getNode(arg.id);
      MindMapStore.update(x => {
         x.allNodes = x.allNodes.filter(id => id != node.id);
         delete x.$kids[node.id];
         delete x.$nonRootNodes[node.id];
         let parentsKids = x.$kids[node.parentId].filter(id => id != node.id);
         x.$kids[node.parentId] = parentsKids;
         x.selectedId = parentsKids.length == 0 ? node.parentId : parentsKids[parentsKids.length - 1];
         x.cursorIx = getNode(x.selectedId).text.length;
         layout(x, true);
      })
   }
});

export const actionMindSetOrigin = Action("actionMindSetOrigin", (d:{x:number, y:number}) => {
   MindMapStore.update(x => {
      x.originX = d.x;
      x.originY = d.y;
      layout(x, false);
   })
});

export const actionMindSelectNode = Action("actionMindSelectNode", (d:{id:number}) => {
   if (MindMapStore.data.selectedId == d.id) return;
   MindMapStore.update(x => {
      x.selectedId = d.id;
      x.cursorIx = -1;
      if (d.id) {
         let node = getNode(d.id)!;
         if (node.text) x.cursorIx = node.text.length; 
         else x.cursorIx = 0;
      }
   })
});

export const actionMindSetCursorIx = Action("actionMindSetCursorIx", (d:{ix:number}) => {
   MindMapStore.set("cursorIx", d.ix);
});

export const actionMindUpdateLabel = Action("actionMindUpdateLabel", (d:{id:number, label:string, cursorIx:number}) => {
   MindMapStore.update(x => {
      let node = getNode(d.id);
      node = Object.assign({}, node, {text: d.label});
      if (node.id == ROOT_ID) {
         x.root = node;
      } else {
         x.$nonRootNodes[node.id] = node;
      }
      x.cursorIx = d.cursorIx;
      layout(x, true);
   })      
});

function layout(x:MindMapStoreData, andSave:boolean) {
   let changed:MapNode[] = layoutAll(x);
   for (let n of changed) {
      if (n.id == ROOT_ID) {
         x.root = n;
      } else {
         x.$nonRootNodes[n.id] = n;
      }
   }
   if (andSave) {
      appSave({ type: "mindmap", exportData: exportData(x) });
   }
}

function exportData(x:MindMapStoreData) {
   return {
      root: x.root,
      $kids: x.$kids,
      $nonRootNodes: x.$nonRootNodes || {},
      originX: x.originX,
      originY: x.originY,
   }
}

interface TextMeasurement {
   ascent: number;
   descent: number;
   height: number;
   width: number;
   recursiveHeight: number;
}

export interface ColoringDetails {
   fg: string;
   bg: string;
   selected: string;
   lines: string;
}

export interface Coloring {
   dark: ColoringDetails;
   normal: ColoringDetails;
}

const nbsp = String.fromCharCode(160);
const VERTICAL_PAD = [0, 10, 15, 15, 5];
const HORIZONTAL_PAD = [0, 10, 80];
const NODE_PAD_HORIZ = [0, 40, 30, 10];
const NODE_PAD_VERT = [0, 34, 24, 10];
const measureCache = new Map<string, TextMeasurement>();
const palette =
`hsl(165.6, 27.78%, 75%)
hsl(34.34, 85.8%, 75%)
hsl(0, 82.76%, 75%)
hsl(285.6, 27.78%, 75%)
hsl(214.34, 85.8%, 75%)
hsl(345.6, 27.78%, 75%)`;
const AllColors: Coloring[] = palette.split("\n").filter(x => x.trim().length > 0).map(x => computeColoring(x));


function layoutAll(data:MindMapStoreData): MapNode[] {
   let changed: MapNode[] = [];
   let sizes = measure(data);
   // root is a special case
   let rootSz = sizes.get(data.root.id)!;
   checkForChanges(data.root, data.originX, data.originY, rootSz.height, rootSz.width, rootSz.recursiveHeight, changed);

   let lefties: MapNode[] = [];
   let righties: MapNode[] = [];
   let leftH = 0, rightH = 0;
   for (let id of data.allNodes) {
      let n = id == ROOT_ID ? data.root : data.$nonRootNodes[id];
      if (n.level == 2) {
         if (n.dirIsLeft) {lefties.push(n); leftH += sizes.get(n.id)!.recursiveHeight + getVPad(n.level);}
         if (!n.dirIsLeft) {righties.push(n); rightH += sizes.get(n.id)!.recursiveHeight + getVPad(n.level);}
      }
   }
   if (leftH > 0) leftH -= getVPad(2);
   if (rightH > 0) rightH -= getVPad(2);
   let leftY = data.originY - (leftH / 2), leftX = data.originX - getHPad(2);
   let rightY = data.originY - (rightH / 2), rightX = data.originX + rootSz.width + getHPad(2);

   for (let e of lefties) {
      subtree(e, leftX, leftY);
      leftY += sizes.get(e.id)!.recursiveHeight + getVPad(e.level);
   }
   for (let e of righties) {
      subtree(e, rightX, rightY);
      rightY += sizes.get(e.id)!.recursiveHeight + getVPad(e.level);
   }

   function subtree(node: MapNode, x: number, y: number) {
      let tm = sizes.get(node.id)!;
      let deltaY = (tm.recursiveHeight - tm.height) / 2;
      let deltaX = (node.dirIsLeft ? -tm.width : 0);
      checkForChanges(node, x + deltaX, y + deltaY, tm.height, tm.width, tm.recursiveHeight, changed);
      let kidX = !node.dirIsLeft ? (x + tm.width + getHPad(node.level)) : (x - tm.width - getHPad(node.level));
      let kidY = y;
      for (let id of data.$kids[node.id]) {
         let kid = data.$nonRootNodes[id];
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

function measure(data:MindMapStoreData) {
   let sizes: Map<number, TextMeasurement> = new Map();
   for (let id of data.allNodes) {
      let v = id == ROOT_ID ? data.root : data.$nonRootNodes[id];
      sizes.set(v.id, measureText(v.level, v.text));
   }
   recurse(data.root.id);
   function recurse(id: number) {
      let array = data.$kids[id];
      let me = id == ROOT_ID ? data.root : data.$nonRootNodes[id];
      let h = 0;
      for (let i of array) {
         h += recurse(i);
      }
      h += getVPad(me.level + 1) * (array.length - 1);
      let val = Math.max(me.collapsed ? 0 : h, sizes.get(id)!.height);
      sizes.get(id)!.recursiveHeight = val;
      return val;
   }
   return sizes;
}

function checkForChanges(node: MapNode, x: number, y: number, height: number, width: number, heightFull: number, changed: MapNode[]) {
   if (node.x != x || node.y != y || node.width != width || node.height != height
      || node.heightFull != heightFull) {
      changed.push(Object.assign({}, node, {x, y, width, height, heightFull}));
   }
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

export function measureText(level: number, text: string) {
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

function computeColoring(val: string): Coloring {
   let match = val.match(/\(([0-9.]+), ([0-9.]+)%, ([0-9.]+)%\)/);
   if (match) {
      let h = +match[1];
      let s = +match[2];
      let L = +match[3];
      return {
         dark: {
            fg: "#ffffffdd",
            bg: `hsl(${h}, ${s}%, 40%)`,
            selected: "hsl(37, 7%, 24%)",
            lines: `hsl(${h}, ${s}%, 60%)`,
         },
         normal: {
            fg: "black",
            bg: `hsl(${h}, ${s}%, 75%)`,
            selected: "hsl(37, 7%, 76%)",
            lines: `hsl(${h}, ${s}%, 40%)`,
         }
      }
   }
   throw "bad input " + val;
}

function newMapNode(label: string, id: number, parent:MapNode|null): MapNode {
   let dirIsLeft:boolean;
   if (parent == null) {
      dirIsLeft = true;
   } else if (parent.level > 1) {
      dirIsLeft = parent.dirIsLeft;
   } else {
      let lefts = 0;
      for (let n of MindMapStore.data.$kids[ROOT_ID]) lefts += (getNode(n).dirIsLeft ? 1 : -1);
      dirIsLeft = lefts < 0;
   }
   return {
      dirIsLeft,
      height: 0,
      heightFull: 0,
      id,
      level: parent ? parent.level + 1 : 1,
      parentId: parent ? parent.id : 0,
      text: label,
      width: 0,
      x: 0,
      y: 0,
      widthFull: 0,
      collapsed: false,
      showing: true
   }
}

function deepEq(payload: MindMapExportData, exp: MindMapExportData) {
   return stableStringify(payload) == stableStringify(exp);
}

export function mindMapOnKey(ev:React.KeyboardEvent|KeyboardEvent) {
   let {selectedId, cursorIx} = MindMapStore.data;
   let k = getKey(ev);
   if (selectedId <= 0 && (k == "Enter" || k.indexOf("Arrow") >= 0)) {
      actionMindSelectNode({id: ROOT_ID});
      return;
   }
   if (selectedId) {
      let n = getNode(selectedId);
      if (isPrintableKey(k) || k == "Shift-Enter") {
         if (k == "Shift-Enter") k = "\n";
         let [pre, post] = divide(n.text, cursorIx);
         actionMindUpdateLabel({ id: n.id, label: pre + k + post, cursorIx: Math.min(n.text.length + 1, cursorIx+1)});
      } else {
         switch (k) {
            case "ArrowLeft":
               actionMindSetCursorIx({ix: Math.max(0, cursorIx-1)});
               break;
            case "ArrowRight":
               actionMindSetCursorIx({ix: Math.min(n.text.length, cursorIx+1)});
               break;
            case "Home":
               actionMindSetCursorIx({ix: 0});
               break;
            case "End":
               actionMindSetCursorIx({ix: n.text.length});
               break;
            case "Enter":
               if (n.id != ROOT_ID) {
                  actionMindAddKid({parentId: n.parentId, afterId: n.id})
               }
               break;
            case "Tab":
               actionMindAddKid({parentId: n.id, afterId: -1})
               break;
            case "Delete":
               if (n.text.length == 0) {
                  actionMindDelete({id: n.id});
                  break;
               }
               if (cursorIx >= n.text.length) break;
               cursorIx++; // fallthrough
            case "Backspace": {
               let [pre, post] = divide(n.text, cursorIx);
               if (pre) {
                  pre = pre.substring(0, pre.length - 1);
                  actionMindUpdateLabel({ id: n.id, label: pre + post, cursorIx: Math.max(0, cursorIx-1)})
               } else if (n.text.length == 0) {
                  actionMindDelete({id: n.id});
               }
               break;
            }
            case "Escape":
               actionMindSelectNode({id: 0});
               break;
            case "Control-ArrowUp":
            case "ArrowUp":
               if (n.level != 1) {
                  let peers = MindMapStore.data.$kids[n.parentId];
                  if (n.level == 2) peers = peers.filter(kId => getNode(kId)!.dirIsLeft == n.dirIsLeft); 
                  let ix = peers.indexOf(selectedId);
                  actionMindSelectNode({id: peers[((ix + peers.length) - 1) % peers.length]});
               }
               break;
            case "Control-ArrowDown":
            case "ArrowDown":
               if (n.level != 1) {
                  let peers = MindMapStore.data.$kids[n.parentId];
                  if (n.level == 2) peers = peers.filter(kId => getNode(kId)!.dirIsLeft == n.dirIsLeft); 
                  let ix = peers.indexOf(selectedId);
                  actionMindSelectNode({id: peers[((ix + peers.length) + 1) % peers.length]});
               }
               break;
            case "Control-ArrowLeft":
               if (selectedId == ROOT_ID) {
                  let arr = MindMapStore.data.$kids[n.id];
                  for (let kId of arr)
                     if (getNode(kId)!.dirIsLeft) {
                        actionMindSelectNode({id: kId});
                        break;
                     }
               } else if (!n.dirIsLeft) {
                  actionMindSelectNode({id: n.parentId});
               } else {
                  let arr = MindMapStore.data.$kids[n.id];
                  if (arr.length > 0) {
                     actionMindSelectNode({id: arr[0]});
                  }
               }
               break;
            case "Control-ArrowRight":
               if (selectedId == ROOT_ID) {
                  let arr = MindMapStore.data.$kids[n.id];
                  for (let kId of arr)
                     if (!getNode(kId)!.dirIsLeft) {
                        actionMindSelectNode({id: kId});
                        break;
                     }
               } else if (n.dirIsLeft) {
                  actionMindSelectNode({id: n.parentId});
               } else {
                  let arr = MindMapStore.data.$kids[n.id];
                  if (arr.length > 0) {
                     actionMindSelectNode({id: arr[0]});
                  }
               }
               break;
            default:
         }
      }
   }
   ev.stopPropagation();
   ev.preventDefault();
}
