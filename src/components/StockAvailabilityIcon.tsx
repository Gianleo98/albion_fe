import { IonIcon } from '@ionic/react';
import {
  archiveOutline,
  fileTrayFullOutline,
  fileTrayOutline,
  fileTrayStackedOutline,
} from 'ionicons/icons';
import type { AvailabilityLevelCode } from '../types';

const ICONS: Record<AvailabilityLevelCode, typeof fileTrayOutline> = {
  NONE: fileTrayOutline,
  LOW: fileTrayFullOutline,
  MEDIUM: fileTrayStackedOutline,
  HIGH: archiveOutline,
};

const FALLBACK_LABEL: Record<AvailabilityLevelCode, string> = {
  NONE: 'Non impostato',
  LOW: 'Basso',
  MEDIUM: 'Medio',
  HIGH: 'Alto',
};

function normalizeLevel(raw: string | undefined | null): AvailabilityLevelCode {
  const u = (raw || 'NONE').toUpperCase();
  if (u === 'LOW' || u === 'MEDIUM' || u === 'HIGH') return u;
  return 'NONE';
}

type StockAvailabilityIconProps = Readonly<{
  level?: string | null;
  /** Es. etichetta dal backend; usata per title e accessibilità */
  label?: string | null;
  /** chip = badge; inline = form modale; titleRow = stessa riga titolo (flash/prezzo), solo icona */
  variant?: 'chip' | 'inline' | 'titleRow';
  className?: string;
}>;

/**
 * Stock: sempre icona — vuoto (vassoio vuoto), basso, medio, alto (archivio pieno).
 */
export function StockAvailabilityIcon({
  level,
  label,
  variant = 'chip',
  className = '',
}: StockAvailabilityIconProps) {
  const code = normalizeLevel(level);
  const icon = ICONS[code];
  const aria = label?.trim() || FALLBACK_LABEL[code];
  const tip = `Stock: ${aria}`;
  const rootClass = [
    'cp-stock-chip',
    `cp-stock-chip--${code.toLowerCase()}`,
    variant === 'inline' ? 'cp-stock-chip--inline' : '',
    variant === 'titleRow' ? 'cp-stock-chip--title-row' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={rootClass}
      title={tip}
      role="img"
      aria-label={tip}
    >
      <IonIcon icon={icon} className="cp-stock-chip__icon" aria-hidden />
    </span>
  );
}
