import { useState } from 'react';
import { CheckCircle2, Edit3, ExternalLink, MapPin, Search } from 'lucide-react';
import type { Locality } from '../shared/types';
import { updateLocalityCoords } from '../lib/api';

interface LocalitiesDirectoryViewProps {
  localities: Locality[];
  onSelectLocalityFilter: (localityName: string) => void;
  onLocalityUpdated: (updated: Locality) => void;
  onToast: (msg: string) => void;
}

export function LocalitiesDirectoryView({
  localities,
  onSelectLocalityFilter,
  onLocalityUpdated,
  onToast,
}: LocalitiesDirectoryViewProps) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Locality | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const filtered = localities.filter((loc) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      loc.name.toLowerCase().includes(q) ||
      loc.abiertos.some((b) => b.toLowerCase().includes(q)) ||
      loc.cerrados.some((b) => b.toLowerCase().includes(q))
    );
  });

  const totalBarrios = localities.reduce(
    (sum, l) => sum + l.abiertos.length + l.cerrados.length,
    0
  );

  const openEdit = (loc: Locality) => {
    setEditing(loc);
    setLatInput(String(loc.lat));
    setLngInput(String(loc.lng));
    setNoteInput(loc.verificationNote || '');
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setEditError(null);
    try {
      const updated = await updateLocalityCoords(
        editing.slug,
        Number(latInput),
        Number(lngInput),
        noteInput.trim() || undefined
      );
      onLocalityUpdated(updated);
      setEditing(null);
      onToast(`Coordenadas de ${updated.name} actualizadas`);
    } catch (err) {
      setEditError((err as Error).message || 'Error al guardar coordenadas');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            Localidades y coordenadas GPS de Pilar
          </h1>
          <p className="text-sm text-white/80 mt-1">
            Tabla verificada de las 15 localidades del Partido del Pilar para ubicar avisos sin coordenada exacta.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-white/85 font-mono tabular-nums shrink-0">
          <span>{localities.length} localidades</span>
          <span aria-hidden="true">·</span>
          <span>{totalBarrios} barrios</span>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar localidad o barrio..."
          className="w-full min-h-[44px] bg-[#F7F7F7] text-[#1C2A3D] placeholder:text-[#687B94] rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#368CD4]"
        />
      </div>

      <div className="bg-[#234C7A] border border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-display font-bold uppercase tracking-wider text-white/75 bg-black/15">
                <th className="py-3.5 px-4">Localidad</th>
                <th className="py-3.5 px-4">Latitud / Longitud</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Referencia / Estado</th>
                <th className="py-3.5 px-4 text-right">Barrios</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-sm">
              {filtered.map((loc) => {
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
                const changed =
                  loc.previousLat !== null &&
                  loc.previousLng !== null &&
                  (Math.abs(loc.lat - loc.previousLat) > 0.001 ||
                    Math.abs(loc.lng - loc.previousLng) > 0.001);

                return (
                  <tr key={loc.slug} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 align-top">
                      <button
                        type="button"
                        onClick={() => onSelectLocalityFilter(loc.name)}
                        className="font-display font-bold text-white hover:text-[#9FD3FF] text-left"
                      >
                        {loc.name}
                      </button>
                      <div className="text-xs text-white/65 mt-0.5">
                        {loc.activeAlertsCount || 0} avisos activos
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top font-mono text-xs tabular-nums">
                      <div className="text-white font-semibold">
                        {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                      </div>
                      {changed && loc.previousLat !== null && loc.previousLng !== null && (
                        <div className="text-white/50 line-through mt-0.5">
                          {loc.previousLat.toFixed(4)}, {loc.previousLng.toFixed(4)}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top hidden md:table-cell text-xs text-white/85 max-w-xs">
                      <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Verificada</span>
                      </span>
                      <p className="text-white/75 mt-1">{loc.verificationNote}</p>
                    </td>

                    <td className="py-3.5 px-4 align-top text-right font-mono text-xs text-white/85 tabular-nums whitespace-nowrap">
                      <div>{loc.abiertos.length} abiertos</div>
                      <div className="text-white/60">{loc.cerrados.length} cerrados</div>
                    </td>

                    <td className="py-3.5 px-4 align-top text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[40px] min-w-[40px] px-3 py-2 rounded-xl bg-black/25 hover:bg-black/35 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                          title="Abrir en Google Maps"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#9FD3FF]" />
                          <span className="hidden sm:inline">Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => openEdit(loc)}
                          className="min-h-[40px] min-w-[40px] px-3 py-2 rounded-xl bg-[#368CD4]/25 hover:bg-[#368CD4]/40 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                          title="Ajustar coordenadas"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#253750] border border-white/15 rounded-3xl p-6 space-y-4">
            <h3 className="font-display font-bold text-xl text-white">
              Ajustar GPS: {editing.name}
            </h3>
            <p className="text-xs text-white/75">
              Pegá las coordenadas copiadas desde Google Maps dentro del Partido del Pilar.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Latitud</label>
                <input
                  type="number"
                  step="0.0001"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  className="w-full min-h-[44px] bg-[#F7F7F7] text-[#1C2A3D] rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-[#368CD4]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Longitud</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  className="w-full min-h-[44px] bg-[#F7F7F7] text-[#1C2A3D] rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-[#368CD4]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Nota de referencia
              </label>
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Ej.: Verificada sobre estación o plaza central"
                className="w-full min-h-[44px] bg-[#F7F7F7] text-[#1C2A3D] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#368CD4]"
              />
            </div>

            {editError && (
              <div className="bg-[#ED1C37]/20 border border-[#ED1C37] rounded-xl px-3 py-2 text-xs text-white">
                {editError}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={saveEdit}
                className="flex-1 min-h-[44px] rounded-full bg-[#368CD4] hover:bg-[#2E7CC0] text-white font-display font-bold text-sm disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar GPS'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 min-h-[44px] rounded-full border border-white/25 text-white font-display font-bold text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
