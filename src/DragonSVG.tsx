import { SVGProps } from "react";
import { RawStyledSvg } from "./RawStyledSvg";

const DRAGON_STYLE_OVERRIDES = String.raw`<style type="text/css">
  .dragon-svg .cls-0 {
    fill: #f0e9d8;
    stroke: currentColor;
    stroke-width: 0.3;
    stroke-miterlimit: 10;
  }
  .dragon-svg .cls-1 {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.3;
    stroke-miterlimit: 10;
  }
  .dragon-svg .cls-2 {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.2;
    stroke-miterlimit: 10;
  }
  .dragon-svg .cls-3 {
    fill: #f0e9d8;
  }
  .dragon-svg .cls-4 {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.2;
    stroke-miterlimit: 10;
  }
  .dragon-svg .cls-5 {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.1;
    stroke-miterlimit: 10;
  }
</style>`;

export function DragonSVG({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <RawStyledSvg
      viewBox="0 0 150 150"
      className={["dragon-svg", className].filter(Boolean).join(" ")}
      svgPath="/florence-ui/DragonSVG.raw.svg"
      styleOverrides={DRAGON_STYLE_OVERRIDES}
      {...props}
    />
  );
}
