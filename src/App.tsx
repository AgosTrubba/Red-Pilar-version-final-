import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Phone, Search, Trash2 } from 'lucide-react';
import type { AlertItem, EmergencyContact, Locality, NeighborUser } from './shared/types';
import { CATEGORIES, DATE_FILTERS, STATUSES, STATUS_META } from './lib/constants';
import {
  fetchAlertDetail,
  fetchAlerts,
  fetchContacts,
  fetchLocalities,
  fetchMyProfile,
  initNeighborSession,
  markNotificationsRead,
} from './lib/api';
import { ZoneSelector } from './components/ZoneSelector';
import { AlertCard } from './components/AlertCard';
import { AlertDetailView } from './components/AlertDetailView';
import { AlertFormView } from './components/AlertFormView';
import { LocalitiesDirectoryView } from './components/LocalitiesDirectoryView';
import { ContactsDrawer } from './components/ContactsDrawer';
import { NeighborProfileModal } from './components/NeighborProfileModal';

type ActiveView = 'home' | 'detail' | 'form' | 'localities';

export default function App() {
  const [view, setView] = useState<ActiveView>('home');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{ alert: AlertItem; nearby: AlertItem[] } | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const [user, setUser] = useState<NeighborUser | null>(null);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState('');
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedLocality, setSelectedLocality] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [hoursFilter, setHoursFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Overlays
  const [contactsOpen, setContactsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileAlerts, setProfileAlerts] = useState<AlertItem[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [unreadAlertNotice, setUnreadAlertNotice] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 2600);
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    setLoadError(null);
    try {
      const items = await fetchAlerts({
        q: query.trim() || undefined,
        zones: selectedZones,
        locality: selectedLocality || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        hours: hoursFilter || undefined,
      });
      setAlerts(items);
    } catch (err) {
      setLoadError((err as Error).message || 'Error al cargar los avisos');
    } finally {
      setLoadingAlerts(false);
    }
  }, [query, selectedZones, selectedLocality, categoryFilter, statusFilter, hoursFilter]);

  // Initial bootstrap
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const [sessionUser, locs, contactList] = await Promise.all([
          initNeighborSession(),
          fetchLocalities(),
          fetchContacts(),
        ]);
        if (cancelled) return;
        setUser(sessionUser);
        setLocalities(locs);
        setContacts(contactList);

        const unread = sessionUser.notifications.filter((n) => !n.isRead);
        if (unread.length > 0) {
          setUnreadAlertNotice(unread.map((u) => u.message).join(' '));
        }

        const hashMatch = window.location.hash.match(/aviso=([a-zA-Z0-9_-]+)/);
        if (hashMatch) {
          openAlertDetail(hashMatch[1]);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError((err as Error).message || 'No pudimos conectar con el servidor');
        }
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const openAlertDetail = async (id: string) => {
    setSelectedAlertId(id);
    setView('detail');
    setDetailLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const data = await fetchAlertDetail(id);
      setDetailData(data);
    } catch (err) {
      showToast((err as Error).message || 'No encontramos ese aviso');
      setView('home');
      setSelectedAlertId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openProfile = async () => {
    setProfileOpen(true);
    try {
      const data = await fetchMyProfile();
      setUser(data.user);
      setProfileAlerts(data.alerts);
    } catch {
      // keep existing user state
    }
  };

  const dismissUnreadNotice = async () => {
    setUnreadAlertNotice(null);
    try {
      const updated = await markNotificationsRead();
      setUser(updated);
    } catch {
      // ignore
    }
  };

  const resetFilters = () => {
    setQuery('');
    setSelectedZones([]);
    setSelectedLocality('');
    setCategoryFilter('');
    setHoursFilter('');
    setStatusFilter('');
  };

  const hasActiveFilters = Boolean(
    query || selectedZones.length || selectedLocality || categoryFilter || hoursFilter || statusFilter
  );

  const unreadNotifCount = user?.notifications.filter((n) => !n.isRead).length || 0;

  return (
    <div className="min-h-screen bg-[#1B2A3E] text-white flex flex-col">
      {/* Top Bar Contract: 3 zones (Wordmark — Nav links — 1 Primary CTA) */}
      <header className="sticky top-0 z-40 bg-[#1B2A3E]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-16 py-2 flex items-center justify-between gap-2 sm:gap-8">
          <button
            type="button"
            onClick={() => {
              setView('home');
              setSelectedAlertId(null);
            }}
            className="flex flex-col items-start text-left min-w-0 shrink"
          >
            <span className="font-display font-extrabold text-2xl tracking-tight text-white leading-none whitespace-nowrap">
              Red <span className="text-[#ED1C37]">Pilar</span>
            </span>
            <span className="text-[10px] sm:text-xs font-display font-semibold tracking-wide text-[#9FD3FF] leading-tight mt-0.5">
              Vecinos informados, comunidad más segura
            </span>
          </button>

          <nav className="flex items-center gap-4 sm:gap-6 text-sm font-medium text-white/80">
            <button
              type="button"
              onClick={openProfile}
              className="whitespace-nowrap shrink-0 py-2 transition-colors hover:text-white"
            >
              Mi perfil{unreadNotifCount > 0 ? ` (${unreadNotifCount})` : ''}
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setContactsOpen(true)}
              className="min-h-[42px] px-4 py-2 rounded-full bg-black/25 hover:bg-black/35 border border-white/15 text-white font-display font-semibold text-xs sm:text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
            >
              <Phone className="w-4 h-4 text-[#9FD3FF]" />
              <span className="hidden sm:inline">Teléfonos de emergencia</span>
              <span className="sm:hidden">Emergencias</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {view === 'home' && (
          <div className="space-y-6">
            {/* Hero intro */}
            <div className="pb-2 border-b border-white/10">
              <h1 className="font-display font-bold text-lg sm:text-xl text-white [text-wrap:balance]">
                Alertas vecinales de Pilar en tiempo real
              </h1>
            </div>

            {/* Desktop 2-column split: Toolbar + Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
              <aside className="space-y-3 lg:sticky lg:top-20">
                <button
                  type="button"
                  onClick={() => {
                    setView('form');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full min-h-[48px] px-5 py-2.5 rounded-full bg-[#ED1C37] hover:bg-[#D41730] text-white font-display font-bold text-base flex items-center justify-center transition-colors"
                >
                  Agregar alerta
                </button>

                <div className="relative">
                  <Search className="w-[18px] h-[18px] text-[#368CD4] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar"
                    className="w-full min-h-[46px] bg-[#F7F7F7] text-[#1C2A3D] placeholder:text-[#525E6E] rounded-full pl-11 pr-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[#368CD4]"
                  />
                </div>

                <ZoneSelector
                  localities={localities}
                  multi={true}
                  selected={selectedZones}
                  emptyMultiLabel="Zona"
                  pill={true}
                  onChange={(next) => {
                    setSelectedZones(next);
                    if (next.length > 0) setSelectedLocality('');
                  }}
                />

                <div className="grid grid-cols-3 gap-2">
                  <div className="relative">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      aria-label="Categoría"
                      className="w-full min-h-[42px] appearance-none bg-[#F7F7F7] text-[#1C2A3D] rounded-full pl-3.5 pr-7 py-2 text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#368CD4] truncate"
                    >
                      <option value="">Categoría</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#1C2A3D] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select
                      value={hoursFilter}
                      onChange={(e) => setHoursFilter(e.target.value)}
                      aria-label="Fecha"
                      className="w-full min-h-[42px] appearance-none bg-[#F7F7F7] text-[#1C2A3D] rounded-full pl-3.5 pr-7 py-2 text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#368CD4] truncate"
                    >
                      <option value="">Fecha</option>
                      {DATE_FILTERS.map((f) => (
                        <option key={f.hours} value={String(f.hours)}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#1C2A3D] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      aria-label="Estado"
                      className="w-full min-h-[42px] appearance-none bg-[#F7F7F7] text-[#1C2A3D] rounded-full pl-3.5 pr-7 py-2 text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#368CD4] truncate"
                    >
                      <option value="">Estado</option>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_META[s].dot} {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#1C2A3D] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {selectedLocality && (
                  <div className="flex items-center justify-between bg-[#368CD4]/25 border border-[#368CD4] rounded-full px-4 py-2 text-xs">
                    <span>
                      Localidad: <strong>{selectedLocality}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedLocality('')}
                      className="underline font-semibold"
                    >
                      Quitar
                    </button>
                  </div>
                )}

                {hasActiveFilters && (
                  <div className="flex justify-end px-1">
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-xs font-semibold text-[#9FD3FF] hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </aside>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display font-bold text-lg text-white">Últimos avisos</h2>
                  <span className="text-xs text-white/75 font-mono tabular-nums">
                    {loadingAlerts ? 'Cargando...' : `${alerts.length} avisos`}
                  </span>
                </div>

                {loadError && (
                  <div className="bg-[#ED1C37]/20 border border-[#ED1C37] rounded-2xl p-4 text-sm">
                    {loadError}
                  </div>
                )}

                {!loadingAlerts && alerts.length === 0 ? (
                  <div className="bg-[#234C7A] border border-white/10 rounded-3xl p-8 text-center space-y-3">
                    <p className="text-sm text-white/85">
                      No hay avisos que coincidan con esos filtros.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="min-h-[44px] px-5 py-2 rounded-full bg-[#368CD4] text-white font-display font-bold text-sm"
                      >
                        Ver todos los avisos
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                    {alerts.map((alert) => (
                      <AlertCard key={alert.id} alert={alert} onSelect={openAlertDetail} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {view === 'detail' && (
          <div>
            {detailLoading || !detailData ? (
              <div className="bg-[#234C7A] rounded-3xl p-8 text-center text-sm text-white/80">
                Cargando detalle del aviso...
              </div>
            ) : (
              <AlertDetailView
                alert={detailData.alert}
                nearby={detailData.nearby}
                currentUserId={user?.id || ''}
                onBack={() => {
                  setView('home');
                  setSelectedAlertId(null);
                  loadAlerts();
                }}
                onSelectAlert={openAlertDetail}
                onUpdated={(updated) => {
                  setDetailData((prev) => (prev ? { ...prev, alert: updated } : null));
                  loadAlerts();
                }}
                onDeletedByCommunity={(msg) => {
                  showToast(msg);
                  setView('home');
                  setSelectedAlertId(null);
                  loadAlerts();
                }}
                onDeletedByOwner={() => {
                  showToast('Aviso eliminado');
                  setView('home');
                  setSelectedAlertId(null);
                  loadAlerts();
                }}
                onToast={showToast}
              />
            )}
          </div>
        )}

        {view === 'form' && (
          <AlertFormView
            localities={localities}
            onCancel={() => setView('home')}
            onCreated={() => {
              setView('home');
              loadAlerts();
            }}
            onToast={showToast}
          />
        )}

        {view === 'localities' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setView('home')}
              className="min-h-[44px] px-4 py-2 rounded-full bg-black/25 hover:bg-black/35 text-sm font-display font-semibold inline-flex items-center gap-2 transition-colors"
            >
              ← Volver a los avisos
            </button>
            <LocalitiesDirectoryView
              localities={localities}
              onSelectLocalityFilter={(locName) => {
                setSelectedZones([]);
                setSelectedLocality(locName);
                setView('home');
              }}
              onLocalityUpdated={(updated) => {
                setLocalities((prev) =>
                  prev.map((l) => (l.slug === updated.slug ? updated : l))
                );
              }}
              onToast={showToast}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/60 px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <span>Red Pilar · Red colaborativa de vecinos de Pilar, Buenos Aires</span>
        <span className="hidden sm:inline" aria-hidden="true">·</span>
        <button
          type="button"
          onClick={() => {
            setView('localities');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="text-white/75 hover:text-white underline underline-offset-4"
        >
          Localidades y coordenadas GPS
        </button>
      </footer>

      {contactsOpen && (
        <ContactsDrawer contacts={contacts} onClose={() => setContactsOpen(false)} />
      )}

      {profileOpen && user && (
        <NeighborProfileModal
          user={user}
          myAlerts={profileAlerts}
          localities={localities}
          onClose={() => setProfileOpen(false)}
          onUserUpdated={(updated) => setUser(updated)}
          onOpenAlert={(id) => openAlertDetail(id)}
          onToast={showToast}
        />
      )}

      {unreadAlertNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#368CD4] rounded-3xl p-6 text-white space-y-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <p className="font-display font-bold text-base leading-snug">{unreadAlertNotice}</p>
            <button
              type="button"
              onClick={dismissUnreadNotice}
              className="w-full min-h-[48px] rounded-full bg-white text-[#1C2A3D] font-display font-bold text-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-xl border border-white/15">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
