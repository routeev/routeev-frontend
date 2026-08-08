interface BannerProps {
  variant: "error" | "info";
  children: string;
}

/** Usa las clases globales .error-banner/.info-banner (src/styles/base.css, portadas de css/style.css). */
export function Banner({ variant, children }: BannerProps) {
  return <p className={variant === "error" ? "error-banner" : "info-banner"}>{children}</p>;
}
