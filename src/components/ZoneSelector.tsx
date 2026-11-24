import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin, Search, X } from 'lucide-react';
import type { Locality } from '../shared/types';

interface ZoneSelectorProps {
  localities: Locality[];
  multi: boolean;
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyMultiLabel?: string;
  pill?: boolean;
}

export function ZoneSelector({
  localities,
  multi,
  selected,
  onChange,
  placeholder = 'Seleccioná barrio o zona',
  emptyMultiLabel = 'Todas las zonas',
  pill = false,
}: ZoneSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 20);
    } else {
      setQuery('');
    }
  }, [open]);

  const barrioOccurrences = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const loc of localities) {
      for (const b of [...loc.abiertos, ...loc.cerrados]) {
        counts[b] = (counts[b] || 0) + 1;
      }
    }
    return counts;
  }, [localities]);

  const filteredGroups = useMemo(() => {
    const k = query.trim().toLowerCase();
    return localities
      .map((loc) => {
        const filterArr = (arr: string[]) =>
          Array.from(new Set(arr))
            .sort((a, b) => a.localeCompare(b, 'es'))
            .filter(
              (b) => !k || b.toLowerCase().includes(k) || loc.name.toLowerCase().includes(k)
            );
        return {
          locality: loc.name,
          abiertos: filterArr(loc.abiertos),
          cerrados: filterArr(loc.cerrados),
        };
      })
      .filter((g) => g.abiertos.length > 0 || g.cerrados.length > 0);
  }, [localities, query]);

  const buttonLabel = useMemo(() => {
    if (selected.length === 0) {
      return multi ? emptyMultiLabel : placeholder;
    }
    if (selected.length === 1) {
      return selected[0].split('|')[0];
    }
    return `${selected.length} zonas`;
  }, [selected, multi, emptyMultiLabel, placeholder]);

  const toggleItem = (val: string) => {
    if (multi) {
      const next = selected.includes(val)
        ? selected.filter((x) => x !== val)
        : [...selected, val];
      onChange(next);
    } else {
      onChange([val]);
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full min-h-[46px] bg-[#F7F7F7] text-[#1C2A3D] ${
          pill ? 'rounded-full px-4' : 'rounded-2xl px-4'
        } py-2.5 text-[15px] font-normal flex items-center justify-between gap-2 text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#368CD4]`}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5 min-w-0 truncate">
          <MapPin className="w-[18px] h-[18px] shrink-0 text-[#368CD4]" />
          <span
            className={`truncate ${
              selected.length === 0 ? 'text-[#525E6E]' : 'text-[#1C2A3D] font-medium'
            }`}
          >
            {buttonLabel}
          </span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {multi && selected.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onChange([]);
                }
              }}
              className="p-1 rounded-full hover:bg-slate-200 text-slate-500"
              aria-label="Limpiar zonas"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-[#1C2A3D] transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-[#F7F7F7] text-[#1C2A3D] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="p-2.5 border-b border-slate-200 bg-white">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribí para buscar una zona o localidad..."
                className="w-full min-h-[40px] bg-slate-100 text-[#1C2A3D] rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#368CD4]"
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-200/70">
            {filteredGroups.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">Sin resultados para esa búsqueda</p>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.locality}>
                  <div className="sticky top-0 z-10 bg-[#E4E9F0] px-3.5 py-1.5 text-xs font-bold text-[#1C2A3D] font-display">
                    {group.locality}
                  </div>

                  {group.abiertos.length > 0 && (
                    <div>
                      <div className="px-3.5 pt-2 pb-1 text-[10px] font-bold tracking-wider text-[#368CD4] uppercase">
                        Barrios abiertos
                      </div>
                      {group.abiertos.map((b) => {
                        const val = `${b}|${group.locality}`;
                        const active = selected.includes(val);
                        return (
                          <button
                            key={`a-${val}`}
                            type="button"
                            onClick={() => toggleItem(val)}
                            className="w-full min-h-[44px] px-3.5 py-2 flex items-center gap-2.5 text-sm text-left hover:bg-[#E8EEF6] transition-colors"
                          >
                            <span
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                active
                                  ? 'bg-[#368CD4] border-[#368CD4] text-white'
                                  : 'border-slate-400 bg-white'
                              }`}
                            >
                              {active && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                            <span className="truncate">{b}</span>
                            {barrioOccurrences[b] > 1 && (
                              <span className="ml-auto text-[11px] text-[#687B94] shrink-0">
                                {group.locality}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {group.cerrados.length > 0 && (
                    <div>
                      <div className="px-3.5 pt-2 pb-1 text-[10px] font-bold tracking-wider text-[#368CD4] uppercase">
                        Barrios cerrados
                      </div>
                      {group.cerrados.map((b) => {
                        const val = `${b}|${group.locality}`;
                        const active = selected.includes(val);
                        return (
                          <button
                            key={`c-${val}`}
                            type="button"
                            onClick={() => toggleItem(val)}
                            className="w-full min-h-[44px] px-3.5 py-2 flex items-center gap-2.5 text-sm text-left hover:bg-[#E8EEF6] transition-colors"
                          >
                            <span
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                active
                                  ? 'bg-[#368CD4] border-[#368CD4] text-white'
                                  : 'border-slate-400 bg-white'
                              }`}
                            >
                              {active && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                            <span className="truncate">{b}</span>
                            {barrioOccurrences[b] > 1 && (
                              <span className="ml-auto text-[11px] text-[#687B94] shrink-0">
                                {group.locality}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
