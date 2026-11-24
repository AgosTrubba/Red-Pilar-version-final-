import { useState } from 'react';
import { Bell, Check, UserCheck, X } from 'lucide-react';
import type { AlertItem, Locality, NeighborUser } from '../shared/types';
import { formatAlertDate, moderateClientText } from '../lib/constants';
import { markNotificationsRead, updateMyProfile } from '../lib/api';
import { StatusIndicator } from './AlertCard';

interface NeighborProfileModalProps {
  user: NeighborUser;
  myAlerts: AlertItem[];
  localities: Locality[];
  onClose: () => void;
  onUserUpdated: (user: NeighborUser) => void;
  onOpenAlert: (id: string) => void;
  onToast: (msg: string) => void;
}

export function NeighborProfileModal({
  user,
  myAlerts,
  localities,
  onClose,
  onUserUpdated,
  onOpenAlert,
  onToast,
}: NeighborProfileModalProps) {
  const [alias, setAlias] = useState(user.alias || 'Vecino de Pilar');
  const [homeLocality, setHomeLocality] = useState(user.homeLocality || '');
  const [homeBarrio, setHomeBarrio] = useState(user.homeBarrio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLocObj = localities.find((l) => l.name === homeLocality);
  const availableBarrios = selectedLocObj
    ? Array.from(new Set([...selectedLocObj.abiertos, ...selectedLocObj.cerrados])).sort((a, b) =>
        a.localeCompare(b, 'es')
      )
    : [];

  const unreadCount = user.notifications.filter((n) => !n.isRead).length;

  const handleSave = async () => {
    const modErr = moderateClientText(alias.trim());
    if (modErr) {
      setError(modErr);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        alias: alias.trim() || 'Vecino de Pilar',
        homeLocality: homeLocality || null,
        homeBarrio: homeBarrio || null,
      });
      onUserUpdated(updated);
      onToast('Preferencias guardadas');
    } catch (err) {
      setError((err as Error).message || 'No pudimos guardar tus preferencias');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkRead = async () => {
    try {
      const updated = await markNotificationsRead();
      onUserUpdated(updated);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto bg-[#253750] border border-white/15 rounded-3xl p-6 space-y-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display font-extrabold text-xl">Tu perfil vecinal</h2>
            <p className="text-xs text-white/75 mt-0.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Acceso abierto sin inicio de sesión obligatorio</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="min-h-[40px] min-w-[40px] rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-[#1D2D42] rounded-2xl p-4 font-mono tabular-nums">
          <div>
            <div className="text-xs text-white/65">Avisos publicados</div>
            <div className="text-2xl font-bold mt-0.5">{user.stats.alertsCount}</div>
          </div>
          <div>
            <div className="text-xs text-white/65">Votos realizados</div>
            <div className="text-2xl font-bold mt-0.5">{user.stats.votesCount}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1">
              Nombre o alias visible en aportes
            </label>
            <input
              type="text"
              maxLength={40}
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="w-full min-h-[44px] bg-[#F7F7F7] text-[#1C2A3D] rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#368CD4]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">
                Tu localidad habitual
              </label>
              <select
                value={homeLocality}
                onChange={(e) => {
                  setHomeLocality(e.target.value);
                  setHomeBarrio('');
                }}
                className="w-full min-h-[44px] bg-[#F7F7F7] text-[#1C2A3D] rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#368CD4]"
              >
                <option value="">Todas las localidades</option>
                {localities.map((l) => (
                  <option key={l.slug} value={l.name}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">Tu barrio</label>
              <select
                value={homeBarrio}
                disabled={!homeLocality}
                onChange={(e) => setHomeBarrio(e.target.value)}
                className="w-full min-h-[44px] bg-[#F7F7F7] text-[#1C2A3D] rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#368CD4] disabled:opacity-50"
              >
                <option value="">Elegí un barrio</option>
                {availableBarrios.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-[#ED1C37]/20 border border-[#ED1C37] rounded-xl px-3 py-2 text-xs">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="w-full min-h-[44px] rounded-full bg-[#368CD4] hover:bg-[#2E7CC0] text-white font-display font-bold text-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar preferencias'}
          </button>
        </div>

        {/* Notifications */}
        <div className="pt-4 border-t border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#F2C94C]" />
              <span>Notificaciones ({unreadCount} sin leer)</span>
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkRead}
                className="text-xs text-[#9FD3FF] hover:underline inline-flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Marcar leídas</span>
              </button>
            )}
          </div>

          {user.notifications.length === 0 ? (
            <p className="text-xs text-white/65">No tenés notificaciones recientes.</p>
          ) : (
            <div className="space-y-2">
              {user.notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-2xl p-3 text-xs ${
                    n.isRead ? 'bg-black/15 text-white/75' : 'bg-[#368CD4]/25 border border-[#368CD4]'
                  }`}
                >
                  <p>{n.message}</p>
                  <p className="text-[11px] opacity-65 mt-1">{formatAlertDate(n.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Own alerts */}
        <div className="pt-4 border-t border-white/10 space-y-2.5">
          <h3 className="font-display font-bold text-sm">Mis avisos recientes</h3>
          {myAlerts.length === 0 ? (
            <p className="text-xs text-white/65">Todavía no publicaste avisos desde este dispositivo.</p>
          ) : (
            <div className="space-y-2">
              {myAlerts.slice(0, 6).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAlert(a.id);
                  }}
                  className="w-full min-h-[48px] bg-black/20 hover:bg-black/30 rounded-2xl p-3 flex items-center justify-between gap-2 text-left"
                >
                  <div className="min-w-0">
                    <div className="font-display font-semibold text-sm truncate">{a.title}</div>
                    <div className="text-[11px] text-white/65">
                      {a.zone} · {formatAlertDate(a.createdAt)}
                    </div>
                  </div>
                  <StatusIndicator status={a.status} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
