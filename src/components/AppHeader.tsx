import { useState } from 'react';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonAlert,
  IonProgressBar,
  IonSelect,
  IonSelectOption,
  IonToggle,
  useIonToast,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { settingsOutline, layersOutline, storefrontOutline, hammerOutline, flashOutline, checkmarkCircleOutline, globeOutline } from 'ionicons/icons';
import { triggerPriceUpdate, triggerBlackMarketUpdate, triggerCraftingProfitUpdate, triggerRoyalContinentUpdate, triggerFocusProfitUpdate, getRateLimitStatus, getCraftingBonuses, getCraftingBonusCategories, setDailyBonuses, getCraftingSettings, setCraftingSettings as updateCraftingSettings } from '../services/api';
import type { RateLimitStatus, CraftingBonusResponse, CraftingSettingsResponse } from '../types';
import './AppHeader.css';

interface AppHeaderProps {
  onMaterialsUpdated?: () => void;
  onCraftingUpdated?: () => void;
  onFocusUpdated?: () => void;
  onFlipUpdated?: () => void;
  lastUpdate?: string | null;
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AppHeader: React.FC<AppHeaderProps> = ({ onMaterialsUpdated, onCraftingUpdated, onFocusUpdated, onFlipUpdated, lastUpdate }) => {
  const history = useHistory();
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | undefined>(undefined);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [updatingMaterials, setUpdatingMaterials] = useState(false);
  const [updatingBM, setUpdatingBM] = useState(false);
  const [updatingCrafting, setUpdatingCrafting] = useState(false);
  const [updatingRoyalContinent, setUpdatingRoyalContinent] = useState(false);
  const [updatingFocus, setUpdatingFocus] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    'materials' | 'blackmarket' | 'craftingProfit' | 'royal' | 'focus' | null
  >(null);
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const [craftingBonuses, setCraftingBonuses] = useState<CraftingBonusResponse | null>(null);
  const [bonusCategories, setBonusCategories] = useState<string[]>([]);
  const [dailyBonus1, setDailyBonus1] = useState<string>('');
  const [dailyBonus2, setDailyBonus2] = useState<string>('');
  const [savingDailyBonus, setSavingDailyBonus] = useState(false);
  const [craftingSettings, setCraftingSettings] = useState<CraftingSettingsResponse | null>(null);
  const [savingPremium, setSavingPremium] = useState(false);
  const [presentToast] = useIonToast();

  const dailyBonusesSet = (craftingBonuses?.dailyBonuses?.length ?? 0) >= 1;

  const handleOpenPopover = async (e: React.MouseEvent) => {
    setPopoverEvent(e.nativeEvent);
    setPopoverOpen(true);
    try {
      const [rateData, bonusData, settingsData] = await Promise.all([
        getRateLimitStatus(),
        getCraftingBonuses(),
        getCraftingSettings(),
      ]);
      setRateLimit(rateData);
      setCraftingBonuses(bonusData);
      setCraftingSettings(settingsData);
      const cats = await getCraftingBonusCategories();
      setBonusCategories(Array.isArray(cats) ? [...cats].toSorted((a, b) => a.localeCompare(b)) : []);
      const daily = bonusData.dailyBonuses ?? [];
      setDailyBonus1(daily[0]?.category ?? '');
      setDailyBonus2(daily[1]?.category ?? '');
    } catch { /* ignore */ }
  };

  const handlePremiumChange = async (premium: boolean) => {
    setSavingPremium(true);
    try {
      const updated = await updateCraftingSettings(premium);
      setCraftingSettings(updated);
      presentToast({
        message: `Tassa vendita: ${premium ? '4%' : '8%'}. Esegui «Ricalcola Black Market» (profitti) per applicare.`,
        duration: 2800,
        color: 'success',
        position: 'top',
      });
      onCraftingUpdated?.();
      onFlipUpdated?.();
    } catch {
      presentToast({ message: 'Errore nel salvataggio.', duration: 2500, color: 'danger', position: 'top' });
    } finally {
      setSavingPremium(false);
    }
  };

  const handleSaveDailyBonuses = async () => {
    const categories = [dailyBonus1, dailyBonus2].filter((c) => c && c.trim() !== '');
    if (categories.length === 0) {
      presentToast({ message: 'Seleziona almeno un bonus.', duration: 2000, color: 'warning', position: 'top' });
      return;
    }
    if (categories.length === 2 && categories[0] === categories[1]) {
      presentToast({ message: 'Seleziona due categorie diverse.', duration: 2000, color: 'warning', position: 'top' });
      return;
    }
    setSavingDailyBonus(true);
    try {
      const updated = await setDailyBonuses(categories);
      setCraftingBonuses(updated);
      presentToast({ message: 'Bonus daily salvati.', duration: 2000, color: 'success', position: 'top' });
      onCraftingUpdated?.();
    } catch {
      presentToast({ message: 'Errore nel salvataggio dei bonus daily.', duration: 2500, color: 'danger', position: 'top' });
    } finally {
      setSavingDailyBonus(false);
    }
  };

  const handleUpdateMaterials = async () => {
    setConfirmAction(null);
    setUpdatingMaterials(true);
    try {
      const result = await triggerPriceUpdate();
      presentToast({
        message: `${result.message} (${result.itemsUpdated} item)`,
        duration: 2500,
        color: 'success',
        position: 'top',
      });
      onMaterialsUpdated?.();
    } catch {
      presentToast({
        message: "Errore durante l'aggiornamento dei materiali.",
        duration: 2500,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setUpdatingMaterials(false);
    }
  };

  const handleUpdateBlackMarket = async () => {
    setConfirmAction(null);
    setUpdatingBM(true);
    try {
      const result = await triggerBlackMarketUpdate();
      presentToast({
        message: `${result.message} (${result.itemsUpdated} item)`,
        duration: 2500,
        color: 'success',
        position: 'top',
      });
    } catch {
      presentToast({
        message: "Errore durante l'aggiornamento del Black Market.",
        duration: 2500,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setUpdatingBM(false);
    }
  };

  const handleUpdateCrafting = async () => {
    setConfirmAction(null);
    setUpdatingCrafting(true);
    try {
      const result = await triggerCraftingProfitUpdate();
      presentToast({
        message: `${result.message} (${result.itemsUpdated} item)`,
        duration: 2500,
        color: 'success',
        position: 'top',
      });
      onCraftingUpdated?.();
    } catch {
      presentToast({
        message: 'Errore durante il ricalcolo dei profitti Black Market.',
        duration: 2500,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setUpdatingCrafting(false);
    }
  };

  const handleUpdateRoyalContinent = async () => {
    setConfirmAction(null);
    setUpdatingRoyalContinent(true);
    try {
      const result = await triggerRoyalContinentUpdate();
      presentToast({
        message: `${result.message} (~${result.priceRowsWritten} prezzi salvati, Focus ${result.focusItemsUpdated}).`,
        duration: 5000,
        color: 'success',
        position: 'top',
      });
      onFocusUpdated?.();
      onFlipUpdated?.();
    } catch {
      presentToast({
        message: 'Errore aggiornamento Royal Continent (timeout o rate limit?). Riprova tra qualche minuto.',
        duration: 4000,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setUpdatingRoyalContinent(false);
    }
  };

  const handleUpdateFocus = async () => {
    setConfirmAction(null);
    setUpdatingFocus(true);
    try {
      const result = await triggerFocusProfitUpdate();
      presentToast({
        message: `${result.message} (${result.itemsUpdated} item)`,
        duration: 2500,
        color: 'success',
        position: 'top',
      });
      onFocusUpdated?.();
    } catch {
      presentToast({
        message: 'Errore durante il calcolo del focus profit.',
        duration: 2500,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setUpdatingFocus(false);
    }
  };

  const updating =
    updatingMaterials || updatingBM || updatingCrafting || updatingRoyalContinent || updatingFocus;

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <button type="button" className="header-logo-wrapper" onClick={() => history.push('/home')}>
              <img src="/assets/logo_homepage.png" alt="Albus" className="header-logo" />
            </button>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={(e) => handleOpenPopover(e)}>
              <IonIcon icon={settingsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        {updating && <IonProgressBar type="indeterminate" color="primary" />}
      </IonHeader>

      <IonPopover
        isOpen={popoverOpen}
        event={popoverEvent}
        onDidDismiss={() => setPopoverOpen(false)}
        alignment="end"
        side="bottom"
        className="settings-popover"
      >
        <IonList lines="full">
          <IonItem
            button
            detail={false}
            disabled={updatingMaterials}
            onClick={() => {
              setPopoverOpen(false);
              setConfirmAction('materials');
            }}
          >
            {updatingMaterials
              ? <IonSpinner name="dots" slot="start" />
              : <IonIcon icon={layersOutline} slot="start" />}
            <IonLabel>Aggiorna Materiali</IonLabel>
          </IonItem>
          <IonItem
            button
            detail={false}
            disabled={updatingBM}
            onClick={() => {
              setPopoverOpen(false);
              setConfirmAction('blackmarket');
            }}
          >
            {updatingBM
              ? <IonSpinner name="dots" slot="start" />
              : <IonIcon icon={storefrontOutline} slot="start" />}
            <IonLabel>Aggiorna Black Market</IonLabel>
          </IonItem>
          <IonItem
            button
            detail={false}
            disabled={updatingCrafting}
            onClick={() => {
              setPopoverOpen(false);
              setConfirmAction('craftingProfit');
            }}
          >
            {updatingCrafting
              ? <IonSpinner name="dots" slot="start" />
              : <IonIcon icon={hammerOutline} slot="start" />}
            <IonLabel>Ricalcola Black Market</IonLabel>
          </IonItem>
          <IonItem
            button
            detail={false}
            disabled={updatingRoyalContinent}
            onClick={() => {
              setPopoverOpen(false);
              setConfirmAction('royal');
            }}
          >
            {updatingRoyalContinent
              ? <IonSpinner name="dots" slot="start" />
              : <IonIcon icon={globeOutline} slot="start" />}
            <IonLabel>Aggiorna Royal Continent</IonLabel>
          </IonItem>
          <IonItem
            button
            detail={false}
            disabled={updatingFocus}
            onClick={() => {
              setPopoverOpen(false);
              setConfirmAction('focus');
            }}
          >
            {updatingFocus
              ? <IonSpinner name="dots" slot="start" />
              : <IonIcon icon={flashOutline} slot="start" />}
            <IonLabel>Ricalcola Focus</IonLabel>
          </IonItem>
          <div className="settings-section settings-section-bonus">
            <div className="settings-section-header">
              <span className="settings-section-label">Bonus crafting daily</span>
              {dailyBonusesSet && craftingBonuses?.dailyBonuses && craftingBonuses.dailyBonuses.length > 0 && (
                <span className="settings-section-badge">
                  <IonIcon icon={checkmarkCircleOutline} />
                  {craftingBonuses.dailyBonuses.map((b) => b.category).join(', ')}
                </span>
              )}
            </div>
            <div className="settings-select-row">
              <div className="settings-select-group">
                <label className="settings-select-label" htmlFor="settings-bonus-1">
                  Primo bonus
                </label>
                <IonSelect
                  id="settings-bonus-1"
                  value={dailyBonus1}
                  onIonChange={(e) => setDailyBonus1(e.detail.value ?? '')}
                  placeholder="Scegli categoria"
                  interface="popover"
                  className="settings-select"
                >
                  {bonusCategories.map((c) => (
                    <IonSelectOption key={c} value={c}>{c}</IonSelectOption>
                  ))}
                </IonSelect>
              </div>
              <div className="settings-select-group">
                <label className="settings-select-label" htmlFor="settings-bonus-2">
                  Secondo (opzionale)
                </label>
                <IonSelect
                  id="settings-bonus-2"
                  value={dailyBonus2}
                  onIonChange={(e) => setDailyBonus2(e.detail.value ?? '')}
                  placeholder="Nessuno"
                  interface="popover"
                  className="settings-select"
                >
                  <IonSelectOption value="">Nessuno</IonSelectOption>
                  {bonusCategories.map((c) => (
                    <IonSelectOption key={c} value={c}>{c}</IonSelectOption>
                  ))}
                </IonSelect>
              </div>
            </div>
            <IonButton
              expand="block"
              fill="solid"
              size="small"
              className="settings-save-btn"
              disabled={savingDailyBonus || !dailyBonus1 || (!!dailyBonus2 && dailyBonus1 === dailyBonus2)}
              onClick={handleSaveDailyBonuses}
            >
              {savingDailyBonus ? <IonSpinner name="dots" /> : 'Salva bonus'}
            </IonButton>
          </div>

          <div className="settings-section settings-section-premium">
            <div className="settings-section-header">
              <span className="settings-section-label">Tassa vendita</span>
            </div>
            <div className="settings-toggle-row">
              <div className="settings-toggle-content">
                <span className="settings-toggle-title">Account Premium</span>
                <span className="settings-toggle-subtitle">
                  {craftingSettings?.premium ? 'Tassa 4%' : 'Tassa 8%'} · anche vendita BM (Flip)
                </span>
              </div>
              <div className="settings-toggle-control">
                {savingPremium ? (
                  <IonSpinner name="dots" className="settings-toggle-spinner" />
                ) : (
                  <IonToggle
                    checked={craftingSettings?.premium ?? true}
                    disabled={savingPremium}
                    onIonChange={(e) => handlePremiumChange(e.detail.checked)}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="popover-footer">
            {lastUpdate && (
              <span className="popover-last-update">
                Ultimo aggiornamento: {formatDate(lastUpdate)}
              </span>
            )}
            {rateLimit && (
              <div className="rate-limit-section">
                <div className="rate-limit-bar-track">
                  <div
                    className="rate-limit-bar-fill"
                    style={{ width: `${(rateLimit.callsRemaining / rateLimit.maxCalls) * 100}%` }}
                  />
                </div>
                <span className="rate-limit-text">
                  {rateLimit.callsRemaining}/{rateLimit.maxCalls} chiamate API
                </span>
              </div>
            )}
          </div>
        </IonList>
      </IonPopover>

      <IonAlert
        isOpen={confirmAction === 'materials'}
        onDidDismiss={() => setConfirmAction(null)}
        header="Aggiorna Materiali"
        message="Vuoi forzare l'aggiornamento dei prezzi dei materiali?"
        buttons={[
          { text: 'Annulla', role: 'cancel' },
          { text: 'Aggiorna', handler: handleUpdateMaterials },
        ]}
      />

      <IonAlert
        isOpen={confirmAction === 'blackmarket'}
        onDidDismiss={() => setConfirmAction(null)}
        header="Aggiorna Black Market"
        message="Vuoi forzare l'aggiornamento dei prezzi del Black Market? (~22 chiamate API)"
        buttons={[
          { text: 'Annulla', role: 'cancel' },
          { text: 'Aggiorna', handler: handleUpdateBlackMarket },
        ]}
      />

      <IonAlert
        isOpen={confirmAction === 'craftingProfit'}
        onDidDismiss={() => setConfirmAction(null)}
        header="Ricalcola Black Market"
        message="Vuoi forzare il ricalcolo dei profitti (craft → vendita BM) sulla tab Black Market?"
        buttons={[
          { text: 'Annulla', role: 'cancel' },
          { text: 'Ricalcola', handler: handleUpdateCrafting },
        ]}
      />

      <IonAlert
        isOpen={confirmAction === 'royal'}
        onDidDismiss={() => setConfirmAction(null)}
        header="Aggiorna Royal Continent"
        message="Scarica i prezzi per Lymhurst, Bridgewatch, Martlock, Fort Sterling, Thetford, Brecilien e Caerleon (una query API per batch su tutte le città). Poi ricalcola Focus. Può richiedere diversi minuti e molte chiamate API."
        buttons={[
          { text: 'Annulla', role: 'cancel' },
          { text: 'Avvia', handler: handleUpdateRoyalContinent },
        ]}
      />

      <IonAlert
        isOpen={confirmAction === 'focus'}
        onDidDismiss={() => setConfirmAction(null)}
        header="Ricalcola Focus"
        message="Vuoi ricalcolare i profitti con focus (RRR +28.3%)?"
        buttons={[
          { text: 'Annulla', role: 'cancel' },
          { text: 'Ricalcola', handler: handleUpdateFocus },
        ]}
      />

    </>
  );
};

export default AppHeader;
