import {Store} from "../flux-ux/store.js";
import {parseWikiMap, layoutAll, MapNode, newMapNode, Coloring, nextColor, Direction, mindMapToString} from "./MindMapUtils.js";
import {Action} from "../flux-ux/action.js";
import {path, AppStore} from "./AppStore.js";
import {onTextExternal} from "./App.js";


export interface MapNodeStore {
   nodes:Map<number, MapNode>;
   kids:Map<number, number[]>;
   colors:Map<number, Coloring>;
   rootId:number;
   selectedId:number;
   cursorIx:number;
   text:string;
   originX:number;
   originY:number;
}

class MindMapStoreClass extends Store<MapNodeStore> {
   ID:number = 1;

   constructor() {
      super({selectedId: 0, text: "", nodes: new Map(), kids: new Map(), colors: new Map(), rootId: 0, originX: 800, originY: 300, cursorIx: -1}, "mindMapStore");
      AppStore.actions.setMarkdown.add(d => {
         if (path().endsWith("mmap") && this.data.text != d.markdown) this.onParse({ text: d.markdown });
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
         if (all.length == 0) {
            all.push(newMapNode(1, "", 1, 1));
            this.ID = 2;
         }
         for (let n of all) {
            x.nodes.set(n.id, n);
            if (n.level == 1 && !x.rootId) x.rootId = n.id;
         }
         x.colors = new Map();
         x.colors.set(x.rootId, nextColor(x.colors));
         for (let l2 of kids.get(x.rootId)!) {
            x.colors.set(l2, nextColor(x.colors));
         }
         this.layout(x, false);
      })
   }

   private onAddKid = (d:{id:number}) => {
      let parent = this.data.nodes.get(d.id)!;
      this.addEmptyChild(parent);
   }

   private onAddPeer = (d:{id:number}) => {
      let n = this.data.nodes.get(d.id)!;
      if (n.level > 1) {
         let parent = this.data.nodes.get(n.parentId)!;
         this.addEmptyChild(parent, n);
      }
   }

   private onDeleteNode = (d:{id:number}) => {
      let n = this.data.nodes.get(d.id)!;
      if (n.level > 1 && this.data.kids.get(n.id)!.length == 0) {
         this.update(x => {
            x.nodes = new Map(x.nodes);
            x.nodes.delete(n.id);
            x.kids = new Map(x.kids);
            x.kids.delete(n.id);
            if (n.level == 2) {
               x.colors = new Map(x.colors);
               x.colors.delete(n.id);
            }
            let pkids = x.kids.get(n.parentId)!.filter(x => x != d.id);
            x.kids.set(n.parentId, pkids);
            if (pkids.length > 0) x.selectedId = pkids[pkids.length-1];
            else x.selectedId = n.parentId;
            x.cursorIx = x.nodes.get(x.selectedId)!.text.length;
            this.layout(x, true);
         });
      }
   }

   private onSetOrigin = (d:{x:number, y:number}) => {
      this.update(x => {
         x.originX = d.x;
         x.originY = d.y;
         x.nodes = new Map(x.nodes);
         this.layout(x, false);
      })
   }

   private onSetSelectedNode = (d:{id:number}) => {
      if (this.data.selectedId == d.id) return;
      this.update(x => {
         x.selectedId = d.id;
         x.cursorIx = -1;
         if (d.id) {
            let node = x.nodes.get(d.id)!;
            if (node.text) x.cursorIx = node.text.length; 
            else x.cursorIx = 0;
         }
      })
   }

   private onSetCursorIx = (d:{ix:number}) => {
      if (this.data.cursorIx == d.ix) return;
      this.update(x => {
         x.cursorIx = d.ix;
      })
   }

   private onUpdateLabel = (d:{id:number, label:string, cursorIx:number}) => {
      this.update(x => {
         x.nodes = new Map(x.nodes);
         x.nodes.set(d.id, Object.assign({}, x.nodes.get(d.id)!, {text: d.label}));
         x.cursorIx = d.cursorIx;
         this.layout(x, true);
      })      
   }

   private addEmptyChild(parent:MapNode, after?:MapNode) {
      let node = newMapNode(parent.level + 1, "", this.ID++, parent.L2);
      node.parentId = parent.id;
      node.dir = parent.dir;
      let arr = this.data.kids.get(parent.id)!;
      this.update(x => {
         x.nodes = new Map(x.nodes);
         x.nodes.set(node.id, node); 
         x.kids = new Map(x.kids);
         let arr2:number[];
         if (after) {
            arr2 = arr.concat([]);
            arr2.splice(arr2.indexOf(after.id)+1, 0, node.id);
         } else {
            arr2 = arr.concat([node.id])
         }
         x.kids.set(parent.id, arr2);
         x.kids.set(node.id, []);
         x.selectedId = node.id;
         x.cursorIx = 0;
         if (node.level == 2) {
            node.L2 = node.id;
            x.colors = new Map(x.colors);
            x.colors.set(node.id, nextColor(x.colors));
            let lefts = 0;
            for (let i of x.kids.get(x.rootId)!) lefts += x.nodes.get(i)!.dir == Direction.LEFT ? 1 : -1;
            node.dir = lefts < 0 ? Direction.LEFT : Direction.RIGHT;
         }
         this.layout(x, true);
      });
   }

   private layout(x:MapNodeStore, andSave:boolean) {
      let changed:MapNode[] = layoutAll(x.nodes, x.kids, x.rootId, x.originX, x.originY);
      for (let n of changed) x.nodes.set(n.id, n);
      if (andSave) {
         x.text = mindMapToString(x.nodes, x.kids, x.rootId);
         onTextExternal(x.text);
      }
   }

   actions = {
      parse: Action("parse", this.onParse),
      addKid: Action("addKid", this.onAddKid),
      addPeer: Action("addPeer", this.onAddPeer),
      setOrigin: Action("setOrigin", this.onSetOrigin),
      setSelectedNode: Action("setSelectedNode", this.onSetSelectedNode),
      setCursorIx: Action("setCursorIx", this.onSetCursorIx),
      updateLabel: Action("updateLabel", this.onUpdateLabel),
      deleteNode: Action("deleteNode", this.onDeleteNode),
   };

}


export const MindMapStore = new MindMapStoreClass(); 