import {Store} from "../flux-ux/store.js";
import {parseWikiMap, layoutAll} from "./MindMapUtils.js";
import {Action} from "../flux-ux/action.js";
import {path, AppStore} from "./AppStore.js";

export const enum Direction { LEFT, RIGHT };

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
   heightFull: number;
   widthFull: number;
   L2:number;
}

export interface MapNodeStore {
   nodes:Map<number, MapNode>;
   kids:Map<number, number[]>;
   rootId:number;
   selectedId:number;  
   text:string;
   originX:number;
   originY:number;
}

export function newMapNode(level:number, label:string, id:number, L2:number):MapNode {
   return {
      dir: Direction.RIGHT,
      height: 0,
      heightFull: 0,
      id,
      level,
      ordinal: 1,
      parentId: 0,
      text: label,
      width: 0,
      x: 0,
      y: 0,
      widthFull: 0,
      L2: L2
   }
}

class MindMapStoreClass extends Store<MapNodeStore> {
   ID:number = 1;

   constructor() {
      super({selectedId: 0, text: "", nodes: new Map(), kids: new Map(), rootId: 0, originX: 800, originY: 300}, "mindMapStore");
      AppStore.actions.setMarkdown.add(d => {
         if (path().endsWith("mmap")) this.onParse({ text: d.markdown });
      })
   }

   private onParse = (d:{text:string}) => {
      let { all, kids, id } = parseWikiMap(d.text);
      this.ID = id;
      this.update(x => {
         x.selectedId = 0;
         x.kids = kids;
         x.text = d.text;
         x.rootId = 0;
         x.nodes = new Map();
         for (let n of all) {
            x.nodes.set(n.id, n);
            if (n.level == 1 && !x.rootId) x.rootId = n.id;
         }
         this.layout(x);
      })
   }

   private onAddKid = (d:{id:number}) => {
      let parent = this.data.nodes.get(d.id)!;
      this.addEmptyChild(parent);
   }

   private onAddPeer = (d:{id:number}) => {
      let n = this.data.nodes.get(d.id)!;
      let parent = this.data.nodes.get(n.parentId)!;
      this.addEmptyChild(parent);
   }

   private onSetOrigin = (d:{x:number, y:number}) => {
      this.update(x => {
         x.originX = d.x;
         x.originY = d.y;
         x.nodes = new Map(x.nodes);
         this.layout(x);
      })
   }

   private onSetSelectedNode = (d:{id:number}) => {
      this.update(x => {
         x.selectedId = d.id;
      })
   }


   private onUpdateLabel = (d:{id:number, label:string}) => {
      this.update(x => {
         x.nodes = new Map(x.nodes);
         x.nodes.set(d.id, Object.assign({}, x.nodes.get(d.id)!, {text: d.label}));
         this.layout(x);
      })      
   }

   private addEmptyChild(parent:MapNode) {
      let node = newMapNode(parent.level + 1, "", this.ID++, parent.L2);
      node.dir = parent.dir;
      let arr = this.data.kids.get(parent.id)!;
      node.ordinal = this.data.nodes.get(arr[arr.length - 1])!.ordinal + 1;
      if (node.level == 2) node.L2 = node.ordinal;
      this.update(x => {
         x.nodes = new Map(x.nodes);
         x.nodes.set(node.id, node); 
         x.kids = new Map(x.kids);
         x.kids.set(parent.id, arr.concat([node.id]));
         this.layout(x);
      });
   }

   private layout(x:MapNodeStore) {
      let changed:MapNode[] = layoutAll(x);
      for (let n of changed) x.nodes.set(n.id, n);
   }

   actions = {
      parse: Action("parse", this.onParse),
      addKid: Action("addKid", this.onAddKid),
      addPeer: Action("addPeer", this.onAddPeer),
      setOrigin: Action("setOrigin", this.onSetOrigin),
      setSelectedNode: Action("setSelectedNode", this.onSetSelectedNode),
      updateLabel: Action("updateLabel", this.onUpdateLabel),
   };


}


export const MindMapStore = new MindMapStoreClass(); 