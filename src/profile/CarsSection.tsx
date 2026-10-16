import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import {
  deleteVehicle,
  deleteVehiclePhoto,
  listVehicles,
  uploadVehiclePhoto,
  type Vehicle,
} from "../api/vehicles";
import { useTranslation } from "../i18n/LanguageProvider";
import { IconCamera, IconPlus } from "../map/panelIcons";
import { useMediaQuery } from "../shared/useMediaQuery";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { resizePhotoForUpload } from "../shared/resizePhoto";
import { toast } from "../shared/toastStore";
import { CarOutline } from "../showroom/showroomIcons";
import { useFormat } from "../showroom/format";
import { AddCarDialog } from "./AddCarDialog";
import { carFigures, carRange } from "./numbers";
import { LoadError } from "./parts";
import { IconDots, IconDotsVertical, IconExternal, IconImageOff, IconTrash } from "./profileIcons";
import { useModal } from "../shared/useModal";
import { useVehiclePhoto, vehiclePhotoQueryKey } from "./useVehiclePhoto";
import styles from "./CarsSection.module.css";
import ui from "./ui.module.css";

const menuTriggerId = (id: number) => `auto-menu-${id}`;

interface CarsSectionProps {
  /** `/profile?agregar-vehiculo=1`: el alta se abre sola al entrar. */
  addOnLoad: boolean;
  onAddClosed: () => void;
}

export function CarsSection({ addOnLoad, onAddClosed }: CarsSectionProps) {
  const { t } = useTranslation();
  const c = t.profile.cars;
  const queryClient = useQueryClient();
  const isDesktop = useMediaQuery("(min-width: 900px)");
  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: listVehicles });
  const [adding, setAdding] = useState(addOnLoad);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoTarget = useRef<number | null>(null);
  const headRef = useRef<HTMLHeadingElement>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  const refreshPhoto = (id: number) => {
    const key = vehiclePhotoQueryKey(id);
    const old = queryClient.getQueryData<string | null>(key);
    if (old) URL.revokeObjectURL(old);
    void queryClient.invalidateQueries({ queryKey: key });
  };

  const upload = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) =>
      uploadVehiclePhoto(id, await resizePhotoForUpload(file)),
    onSuccess: (_d, { id }) => {
      void refresh();
      refreshPhoto(id);
      toast.ok(c.photoSaved);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : c.photoError),
  });

  const removePhoto = useMutation({
    mutationFn: (id: number) => deleteVehiclePhoto(id),
    onSuccess: (_d, id) => {
      void refresh();
      refreshPhoto(id);
      toast.ok(c.photoRemoved);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : c.photoRemoveError),
  });

  const remove = useMutation({
    mutationFn: (v: Vehicle) => deleteVehicle(v.id),
    onSuccess: (_d, v) => {
      setDeleting(null);
      void refresh();
      refreshPhoto(v.id);
      toast.ok(c.deleted(v.name));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : c.deleteError),
  });

  function pickPhoto(id: number) {
    photoTarget.current = id;
    fileRef.current?.click();
  }

  function closeAdd() {
    setAdding(false);
    onAddClosed();
  }

  const list = vehicles.data ?? [];
  const actions = {
    onPhoto: pickPhoto,
    onRemovePhoto: (v: Vehicle) => removePhoto.mutate(v.id),
    onDelete: (v: Vehicle) => setDeleting(v),
  };

  return (
    <section id="autos" aria-labelledby="h-autos" className={styles.section}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <h2 id="h-autos" ref={headRef} tabIndex={-1} className={styles.title}>
            {c.title}
          </h2>
          <p className={styles.subtitle}>{c.subtitle}</p>
        </div>
        {list.length > 0 && (
          <button
            type="button"
            className={`${ui.primary} ${ui.small}`}
            onClick={() => setAdding(true)}
          >
            <IconPlus size={18} />
            {c.add}
          </button>
        )}
      </div>

      {vehicles.isPending ? (
        <div role="status" aria-label={c.loading} className={styles.grid}>
          <div className={`${ui.skeleton} ${styles.skeleton}`} />
          <div className={`${ui.skeleton} ${styles.skeleton}`} />
        </div>
      ) : vehicles.isError ? (
        <LoadError title={c.error} onRetry={() => void vehicles.refetch()} />
      ) : list.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyArt}>
            <CarOutline width={72} />
          </span>
          <div className={styles.emptyText}>
            <span className={styles.emptyTitle}>{c.emptyTitle}</span>
            <span className={styles.emptyBody}>{c.emptyBody}</span>
          </div>
          <button type="button" className={ui.primary} onClick={() => setAdding(true)}>
            <IconPlus size={18} />
            {c.addFirst}
          </button>
        </div>
      ) : isDesktop ? (
        <ul className={styles.grid}>
          {list.map((v) => (
            <CarCard key={v.id} car={v} {...actions} />
          ))}
          <li className={styles.addTile}>
            <button type="button" onClick={() => setAdding(true)}>
              <IconPlus size={26} />
              {c.add}
            </button>
          </li>
        </ul>
      ) : (
        <ul className={styles.rows}>
          {list.map((v) => (
            <CarRow key={v.id} car={v} {...actions} />
          ))}
        </ul>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Vaciarlo deja elegir el mismo archivo dos veces seguidas.
          e.target.value = "";
          const id = photoTarget.current;
          if (file && id != null) upload.mutate({ id, file });
        }}
      />

      {adding && <AddCarDialog existingNames={list.map((v) => v.name)} onClose={closeAdd} />}

      {deleting && (
        <ConfirmDeleteCar
          car={deleting}
          busy={remove.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting)}
          // Si el auto ya no está, el foco vuelve al título de la sección.
          returnFocus={() => document.getElementById(menuTriggerId(deleting.id)) ?? headRef.current}
        />
      )}
    </section>
  );
}

interface CarProps {
  car: Vehicle;
  onPhoto: (id: number) => void;
  onRemovePhoto: (v: Vehicle) => void;
  onDelete: (v: Vehicle) => void;
}

/** La foto propia, la del modelo del catálogo (con su crédito) o, si no hay ninguna, el contorno. */
function useCarPhoto(car: Vehicle) {
  const own = useVehiclePhoto(car.id, car.has_photo);
  if (car.has_photo) return { src: own, own: true };
  if (car.foto_modelo_url)
    return { src: cloudinaryResize(car.foto_modelo_url, 600) ?? car.foto_modelo_url, own: false };
  return { src: null, own: false };
}

function Credit({ car, compact = false }: { car: Vehicle; compact?: boolean }) {
  const { t } = useTranslation();
  const credit = car.foto_modelo_credito;
  if (car.has_photo || !car.foto_modelo_url) return null;
  const text = [t.profile.cars.credit, credit?.autor, credit?.licencia].filter(Boolean).join(" · ");
  return (
    <span className={compact ? styles.creditCompact : styles.credit}>
      <span>{text}</span>
      {!compact && credit?.archivo_url && (
        <a href={credit.archivo_url} target="_blank" rel="noopener noreferrer">
          {t.profile.cars.original}
          <IconExternal />
        </a>
      )}
    </span>
  );
}

function CarCard({ car, onPhoto, onRemovePhoto, onDelete }: CarProps) {
  const { t } = useTranslation();
  const c = t.profile.cars;
  const f = useFormat();
  const photo = useCarPhoto(car);
  const range = carRange(car);
  const fig = carFigures(f, car);

  return (
    <li className={styles.card}>
      <div className={styles.photo}>
        {photo.src ? (
          <img src={photo.src} alt="" loading="lazy" />
        ) : car.has_photo ? null : (
          <span className={styles.noPhoto}>
            <CarOutline width={64} />
            <span>{c.noPhoto}</span>
          </span>
        )}
        {car.has_photo && <span className={styles.ownBadge}>{c.ownPhoto}</span>}
      </div>
      <CarMenu
        car={car}
        vertical={false}
        onPhoto={onPhoto}
        onRemovePhoto={onRemovePhoto}
        onDelete={onDelete}
      />
      <div className={styles.body}>
        <Credit car={car} />
        <h3 className={styles.name}>{car.name}</h3>
        <p className={styles.range}>
          <span className={styles.rangeValue}>
            {range == null ? "—" : f.n(range)}
            <span className={ui.unitSmall}>km</span>
          </span>
          <span className={styles.rangeLabel}>{c.range}</span>
        </p>
        <dl className={styles.specs}>
          <div>
            <dt>{c.battery}</dt>
            <dd>
              {fig.kwh}
              <span>kWh</span>
            </dd>
          </div>
          <div>
            <dt>{c.consumption}</dt>
            <dd>
              {fig.cons}
              <span>kWh/km</span>
            </dd>
          </div>
          <div>
            <dt>{c.charging}</dt>
            <dd>
              {fig.kw}
              <span>kW</span>
            </dd>
          </div>
        </dl>
      </div>
    </li>
  );
}

/** En el celular: la fila de la app mobile, con la autonomía grande a la derecha. */
function CarRow({ car, onPhoto, onRemovePhoto, onDelete }: CarProps) {
  const f = useFormat();
  const photo = useCarPhoto(car);
  const range = carRange(car);
  const fig = carFigures(f, car);

  return (
    <li className={styles.row}>
      <span className={styles.thumb}>
        {photo.src ? (
          <img src={photo.src} alt="" loading="lazy" />
        ) : car.has_photo ? null : (
          <CarOutline width={34} />
        )}
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowName}>{car.name}</span>
        <span className={styles.rowSub}>
          {fig.kwh} kWh · {fig.kw} kW
        </span>
        <Credit car={car} compact />
      </span>
      <span className={styles.rowRange}>
        {range == null ? "—" : f.n(range)}
        <span className={ui.unitSmall}>km</span>
      </span>
      <CarMenu
        car={car}
        vertical
        onPhoto={onPhoto}
        onRemovePhoto={onRemovePhoto}
        onDelete={onDelete}
      />
    </li>
  );
}

/**
 * "⋯": la foto y eliminar, fuera de la tarjeta. Menú de verdad: el foco entra
 * al primer ítem, las flechas recorren, Escape (o tocar afuera) lo cierra y el
 * foco vuelve al botón.
 */
function CarMenu({
  car,
  vertical,
  onPhoto,
  onRemovePhoto,
  onDelete,
}: CarProps & { vertical: boolean }) {
  const { t } = useTranslation();
  const c = t.profile.cars;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const items = () => [
      ...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
    ];
    items()[0]?.focus();

    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key === "Tab") {
        setOpen(false);
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      const next =
        e.key === "ArrowDown" ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
      list[next]?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={rootRef} className={vertical ? styles.menuRootRow : styles.menuRootCard}>
      <button
        ref={triggerRef}
        id={menuTriggerId(car.id)}
        type="button"
        className={vertical ? styles.menuTriggerRow : ui.iconButton}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={c.menu(car.name)}
        onClick={() => setOpen((v) => !v)}
      >
        {vertical ? <IconDotsVertical /> : <IconDots />}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={c.menu(car.name)}
          className={styles.menu}
        >
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => choose(() => onPhoto(car.id))}
          >
            <IconCamera size={18} />
            {car.has_photo ? c.changePhoto : c.uploadPhoto}
          </button>
          {car.has_photo && (
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => choose(() => onRemovePhoto(car))}
            >
              <IconImageOff />
              {c.removePhoto}
            </button>
          )}
          <span className={styles.menuSeparator} role="separator" />
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={styles.menuDanger}
            onClick={() => choose(() => onDelete(car))}
          >
            <IconTrash />
            {c.delete}
          </button>
        </div>
      )}
    </div>
  );
}

interface ConfirmDeleteCarProps {
  car: Vehicle;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  returnFocus: () => HTMLElement | null;
}

/** Reemplaza al confirm() del navegador. El foco arranca en Cancelar. */
function ConfirmDeleteCar({ car, busy, onCancel, onConfirm, returnFocus }: ConfirmDeleteCarProps) {
  const { t } = useTranslation();
  const c = t.profile.cars;
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  useModal(dialogRef, onCancel, cancelRef, returnFocus);

  return (
    <div className={styles.overlay}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={styles.confirm}
      >
        <h2 id={titleId} className={styles.confirmTitle}>
          {c.deleteTitle(car.name)}
        </h2>
        <p id={bodyId} className={styles.confirmBody}>
          {c.deleteBody}
        </p>
        <div className={styles.confirmActions}>
          <button ref={cancelRef} type="button" className={ui.outline} onClick={onCancel}>
            {t.profile.common.cancel}
          </button>
          <button
            type="button"
            className={ui.dangerFill}
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
          >
            {busy && <span className={ui.spinnerOnDanger} aria-hidden="true" />}
            {c.delete}
          </button>
        </div>
      </div>
    </div>
  );
}
