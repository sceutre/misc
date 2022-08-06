export class Parser {
   parse(expr:string): { error: any, result: any }
   setVariable(name:string, val:any) : void
   getVariable(name:string) : void
   on(evType:string, fn:any) : void;
}
