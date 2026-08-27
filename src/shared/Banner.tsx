interface BannerProps {
  variant: "error" | "info" | "warn";
  /**
   * Marca el banner como live region (role="alert"): el texto se anuncia solo
   * cuando aparece. Va en los errores que salen COMO RESPUESTA a algo que la
   * persona acaba de hacer (mandar un formulario), no en los informativos que
   * ya estaban ahí al pintar la pantalla -- esos no interrumpen nada.
   */
  alert?: boolean;
  children: string;
}

const CLASS_BY_VARIANT: Record<BannerProps["variant"], string> = {
  error: "error-banner",
  info: "info-banner",
  warn: "warn-banner",
};

/** Usa las clases globales .error-banner/.info-banner/.warn-banner (src/styles/base.css, portadas de css/style.css). */
export function Banner({ variant, alert, children }: BannerProps) {
  return (
    <p className={CLASS_BY_VARIANT[variant]} role={alert ? "alert" : undefined}>
      {children}
    </p>
  );
}
