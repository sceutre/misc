import {Store} from "../flux-ux/store.js";
import {parseWikiMap, layoutMap, layoutRoot} from "./MindMapUtils.js";

export const enum Direction { LEFT, RIGHT };
export const VERTICAL_PAD = [ 0, 10 ];
export const HORIZONTAL_PAD = [ 0, 10 ];

export interface MapNode {
   id:number;
   parentId:number;
   ordinal:number;
   level:number;
   text:string;
   dir:Direction;
   x:number;
   y:number;
   height:number;
   width:number;
   heightWithKids: number;
}

interface MapNodeStore {
   nodes:Map<number, MapNode>;
   selected:number;  
   text:string;
}

export function newMapNode(level:number, label:string, id:number):MapNode {
   return {
      dir: Direction.RIGHT,
      height: 0,
      heightWithKids: 0,
      id,
      level,
      ordinal: 1,
      parentId: 0,
      text: label,
      width: 0,
      x: 0,
      y: 0
   }
}

class MindMapStoreClass extends Store<MapNodeStore> {
   kids:{[id:number]:number[]} = {};
   ID:number = 0;

   constructor() {
      super({selected: 0, text: "", nodes: new Map()}, "mindMapStore");
   }

   private parse(text:string) {
      let { all, kids, id } = parseWikiMap(text);
      this.kids = kids;
      this.ID = id;
      this.update(x => {
         x.selected = 0;
         x.text = text;
         x.nodes = new Map();
         for (let n of all) {
            x.nodes.set(n.id, n);
         }
         this.layout(x);
      })
   }

   private addKid(id:number) {
      let parent = this.data.nodes.get(id)!;
      this.addChild(parent);
   }

   private addPeer(id:number) {
      let n = this.data.nodes.get(id)!;
      let parent = this.data.nodes.get(n.parentId)!;
      this.addChild(parent);
   }

   private updateLabel(id:number, label:string) {
      this.update(x => {
         x.nodes = new Map(x.nodes);
         x.nodes.set(id, Object.assign({}, x.nodes.get(id)!, {text: label}));
         this.layout(x);
      })      
   }

   private addChild(parent:MapNode) {
      let node = newMapNode(parent.level + 1, "", this.ID++);
      node.dir = parent.dir;
      let arr = this.kids[parent.id];
      if (!arr) arr = this.kids[parent.id] = [];
      node.ordinal = this.data.nodes.get(arr[arr.length - 1])!.ordinal + 1;
      arr.push(node.id);
      this.update(x => {
         x.nodes = new Map(x.nodes);
         x.nodes.set(node.id, node); 
         this.layout(x);
      });
   }

   private layout(x:MapNodeStore) {
      let changed:MapNode[] = [];
      let m:MapNode|undefined = undefined;

      for (let [key,val] of x.nodes) {
         if (val.level == 1) {
            m = val;
            break;
         }
      }

      if (m) {
         let m2 = layoutRoot(m, 600, 600);
         if (m2) {
            m = m2;
            changed.push(m2);
         }
         let arr = this.kids[m.id] || [];
         for (let id of arr) layoutMap(x.nodes.get(id)!, 0, 0, this.kids, x.nodes, changed);
      }
      for (let n of changed) x.nodes.set(n.id, n);
   }


}


export const MindMapStore = new MindMapStoreClass(); 