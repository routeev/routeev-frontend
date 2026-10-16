import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ApiError } from "../api/client";
import {
  createVehicle,
  listEvModels,
  lookupVehicleAiPhoto,
  uploadVehiclePhoto,
  type EvModel,
} from "../api/vehicles";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconCamera, IconCheck, IconClose, IconSearch } from "../map/panelIcons";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { filterModelLabels } from "../shared/evModelSearch";
import { resizePhotoForUpload } from "../shared/resizePhoto";
import { toast } from "../shared/toastStore";
import { CarOutline } from "../showroom/showroomIcons";
import { useFormat } from "../showroom/format";
import { parseDecimal } from "./numbers";
import { ErrorNotice, Field } from "./parts";
import { IconPencil } from "./profileIcons";
import { useModal } from "../shared/useModal";
import styles from "./AddCarDialog.module.css";
import ui from "./ui.module.css";

const MAX_RESULTS = 6;

type Source = "catalog" | "ia" | "manual";
type CarField = "name" | "kwh" | "cons" | "kw";
type Values = Record<CarField, string>;
type Errors = Partial<Record<CarField, string>>;

const EMPTY: Values = { name: "", kwh: "", cons: "", kw: "" };
const ORDER: CarField[] = ["name", "kwh", "cons", "kw"];

const modelLabel = (m: EvModel) => `${m.marca} ${m.modelo}`;

/** Una blob URL para mostrar la foto elegida, revocada cuando deja de usarse. */
function useObjectUrl(blob: Blob | null) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url;
}

interface AddCarDialogProps {
  /** Para avisar del nombre repetido antes de mandar. */
  existingNames: string[];
  onClose: () => void;
}

/**
 * Agregar un auto en dos pasos: de dónde salen los datos (catálogo, foto con
 * IA o a mano) y después revisarlos y guardar. Los tres caminos terminan en
 * el mismo formulario.
 */
export function AddCarDialog({ existingNames, onClose }: AddCarDialogProps) {
  const { t } = useTranslation();
  const a = t.profile.add;
  const f = useFormat();
  const queryClient = useQueryClient();
  const models = useQuery({ queryKey: ["evModels"], queryFn: listEvModels, staleTime: Infinity });

  const [step, setStep] = useState<"pick" | "form">("pick");
  const [query, setQuery] = useState("");
  const [nav, setNav] = useState({ query: "", index: -1 });
  const [source, setSource] = useState<Source>("manual");
  const [picked, setPicked] = useState<EvModel | null>(null);
  const [iaFile, setIaFile] = useState<Blob | null>(null);
  const [ownPhoto, setOwnPhoto] = useState<Blob | null>(null);
  const [iaError, setIaError] = useState<string | null>(null);
  const [vals, setVals] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const focusOnStep = useRef(false);
  const uid = useId();
  const titleId = `${uid}-title`;
  const listId = `${uid}-results`;
  const hintId = `${uid}-hint`;
  const optionId = (i: number) => `${uid}-opt-${i}`;
  const fieldId = (k: CarField) => `${uid}-${k}`;

  useModal(dialogRef, onClose, searchRef);

  // Al cambiar de paso, el foco va al primer campo del paso nuevo.
  useEffect(() => {
    if (!focusOnStep.current) return;
    focusOnStep.current = false;
    (step === "form" ? nameRef : searchRef).current?.focus({ preventScroll: true });
  }, [step]);

  const iaPreview = useObjectUrl(iaFile);
  const ownPreview = useObjectUrl(ownPhoto);

  const byLabel = useMemo(
    () => new Map((models.data ?? []).map((m) => [modelLabel(m), m])),
    [models.data]
  );
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(
    () =>
      filterModelLabels(byLabel.keys(), deferredQuery)
        .slice(0, MAX_RESULTS)
        .map((label) => byLabel.get(label)!),
    [byLabel, deferredQuery]
  );
  const active = nav.query === query ? Math.min(nav.index, results.length - 1) : -1;
  const searched = query.trim().length >= 3 && models.isSuccess;

  function toForm(from: Source, model: EvModel | null) {
    focusOnStep.current = true;
    setSource(from);
    setPicked(model);
    setErrors({});
    setApiError(null);
    setVals(
      model
        ? {
            name: modelLabel(model),
            kwh: f.n(model.bateria_kwh, model.bateria_kwh % 1 ? 1 : 0),
            cons: f.n(model.consumo_kwh_km, 3).replace(/0$/, ""),
            kw: f.n(model.potencia_carga_kw, model.potencia_carga_kw % 1 ? 1 : 0),
          }
        : EMPTY
    );
    if (from !== "ia") setOwnPhoto(null);
    setStep("form");
  }

  function backToPick() {
    focusOnStep.current = true;
    setIaError(null);
    setIaFile(null);
    setStep("pick");
  }

  const identify = useMutation({
    mutationFn: async (file: File) => {
      const resized = await resizePhotoForUpload(file);
      return { model: await lookupVehicleAiPhoto(resized), resized };
    },
    onSuccess: ({ model, resized }) => {
      setOwnPhoto(resized);
      toForm("ia", model);
    },
    // El texto de la API tal cual: también el del tope de pedidos por hora.
    onError: (err) => setIaError(err instanceof Error ? err.message : a.iaError),
  });

  function startIa() {
    setIaError(null);
    fileRef.current?.click();
  }

  const create = useMutation({
    mutationFn: async () => {
      const vehicle = await createVehicle({
        name: vals.name.trim(),
        battery_capacity_kwh: parseDecimal(vals.kwh),
        consumption_kwh_per_km: parseDecimal(vals.cons),
        charging_power_kw: parseDecimal(vals.kw),
      });
      if (source === "ia" && ownPhoto) {
        // Si la foto falla, el auto ya quedó creado: no frena el alta.
        try {
          await uploadVehiclePhoto(vehicle.id, ownPhoto);
        } catch {
          /* no bloquea */
        }
      }
      return vehicle;
    },
    onSuccess: (vehicle) => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.ok(a.added(vehicle.name));
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ name: a.errDuplicate });
        document.getElementById(fieldId("name"))?.focus();
      } else {
        setApiError(err instanceof Error ? err.message : a.createError);
      }
    },
  });

  function setValue(k: CarField, v: string) {
    setVals((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
  }

  function onSave(e: FormEvent) {
    e.preventDefault();
    if (create.isPending) return;
    const found: Errors = {};
    const name = vals.name.trim();
    if (!name) found.name = a.errName;
    else if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase()))
      found.name = a.errDuplicate;
    if (!(parseDecimal(vals.kwh) >= 1)) found.kwh = a.errBattery;
    if (!(parseDecimal(vals.cons) >= 0.01)) found.cons = a.errConsumption;
    if (!(parseDecimal(vals.kw) >= 1)) found.kw = a.errCharging;
    setErrors(found);
    setApiError(null);
    const first = ORDER.find((k) => found[k]);
    if (first) {
      document.getElementById(fieldId(first))?.focus();
      return;
    }
    create.mutate();
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next =
        e.key === "ArrowDown"
          ? (active + 1) % results.length
          : (active - 1 + results.length) % results.length;
      setNav({ query, index: next });
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      toForm("catalog", results[active]!);
    }
  }

  const kwh = parseDecimal(vals.kwh);
  const cons = parseDecimal(vals.cons);
  const estimate = kwh > 0 && cons >= 0.01 ? f.n(Math.round(kwh / cons)) : "—";
  const catalogPhoto = source === "catalog" && picked?.foto_url ? picked : null;
  const credit = catalogPhoto
    ? [catalogPhoto.foto_credito?.autor, catalogPhoto.foto_credito?.licencia]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
      >
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.step}>{step === "form" ? a.step2 : a.step1}</span>
            <h2 id={titleId} className={styles.title}>
              {a.title}
            </h2>
          </div>
          <button
            type="button"
            className={ui.iconButton}
            onClick={onClose}
            aria-label={t.profile.common.close}
          >
            <IconClose size={20} />
          </button>
        </div>

        {step === "pick" ? (
          <div className={styles.body}>
            <div className={ui.field}>
              <label htmlFor={`${uid}-q`} className={styles.searchLabel}>
                {a.searchLabel}
              </label>
              <div className={ui.inputWrap}>
                <span className={styles.searchIcon} aria-hidden="true">
                  <IconSearch size={18} />
                </span>
                <input
                  ref={searchRef}
                  id={`${uid}-q`}
                  type="search"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={results.length > 0}
                  aria-controls={listId}
                  aria-activedescendant={active >= 0 ? optionId(active) : undefined}
                  aria-describedby={hintId}
                  autoComplete="off"
                  className={`${ui.input} ${styles.searchInput}`}
                  placeholder={a.searchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onSearchKey}
                />
              </div>
              <span id={hintId} className={styles.hint}>
                {a.searchHint}
              </span>
            </div>

            {results.length > 0 && (
              <ul id={listId} role="listbox" aria-label={a.results} className={styles.results}>
                {results.map((m, i) => (
                  <li
                    key={modelLabel(m)}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    className={styles.result}
                    onClick={() => toForm("catalog", m)}
                  >
                    <span className={styles.resultThumb}>
                      {m.foto_url ? (
                        <img
                          src={cloudinaryResize(m.foto_url, 120) ?? m.foto_url}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <CarOutline width={28} />
                      )}
                    </span>
                    <span className={styles.resultText}>
                      <span className={styles.resultName}>{modelLabel(m)}</span>
                      <span className={styles.resultSub}>
                        {f.n(m.bateria_kwh, m.bateria_kwh % 1 ? 1 : 0)} kWh ·{" "}
                        {f.n(m.potencia_carga_kw)} kW
                      </span>
                    </span>
                    <span className={styles.resultRange}>
                      {f.n(m.autonomia_aprox_km)}
                      <span className={ui.unitSmall}>km</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {searched && results.length === 0 && (
              <p role="status" className={styles.noResults}>
                {a.noResults(query.trim())}
              </p>
            )}

            <div className={styles.other}>
              <span className={styles.otherTitle}>{a.otherWays}</span>
              {identify.isPending ? (
                <div role="status" className={styles.iaBusy}>
                  <span className={styles.iaThumb}>
                    {iaPreview && <img src={iaPreview} alt="" />}
                  </span>
                  <span className={styles.iaBusyText}>
                    <span className={styles.iaBusyTitle}>
                      <span className={ui.spinner} aria-hidden="true" />
                      {a.iaBusy}
                    </span>
                    <span className={styles.iaBusySub}>{a.iaBusySub}</span>
                  </span>
                </div>
              ) : iaError ? (
                <div className={styles.iaError}>
                  <ErrorNotice>
                    {iaError} {a.iaErrorHint}
                  </ErrorNotice>
                  <div className={styles.iaErrorActions}>
                    <button type="button" className={`${ui.outline} ${ui.small}`} onClick={startIa}>
                      <IconCamera size={16} />
                      {a.iaRetry}
                    </button>
                    <button
                      type="button"
                      className={ui.textAction}
                      onClick={() => toForm("manual", null)}
                    >
                      {a.manualButton}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.ways}>
                  <button type="button" className={styles.way} onClick={startIa}>
                    <IconCamera size={22} />
                    <span className={styles.wayText}>
                      <span className={styles.wayTitle}>{a.iaButton}</span>
                      <span className={styles.waySub}>{a.iaSub}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.way}
                    onClick={() => toForm("manual", null)}
                  >
                    <IconPencil />
                    <span className={styles.wayText}>
                      <span className={styles.wayTitle}>{a.manualButton}</span>
                      <span className={styles.waySub}>{a.manualSub}</span>
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Sin `capture`: así el celular ofrece la cámara y también la
                galería. Nunca se dispara solo. */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setIaFile(file);
                identify.mutate(file);
              }}
            />
          </div>
        ) : (
          <form className={styles.form} onSubmit={onSave} noValidate>
            <div className={styles.body}>
              {source === "ia" && picked && (
                <div role="status" className={`${ui.notice} ${ui.noticeOk}`}>
                  <IconCheck size={18} />
                  <span>{a.iaOk(modelLabel(picked))}</span>
                </div>
              )}
              {apiError && <ErrorNotice>{apiError}</ErrorNotice>}

              {(catalogPhoto || (source === "ia" && ownPreview)) && (
                <div className={styles.preview}>
                  <span className={styles.previewPhoto}>
                    <img
                      src={
                        catalogPhoto
                          ? (cloudinaryResize(catalogPhoto.foto_url, 240) ?? catalogPhoto.foto_url)
                          : ownPreview!
                      }
                      alt=""
                    />
                  </span>
                  <span className={styles.previewText}>
                    <span className={styles.previewTitle}>
                      {catalogPhoto ? a.previewCatalog : a.previewOwn}
                    </span>
                    <span className={styles.previewBody}>
                      {catalogPhoto ? a.previewCatalogBody(credit) : a.previewOwnBody}
                    </span>
                  </span>
                </div>
              )}

              <Field
                id={fieldId("name")}
                inputRef={nameRef}
                label={a.name}
                value={vals.name}
                onChange={(v) => setValue("name", v)}
                error={errors.name}
                hint={a.nameHint}
                placeholder="Nissan Leaf"
                maxLength={80}
              />
              <Field
                id={fieldId("kwh")}
                label={a.battery}
                value={vals.kwh}
                onChange={(v) => setValue("kwh", v)}
                error={errors.kwh}
                inputMode="decimal"
                unit="kWh"
                placeholder={f.n(44.9, 1)}
              />
              <Field
                id={fieldId("cons")}
                label={a.consumption}
                value={vals.cons}
                onChange={(v) => setValue("cons", v)}
                error={errors.cons}
                inputMode="decimal"
                unit="kWh/km"
                placeholder={f.n(0.169, 3)}
              />
              <Field
                id={fieldId("kw")}
                label={a.charging}
                value={vals.kw}
                onChange={(v) => setValue("kw", v)}
                error={errors.kw}
                inputMode="decimal"
                unit="kW"
                placeholder="60"
              />

              <div aria-live="polite" className={styles.estimate}>
                <span className={styles.estimateLabel}>{a.rangeEstimate}</span>
                <span className={styles.estimateValue}>
                  {estimate}
                  <span className={ui.unitSmall}>km</span>
                </span>
              </div>
            </div>
            <div className={styles.foot}>
              <button type="button" className={ui.outline} onClick={backToPick}>
                {t.profile.common.back}
              </button>
              <button
                type="submit"
                className={ui.primary}
                disabled={create.isPending}
                aria-busy={create.isPending}
              >
                {create.isPending && <span className={ui.spinnerOnAccent} aria-hidden="true" />}
                {a.save}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
