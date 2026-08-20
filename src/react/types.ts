import type { CSSProperties, ImgHTMLAttributes, ReactNode } from "react";
import type {
  AlignmentMode,
  BackgroundColor,
  LogoFailure,
  LogoSource,
  NormalizedLogo,
} from "../core/types";

export type ImageRenderProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  width: number;
  height: number;
  style?: CSSProperties;
};

export type RenderImageFn = (props: ImageRenderProps) => ReactNode;

export type UseLogoSoupOptions = {
  logos: (string | LogoSource)[];
  baseSize?: number;
  scaleFactor?: number;
  contrastThreshold?: number;
  densityAware?: boolean;
  densityFactor?: number;
  cropToContent?: boolean;
  backgroundColor?: BackgroundColor;
};

export type UseLogoSoupResult = {
  isLoading: boolean;
  isReady: boolean;
  normalizedLogos: NormalizedLogo[];
  error: Error | null;
  /** Logos that failed to load in the last run (absent from normalizedLogos) */
  failures: LogoFailure[];
};

export type LogoSoupProps = {
  logos: (string | LogoSource)[];
  baseSize?: number;
  scaleFactor?: number;
  contrastThreshold?: number;
  densityAware?: boolean;
  densityFactor?: number;
  cropToContent?: boolean;
  backgroundColor?: BackgroundColor;
  alignBy?: AlignmentMode;
  gap?: number | string;
  renderImage?: RenderImageFn;
  className?: string;
  style?: CSSProperties;
  onNormalized?: (logos: NormalizedLogo[]) => void;
  /** Called when one or more logos fail to load (including total failure) */
  onError?: (failures: LogoFailure[]) => void;
};
