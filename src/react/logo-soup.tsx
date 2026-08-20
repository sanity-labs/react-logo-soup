import { type CSSProperties, useEffect } from "react";
import { DEFAULT_ALIGN_BY, DEFAULT_GAP } from "../core/constants";
import { getVisualCenterTransform } from "../core/get-visual-center-transform";
import type { ImageRenderProps, LogoSoupProps } from "./types";
import { useLogoSoup } from "./use-logo-soup";

const logoWrapperStyle: CSSProperties = {
  display: "inline-block",
  verticalAlign: "middle",
};

const logoImageStyle: CSSProperties = {
  display: "block",
  objectFit: "contain",
};

function DefaultImage(props: ImageRenderProps) {
  // crossOrigin must match loadImage's, or browsers re-download every logo
  // biome-ignore lint/a11y/useAltText: alt is required in ImageRenderProps
  return <img crossOrigin="anonymous" decoding="async" {...props} />;
}

export function LogoSoup({
  logos,
  measurements,
  baseSize,
  scaleFactor,
  contrastThreshold,
  densityAware,
  densityFactor,
  cropToContent,
  backgroundColor,
  alignBy = DEFAULT_ALIGN_BY,
  gap = DEFAULT_GAP,
  renderImage,
  className,
  style,
  onNormalized,
  onError,
}: LogoSoupProps) {
  const { isLoading, isReady, normalizedLogos, error, failures } = useLogoSoup({
    logos,
    measurements,
    baseSize,
    scaleFactor,
    contrastThreshold,
    densityAware,
    densityFactor,
    cropToContent,
    backgroundColor,
  });

  const ImageComponent = renderImage || DefaultImage;

  useEffect(() => {
    if (isReady && onNormalized) {
      onNormalized(normalizedLogos);
    }
  }, [isReady, normalizedLogos, onNormalized]);

  useEffect(() => {
    if (failures.length > 0 && onError) {
      onError(failures);
    }
  }, [failures, onError]);

  const halfGap = typeof gap === "number" ? `${gap / 2}px` : `calc(${gap} / 2)`;

  // Fade on the always-mounted container; per-item opacity never transitioned
  const containerStyle: CSSProperties = {
    textAlign: "center",
    textWrap: "balance",
    opacity: isLoading && normalizedLogos.length === 0 ? 0 : 1,
    transition: "opacity 0.2s ease-in-out",
    ...style,
  };

  if (error) {
    return null;
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: ul/li would inherit list styling consumers must reset
    <div
      className={className}
      style={containerStyle}
      role="list"
      data-logo-soup-loading={isLoading}
    >
      {normalizedLogos.map((logo, index) => {
        const transform = getVisualCenterTransform(logo, alignBy);

        return (
          // biome-ignore lint/a11y/useSemanticElements: see role="list" above
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: src alone can repeat; index disambiguates duplicates
            key={`${logo.src}-${index}`}
            role="listitem"
            style={{
              ...logoWrapperStyle,
              padding: halfGap,
            }}
          >
            <ImageComponent
              src={logo.croppedSrc || logo.src}
              alt={logo.alt}
              width={logo.normalizedWidth}
              height={logo.normalizedHeight}
              style={{
                ...logoImageStyle,
                width: logo.normalizedWidth,
                height: logo.normalizedHeight,
                transform,
              }}
            />
          </span>
        );
      })}
    </div>
  );
}
