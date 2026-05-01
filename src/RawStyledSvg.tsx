"use client";

import { SVGProps, useEffect, useState } from "react";

type RawStyledSvgProps = SVGProps<SVGSVGElement> & {
  svgPath: string;
  styleOverrides: string;
};

export function RawStyledSvg({
  svgPath,
  styleOverrides,
  className,
  ...props
}: RawStyledSvgProps) {
  const [svgContent, setSvgContent] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(svgPath)
      .then((response) => response.text())
      .then((markup) => {
        if (cancelled) return;
        const cleaned = markup
          .replace(/^\uFEFF/, "")
          .trim()
          .replace(/<style[^>]*>[\s\S]*?<\/style>/, "")
          .replace(/^<svg\b[^>]*>/i, "")
          .replace(/<\/svg>\s*$/i, "");
        setSvgContent(cleaned);
      })
      .catch(() => {
        if (!cancelled) setSvgContent("");
      });

    return () => {
      cancelled = true;
    };
  }, [svgPath]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
      dangerouslySetInnerHTML={{
        __html: svgContent ? styleOverrides + svgContent : "",
      }}
    />
  );
}
