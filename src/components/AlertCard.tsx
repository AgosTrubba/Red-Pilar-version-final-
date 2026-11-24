import { Fragment } from 'react';
import { CheckCircle2, Clock, Film, HelpCircle, AlertTriangle } from 'lucide-react';
import type { AlertItem, AlertStatus } from '../shared/types';
import { CATEGORY_ICONS, STATUS_META, formatAlertDate } from '../lib/constants';

export function renderLinkedText(text: string) {
  const parts = text.split(/(https:\/\/[^\s<]+)/g);
  return parts.map((part, idx) => {
    if (/^https:\/\/[^\s<]+$/.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="underline break-all text-[#B8E1FF] hover:text-white"
        >
          {part}
        </a>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

export function StatusIndicator({ status }: { status: AlertStatus }) {
  const meta = STATUS_META[status];
  const Icon =
    status === 'Confirmado'
      ? CheckCircle2
      : status === 'En proceso'
        ? Clock
        : status === 'Terminado'
          ? CheckCircle2
          : AlertTriangle;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-bold whitespace-nowrap shrink-0"
      style={{ backgroundColor: meta.bg, color: meta.text }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{status}</span>
    </span>
  );
}

interface AlertCardProps {
  alert: AlertItem;
  onSelect: (id: string) => void;
}

export function AlertCard({ alert, onSelect }: AlertCardProps) {
  const firstMedia = alert.media[0];

  return (
    <article
      onClick={() => onSelect(alert.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(alert.id);
        }
      }}
      className="group bg-[#234C7A] hover:bg-[#28568A] border border-white/10 rounded-3xl p-4 sm:p-5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#368CD4]"
    >
      <div className="flex items-start gap-3.5">
        <img
          src={CATEGORY_ICONS[alert.category]}
          alt={alert.category}
          className="w-11 h-11 rounded-full shrink-0 bg-[#1B3A5E]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/75">
            <span className="font-semibold text-[#9FD3FF]">{alert.category}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{alert.zone}, {alert.locality}</span>
          </div>
          <h3 className="font-display font-bold text-[17px] leading-snug text-white mt-1 group-hover:text-[#D9EEFF] transition-colors">
            {alert.title}
          </h3>
          <p className="text-xs text-white/65 mt-1 font-mono tabular-nums">
            {formatAlertDate(alert.createdAt)}
          </p>
        </div>
      </div>

      <p className="text-sm text-white/90 leading-relaxed mt-3 line-clamp-3">
        {renderLinkedText(alert.description)}
      </p>

      {firstMedia && (
        <div className="mt-3 rounded-2xl overflow-hidden bg-[#1A3554] border border-white/10 relative">
          {firstMedia.mediaType === 'video' ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-white/85">
              <Film className="w-4 h-4 text-[#9FD3FF]" />
              <span>Video adjunto ({alert.media.length} archivo{alert.media.length > 1 ? 's' : ''})</span>
            </div>
          ) : (
            <img
              src={firstMedia.url}
              alt={alert.title}
              className="w-full max-h-52 object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
        <span className="text-xs text-white/75 flex items-center gap-1.5 font-mono tabular-nums">
          <HelpCircle className="w-3.5 h-3.5 text-white/55" />
          <span>{alert.totalVotes} votos vecinales</span>
        </span>
        <StatusIndicator status={alert.status} />
      </div>
    </article>
  );
}
