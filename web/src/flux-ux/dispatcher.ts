import {Action, Listener, Priority} from './action.js';

interface InProgress<T> {
   action: Action<T>;
   data: any;
   startedId: number;
   doneId: number;
}

export type DispatchFn<T> = (action: Action<T>, data: T) => void;

class Dispatcher {
   private stage = 0;
   private inProgress: InProgress<any> | undefined;
   private dispatchListeners: DispatchFn<any>[] = [];

   dispatchAction(action: Action<any>, data: any) {
      try {
         if (this.inProgress) throw new Error(`Trying to fire ${action.name} while another action ${this.inProgress.action.name} is firing.`);
         this.inProgress = {
            action: action,
            data: data,
            startedId: this.stage + 1,
            doneId: this.stage + 2
         };
         this.stage = this.inProgress.doneId;
         this.dispatchLoop(this.inProgress);
         this.onDispatched(action, data);
      } finally {
         this.inProgress = undefined;
      }
   }

   addDispatchListener(fn: DispatchFn<any>) {
      this.dispatchListeners.push(fn);
   }

   onDispatched(action: Action<any>, data: any) {
      let array = this.dispatchListeners;
      for (let fn of array) fn(action, data);
   }

   installActionLogging(logger: (action: string, data: string) => void) {
      this.addDispatchListener((action, data) => {
         logger(action.name, JSON.stringify(data));
      });
   }

   installActionFallback(fallback: DispatchFn<any>) {
      this.addDispatchListener((action, data) => {
         if (action.listeners.length == 0) fallback(action, data);
      });
   }

   installReduxDevTools(rootStore: {data: any}) {
      let devtools = (window as any)["__REDUX_DEVTOOLS_EXTENSION__"];
      if (devtools) {
         devtools = devtools.connect();
         if (devtools) {
            devtools.init();
            this.addDispatchListener((action, data) => {
               devtools.send(action.name, rootStore.data);
            });
         }
      }
   }

   private dispatchLoop(inProgress: InProgress<any>) {
      for (let i = 0, n = inProgress.action.listeners.length; i < n; i++) {
         let listener = inProgress.action.listeners[i];
         if (listener.stage < inProgress.startedId) {
            if (listener.priority == Priority.FALLBACK && (n != 0)) continue;
            listener.stage = inProgress.startedId;
            listener.callback(inProgress.data);
            listener.stage = inProgress.doneId;
         }
      }
   }
}

export let dispatcher: Dispatcher = new Dispatcher();


