interface BannerProps {
  variant: "error" | "info" | "warn";
  children: string;
}

const CLASS_BY_VARIANT: Record<BannerProps["variant"], string> = {
  error: "error-banner",
  info: "info-banner",
  warn: "warn-banner",
};

/** Usa las clases globales .error-banner/.info-banner/.warn-banner (src/styles/base.css, portadas de css/style.css). */
export function Banner({ variant, children }: BannerProps) {
  return <p className={CLASS_BY_VARIANT[variant]}>{children}</p>;
}
