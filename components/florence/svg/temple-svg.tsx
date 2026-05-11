import { SVGProps } from "react";
import { RawStyledSvg } from "./raw-styled-svg";

const TEMPLE_STYLE_OVERRIDES = String.raw`<style type="text/css">
  .temple-svg .cls-0 {
    fill: #f0e9d8;
    stroke: currentColor;
    stroke-width: 0.5;
    stroke-miterlimit: 10;
  }
  .temple-svg .cls-1 {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .temple-svg .cls-2 {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.36;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .temple-svg .cls-3 {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.24;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .temple-svg .cls-4 {
    fill: #f0e9d8;
  }
  .temple-svg .cls-5 {
    fill: #f0e9d8;
    stroke: currentColor;
    stroke-width: 0.36;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .temple-svg .cls-6 {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .temple-svg .cls-7 {
    fill: #f0e9d8;
    stroke: currentColor;
    stroke-width: 0.24;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>`;

export function TempleSVG({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <RawStyledSvg
      viewBox="0 0 200 200"
      className={["temple-svg", className].filter(Boolean).join(" ")}
      svgPath="/florence-ui/TempleSVG.raw.svg"
      styleOverrides={TEMPLE_STYLE_OVERRIDES}
      {...props}
    />
  );
}
