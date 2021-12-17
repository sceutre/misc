
export type Fn<T = any, V = any> = (arg: T) => V;
type FnId<T = any, V = any> = Fn<T,V> & { id: number };
type ConnectableComponent<DerivedProps, InlineProps> = React.ComponentType<DerivedProps & InlineProps> & {getDerivedProps: (props:InlineProps) => DerivedProps, stores: Store<any>[]}

export type LoggerFn = (action: string, data: any) => void;

export interface Action<T> {
   (data?: T): void;
   add(callback: Fn<T>): number;
   remove(id: number): void;
   listeners: Fn<T>[];
};

export function Action<T>(name: string, callback?: Fn<T>) {
   let action = new ActionClass<T>(name);
   let f = action.fire as Action<T>;
   f.add = action.add;
   f.remove = action.remove;
   f.listeners = action.listeners;
   if (callback) f.add(callback);
   return f;
}

class ActionClass<T = {}> {
   static ALL: {[k: string]: ActionClass<any>} = {};
   static ID = 0;
   private static HANDLE = 0;

   listeners: FnId<T>[] = [];

   constructor(public name: string) {
      if (ActionClass.ALL[name]) {
         throw new Error("creating duplicate action " + name);
      }
      ActionClass.ALL[name] = this;
   }

   add = (callback: Fn<T>) => {
      let fnId = callback as FnId;
      if (!fnId.id) fnId.id = ActionClass.ID++;
      this.listeners.push(fnId);
      return fnId.id;
   };

   remove = (id: number) => {
      this.listeners = this.listeners.filter(x => x.id != id);
   };

   fire = (data?: T) => {
      dispatcher.dispatchAction(this as any, data);
   };
}

class Dispatcher {
   private inProgress:string = "";
   private logger:undefined|LoggerFn = undefined;
   private waitFors:{stage:number, fn:Fn}[] = [];
   private delayedNotification:{[name:string]:{store:Store<any>, oldData:any}} = {};
   private delayedComponentNotification:Fn[] = [];

   dispatchAction(action: Action<any>, data: any) {
      try {
         if (this.inProgress) throw new Error(`Trying to fire ${action.name} while another action ${this.inProgress} is firing.`);
         this.inProgress = action.name;
         this.delayedNotification = {};
         for (let i = 0, n = action.listeners.length; i < n; i++) {
            let listener = action.listeners[i];
            listener(data);
         }
         while (this.waitFors.length > 0) {
            let stage = this.waitFors.reduce((prev,current) => Math.min(prev, current.stage), Number.MAX_VALUE);
            if (stage == Number.MAX_VALUE) {
               console.warn(action.name, "bad stage", this.waitFors);
               this.waitFors = [];
               break;
            }
            for (let wf of this.waitFors) {
               if (wf.stage == stage) {
                  wf.fn(true);
               }
            }
            this.waitFors = this.waitFors.filter(x => x.stage != stage);
         }
         if (this.logger) this.logger(action.name, data);
      } finally {
         this.inProgress = "";
         let delayedComponentNotification = this.delayedComponentNotification;
         let delayedNotification = this.delayedNotification;
         this.delayedNotification = {};
         this.delayedComponentNotification = [];
         for (let k in delayedNotification) {
            let obj = delayedNotification[k];
            obj.store.notify(obj.oldData);
         }
         for (let fn of delayedComponentNotification) {
            fn(true);
         }
      }
   }

   waitForStage(stage:number) {
      let resolveFn:Fn;
      let promise = new Promise((resolve,reject) => {
         resolveFn = resolve;
      });
      this.waitFors.push({stage, fn: resolveFn!});
      return promise;
   }

   installActionLogging(logger: (action: string, data: any) => void) {
      this.logger = logger;
   }

   deferNotification(store:Store<any>, oldData:any) {
      if (!this.inProgress) return false;
      if (!this.delayedNotification[store.name]) {
         this.delayedNotification[store.name] = { store, oldData };
      }
      return true;
   }

   deferComponentNotification(fn:Fn) {
      if (!this.inProgress) return false;
      if (!this.delayedComponentNotification.includes(fn)) {
         this.delayedComponentNotification.push(fn);
      }
      return true;
   }
}

export class Store<T> {
   data: T;
   name: string;
   listeners: Fn<T>[] = [];

   constructor(name:string, defaultValues: T,) {
      this.data = Object.assign({}, defaultValues);
      this.name = name;
      if (this.name != "root") {
         if (rootStore.data[this.name]) {
            throw new Error("dusplicate store name " + this.name);
         }
         rootStore.set(this.name, this.data);
      }
   }

   addListener(f: Fn<T>) {
      if (this.listeners.indexOf(f) < 0) this.listeners.push(f);
   }

   removeListener(f: Fn<T>) {
      this.listeners = this.listeners.filter(x => x !== f);
   }

   set<V extends keyof T>(attr:V, val: T[V]) {
      if (this.data[attr] !== val) {
         let x = Object.assign({}, this.data, {[attr]: val});
         this.setData(x);
      }
   }

   update(func: Fn<T>) {
      let x = Object.assign({}, this.data);
      func(x as T);
      this.setData(x);
   }

   getShallowCopy<V extends keyof T>(attr: V): T[V] {
      let obj = this.data[attr];
      if (null == obj || "object" != typeof obj) return obj;
      if (obj instanceof Date) {
         let copy = new Date();
         copy.setTime(obj.getTime());
         return copy as any;
      }
      if (Array.isArray(obj)) {
         return ([] as any).concat(obj);
      }
      return Object.assign({}, obj);
   }

   private setData(d: T) {
      let old = this.data;
      this.data = d;
      if (this.name != "root") {
         rootStore.set(this.name, this.data);
      }
      if (!dispatcher.deferNotification(this, old)) {
         this.notify(old);
      }
   }

   notify(prev: T) {
      for (let fn of this.listeners) fn(prev);
   }

}

export class StoreCollection<T> {
   private prefix: string;
   private stores: { [k:string]:Store<T>};
   private defaultValues: T;

   constructor(prefix: string, defaultValues: T) {
      this.prefix = prefix;
      this.stores = {};
      this.defaultValues = defaultValues;
   }

   get(name:string) {
      if (!this.stores[name]) {
         this.stores[name] = new Store<T>("coll." + this.prefix + "." + name, this.defaultValues)
      }
      return this.stores[name];
   }

   contains(name:string) {
      return this.stores[name] != null;
   }

   clear(name: string) {
      delete this.stores[name];
      delete rootStore.data[name];
   }
}


export function connect<DerivedProps, InlineProps={}>(Component: ConnectableComponent<DerivedProps, InlineProps>) {

   const name = Component.displayName || Component.name || "Unnamed";
   return class Connected extends React.Component<InlineProps> {

      static displayName = "c(" + name + ")";

      private currentDerivedProps:DerivedProps|undefined = undefined;

      componentWillMount() {
         for (let s of Component.stores) s.addListener(this.storeChanged);
      }

      componentWillUnmount() {
         for (let s of Component.stores) s.removeListener(this.storeChanged);
      }

      shouldComponentUpdate(nextProps:InlineProps) {
         let nextDerivedProps:DerivedProps = Component.getDerivedProps(nextProps);
         let shouldUpdate = !eq(this.props, nextProps) || !eq(this.currentDerivedProps, nextDerivedProps);
         if (shouldUpdate) {
            this.currentDerivedProps = nextDerivedProps;
         }
         return shouldUpdate;
      }

      storeChanged = () => {
         if (!dispatcher.deferComponentNotification(this.storeChangeImpl)) {
            this.storeChangeImpl();
         }
      };

      storeChangeImpl = () => {
         if (this.shouldComponentUpdate(this.props)) this.forceUpdate();
      };

      render() {
         if (!this.currentDerivedProps) {
            this.currentDerivedProps = Component.getDerivedProps(this.props);
         }
         return <Component {...this.props} {...this.currentDerivedProps} />;
      }

   }
}

export function useStore<T, V extends keyof T>(store:Store<T>, watchingOnly:V[]): Pick<T,V>;
export function useStore<T, V extends keyof T>(store:Store<T>): T;
export function useStore<T, V extends keyof T>(store:Store<T>, watchingOnly?:V[]): Pick<T,V>|T {

   function storeChanged(old:T) {
      let now = store.data;
      if (!watchingOnly) {
         if (!dispatcher.deferComponentNotification(forceUpdate)) {
            forceUpdate();
         }
         return;
      }
      for (let k of watchingOnly) {
         if (now[k] !== old[k]) {
            if (!dispatcher.deferComponentNotification(forceUpdate)) {
               forceUpdate();
            }
            return;
         }
      }
   }

   const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);

   React.useEffect(() => {
      store.addListener(storeChanged);
      return () => store.removeListener(storeChanged);
   }, []);

   return store.data as Pick<T,V>|T;
}

export function useContainerDimensions(myRef: React.RefObject<any>) {
   const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
   function handleResize() {
      setDimensions({
         width: (myRef && myRef.current && myRef.current.offsetWidth) || 0,
         height: (myRef && myRef.current && myRef.current.offsetHeight) || 0,
       })      
   }
   React.useEffect(() => {
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => { window.removeEventListener('resize', handleResize);};
   }, [myRef]);
   return dimensions;
}

function eq(a: any, b: any): boolean {
   if (a === b) return true;
   if (a && b) {
      let aK = Object.keys(a);
      let bK = Object.keys(b);
      if (aK.length == bK.length) {
         for (let k of aK) if (!b.hasOwnProperty(k) || b[k] !== a[k]) return false;
         return true;
      }
   }
   return false;
}

export const rootStore = new Store("root", {} as any);
export const dispatcher = new Dispatcher();
