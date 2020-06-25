import {MindMapStore, MapNode} from "./MindMapStore.js";
import {AppStore} from "./AppStore.js";
import {connect} from "../flux-ux/utils.js";

interface PropsDerived {
   nodes:Map<number, MapNode>;
}

class MindMap extends React.PureComponent<PropsDerived> {
   static stores = [AppStore, MindMapStore];

   static getDerivedProps() {
      let text = AppStore.data.markdown;
      let root = MindMapStore.data;
      if (MindMapStore.data.text != text) {
         
         root = MindMapStore.calcMap(text);
      }
      return {
         nodes: MindMapStore.data.nodes;
      }
   }
}

const connectedClass = connect<PropsDerived>(MindMap);
export {connectedClass as MindMap};