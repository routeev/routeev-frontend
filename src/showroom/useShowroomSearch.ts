import { useCallback, useState } from "react";
import { useLocation, useNavigationType, useSearchParams } from "react-router-dom";

interface SearchState {
  fromSearch?: boolean;
}

/**
 * El texto del buscador, sincronizado con ?q= sin sumar un paso al historial
 * por tecla (replace). El campo tiene su propio estado para no depender de que
 * la URL se actualice entre tecla y tecla; la URL manda solo cuando la
 * navegación no la hizo el buscador: un link, o atrás/adelante del navegador.
 */
export function useShowroomSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigationType = useNavigationType();
  const urlQ = searchParams.get("q") ?? "";
  const [synced, setSynced] = useState({ key: location.key, q: urlQ });

  let q = synced.q;
  if (synced.key !== location.key) {
    const typed =
      navigationType !== "POP" && (location.state as SearchState | null)?.fromSearch === true;
    q = typed ? synced.q : urlQ;
    setSynced({ key: location.key, q });
  }

  const setQ = useCallback(
    (value: string) => {
      setSynced((s) => ({ ...s, q: value }));
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value.trim()) next.set("q", value);
          else next.delete("q");
          return next;
        },
        {
          replace: true,
          preventScrollReset: true,
          state: { fromSearch: true } satisfies SearchState,
        }
      );
    },
    [setSearchParams]
  );

  return [q, setQ] as const;
}
