import { useMemo, type FC } from 'react';
import type { TransportLoadSettings } from '../utils/refiningTransport';
import { computeRefiningTransportPlan } from '../utils/refiningTransport';

const formatKg = (n: number) =>
  n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2);

const formatPrice = (n: number) => (n !== 0 ? n.toLocaleString('it-IT') : '0');

type Props = {
  transportSettings: TransportLoadSettings;
  rawItemId: string;
  lowerItemId: string;
  rawQty: number;
  lowerQty: number;
  batchProfitSilver: number;
};

const RefiningTransportBlock: FC<Props> = ({
  transportSettings,
  rawItemId,
  lowerItemId,
  rawQty,
  lowerQty,
  batchProfitSilver,
}) => {
  const plan = useMemo(
    () =>
      computeRefiningTransportPlan(
        transportSettings,
        rawItemId,
        lowerItemId,
        rawQty,
        lowerQty,
        batchProfitSilver,
      ),
    [transportSettings, rawItemId, lowerItemId, rawQty, lowerQty, batchProfitSilver],
  );

  if (!plan) {
    return null;
  }

  return (
    <div className="refining-transport-block">
      <div className="refining-prices-title">Trasporto (stima)</div>
      <p className="refining-transport-hint">
        Max load e percentuale <strong>Porkpie</strong> da <strong>Impostazioni</strong> (salvate sul server). Pesi item come
        stima flip/mammouth (non ufficiali).
      </p>
      <ul className="refining-prices-list refining-transport-list">
        <li>
          <strong>Capacità effettiva</strong>: ~{formatKg(plan.effectiveMaxLoadKg)} kg (base{' '}
          {formatKg(transportSettings.maxLoadKg)} kg
          {plan.porkPieBonusPercentApplied !== 0 ? (
            <>
              {' '}
              + Porkpie <strong>+{plan.porkPieBonusPercentApplied}%</strong>
            </>
          ) : (
            <> (nessun bonus Porkpie)</>
          )}
          )
        </li>
        <li>
          <strong>Peso / batch</strong>: {plan.rawQty}×~{formatKg(plan.weightRawKg)} kg raw + {plan.lowerQty}×~
          {formatKg(plan.weightLowerKg)} kg semilavorato ≈ <strong>{formatKg(plan.weightPerBatchKg)} kg</strong>
        </li>
        <li>
          <strong>Batch per viaggio</strong>: <strong>{plan.maxFullBatches}</strong>
          {plan.maxFullBatches < 1 ? (
            <span> (carico supera la capacità: riduci quantità o aumenta capacità in impostazioni)</span>
          ) : null}
        </li>
        {plan.maxFullBatches >= 1 ? (
          <>
            <li>
              <strong>Compra raw</strong>: <strong>{plan.buyRawTotal.toLocaleString('it-IT')}</strong> pz (
              {plan.rawQty} × {plan.maxFullBatches} batch)
            </li>
            <li>
              <strong>Compra semilavorato</strong>: <strong>{plan.buyLowerTotal.toLocaleString('it-IT')}</strong> pz (
              {plan.lowerQty} × {plan.maxFullBatches} batch)
            </li>
            {batchProfitSilver > 0 ? (
              <li>
                <strong>Profitto stimato / viaggio</strong> (solo materiali, {plan.maxFullBatches} batch):{' '}
                <strong>+{formatPrice(plan.estimatedTripProfitSilver)}</strong>
              </li>
            ) : null}
          </>
        ) : null}
      </ul>
    </div>
  );
};

export default RefiningTransportBlock;
