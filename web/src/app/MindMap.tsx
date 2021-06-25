import {MindMapStore} from "./MindMapStore.js";
import {AppStore} from "./AppStore.js";
import {wait} from "./App.js";
import {connect} from "../flux-ux/utils.js";
import {getNodeHorizPad, getNodeVertPad, MapNode, Direction, Coloring} from "./MindMapUtils.js";
import {getKey, isPrintableKey} from "../flux-ux/keyboard.js";

interface PropsDerived {
   nodes: ImmutableMap<number, MapNode>;
   kids: ImmutableMap<number, number[]>;
   colors: ImmutableMap<number, Coloring>;
   paths: any[],
   rootId: number;
   minX: number;
   maxX: number;
   minY: number;
   maxY: number;
   isDark: boolean;
   selectionId: number;
   cursorIx: number;
}

class MindMap extends React.PureComponent<PropsDerived> {
   static stores = [AppStore, MindMapStore];

   static getDerivedProps() {
      let text = AppStore.data.markdown;
      let paths: any[] = [];
      let minX = Number.MAX_SAFE_INTEGER, minY = Number.MAX_SAFE_INTEGER, maxX = 0, maxY = 0;
      for (let [k, v] of MindMapStore.data.nodes) {
         if (!v.showing) continue;
         minX = Math.min(minX, v.x);
         minY = Math.min(minY, v.y);
         maxX = Math.max(maxX, v.x + v.width);
         maxY = Math.max(maxY, v.y + v.height);
      }
      for (let [k, v] of MindMapStore.data.nodes) {
         if (v.level == 1 || !v.showing) continue;
         paths.push(makePath(MindMapStore.data.colors, v, MindMapStore.data.nodes.get(v.parentId)!, minX, minY));
      }
      return {
         nodes: MindMapStore.data.nodes,
         kids: MindMapStore.data.kids,
         rootId: MindMapStore.data.rootId,
         paths,
         minX, minY, maxX, maxY, isDark: AppStore.data.isDark,
         selectionId: MindMapStore.data.selectedId,
         cursorIx: MindMapStore.data.cursorIx,
         colors: MindMapStore.data.colors,
      }
   }

   render() {
      let {nodes, paths, minX, minY, maxX, maxY, isDark, selectionId, cursorIx, colors} = this.props;
      return <div
         style={{
            position: "relative",
            top: -minY + "px",
            left: -minX + "px",
            width: (maxX - minX) + "px",
            height: (maxY - minY) + "px"
         }}
         tabIndex={0} onKeyDown={this.onKey} onClick={this.onClick}>
         <svg style={{position: "absolute", top: minY + "px", left: minX + "px", height: (maxY - minY) + "px", width: (maxX - minX) + "px", pointerEvents: "none"}}>
            {paths}
         </svg>
         {Array.from(nodes.values()).map(x => x.showing ? <MindMapNode
            key={x.id} node={x} isDark={isDark} isSelected={selectionId == x.id}
            cursorIx={selectionId == x.id ? cursorIx : 0} colors={colors}
         /> : null)}
      </div>
   }

   onClick = () => {
      MindMapStore.actions.setSelectedNode({id: 0});
   }

   onKey = (ev: React.KeyboardEvent) => {
      let {nodes, selectionId, cursorIx, kids, rootId} = this.props;
      let k = getKey(ev);
      if (selectionId <= 0 && (k == "Enter" || k.indexOf("Arrow") >= 0)) {
         MindMapStore.actions.setSelectedNode({id: rootId});
         return;
      }
      if (selectionId) {
         let n = nodes.get(selectionId)!;
         if (isPrintableKey(k) || k == "Shift-Enter") {
            if (k == "Shift-Enter") k = "\n";
            let [pre, post] = divide(n.text, cursorIx);
            MindMapStore.actions.updateLabel({ id: n.id, label: pre + k + post, cursorIx: Math.min(n.text.length + 1, cursorIx+1)});
         } else {
            switch (k) {
               case "ArrowLeft":
                  MindMapStore.actions.setCursorIx({ix: Math.max(0, cursorIx-1)});
                  break;
               case "ArrowRight":
                  MindMapStore.actions.setCursorIx({ix: Math.min(n.text.length, cursorIx+1)});
                  break;
               case "Home":
                  MindMapStore.actions.setCursorIx({ix: 0});
                  break;
               case "End":
                  MindMapStore.actions.setCursorIx({ix: n.text.length});
                  break;
               case "Enter":
                  MindMapStore.actions.addPeer({id: n.id});
                  break;
               case "Tab":
                  MindMapStore.actions.addKid({id: n.id});
                  break;
               case "Delete":
                  if (n.text.length == 0) {
                     MindMapStore.actions.deleteNode({id: n.id});
                     break;
                  }
                  if (cursorIx >= n.text.length) break;
                  cursorIx++; // fallthrough
               case "Backspace": {
                  let [pre, post] = divide(n.text, cursorIx);
                  if (pre) {
                     pre = pre.substring(0, pre.length - 1);
                     MindMapStore.actions.updateLabel({ id: n.id, label: pre + post, cursorIx: Math.max(0, cursorIx-1)})
                  } else if (n.text.length == 0) {
                     MindMapStore.actions.deleteNode({id: n.id});
                  }
                  break;
               }
               case "Escape":
                  MindMapStore.actions.setSelectedNode({id: 0});
                  break;
               case "Control-ArrowUp":
               case "ArrowUp":
                     if (selectionId) {
                     let n = nodes.get(selectionId)!
                     if (n.level == 1) break;
                     let peers = kids.get(n.parentId)!;
                     if (n.level == 2) peers = peers.filter(kId => nodes.get(kId)!.dir == n.dir); 
                     let ix = peers.indexOf(selectionId);
                     MindMapStore.actions.setSelectedNode({id: peers[((ix + peers.length) - 1) % peers.length]});
                  }
                  break;
               case "Control-ArrowDown":
               case "ArrowDown":
                  if (selectionId) {
                     let n = nodes.get(selectionId)!
                     if (n.level == 1) break;
                     let peers = kids.get(n.parentId)!;
                     if (n.level == 2) peers = peers.filter(kId => nodes.get(kId)!.dir == n.dir); 
                     let ix = peers.indexOf(selectionId);
                     MindMapStore.actions.setSelectedNode({id: peers[((ix + peers.length) + 1) % peers.length]});
                  }
                  break;
               case "Control-ArrowLeft":
                  if (selectionId) {
                     let n = nodes.get(selectionId)!
                     if (selectionId == rootId) {
                        let arr = kids.get(n.id)!;
                        for (let kId of arr)
                           if (nodes.get(kId)!.dir == Direction.LEFT) {
                              MindMapStore.actions.setSelectedNode({id: kId});
                              break;
                           }
                     } else if (n.dir == Direction.RIGHT) {
                        MindMapStore.actions.setSelectedNode({id: n.parentId});
                     } else {
                        let arr = kids.get(n.id)!;
                        if (arr.length > 0) {
                           MindMapStore.actions.setSelectedNode({id: arr[0]});
                        }
                     }
                  }
                  break;
               case "Control-ArrowRight":
                  if (selectionId) {
                     let n = nodes.get(selectionId)!
                     if (selectionId == rootId) {
                        let arr = kids.get(n.id)!;
                        for (let kId of arr)
                           if (nodes.get(kId)!.dir == Direction.RIGHT) {
                              MindMapStore.actions.setSelectedNode({id: kId});
                              break;
                           }
                     } else if (n.dir == Direction.LEFT) {
                        MindMapStore.actions.setSelectedNode({id: n.parentId});
                     } else {
                        let arr = kids.get(n.id)!;
                        if (arr.length > 0) {
                           MindMapStore.actions.setSelectedNode({id: arr[0]});
                        }
                     }
                  }
                  break;
               default:
                  console.log("Skipping:" + k);
            }
         }
      }
      ev.stopPropagation();
      ev.preventDefault();
   }

}

function divide(text:string, ix:number) {
   if (ix <= 0) return [ "", text ];
   if (ix >= text.length) return [ text, "" ];
   return [ text.substring(0, ix), text.substring(ix) ];
}

const MindMapNode: React.SFC<{node: MapNode, isDark: boolean, isSelected: boolean, cursorIx: number, colors:ImmutableMap<number,Coloring>}> = React.memo(({node, isDark, isSelected, cursorIx, colors}) => {
   function onClick(ev: React.MouseEvent) {MindMapStore.actions.setSelectedNode({id: node.id}); ev.stopPropagation();}

   let cx = colors.get(node.L2)!;
   let c = isDark ? cx.dark : cx.normal;
   let [pre, post] = isSelected ? divide(node.text, cursorIx) : [node.text, ""];
   return <div className={"mapnode level" + node.level + (isSelected ? " sel" : "")} onClick={onClick} style={{
      top: node.y,
      left: node.x,
      height: node.height,
      width: node.width,
      backgroundColor: (isSelected ? c.selected : c.bg),
      color: c.fg,
      borderColor: c.lines
   }}><div style={{
      display: "inline-block",
      position: "relative",
      top: (getNodeVertPad(node.level) / 2) + "px",
      left: (getNodeHorizPad(node.level) / 2) + "px",
      pointerEvents: "none",
      userSelect: "none"
   }}>{pre}{isSelected && <span className="cursor"></span>}{post}</div></div>;
});


async function asyncParse(text: string) {
   await wait(0);
   if (MindMapStore.data.text == text) return;
   MindMapStore.actions.parse({text});
}

const connectedClass = connect<PropsDerived>(MindMap);
export {connectedClass as MindMap};

function makePath(colors:ImmutableMap<number, Coloring>, node: MapNode, parent: MapNode, x: number, y: number) {
   let pt1_y = parent.y + parent.height / 2 - y;
   let pt1_x = node.dir == Direction.LEFT ? parent.x - x : parent.x + parent.width - x;
   let pt2_y = node.y + node.height / 2 - y;
   let pt2_x = node.dir == Direction.LEFT ? node.x + node.width - x : node.x - x;
   let cx = colors.get(node.L2)!;
   let c = AppStore.data.isDark ? cx.dark : cx.normal;
   let str = "";
   if (parent.level == 1) {
      pt1_x = parent.x + parent.width / 2 - x;
      let d = (pt2_y - pt1_y) * 0.7;
      str = ["M", pt1_x, pt1_y, "Q", pt1_x, pt1_y + d, pt2_x, pt2_y,
         "M", pt1_x + 3, pt1_y, "Q", pt1_x, pt1_y + d, pt2_x, pt2_y,
      ].join(" ");
      //return <path d={str} fill={c.lines} stroke="transparent" />;
   } else if (Math.abs(pt1_y - pt2_y) < 5) {
      str = ["M", pt1_x, pt1_y, "L", pt2_x, pt2_y].join(" ");
   } else {
      let d = (pt2_x - pt1_x) * 0.7;
      let s = (pt2_x - pt1_x) * 0.05;
      str = ["M", pt1_x, pt1_y, "L", pt1_x + s, pt1_y, "C", pt1_x + s + d, pt1_y, pt2_x - d, pt2_y, pt2_x, pt2_y].join(" ");
   }
   return <path key={node.id} d={str} fill="transparent" stroke={c.lines} onClick={() => pathOnClick(parent.id, parent.text)}  />;
}


function pathOnClick(parentId:number, parentName:string) {
   console.log("clicked " + parentName);
}