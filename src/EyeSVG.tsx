import { SVGProps } from "react";
import { RawStyledSvg } from "./RawStyledSvg";

const EYE_STYLE_OVERRIDES = String.raw`<style type="text/css">
  .eye-svg .cls-0 {
    fill: currentColor;
    fill-opacity: 0.12;
  }
  .eye-svg .cls-1 {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.5;
    stroke-miterlimit: 10;
  }
  .eye-svg .cls-2 {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.25;
    stroke-miterlimit: 10;
  }
  .eye-svg .cls-3 {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.1;
    stroke-miterlimit: 10;
  }
  .eye-svg .cls-4 {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.15;
    stroke-miterlimit: 10;
  }
  .eye-svg .cls-5 {
    fill: currentColor;
    fill-opacity: 0.75;
  }
</style>`;

export function EyeSVG({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <RawStyledSvg
      viewBox="0 0 150 150"
      className={["eye-svg", className].filter(Boolean).join(" ")}
      svgPath="/florence-ui/EyeSVG.raw.svg"
      styleOverrides={EYE_STYLE_OVERRIDES}
      {...props}
    />
  );
}
