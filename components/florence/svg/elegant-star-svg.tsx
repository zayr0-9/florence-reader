import { SVGProps } from "react";

export function ElegantStarSVG(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor" stroke="rgba(40,40,35,0.8)" strokeWidth={1.5} strokeLinejoin="round" {...props}>
      <path d="M 50.0 0.0 
               L 53.0 43.0 
               L 80.0 20.0 
               L 57.0 47.0 
               L 100.0 50.0 
               L 57.0 53.0 
               L 80.0 80.0 
               L 53.0 57.0 
               L 50.0 100.0 
               L 47.0 57.0 
               L 20.0 80.0 
               L 43.0 53.0 
               L 0.0 50.0 
               L 43.0 47.0 
               L 20.0 20.0 
               L 47.0 43.0 Z" />
    </svg>
  );
}
