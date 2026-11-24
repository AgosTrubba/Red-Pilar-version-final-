import { useState, type ChangeEvent } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Crosshair,
  Mic,
  Share2,
  Trash2,
  Video,
} from 'lucide-react';
import type { AlertCategory, AlertItem, Locality } from '../shared/types';
import {
  CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_ICONS,
  SUBCATEGORIES,
  moderateClientText,
} from '../lib/constants';
import { createAlertSubmission, fetchNearestLocality } from '../lib/api';
import { ZoneSelector } from './ZoneSelector';

interface MediaPreview {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
}

interface AlertFormViewProps {
  localities: Locality[];
  onCancel: () => void;
  onCreated: (alert: AlertItem) => void;
  onToast: (msg: string) => void;
}

export function AlertFormView({
  localities,
  onCancel,
  onCreated,
  onToast,
}: AlertFormViewProps) {
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<{
    type: 'idle' | 'loading' | 'ok' | 'error';
    message?: string;
  }>({ type: 'idle' });
  const [referenceText, setReferenceText] = useState('');
  const [category, setCategory] = useState<AlertCategory | ''>('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [listening, setListening] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaPreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [createdAlert, setCreatedAlert] = useState<AlertItem | null>(null);

  const refError = moderateClientText(referenceText);
  const descError = moderateClientText(description);

  const step1Done = selectedZones.length === 1;
  const step2Done = Boolean(category);
  const step3Done = Boolean(subcategory);
  const step4Done = description.trim().length >= 10 && !descError && !refError;
  const canSubmit = step1Done && step2Done && step3Done && step4Done && !submitting;

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus({
        type: 'error',
        message: 'No pudimos obtener tu ubicación. Podés elegir la zona de la lista.',
      });
      return;
    }
    setGpsStatus({ type: 'loading', message: 'Buscando ubicación actual...' });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const match = await fetchNearestLocality(lat, lng);
          setSelectedZones([`${match.suggestedBarrio}|${match.locality.name}`]);
          setGpsCoords({ lat, lng });
          setGpsStatus({
            type: 'ok',
            message: `${match.suggestedBarrio}, ${match.locality.name} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          });
        } catch {
          setGpsStatus({
            type: 'error',
            message: 'No pudimos asociar el GPS a una zona. Elegila manualmente.',
          });
        }
      },
      () => {
        setGpsStatus({
          type: 'error',
          message: 'No pudimos obtener tu ubicación. Podés elegir la zona de la lista.',
        });
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const handleVoiceDictation = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRec) {
      onToast('Tu navegador no permite dictar por voz');
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'es-AR';
    rec.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        setDescription((prev) => `${prev} ${transcript}`.trim().slice(0, 2000));
      }
    };
    rec.onerror = () => onToast('No pudimos usar el micrófono');
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const handleMediaCapture = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (mediaItems.length >= 5) {
      onToast('Máximo 5 fotos o videos por aviso');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const type: 'image' | 'video' = file.type.startsWith('video') ? 'video' : 'image';
    setMediaItems((prev) => [...prev, { file, previewUrl, type }]);
  };

  const removeMedia = (idx: number) => {
    setMediaItems((prev) => {
      const copy = [...prev];
      const removed = copy.splice(idx, 1)[0];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit || !category) return;
    setSubmitError(null);
    setSubmitting(true);

    try {
      const [zone, locality] = selectedZones[0].split('|');
      const fd = new FormData();
      fd.append('category', category);
      fd.append('subcategory', subcategory);
      fd.append('zone', zone);
      fd.append('locality', locality);
      fd.append('referenceText', referenceText.trim());
      fd.append('description', description.trim());
      if (gpsCoords) {
        fd.append('lat', String(gpsCoords.lat));
        fd.append('lng', String(gpsCoords.lng));
      }
      for (const item of mediaItems) {
        fd.append('media', item.file);
      }

      const res = await createAlertSubmission(fd);
      setCreatedAlert(res.alert);
    } catch (err) {
      setSubmitError((err as Error).message || 'No pudimos publicar tu aviso');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareCreated = async () => {
    if (!createdAlert) return;
    const shareUrl = `${window.location.href.split('#')[0]}#aviso=${createdAlert.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${createdAlert.title} — Red Pilar`, url: shareUrl });
        return;
      } catch {
        // ignore cancellation
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      onToast('Link copiado para compartir');
    } catch {
      onToast('Copiá el link desde la barra del navegador');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setConfirmCancelOpen(true)}
          className="min-h-[44px] px-4 py-2 rounded-full bg-black/25 hover:bg-black/35 text-sm font-display font-semibold inline-flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
      </div>

      <header className="mb-6">
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
          Formulario de aviso
        </h1>
        <p className="text-sm text-white/85 mt-1">
          Cinco pasos y listo. El sistema redactará el título y el resumen con lo que cuentes.
        </p>
      </header>

      <div className="space-y-5">
        {/* Step 1: Ubicación */}
        <StepBlock num={1} title="Ubicación" done={step1Done} locked={false}>
          <button
            type="button"
            onClick={handleUseGps}
            className="w-full min-h-[48px] rounded-full border-2 border-[#368CD4] bg-[#368CD4]/15 hover:bg-[#368CD4]/25 text-white font-display font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Crosshair className="w-4 h-4" />
            <span>Usar mi ubicación actual (GPS)</span>
          </button>

          {gpsStatus.type === 'loading' && (
            <p className="text-xs text-white/80 mt-2">{gpsStatus.message}</p>
          )}
          {gpsStatus.type === 'ok' && (
            <div className="mt-2 bg-[#22A559]/25 border border-[#22A559] rounded-2xl px-3.5 py-2.5 text-xs text-white">
              <strong className="block font-display">Ubicación exacta cargada</strong>
              <span>{gpsStatus.message}</span>
            </div>
          )}
          {gpsStatus.type === 'error' && (
            <div className="mt-2 bg-[#ED1C37]/20 border border-[#ED1C37] rounded-2xl px-3.5 py-2.5 text-xs text-white">
              {gpsStatus.message}
            </div>
          )}

          <p className="text-center text-[11px] font-display font-bold tracking-wider uppercase text-white/75 my-3">
            O elegí la zona de la lista
          </p>

          <ZoneSelector
            localities={localities}
            multi={false}
            selected={selectedZones}
            onChange={(next) => {
              setSelectedZones(next);
              setGpsCoords(null);
              setGpsStatus({ type: 'idle' });
            }}
          />

          <input
            type="text"
            value={referenceText}
            onChange={(e) => setReferenceText(e.target.value)}
            placeholder="Referencia o altura (ej.: Eva Perón al 1200)"
            className="mt-3 w-full min-h-[44px] bg-[#F7F7F7] text-[#1C2A3D] placeholder:text-[#687B94] rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#368CD4]"
          />
          {refError && (
            <div className="mt-2 bg-[#ED1C37]/20 border border-[#ED1C37] rounded-2xl px-3.5 py-2 text-xs text-white">
              ⚠ {refError}
            </div>
          )}
        </StepBlock>

        {/* Step 2: Categoría */}
        <StepBlock num={2} title="Categoría" done={step2Done} locked={!step1Done}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCategory(c);
                    setSubcategory('');
                  }}
                  className={`min-h-[84px] bg-[#2B5F96] rounded-2xl p-3.5 text-left border-2 transition-colors ${
                    active ? 'border-white bg-[#326CA9]' : 'border-transparent hover:border-white/30'
                  }`}
                >
                  <img src={CATEGORY_ICONS[c]} alt={c} className="w-9 h-9 rounded-full" />
                  <span className="block font-display font-bold text-sm text-white mt-2">{c}</span>
                  <span className="block text-xs text-white/80">{CATEGORY_DESCRIPTIONS[c]}</span>
                </button>
              );
            })}
          </div>
        </StepBlock>

        {/* Step 3: Subcategoría */}
        <StepBlock num={3} title="Subcategoría" done={step3Done} locked={!step2Done}>
          <select
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className="w-full min-h-[44px] bg-[#F7F7F7] text-[#1C2A3D] rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#368CD4]"
          >
            <option value="">Elegí una opción</option>
            {category &&
              SUBCATEGORIES[category].map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
          </select>
        </StepBlock>

        {/* Step 4: Detalle */}
        <StepBlock num={4} title="Detalle" done={step4Done} locked={!step3Done}>
          <p className="text-sm text-white/90 mb-2">
            Contá qué está pasando: escribilo o grabá tu voz.
          </p>
          <textarea
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej.: Corte de luz desde las 18 hs en toda la cuadra..."
            className="w-full bg-[#F7F7F7] text-[#1C2A3D] placeholder:text-[#687B94] rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#368CD4]"
          />
          <div className="flex items-center justify-between gap-2 mt-2">
            <button
              type="button"
              onClick={handleVoiceDictation}
              className="min-h-[40px] px-3.5 py-2 rounded-full bg-black/25 hover:bg-black/35 text-xs font-display font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{listening ? 'Escuchando...' : 'Grabar con la voz'}</span>
            </button>
            {description.length >= 1600 && (
              <span className="text-xs font-mono text-white/75 tabular-nums">
                {description.length}/2000
              </span>
            )}
          </div>
          {descError && (
            <div className="mt-2 bg-[#ED1C37]/20 border border-[#ED1C37] rounded-2xl px-3.5 py-2 text-xs text-white">
              ⚠ {descError}
            </div>
          )}
          <p className="text-xs text-white/75 mt-2">
            Mínimo 10 caracteres. El sistema genera el título y el resumen limpio automáticamente.
          </p>
        </StepBlock>

        {/* Step 5: Evidencia (opcional) */}
        <StepBlock
          num={5}
          title="Evidencia (opcional)"
          done={mediaItems.length > 0}
          locked={!step4Done}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="min-h-[48px] rounded-full border-2 border-[#368CD4] bg-[#368CD4]/15 hover:bg-[#368CD4]/25 text-white font-display font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <Camera className="w-4 h-4" />
              <span>Sacar foto</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleMediaCapture}
                hidden
              />
            </label>
            <label className="min-h-[48px] rounded-full border-2 border-[#368CD4] bg-[#368CD4]/15 hover:bg-[#368CD4]/25 text-white font-display font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <Video className="w-4 h-4" />
              <span>Grabar video</span>
              <input
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleMediaCapture}
                hidden
              />
            </label>
          </div>
          <p className="text-xs text-white/80 mt-2.5">
            Solo cámara, sin galería. Podés sumar hasta 5 fotos o videos.
          </p>

          {mediaItems.length > 0 && (
            <div className="flex flex-wrap gap-2.5 mt-3">
              {mediaItems.map((m, i) => (
                <div key={m.previewUrl} className="relative w-20 h-20 rounded-xl overflow-hidden bg-black">
                  {m.type === 'video' ? (
                    <video src={m.previewUrl} className="w-full h-full object-cover" />
                  ) : (
                    <img src={m.previewUrl} alt="Evidencia" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    aria-label="Quitar archivo"
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-[#ED1C37]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </StepBlock>
      </div>

      {submitError && (
        <div className="mt-4 bg-[#ED1C37]/20 border border-[#ED1C37] rounded-2xl px-4 py-3 text-sm text-white">
          ⚠ {submitError}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="w-full min-h-[52px] rounded-full bg-[#ED1C37] hover:bg-[#D41730] text-white font-display font-bold text-base transition-colors disabled:opacity-45 disabled:pointer-events-none"
        >
          {submitting ? 'Publicando aviso...' : 'Enviar aviso'}
        </button>
        <p className="text-xs text-center text-white/85">
          Tu aviso se publica como <strong className="text-[#FFC27A]">En verificación</strong> hasta que los vecinos lo confirmen. No hay moderadores.
        </p>
      </div>

      {confirmCancelOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#253750] border border-white/15 rounded-3xl p-6 space-y-4">
            <h3 className="font-display font-bold text-lg text-white">
              ¿Querés cancelar el formulario?
            </h3>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setConfirmCancelOpen(false)}
                className="w-full min-h-[48px] rounded-full bg-[#ED1C37] text-white font-display font-bold text-sm"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-full min-h-[48px] rounded-full border border-[#368CD4] bg-[#368CD4]/15 text-white font-display font-bold text-sm"
              >
                Sí, salir
              </button>
            </div>
          </div>
        </div>
      )}

      {createdAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#368CD4] rounded-3xl p-6 text-white space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-white text-[#368CD4] flex items-center justify-center">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div>
              <p className="font-display font-extrabold text-xl leading-snug">
                Tu aviso ha sido ingresado como
              </p>
              <span className="inline-block mt-2 px-3.5 py-1 rounded-full bg-[#CF8838] text-white text-xs font-display font-bold">
                En verificación
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/95">
              Compartilo con tus vecinos para que lo confirmen entre todos: cuanto antes se sabe qué está pasando, más rápido se difunde en el barrio.
            </p>
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleShareCreated}
                className="w-full min-h-[48px] rounded-full bg-white text-[#1C2A3D] font-display font-bold text-sm inline-flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartir el aviso</span>
              </button>
              <button
                type="button"
                onClick={() => onCreated(createdAlert)}
                className="w-full min-h-[48px] rounded-full bg-white/95 text-[#1C2A3D] font-display font-bold text-sm"
              >
                Volver a la bandeja principal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepBlock({
  num,
  title,
  done,
  locked,
  children,
}: {
  num: number;
  title: string;
  done: boolean;
  locked: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative pl-11 pb-2">
      <div
        className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-display font-extrabold text-xs transition-colors ${
          done
            ? 'bg-[#CF8838] border-[#CF8838] text-white'
            : 'bg-transparent border-[#CF8838] text-[#CF8838]'
        }`}
      >
        {done ? <Check className="w-4 h-4 stroke-[3]" /> : num}
      </div>
      <div className="flex items-baseline justify-between gap-2 mb-2.5">
        <h2 className="font-display font-bold text-lg text-white">{title}</h2>
        {locked && (
          <span className="text-xs text-white/70">Completá el paso anterior para seguir</span>
        )}
      </div>
      <div className={locked ? 'opacity-40 pointer-events-none select-none' : ''}>{children}</div>
    </div>
  );
}
