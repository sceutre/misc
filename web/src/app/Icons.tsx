import {useStore} from "../utils/flux";
import {SidebarStore} from "./backing/SidebarBacking";

const FULL_WIDTH = 200;
const COMPACT_WIDTH = 80;

export function IconArrow() {
   const {compactMode} = useStore(SidebarStore, ["compactMode"]);
   return <svg style={{
      position: "fixed",
      bottom: "10px",
      left: compactMode ? (COMPACT_WIDTH - 12) : (FULL_WIDTH - 12),
      transform: compactMode ? "unset" : "rotate(180deg)"
   }} width="24px" height="24px" viewBox="0 0 256 256" id="Flat" xmlns="http://www.w3.org/2000/svg">
      <g>
         <circle cx="128" cy="128" r="96" style={{fill: "var(--sidebar-bg)"}} />
      </g>
      <g style={{fill: "var(--main-bg)"}}>
         <path d="M128,24A104,104,0,1,0,232,128,104.11791,104.11791,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.09957,88.09957,0,0,1,128,216Z" />
         <path d="M139.71582,88.40186a8,8,0,1,0-11.31348,11.314L148.68652,120H88a8,8,0,0,0,0,16h60.68652l-20.28418,20.28418a8,8,0,1,0,11.31348,11.314l33.94092-33.94091a8.00034,8.00034,0,0,0,0-11.31446Z" />
      </g>
   </svg>
}
