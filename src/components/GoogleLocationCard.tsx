import { useEffect, useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';

interface GoogleLocationCardProps {
  zone: string;
  locality: string;
  lat: number;
  lng: number;
  hasExactCoords: boolean;
}

export function GoogleLocationCard({
  zone,
  locality,
  lat,
  lng,
  hasExactCoords,
}: GoogleLocationCardProps) {
  const [mapFailed, setMapFailed] = useState(false);

  const embedUrl = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  const externalUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  useEffect(() => {
    setMapFailed(false);

    const handleCspViolation = (event: SecurityPolicyViolationEvent) => {
      const blocked = `${event.blockedURI || ''} ${event.violatedDirective || ''}`.toLowerCase();
      if (blocked.includes('google.com') || blocked.includes('frame')) {
        setMapFailed(true);
      }
    };

    window.addEventListener('securitypolicyviolation', handleCspViolation);
    return () => {
      window.removeEventListener('securitypolicyviolation', handleCspViolation);
    };
  }, [lat, lng]);

  return (
    <section className="bg-[#234C7A] rounded-3xl p-4 border border-white/10">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-display font-bold text-sm text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#F2C94C] shrink-0" />
          <span>Ubicación</span>
        </h2>
        <span className="font-mono text-[11px] text-white/70 tabular-nums">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </span>
      </div>

      {!mapFailed ? (
        <div className="relative h-[220px] rounded-2xl overflow-hidden bg-[#1D3A5C] border border-white/10">
          <iframe
            src={embedUrl}
            title={`Mapa de Google Maps en ${zone}, ${locality}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            onError={() => setMapFailed(true)}
            className="w-full h-full border-0"
          />
        </div>
      ) : (
        <div className="rounded-2xl bg-[#1A3352] border border-white/10 p-5 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#368CD4]/25 flex items-center justify-center text-[#7CC4FA]">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="font-display font-bold text-base text-white">
              {zone}, {locality}
            </p>
            <p className="font-mono text-xs text-white/70 mt-0.5 tabular-nums">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          </div>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[48px] bg-[#368CD4] hover:bg-[#2E7CC0] text-white font-display font-bold text-sm rounded-2xl px-5 py-3 inline-flex items-center justify-center gap-2 transition-colors"
          >
            <span>Abrir en Google Maps</span>
            <ExternalLink className="w-4 h-4 shrink-0" />
          </a>
        </div>
      )}

      {!hasExactCoords && (
        <p className="text-xs font-medium text-amber-200/90 mt-2.5 px-1">
          Ubicación aproximada (centro de la zona)
        </p>
      )}

      {!mapFailed && (
        <div className="mt-3 flex items-center justify-between gap-3 px-1">
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[40px] inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-[#9FD3FF] underline underline-offset-4"
          >
            <span>Abrir en Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
          <button
            type="button"
            onClick={() => setMapFailed(true)}
            className="text-xs text-white/65 hover:text-white transition-colors"
          >
            ¿No se ve el mapa?
          </button>
        </div>
      )}
    </section>
  );
}
