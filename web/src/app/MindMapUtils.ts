import {VERTICAL_PAD, HORIZONTAL_PAD, MapNode, Direction, newMapNode} from "./MindMapStore.js";

let rulers:{[k:number]:HTMLDivElement} = {};

function getRuler(i:number, txt:string) {
   let x = rulers[i];
   if (!x) {
      x = document.createElement("div");
      x.className = "level" + i;
      rulers[i] = x;
   }
   x.innerText = txt;
   return x;
}

function getVPad(i:number) {
   let n = VERTICAL_PAD.length;
   return VERTICAL_PAD[i < n ? i : n-1];
}

function getHPad(i:number) {
   let n = HORIZONTAL_PAD.length;
   return HORIZONTAL_PAD[i < n ? i : n-1];
}

export function layoutRoot(root:MapNode, x:number, y:number) {
   let r = getRuler(root.level, root.text);
   let height = r.offsetHeight;
   let width = r.offsetWidth;
   x -= width/2;
   y -= height/2;
   if (root.x != x || root.y != y || root.width != width || root.height != height) {
      return Object.assign({}, root, {x, y, width, height});
   }
}

export function layoutMap(root:MapNode, x:number, y:number, kids:{[id:number]: number[]}, data:Map<number, MapNode>, changed:MapNode[]) {
   let r = getRuler(root.level, root.text);
   let height = r.offsetHeight;
   let width = r.offsetWidth;
   let array = kids[root.id] || [];
   let kidX = root.dir == Direction.RIGHT ? (x + width + getHPad(root.level)) : (x - width - getHPad(root.level));
   let kidY = y;
   let heightWithKids = -getVPad(root.level);
   for (let kidId of array) {
      let kid = data.get(kidId)!;
      heightWithKids += layoutMap(kid, kidX, kidY, kids, data, changed) + getVPad(root.level);
      kidY += height + getVPad(root.level);
   }
   heightWithKids = Math.max(heightWithKids, height);
   y = y + heightWithKids/2 - height/2;
   if (root.x != x || root.y != y || root.width != width || root.height != height || root.heightWithKids != heightWithKids) {
      root = Object.assign({}, root, {x, y, width, height, heightWithKids});
      changed.push(root);
   }
   return heightWithKids;
}

export function parseWikiMap(text:string) {
   function parseLine(line:string) {
      let level = (line.length - line.trimLeft().length) + 1;
      let label = line.trim();
      if (label.startsWith("*")) {
         level = Math.floor(level/3);
         label = label.substring(1).trimLeft();
      }
      return { level, label };
   }

   let id = 1;
   let parents:MapNode[] = [];
   let all:MapNode[] = [];
   let kids:{[id:number] : number[]} = {};
   let lines = text.split("\n");

   for (let line of lines) {
      let { level, label } = parseLine(line);
      let node:MapNode = newMapNode(level, label, id++);
      all.push(node);
      if (parents.length == 0) {
         parents.push(node);
      } else {
         let p = parents[parents.length - 1];
         if (p.level+1 == level) {
            node.parentId = p.id;
         } else if (p.level + 1 < level) {
            parents.push(all[all.length - 1]);
            p = parents[parents.length - 1];
            node.parentId = p.id;
         } else {
            while (p.level + 1 > level) {
               p = parents.pop()!;
            }            
            node.parentId = p.id;
         }
         if (typeof kids[p.id] == "undefined") kids[p.id] = [];
         kids[p.id].push(node.id);
         node.ordinal = kids[p.id].length;
         node.dir = level==1 ? (node.ordinal % 2 == 0 ? Direction.RIGHT : Direction.LEFT) : p.dir;
      }
   }

   return { all, kids, id }
}
