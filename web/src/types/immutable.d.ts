type ImmutableObject<T> = {readonly [P in keyof T]: ImmutableAny<T[P]>};

interface ImmutableArray<T> extends ReadonlyArray<ImmutableAny<T>> {}

interface ImmutableMap<K, V> {
   forEach(callbackfn: (value: ImmutableAny<V>, key: K, map: ImmutableMap<K, V>) => void, thisArg?: any): void;
   get(key: K): ImmutableAny<V> | undefined;
   has(key: K): boolean;
   readonly size: number;
   [Symbol.iterator](): IterableIterator<[K, V]>;
   entries(): IterableIterator<[K, V]>;
   keys(): IterableIterator<K>;
   values(): IterableIterator<V>;
}

interface ImmutableSet<T> {
   forEach(callbackfn: (value: ImmutableAny<T>, value2: ImmutableAny<T>, set: ImmutableSet<T>) => void, thisArg?: any): void;
   has(value: T): boolean;
   readonly size: number;
}

type ImmutableAny<T> =
   T extends Array<infer V> ? ImmutableArray<V> :
   T extends Map<infer K, infer V> ? ImmutableMap<K, V> :
   T extends Set<infer K> ? ImmutableSet<K> :
   T extends object ? ImmutableObject<T> :
   T;

type Immutable<T> = ImmutableObject<T>;

type Fn<T = any> = (arg: T) => any;
