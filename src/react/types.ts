import type { CSSProperties, ImgHTMLAttributes, ReactNode } from "react";
import type {
  AlignmentMode,
  BackgroundColor,
  LogoFailure,
  LogoSource,
  MeasurementResult,
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
  /** Pre-computed measurements keyed by src (e.g. from the Node adapter). Full coverage renders synchronously — SSR-safe, zero CLS */
  measurements?: Record<string, MeasurementResult>;
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
  /** Pre-computed measurements keyed by src (e.g. from the Node adapter). Full coverage renders synchronously — SSR-safe, zero CLS */
  measurements?: Record<string, MeasurementResult>;
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
