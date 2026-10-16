import type { ReactNode, Ref } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconAlert, IconCheck, IconRetry } from "../map/panelIcons";
import { IconMail } from "./profileIcons";
import ui from "./ui.module.css";

interface FieldProps {
  id: string;
  label: string;
  optional?: string;
  value: string;
  onChange: (value: string) => void;
  /** Error del campo; tiene prioridad sobre la ayuda. */
  error?: string;
  hint?: string;
  type?: "text" | "email" | "password";
  inputMode?: "text" | "email" | "numeric" | "decimal";
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  /** Campo de código de 6 dígitos: grande y monoespaciado. */
  code?: boolean;
  /** Unidad dentro del campo, a la derecha ("kWh"). */
  unit?: string;
  inputRef?: Ref<HTMLInputElement>;
}

/** Label visible arriba, el campo y debajo su error o su ayuda (en aria-describedby). */
export function Field({
  id,
  label,
  optional,
  value,
  onChange,
  error,
  hint,
  type = "text",
  inputMode,
  autoComplete = "off",
  placeholder,
  maxLength,
  code = false,
  unit,
  inputRef,
}: FieldProps) {
  const msg = error ?? hint;
  const msgId = msg ? `${id}-msg` : undefined;
  const className = [ui.input, code ? ui.inputCode : "", unit ? ui.inputWithUnit : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={ui.field}>
      <label htmlFor={id} className={ui.label}>
        {label}
        {optional && <span className={ui.optional}> {optional}</span>}
      </label>
      <div className={ui.inputWrap}>
        <input
          ref={inputRef}
          id={id}
          className={className}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          placeholder={placeholder}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={msgId}
        />
        {unit && (
          <span className={ui.unit} aria-hidden="true">
            {unit}
          </span>
        )}
      </div>
      {msg && (
        <p id={msgId} className={error ? `${ui.msg} ${ui.msgError}` : ui.msg}>
          {error && <IconAlert size={16} />}
          <span>{msg}</span>
        </p>
      )}
    </div>
  );
}

export function ErrorNotice({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className={`${ui.notice} ${ui.noticeError}`}>
      <IconAlert size={18} />
      <span>{children}</span>
    </div>
  );
}

/** Aviso de que algo salió bien: un check, o un sobre si es un código reenviado. */
export function OkNotice({ children, mail = false }: { children: ReactNode; mail?: boolean }) {
  return (
    <div className={`${ui.notice} ${ui.noticeOk}`}>
      {mail ? <IconMail /> : <IconCheck size={18} />}
      <span>{children}</span>
    </div>
  );
}

/** Una sección que no cargó: qué pasó, que la API puede estar despertando, y reintentar. */
export function LoadError({ title, onRetry }: { title: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className={ui.loadError}>
      <p className={ui.loadErrorText}>
        <IconAlert size={18} />
        <span>
          <strong>{title}</strong> {t.profile.common.wakeUp}
        </span>
      </p>
      <button type="button" className={`${ui.outline} ${ui.small} ${ui.retry}`} onClick={onRetry}>
        <IconRetry size={16} />
        {t.profile.common.retry}
      </button>
    </div>
  );
}
