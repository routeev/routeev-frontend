import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  createVehicle,
  listEvModels,
  lookupVehicleAiPhoto,
  uploadVehiclePhoto,
  type EvModel,
} from "../api/vehicles";
import { Banner } from "../shared/Banner";
import { cloudinaryResize } from "../shared/cloudinaryResize";
import { MODEL_SEARCH_MIN_CHARS, filterModelLabels } from "../shared/evModelSearch";
import { ModelCombobox } from "../shared/ModelCombobox";
import { resizePhotoForUpload } from "../shared/resizePhoto";
import { Spinner } from "../shared/Spinner";
import { toast } from "../shared/toastStore";
import styles from "./ProfilePage.module.css";

const emptyForm = { name: "", capacity: "", consumption: "", chargingPower: "" };

type CampoForm = keyof typeof emptyForm;
type ErroresForm = Partial<Record<CampoForm, string>>;

/** El id del <input> de cada campo, para poder mandarle el foco al primero que falle. */
const ID_POR_CAMPO: Record<CampoForm, string> = {
  name: "p-name",
  capacity: "p-capacity",
  consumption: "p-consumption",
  chargingPower: "p-charging-power",
};

/** El orden en el que están en pantalla: el foco tiene que ir al de más arriba. */
const ORDEN_CAMPOS: CampoForm[] = ["name", "capacity", "consumption", "chargingPower"];

/**
 * QA MEDIO 19: estos campos son `required` con `min` dentro de un <form>, así
 * que hasta ahora los rechazaba el propio navegador con SU cartel, en inglés
 * ("Please fill out this field", "Value must be greater than or equal to
 * 0.1"), en el medio de una pantalla íntegramente en castellano. Con
 * noValidate el navegador se corre y los mensajes los ponemos acá.
 *
 * Los números se escriben con punto y no con coma a propósito, aunque en
 * Uruguay se escriba "0,18": son campos <input type="number">, y ese tipo de
 * campo directamente NO deja tipear la coma (el navegador la descarta al
 * sanear el valor). Decirle a alguien que escriba "0,18" en un campo donde la
 * coma no entra sería mandarlo a pelear con el teclado.
 */
function validar(f: typeof emptyForm): ErroresForm {
  const errores: ErroresForm = {};

  if (!f.name.trim()) {
    errores.name = "Escribí un nombre para reconocer el vehículo (ej. Nissan Leaf).";
  }

  const invalido = (valor: string, min: number) => {
    const n = Number(valor);
    return valor.trim() === "" || !Number.isFinite(n) || n < min;
  };

  if (invalido(f.capacity, 0.1)) {
    errores.capacity = "Poné la capacidad de la batería en kWh, de 0.1 para arriba (ej. 40).";
  }
  if (invalido(f.consumption, 0.01)) {
    errores.consumption = "Poné el consumo en kWh por km, de 0.01 para arriba (ej. 0.18).";
  }
  if (invalido(f.chargingPower, 0.5)) {
    errores.chargingPower = "Poné la potencia de carga en kW, de 0.5 para arriba (ej. 22).";
  }

  return errores;
}

interface AddVehicleFormProps {
  onCreated: () => void;
}

export function AddVehicleForm({ onCreated }: AddVehicleFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [errores, setErrores] = useState<ErroresForm>({});
  const [modelSearch, setModelSearch] = useState("");
  // El catálogo se pide recién cuando el usuario escribió lo suficiente como
  // para ofrecerle opciones: abrir el perfil (o clickear el campo) ya no
  // descarga los 630 modelos. Una vez traído no se vuelve a pedir
  // (staleTime): el catálogo no cambia mientras el backend esté corriendo.
  const modelsQuery = useQuery({
    queryKey: ["evModels"],
    queryFn: listEvModels,
    enabled: modelSearch.trim().length >= MODEL_SEARCH_MIN_CHARS,
    staleTime: Infinity,
  });
  const [modelPhoto, setModelPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // La foto que identificó el auto queda pendiente y se sube como foto del
  // vehículo recién creado (mismo flujo que la app móvil).
  const [pendingPhoto, setPendingPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const models = modelsQuery.data;
  const modelsByLabel = useMemo(() => {
    const map = new Map<string, EvModel>();
    for (const m of models ?? []) map.set(`${m.marca} ${m.modelo}`, m);
    return map;
  }, [models]);
  const modelOptions = useMemo(
    () => filterModelLabels(modelsByLabel.keys(), modelSearch),
    [modelsByLabel, modelSearch]
  );

  const identify = useMutation({
    mutationFn: async (file: File) => {
      const resized = await resizePhotoForUpload(file);
      const model = await lookupVehicleAiPhoto(resized);
      return { model, resized };
    },
    onSuccess: ({ model, resized }) => {
      setPendingPhoto(resized);
      setPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(resized);
      });
      setForm({
        name: [model.marca, model.modelo].filter(Boolean).join(" "),
        capacity: model.bateria_kwh != null ? String(model.bateria_kwh) : "",
        consumption: model.consumo_kwh_km != null ? String(model.consumo_kwh_km) : "",
        chargingPower: model.potencia_carga_kw != null ? String(model.potencia_carga_kw) : "",
      });
      // Los datos que acaban de entrar solos invalidan cualquier error viejo.
      setErrores({});
      setPhotoStatus({
        text: `Identificado: ${model.marca} ${model.modelo}. Revisá los datos y guardá.`,
        ok: true,
      });
    },
    onError: (err) => {
      const text =
        err instanceof Error ? err.message : "No se pudo identificar el vehículo con esa foto.";
      setPhotoStatus({ text, ok: false });
      // Además del texto de al lado del botón: identificar por foto puede
      // tardar varios segundos, tiempo de sobra para que la persona haya
      // dejado de mirar esa esquina de la pantalla.
      toast.error(text);
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const vehicle = await createVehicle({
        name: form.name.trim(),
        battery_capacity_kwh: Number(form.capacity),
        consumption_kwh_per_km: Number(form.consumption),
        charging_power_kw: Number(form.chargingPower),
      });
      if (pendingPhoto) {
        // Si falla, el vehículo ya quedó creado: no bloqueamos el flujo
        // principal por un paso secundario (mismo criterio que la app móvil).
        try {
          await uploadVehiclePhoto(vehicle.id, pendingPhoto);
        } catch {
          /* no bloquea */
        }
      }
      return vehicle;
    },
    onSuccess: (vehicle) => {
      setForm(emptyForm);
      setErrores({});
      setModelSearch("");
      setModelPhoto(null);
      setPendingPhoto(null);
      setPhotoStatus(null);
      setPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      // El formulario se vacía y el vehículo aparece en la grilla de arriba,
      // que puede quedar fuera de la pantalla: sin este aviso, el único
      // indicio de que salió bien era que los campos se borraron -- que es
      // exactamente lo que se ve cuando algo se pierde.
      toast.ok(`Listo, «${vehicle.name}» quedó agregado a tus vehículos.`);
      onCreated();
    },
    // Acá cae, entre otros, el 409 de nombre repetido: el backend ya manda un
    // mensaje explicando cuál es el nombre que choca.
    onError: (err) =>
      setError(err instanceof Error ? err.message : "No se pudo crear el vehículo."),
  });

  function onModelSearchChange(value: string) {
    setModelSearch(value);
    const model = modelsByLabel.get(value.trim());
    if (!model) return;
    setForm({
      name: `${model.marca} ${model.modelo}`,
      capacity: String(model.bateria_kwh),
      consumption: String(model.consumo_kwh_km),
      chargingPower: String(model.potencia_carga_kw),
    });
    setErrores({});
    setModelPhoto(cloudinaryResize(model.foto_url, 100) ?? null);
  }

  /** Editar un campo borra su error: el cartel rojo tiene que irse al corregirlo, no al mandar. */
  function setCampo(campo: CampoForm, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev));
  }

  return (
    <form
      className="inline-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const nuevos = validar(form);
        setErrores(nuevos);
        const primerCampoRoto = ORDEN_CAMPOS.find((campo) => nuevos[campo]);
        if (primerCampoRoto) {
          // Mandar el foco, no solo pintar el mensaje: con cuatro campos
          // apilados, el que falla puede estar fuera de la pantalla y el
          // formulario se ve igual de "quieto" que si el botón no anduviera.
          document.getElementById(ID_POR_CAMPO[primerCampoRoto])?.focus();
          return;
        }
        create.mutate();
      }}
    >
      <div className={styles.photoIdRow}>
        <label className={styles.photoIdBtn}>
          {identify.isPending ? <Spinner /> : <span aria-hidden="true">📷</span>} Identificar con una
          foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            disabled={identify.isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setPhotoStatus({ text: "Identificando el vehículo con IA...", ok: false });
              identify.mutate(file);
            }}
          />
        </label>
        {photoPreview && <img src={photoPreview} className={styles.photoIdPreview} alt="" />}
      </div>
      {photoStatus && (
        <div className={["hint", photoStatus.ok ? "hint-ok" : ""].join(" ")}>
          {photoStatus.text}
        </div>
      )}

      <div className={styles.formDivider}>
        <span>o buscá / completá a mano</span>
      </div>

      {/* QA BAJO 22: esto era un <input list> con un <datalist>, y el
          desplegable lo dibujaba el navegador -- blanco, con la tipografía del
          sistema y un ancho que no era el del campo, encima de una UI oscura.
          ModelCombobox lo reemplaza con la misma lógica de búsqueda (mínimo de
          letras, tope de opciones, sin tildes) pero con el estilo de la app. */}
      <ModelCombobox
        id="p-model-search"
        label="Modelo (opcional, precarga los datos)"
        placeholder={`Escribí al menos ${MODEL_SEARCH_MIN_CHARS} letras (ej. Nissan Leaf, Tesla Model 3)...`}
        value={modelSearch}
        options={modelOptions}
        loading={modelsQuery.isFetching}
        minChars={MODEL_SEARCH_MIN_CHARS}
        photoUrl={modelPhoto}
        onChange={onModelSearchChange}
      />

      <div className="field">
        <label htmlFor="p-name">Nombre</label>
        <input
          type="text"
          id="p-name"
          required
          placeholder="ej. Nissan Leaf"
          value={form.name}
          aria-invalid={Boolean(errores.name)}
          aria-describedby={errores.name ? "p-name-error" : undefined}
          onChange={(e) => setCampo("name", e.target.value)}
        />
        {errores.name && (
          <p className={styles.fieldError} id="p-name-error">
            {errores.name}
          </p>
        )}
      </div>

      <div className={styles.fieldRow}>
        <div className="field">
          <label htmlFor="p-capacity">Batería (kWh)</label>
          <input
            id="p-capacity"
            type="number"
            step="any"
            min={0.1}
            required
            placeholder="40"
            value={form.capacity}
            aria-invalid={Boolean(errores.capacity)}
            aria-describedby={errores.capacity ? "p-capacity-error" : undefined}
            onChange={(e) => setCampo("capacity", e.target.value)}
          />
          {errores.capacity && (
            <p className={styles.fieldError} id="p-capacity-error">
              {errores.capacity}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="p-consumption">Consumo (kWh/km)</label>
          <input
            id="p-consumption"
            type="number"
            step="any"
            min={0.01}
            required
            placeholder="0.18"
            value={form.consumption}
            aria-invalid={Boolean(errores.consumption)}
            aria-describedby={errores.consumption ? "p-consumption-error" : undefined}
            onChange={(e) => setCampo("consumption", e.target.value)}
          />
          {errores.consumption && (
            <p className={styles.fieldError} id="p-consumption-error">
              {errores.consumption}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="p-charging-power">Carga (kW)</label>
          <input
            id="p-charging-power"
            type="number"
            step="any"
            min={0.5}
            required
            placeholder="22"
            value={form.chargingPower}
            aria-invalid={Boolean(errores.chargingPower)}
            aria-describedby={errores.chargingPower ? "p-charging-power-error" : undefined}
            onChange={(e) => setCampo("chargingPower", e.target.value)}
          />
          {errores.chargingPower && (
            <p className={styles.fieldError} id="p-charging-power-error">
              {errores.chargingPower}
            </p>
          )}
        </div>
      </div>

      {error && (
        <Banner variant="error" alert>
          {error}
        </Banner>
      )}
      <button
        type="submit"
        className="primary small"
        disabled={create.isPending}
        aria-busy={create.isPending}
      >
        {create.isPending ? (
          <>
            <Spinner /> Creando...
          </>
        ) : (
          "Crear vehículo"
        )}
      </button>
    </form>
  );
}
