import type { Ref } from "react";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconClose, IconSearch } from "../map/panelIcons";
import styles from "./SearchField.module.css";

interface SearchFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** "hero": el grande del índice. "bar": el de la barra de la miga de pan. */
  size: "hero" | "bar";
  inputRef?: Ref<HTMLInputElement>;
}

/** El buscador global del showroom: uno solo, en cualquier vista. */
export function SearchField({ id, value, onChange, size, inputRef }: SearchFieldProps) {
  const { t } = useTranslation();
  const ti = t.showroom.index;
  const hero = size === "hero";

  return (
    <div role="search" className={hero ? styles.hero : styles.bar}>
      <label htmlFor={id} className="sr-only">
        {ti.searchLabel}
      </label>
      <span className={styles.icon} aria-hidden="true">
        <IconSearch size={hero ? 20 : 18} />
      </span>
      <input
        ref={inputRef}
        id={id}
        type="search"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        className={styles.input}
        value={value}
        placeholder={hero ? ti.searchPlaceholder : ti.searchPlaceholderShort}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          aria-label={ti.clearSearch}
          onClick={() => onChange("")}
        >
          <IconClose size={hero ? 18 : 16} />
        </button>
      )}
    </div>
  );
}
