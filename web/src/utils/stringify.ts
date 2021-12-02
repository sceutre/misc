export function stableStringify(data:any) {
   return (function stringify (node) {
       if (node === undefined) return;
       if (node === null) return 'null';
       if (typeof node == 'number') return isFinite(node) ? '' + node : 'null';
       if (typeof node !== 'object') return JSON.stringify(node);

       var i, out;
       if (Array.isArray(node)) {
           out = '[';
           for (i = 0; i < node.length; i++) {
               if (i) out += ',';
               out += stringify(node[i]) || 'null';
           }
           return out + ']';
       }

       var keys = Object.keys(node).sort();
       out = '';
       for (i = 0; i < keys.length; i++) {
           var key = keys[i];
           var value = stringify(node[key]);
           if (!value) continue;
           if (out) out += ',';
           out += JSON.stringify(key) + ':' + value;
       }
       return '{' + out + '}';
   })(data);
};