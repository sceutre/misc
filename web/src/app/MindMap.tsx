import {MindMapStore, MapNode, Direction} from "./MindMapStore.js";
import {AppStore} from "./AppStore.js";
import {wait} from "./App.js";
import {connect} from "../flux-ux/utils.js";
import {getNodeHorizPad, getNodeVertPad, DarkColors, NormalColors} from "./MindMapUtils.js";

interface PropsDerived {
   nodes: ImmutableMap<number, MapNode>;
   kids: ImmutableMap<number, number[]>;
   paths: any[],
   rootId: number;
   minX:number;
   maxX:number;
   minY:number;
   maxY:number;
   isDark:boolean;
   selectionId:number;
}

class MindMap extends React.PureComponent<PropsDerived> {
   static stores = [AppStore, MindMapStore];

   static getDerivedProps() {
      let text = AppStore.data.markdown;
      if (MindMapStore.data.text != text) asyncParse(text);
      let paths:any[] = [];
      let minX = Number.MAX_SAFE_INTEGER, minY = Number.MAX_SAFE_INTEGER, maxX = 0, maxY = 0;
      for (let [k,v] of MindMapStore.data.nodes) { 
         minX = Math.min(minX, v.x); 
         minY = Math.min(minY, v.y); 
         maxX = Math.max(maxX, v.x); 
         maxY = Math.max(maxY, v.y + v.height); 
      }
      for (let [k,v] of MindMapStore.data.nodes) {
         if (v.level == 1) continue;
         paths.push(makePath(v, MindMapStore.data.nodes.get(v.parentId)!, minX, minY));
      }
      return {
         nodes: MindMapStore.data.nodes,
         kids: MindMapStore.data.kids,
         rootId: MindMapStore.data.rootId,
         paths,
         minX, minY, maxX, maxY, isDark: AppStore.data.isDark,
         selectionId: MindMapStore.data.selectedId
      }
   }

   render() {
      let {nodes, paths, minX, minY, maxX, maxY, isDark, selectionId} = this.props;
      return <div style={{position: "relative", top:-minY + "px", left: -minX + "px"}}>
         <svg style={{position:"absolute", top:minY + "px", left:minX + "px", height: (maxY - minY) + "px", width: (maxX - minX) + "px", pointerEvents: "none"}}>
            {paths}
         </svg>
         {Array.from(nodes.values()).map(x => <MindMapNode key={x.id} node={x} isDark={isDark} isSelected={selectionId == x.id}/>)}
      </div>
   }

}

const MindMapNode: React.SFC<{node: MapNode, isDark:boolean, isSelected:boolean}> = React.memo(({node, isDark, isSelected}) => {
   function onClick() { MindMapStore.actions.setSelectedNode({id:isSelected ? 0 : node.id}); }

   let array = getPalette(isDark);
   let c = array[node.L2 % array.length];
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
      top: (getNodeVertPad(node.level)/2) + "px",
      left: (getNodeHorizPad(node.level)/2) + "px",
      pointerEvents: "none",
      userSelect: "none"
   }}>{node.text}</div></div>;
});


async function asyncParse(text: string) {
   await wait(0);
   if (MindMapStore.data.text == text) return;
   MindMapStore.actions.parse({text});
}

const connectedClass = connect<PropsDerived>(MindMap);
export {connectedClass as MindMap};

function makePath(node:MapNode, parent:MapNode, x:number, y:number) {
   let pt1_y = parent.y + parent.height/2 - y;
   let pt1_x = node.dir == Direction.LEFT ? parent.x - x : parent.x + parent.width - x;
   let pt2_y = node.y + node.height/2 - y;
   let pt2_x = node.dir == Direction.LEFT ? node.x + node.width - x : node.x - x;
   let array = getPalette(AppStore.data.isDark);
   let c = array[node.L2 % array.length];
   let str = "";
   if (parent.level == 1) {
      pt1_x = parent.x + parent.width/2 - x;
      let d = (pt2_y - pt1_y) * 0.7;
      str = ["M", pt1_x, pt1_y, "Q", pt1_x, pt1_y+d, pt2_x, pt2_y,
             "M", pt1_x+3, pt1_y, "Q", pt1_x, pt1_y+d, pt2_x, pt2_y,
      ].join(" ");
      //return <path d={str} fill={c.lines} stroke="transparent" />;
   } else if (Math.abs(pt1_y-pt2_y) < 5) {
      str = ["M", pt1_x, pt1_y, "L", pt2_x, pt2_y].join(" ");
   } else {
      let d = (pt2_x - pt1_x) * 0.7;
      let s = (pt2_x - pt1_x) * 0.05;
      str = ["M", pt1_x, pt1_y, "L", pt1_x +s, pt1_y, "C", pt1_x+s+d, pt1_y, pt2_x-d, pt2_y, pt2_x, pt2_y].join(" ");
   }
   return <path key={node.id} d={str} fill="transparent" stroke={c.lines} />;
}


function getPalette(isDark:boolean) {
   return isDark ? DarkColors : NormalColors;
}