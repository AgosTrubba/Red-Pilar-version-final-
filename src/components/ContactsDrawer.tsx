import { MessageCircle, Phone, X } from 'lucide-react';
import type { EmergencyContact } from '../shared/types';

interface ContactsDrawerProps {
  contacts: EmergencyContact[];
  onClose: () => void;
}

export function ContactsDrawer({ contacts, onClose }: ContactsDrawerProps) {
  const emergencies = contacts.filter((c) => c.group === 'Emergencias');
  const services = contacts.filter((c) => c.group === 'Municipio y Servicios');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-[#F7F7F7] text-[#1C2A3D] rounded-3xl p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="font-display font-extrabold text-lg text-[#1C2A3D]">
              Contactos útiles de Pilar
            </h2>
            <p className="text-xs text-[#687B94]">Emergencias, municipio y servicios públicos</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar contactos"
            className="min-h-[44px] min-w-[44px] rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          <div>
            <h3 className="font-display font-bold text-[11px] uppercase tracking-wider text-[#ED1C37] mb-2">
              Emergencias
            </h3>
            <div className="divide-y divide-slate-200 rounded-2xl bg-white border border-slate-200 overflow-hidden">
              {emergencies.map((c) => (
                <a
                  key={c.id}
                  href={c.href}
                  className="min-h-[52px] px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="w-9 h-9 rounded-full bg-[#ED1C37]/10 text-[#ED1C37] flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-sm text-[#1C2A3D]">{c.name}</div>
                    <div className="text-xs text-[#687B94]">{c.detail}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display font-bold text-[11px] uppercase tracking-wider text-[#368CD4] mb-2">
              Municipio y servicios
            </h3>
            <div className="divide-y divide-slate-200 rounded-2xl bg-white border border-slate-200 overflow-hidden">
              {services.map((c) => (
                <a
                  key={c.id}
                  href={c.href}
                  target={c.channel === 'whatsapp' ? '_blank' : undefined}
                  rel={c.channel === 'whatsapp' ? 'noopener noreferrer' : undefined}
                  className="min-h-[52px] px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="w-9 h-9 rounded-full bg-[#368CD4]/10 text-[#368CD4] flex items-center justify-center shrink-0">
                    {c.channel === 'whatsapp' ? (
                      <MessageCircle className="w-4 h-4" />
                    ) : (
                      <Phone className="w-4 h-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-sm text-[#1C2A3D]">{c.name}</div>
                    <div className="text-xs text-[#687B94]">{c.detail}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
