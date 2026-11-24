import { useState } from 'react';
import { ArrowLeft, CheckCircle2, MessageSquare, Share2, Trash2 } from 'lucide-react';
import type { AlertItem, VoteOption } from '../shared/types';
import {
  CATEGORY_ICONS,
  STATUS_META,
  VOTE_OPTIONS,
  formatAlertDate,
  moderateClientText,
} from '../lib/constants';
import { castAlertVote, deleteAlertById } from '../lib/api';
import { GoogleLocationCard } from './GoogleLocationCard';
import { StatusIndicator, renderLinkedText } from './AlertCard';

interface AlertDetailViewProps {
  alert: AlertItem;
  nearby: AlertItem[];
  currentUserId: string;
  onBack: () => void;
  onSelectAlert: (id: string) => void;
  onUpdated: (updated: AlertItem) => void;
  onDeletedByCommunity: (message: string) => void;
  onDeletedByOwner: () => void;
  onToast: (msg: string) => void;
}

export function AlertDetailView({
  alert,
  nearby,
  currentUserId,
  onBack,
  onSelectAlert,
  onUpdated,
  onDeletedByCommunity,
  onDeletedByOwner,
  onToast,
}: AlertDetailViewProps) {
  const [comment, setComment] = useState(alert.myVote?.comment || '');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const statusMeta = STATUS_META[alert.status];
  const isOwner = alert.ownerId === currentUserId;
  const canDelete = isOwner && alert.status === 'En verificación';

  const handleShare = async () => {
    const shareUrl = `${window.location.href.split('#')[0]}#aviso=${alert.id}`;
    const shareTitle = `${alert.title} — Red Pilar`;
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
        return;
      } catch {
        // user cancelled share sheet or unsupported
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      onToast('Link del aviso copiado');
    } catch {
      onToast('Compartí el enlace desde tu navegador');
    }
  };

  const handleVote = async (option: VoteOption) => {
    const trimmed = comment.trim();
    const modError = moderateClientText(trimmed);
    if (modError) {
      setCommentError(modError);
      return;
    }
    setCommentError(null);
    setSubmittingVote(true);
    try {
      const res = await castAlertVote(alert.id, option, trimmed);
      if (res.deletedByCommunity) {
        onDeletedByCommunity('El aviso fue eliminado porque la mayoría de los vecinos votó que no era cierto.');
        return;
      }
      if (res.alert) {
        onUpdated(res.alert);
        onToast('Tu voto fue guardado');
      }
    } catch (err) {
      setCommentError((err as Error).message || 'No pudimos registrar tu voto');
    } finally {
      setSubmittingVote(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAlertById(alert.id);
      setConfirmDeleteOpen(false);
      onDeletedByOwner();
    } catch (err) {
      onToast((err as Error).message || 'No pudimos eliminar el aviso');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-4 py-2 rounded-full bg-black/25 hover:bg-black/35 text-sm font-display font-semibold inline-flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="min-h-[44px] px-4 py-2 rounded-full bg-black/25 hover:bg-black/35 text-sm font-display font-semibold inline-flex items-center gap-2 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span>Compartir</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 items-start">
        {/* Left main column */}
        <div className="space-y-5">
          <div className="bg-[#234C7A] rounded-3xl p-5 sm:p-6 border border-white/10">
            <div className="flex items-center gap-3">
              <img
                src={CATEGORY_ICONS[alert.category]}
                alt={alert.category}
                className="w-11 h-11 rounded-full shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-display font-bold tracking-wider uppercase text-[#9FD3FF]">
                  {alert.category}
                </p>
                <p className="text-xs text-white/75 truncate">
                  {alert.zone}, {alert.locality} · {formatAlertDate(alert.createdAt)}
                </p>
              </div>
            </div>

            <h1 className="font-display font-extrabold text-2xl sm:text-3xl leading-tight text-white mt-4 [text-wrap:balance]">
              {alert.title}
            </h1>

            <p className="text-[15px] leading-relaxed text-white/95 mt-3">
              {renderLinkedText(alert.description)}
            </p>

            <div
              className="mt-5 rounded-2xl p-4 sm:p-5"
              style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
            >
              <div className="text-[11px] font-display font-bold tracking-wider uppercase opacity-90">
                Estado del aviso
              </div>
              <div className="font-display font-extrabold text-2xl mt-0.5">{statusMeta.headline}</div>
              <p className="text-sm mt-1 opacity-95">{statusMeta.summary}</p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold font-mono tabular-nums">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{alert.totalVotes} votos de vecinos</span>
              </div>
            </div>

            {alert.media.length > 0 && (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {alert.media.map((m) =>
                  m.mediaType === 'video' ? (
                    <video
                      key={m.id}
                      src={m.url}
                      controls
                      className="w-full max-h-72 rounded-2xl bg-black object-cover"
                    />
                  ) : (
                    <img
                      key={m.id}
                      src={m.url}
                      alt={alert.title}
                      className="w-full max-h-72 rounded-2xl object-cover bg-[#1A3352]"
                    />
                  )
                )}
              </div>
            )}
          </div>

          {/* Community voting card */}
          <section className="bg-[#234C7A] rounded-3xl p-5 sm:p-6 border border-white/10">
            <h2 className="font-display font-bold text-lg text-white">Confirmá este aviso</h2>
            <p className="text-xs text-white/80 mt-1">
              Sin moderadores: el estado cambia automáticamente según la mayoría de los votos vecinos.
            </p>

            <div className="mt-4">
              <input
                type="text"
                value={comment}
                maxLength={140}
                onChange={(e) => {
                  setComment(e.target.value);
                  setCommentError(moderateClientText(e.target.value));
                }}
                placeholder="¿Querés agregar una aclaración? (opcional)"
                className="w-full min-h-[44px] bg-[#F7F7F7] text-[#1C2A3D] placeholder:text-[#687B94] rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#368CD4]"
              />
              {commentError && (
                <div className="mt-2 bg-[#ED1C37]/20 border border-[#ED1C37] rounded-2xl px-3.5 py-2 text-xs text-white">
                  ⚠ {commentError}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5">
              {VOTE_OPTIONS.map((opt) => {
                const isSelected = alert.myVote?.option === opt.key;
                const count = alert.votes[opt.key] || 0;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={submittingVote}
                    onClick={() => handleVote(opt.key)}
                    style={
                      isSelected
                        ? {
                            backgroundColor: opt.activeBg,
                            color: opt.activeText,
                            borderColor: opt.activeBg,
                          }
                        : undefined
                    }
                    className={`min-h-[48px] px-4 py-3 rounded-2xl border-2 flex items-center justify-between gap-2 text-sm font-display font-semibold transition-colors ${
                      isSelected
                        ? 'shadow-md'
                        : 'bg-black/25 border-transparent text-white hover:bg-black/35'
                    } disabled:opacity-50`}
                  >
                    <span>{opt.label}</span>
                    <span className="font-mono font-bold tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-5 border-t border-white/10">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-[#9FD3FF]" />
                <span>Últimos aportes</span>
              </h3>
              {alert.comments.length === 0 ? (
                <p className="text-xs text-white/70">Todavía no hay aportes de vecinos.</p>
              ) : (
                <div className="space-y-2">
                  {alert.comments.map((cm) => (
                    <div
                      key={cm.id}
                      className="bg-black/20 rounded-2xl px-3.5 py-2.5 text-sm text-white/95"
                    >
                      <p>{cm.text}</p>
                      <p className="text-[11px] text-white/60 mt-1">
                        {cm.authorAlias} · {formatAlertDate(cm.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {canDelete && (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="w-full min-h-[48px] rounded-full border-2 border-[#ED1C37] bg-[#ED1C37]/10 hover:bg-[#ED1C37]/20 text-white font-display font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar aviso</span>
            </button>
          )}
        </div>

        {/* Right sidebar column: Location card + Nearby alerts */}
        <div className="space-y-5 lg:sticky lg:top-20">
          <GoogleLocationCard
            zone={alert.zone}
            locality={alert.locality}
            lat={alert.effectiveLat}
            lng={alert.effectiveLng}
            hasExactCoords={alert.hasExactCoords}
          />

          {nearby.length > 0 && (
            <section className="bg-[#234C7A] rounded-3xl p-4 sm:p-5 border border-white/10">
              <h2 className="font-display font-bold text-base text-white mb-3">
                Otras alertas en {alert.locality}
              </h2>
              <div className="space-y-2.5">
                {nearby.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onSelectAlert(n.id)}
                    className="w-full min-h-[56px] bg-black/20 hover:bg-black/30 rounded-2xl p-3 flex items-center gap-3 text-left transition-colors"
                  >
                    <img
                      src={CATEGORY_ICONS[n.category]}
                      alt={n.category}
                      className="w-9 h-9 rounded-full shrink-0"
                    />
                    <span className="font-display font-semibold text-xs sm:text-sm text-white flex-1 line-clamp-2">
                      {n.title}
                    </span>
                    <StatusIndicator status={n.status} />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#253750] border border-white/15 rounded-3xl p-6 space-y-4">
            <h3 className="font-display font-bold text-lg text-white">
              ¿Seguro que querés eliminar este aviso?
            </h3>
            <p className="text-sm text-white/80">Podés volver a crearlo en cualquier momento.</p>
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="w-full min-h-[48px] rounded-full bg-[#ED1C37] hover:bg-[#D41730] text-white font-display font-bold text-sm transition-colors disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="w-full min-h-[48px] rounded-full border border-[#368CD4] bg-[#368CD4]/15 hover:bg-[#368CD4]/25 text-white font-display font-bold text-sm transition-colors"
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
