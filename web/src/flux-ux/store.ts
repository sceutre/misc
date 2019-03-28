import {dispatcher} from './dispatcher.js';

interface Listener {storeChanged(): void}

export class Store<T> {
   data: Immutable<T>;
   private rootKey?: string;
   public listeners: Listener[] = [];

   static installReduxDevTools() {
      dispatcher.installReduxDevTools(rootStore);
   }

   constructor(defaultValues: Immutable<T>, rootKey: string | undefined) {
      this.data = Object.assign({}, defaultValues);
      this.rootKey = rootKey;
   }

   addListener(f: Listener) {
      if (this.listeners.indexOf(f) < 0) this.listeners.push(f);
   }

   removeListener(f: Listener) {
      this.listeners = this.listeners.filter(x => x !== f);
   }

   set(attr: keyof T, val: any) {
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

   private setData(d: Immutable<T>) {
      this.data = d;
      if (this.rootKey) rootStore.set(this.rootKey, this.data);
      this.notify();
   }

   private notify() {
      for (let x of this.listeners) x.storeChanged();
   }
}

const rootStore = new Store<any>({}, undefined);