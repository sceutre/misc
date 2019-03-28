import {dispatcher} from './dispatcher.js';

export const enum Priority {
   FIRST = 1,
   EARLY = 2,
   NORMAL = 3,
   LATE = 4,
   LAST = 5,
   FALLBACK = 10
}

export interface Listener<T> {
   callback: Fn<Immutable<T>>;
   stage: number;
   priority: Priority;
   handle: number;
}

export interface Action<T> {
   (data?: T): void;
   add(callback: Fn<Immutable<T>>, priority?: Priority): void
   remove(handled: number): void
   listeners: Listener<T>[]
};


export function Action<T>(name: string, callback?: Fn<Immutable<T>>) {
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
   private static HANDLE = 0;

   listeners: Listener<T>[] = [];

   constructor(public name: string) {
      ActionClass.ALL[name] = this;
   }

   add = (callback: Fn<Immutable<T>>, priority?: Priority) => {
      if (!priority) priority = Priority.NORMAL;
      let o = {callback, stage: 0, priority, handle: ActionClass.HANDLE++};
      for (let i = 0; i < this.listeners.length; i++) {
         if (o.priority < this.listeners[i].priority || (o.priority == this.listeners[i].priority && o.priority == Priority.FALLBACK)) {
            this.listeners.splice(i, 0, o);
            return o.handle;
         }
      }
      this.listeners.push(o);
      return o.handle;
   }

   remove = (handle: number) => {
      this.listeners = this.listeners.filter(x => x.handle != handle);
   }

   fire = (data?: T) => {
      dispatcher.dispatchAction(this as any, data);
   }
}
