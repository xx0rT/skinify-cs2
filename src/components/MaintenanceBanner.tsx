import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useSiteFlags } from '../utils/siteFlags';

/* Site-wide maintenance notice — controlled from Admin → Developer
   (sitewide flag `maintenance_banner` + editable `maintenance_text`).
   Renders as a slim amber strip above the app; no dismiss so it stays
   visible for the whole maintenance window. */
const MaintenanceBanner: React.FC = () => {
  const flags = useSiteFlags();
  if (!flags.maintenance_banner) return null;
  return (
    <div
      className="sticky top-0 z-[95] w-full bg-amber-500 text-black px-4 py-2 flex items-center justify-center gap-2 text-center"
      role="status"
    >
      <AlertTriangle size={14} strokeWidth={2.6} className="shrink-0" />
      <span className="text-[12.5px] font-bold leading-snug">
        {flags.maintenance_text?.trim() ||
          'Probíhá plánovaná údržba — některé funkce mohou být dočasně nedostupné.'}
      </span>
    </div>
  );
};

export default MaintenanceBanner;
