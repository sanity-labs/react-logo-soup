import { install } from "./plugin";

export type { LogoSoupPluginOptions } from "./plugin";
export { install };

// Auto-install if jQuery is available globally
if (typeof window !== "undefined" && (window as any).jQuery) {
  install((window as any).jQuery);
}
