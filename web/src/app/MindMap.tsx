import {actionMindAddKid, actionMindDelete, actionMindSelectNode, actionMindSetCursorIx, actionMindUpdateLabel, Coloring, getColors, getNode, getNodeHorizPad, getNodeVertPad, MapNode, measureText, mindMapOnKey, MindMapStore, ROOT_ID} from "./backing/MindMapBacking.js";
import {AppStore} from "./backing/AppBacking.js";
import {connect, useContainerDimensions} from "../utils/flux.js";
import {divide} from "../utils/utils.js";

interface PropsInline {
   containerWidth:number;
   containerHeight:number;
}

interface PropsDerived {
   allNodes: number[];
   minX: number;
   maxX: number;
   minY: number;
   maxY: number;
   isDark: boolean;
   selectionId: number;
   cursorIx: number;
}

class MindMapClass extends React.PureComponent<PropsDerived & PropsInline> {
   static stores = [AppStore, MindMapStore];

   static getDerivedProps() {
      let minX = Number.MAX_SAFE_INTEGER, minY = Number.MAX_SAFE_INTEGER, maxX = 0, maxY = 0;
      for (let id of MindMapStore.data.allNodes) {
         let v = getNode(id);
         if (v.showing) {
            minX = Math.min(minX, v.x);
            minY = Math.min(minY, v.y);
            maxX = Math.max(maxX, v.x + v.width);
            maxY = Math.max(maxY, v.y + v.height);
         }
      }

      return {
         allNodes: MindMapStore.data.allNodes,
         minX, minY, maxX, maxY, isDark: AppStore.data.theme == "dark",
         selectionId: MindMapStore.data.selectedId,
         cursorIx: MindMapStore.data.cursorIx,
      }
   }

   svg() {
      let {allNodes, minX, minY, maxX, maxY, isDark, selectionId, cursorIx} = this.props;
      let paths:any[] = [];
      let rects:any[] = [];
      for (let id of allNodes) {
         let v = getNode(id);
         if (v.showing && v.level != 1) {
            paths.push(makePath(v, minX, minY, isDark));
         }
         if (v.showing) {
            makeSvgNode(v, minX, minY, isDark, selectionId, cursorIx, rects);
         }
      }
      return (
         <svg style={{position: "absolute", top: minY + "px", left: minX + "px", height: (maxY - minY) + "px", width: (maxX - minX) + "px", pointerEvents: "none"}}>
            {paths}
            {rects}
         </svg>
      )
   }

   render() {
      let {minX, minY, maxX, maxY, containerWidth, containerHeight} = this.props;
      let w = maxX - minX;
      let h = maxY - minY;
      let top = (-minY + Math.max(0,(containerHeight - h)/4));
      return (
         <div
            style={{
               position: "relative",
               top: top + "px",
               left: (-minX + Math.max(0,(containerWidth - w)/2)) + "px",
               width: w + "px",
               height: (h - Math.abs(top) + 20)  + "px"
            }}
            tabIndex={0} onKeyDown={mindMapOnKey} onClick={this.onClick}>
            {this.svg()}
         </div>
      );
   }

   onClick = () => {
      actionMindSelectNode({id: 0});
   }

}

const MindMapNode: React.SFC<{node: MapNode, isDark: boolean, isSelected: boolean, cursorIx: number, colors:Coloring}> = React.memo(({node, isDark, isSelected, cursorIx, colors}) => {
   function onClick(ev: React.MouseEvent) {actionMindSelectNode({id: node.id}); ev.stopPropagation();}

   let cx = colors;
   let c = isDark ? cx.dark : cx.normal;
   let [pre, post] = isSelected ? divide(node.text, cursorIx) : [node.text, ""];
   return <div className={"mapnode level" + node.level + (isSelected ? " sel" : "")} onClick={onClick} style={{
      top: node.y,
      left: node.x,
      height: node.height,
      width: node.width,
      backgroundColor: isSelected ? c.selected : c.bg,
      color: c.fg,
      borderColor: c.lines,
      whiteSpace: "pre"
   }}><div style={{
      display: "inline-block",
      position: "relative",
      top: (getNodeVertPad(node.level) / 2) + "px",
      left: (getNodeHorizPad(node.level) / 2) + "px",
      pointerEvents: "none",
      userSelect: "none",
   }}>{pre}{isSelected && <span className="cursor"></span>}{post}{!pre && !post && <span style={{opacity: 0}}>x</span>}</div></div>;
});

const MindMapConnected = connect<PropsDerived, PropsInline>(MindMapClass);

export function MindMap() {
   const ref = React.useRef(null);
   const {width, height} = useContainerDimensions(ref);
   return <div className="main mindmap" ref={ref}><MindMapConnected containerHeight={height} containerWidth={width}/></div>
}

function makePath(node: MapNode, x: number, y: number, isDark: boolean) {
   let parent = getNode(node.parentId);
   let pt1_y = parent.y + parent.height / 2 - y;
   let pt1_x = node.dirIsLeft ? parent.x - x : parent.x + parent.width - x;
   let pt2_y = node.y + node.height / 2 - y;
   let pt2_x = node.dirIsLeft ? node.x + node.width - x : node.x - x;
   let cx = getColors(node);
   let c = isDark ? cx.dark : cx.normal;
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
   return <path key={node.id} d={str} fill="transparent" stroke={c.lines} />;
}

function makeSvgNode(node:MapNode, x:number, y:number, isDark:boolean, selectionId:number, cursorIx: number, array:any[]) {
   let cx = getColors(node);
   let c = isDark ? cx.dark : cx.normal;
   let sxIx = Math.min(node.level - 1, 2);
   let r = [node.width/2, 30, 4][sxIx];
   let strokeWidth = [ 2, 2, 1][sxIx];
   let sz = [18, 16, 12][sxIx];
   let wt = ["bold", "normal", "normal"][sxIx] as any;
   let hpad = getNodeHorizPad(node.level);
   let textX = node.x - x + hpad/2;
   let textY = node.y - y + (sz + getNodeVertPad(node.level)/2);
   array.push(<rect 
      x={node.x - x + strokeWidth/2} y={node.y - y + strokeWidth/2} rx={r} ry={r} 
      width={node.width - strokeWidth} height={node.height - strokeWidth} style={{
         fill: c.bg,
         stroke: c.lines,
         strokeWidth: strokeWidth
      }} />);
   array.push(<text 
      x={textX} y={textY} 
      style={{
         fill: c.fg,
         fontSize: sz + "px",
         fontWeight: wt
      }}>{node.text}</text>);
   if (selectionId == node.id) {
      let m = measureText(node.level, cursorIx == 0 ? node.text : node.text.substring(0, cursorIx));
      let deltaX = cursorIx == 0 ? 0 : (m.width - hpad);
      array.push(<line className="svgBlink"
         x1={textX + deltaX} x2={textX + deltaX} y1={textY-m.ascent-2} y2={textY+sz-m.ascent+2} style={{
            stroke: c.fg
         }}
         />)
   }
}


