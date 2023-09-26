export function path() {
   let p = decodeURIComponent(window.location.pathname.substring(1)) || "Misc.md";
   let name = p;
   let ext = "";
   let dotIx = p.lastIndexOf(".");
   if (dotIx >= 0) {
      ext = p.substring(dotIx);
      if (ext == ".md" || ext == ".json" || ext == ".draw" || ext == ".txt") {
         name = p.substring(0, dotIx);
      } else {
         ext = "";
      }
   }
   return {
      title: name,
      filename: name.replace(/[^a-zA-Z0-9]/g, "_") + (ext || ".md")
   }
}

export function matchingExtension(exts:string[]) {
   let p = decodeURIComponent(window.location.pathname.substring(1));
   for (let e of exts) {
      if (p.endsWith(e)) return e;
   }
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