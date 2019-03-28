import {Store} from './store.js';

type ConnectableComponent<DerivedProps, InlineProps> = React.ComponentType<DerivedProps & InlineProps> & {getDerivedProps: () => DerivedProps, stores: Store<any>[]}

export function connect<DerivedProps, InlineProps={}>(Component: ConnectableComponent<DerivedProps, InlineProps>) {

   const name = Component.displayName || Component.name || "Unnamed";
   return class Connected extends React.Component<InlineProps> {

      static displayName = "c(" + name + ")";

      componentWillMount() {
         for (let s of Component.stores) s.addListener(this);
      }

      componentWillUnmount() {
         for (let s of Component.stores) s.removeListener(this);
      }

      storeChanged = () => {
         this.forceUpdate();
      };

      render() {
         return <Component {...this.props} {...Component.getDerivedProps()} />;
      }

   }
}
