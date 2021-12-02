export function path() {
   let p = decodeURIComponent(window.location.pathname.substring(1)).replace(/[^a-zA-Z0-9]/g, "_") || "Misc";
   return p;
}

export function wait(tm: number) {
   return new Promise((resolve, reject) => {
      setTimeout(() => resolve(true), tm);
   });
}

export function log$(p: Promise<any>) {
   p.catch(e => console.warn("promise failed", e));
}

export function debounce<T extends (...a: any) => any>(fn:T, wait:number, leading?:boolean) {
	let timeout:number = 0;
	return [
      function(this:any, ...args:Parameters<T>):void {
         if (leading) {
            let now = Date.now();
            if (now - timeout > wait) {
               timeout = now;
               return fn.apply(this, args);
            }
         } else {
            clearTimeout(timeout);
            timeout = window.setTimeout(() => {
               timeout = 0;
               return fn.apply(this, args);
            }, wait);
         }
      },
      function(this:any, ...args:Parameters<T>):void {
         clearTimeout(timeout);
         return fn.apply(this, args);
      }
   ]
}

export function divide(text:string, ix:number) {
   if (ix <= 0) return [ "", text ];
   if (ix >= text.length) return [ text, "" ];
   return [ text.substring(0, ix), text.substring(ix) ];
}