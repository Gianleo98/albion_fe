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
import { settingsOutline, layersOutline, storefrontOutline, hammerOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { triggerPriceUpdate, triggerBlackMarketUpdate, triggerCraftingProfitUpdate, getRateLimitStatus, getCraftingBonuses, getCraftingBonusCategories, setDailyBonuses, getCraftingSettings, setCraftingSettings as updateCraftingSettings } from '../services/api';
import type { RateLimitStatus, CraftingBonusResponse, CraftingSettingsResponse } from '../types';
import './AppHeader.css';

interface AppHeaderProps {
  onMaterialsUpdated?: () => void;
  onBlackMarketUpdated?: () => void;
  onCraftingUpdated?: () => void;
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

const AppHeader: React.FC<AppHeaderProps> = ({ onMaterialsUpdated, onBlackMarketUpdated, onCraftingUpdated, lastUpdate }) => {
  const history = useHistory();
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | undefined>(undefined);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [updatingMaterials, setUpdatingMaterials] = useState(false);
  const [updatingBM, setUpdatingBM] = useState(false);
  const [updatingCrafting, setUpdatingCrafting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'materials' | 'blackmarket' | 'crafting' | null>(null);
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
        message: `Tassa vendita: ${premium ? '4%' : '8%'}. Esegui "Ricalcola Crafting" per applicare.`,
        duration: 2800,
        color: 'success',
        position: 'top',
      });
      onCraftingUpdated?.();
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
      onBlackMarketUpdated?.();
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
        message: 'Errore durante il calcolo del crafting profit.',
        duration: 2500,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setUpdatingCrafting(false);
    }
  };

  const updating = updatingMaterials || updatingBM || updatingCrafting;

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
              setConfirmAction('crafting');
            }}
          >
            {updatingCrafting
              ? <IonSpinner name="dots" slot="start" />
              : <IonIcon icon={hammerOutline} slot="start" />}
            <IonLabel>Ricalcola Crafting</IonLabel>
          </IonItem>

          <div className="daily-bonus-card">
            <div className="daily-bonus-card-title">Bonus crafting daily</div>
            {dailyBonusesSet && craftingBonuses?.dailyBonuses && craftingBonuses.dailyBonuses.length > 0 && (
              <div className="daily-bonus-badge">
                <IonIcon icon={checkmarkCircleOutline} color="success" />
                <span>Impostati: {craftingBonuses.dailyBonuses.map((b) => b.category).join(', ')}</span>
              </div>
            )}
            <div className="daily-bonus-fields">
              <IonItem lines="none" className="daily-bonus-field">
                <IonLabel position="stacked">Primo bonus</IonLabel>
                <IonSelect
                  value={dailyBonus1}
                  onIonChange={(e) => setDailyBonus1(e.detail.value ?? '')}
                  placeholder="Scegli categoria"
                  interface="popover"
                  className="daily-bonus-select"
                >
                  {bonusCategories.map((c) => (
                    <IonSelectOption key={c} value={c}>{c}</IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonItem lines="none" className="daily-bonus-field">
                <IonLabel position="stacked">Secondo (opzionale)</IonLabel>
                <IonSelect
                  value={dailyBonus2}
                  onIonChange={(e) => setDailyBonus2(e.detail.value ?? '')}
                  placeholder="Nessuno"
                  interface="popover"
                  className="daily-bonus-select"
                >
                  <IonSelectOption value="">Nessuno</IonSelectOption>
                  {bonusCategories.map((c) => (
                    <IonSelectOption key={c} value={c}>{c}</IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonButton
                expand="block"
                fill="solid"
                size="small"
                className="daily-bonus-save-btn"
                disabled={savingDailyBonus || !dailyBonus1 || (!!dailyBonus2 && dailyBonus1 === dailyBonus2)}
                onClick={handleSaveDailyBonuses}
              >
                {savingDailyBonus ? <IonSpinner name="dots" /> : 'Salva'}
              </IonButton>
            </div>
          </div>

          <div className="daily-bonus-card">
            <div className="daily-bonus-card-title">Tassa vendita (mercato)</div>
            <IonItem lines="none" className="daily-bonus-field">
              <IonLabel>
                <span>Account Premium</span>
                <p className="setting-hint">
                  {craftingSettings?.premium ? 'Tassa 4%' : 'Tassa 8%'}
                </p>
              </IonLabel>
              <IonToggle
                slot="end"
                checked={craftingSettings?.premium ?? true}
                disabled={savingPremium}
                onIonChange={(e) => handlePremiumChange(e.detail.checked)}
              />
            </IonItem>
            {savingPremium && <IonSpinner name="dots" className="premium-spinner" />}
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
        isOpen={confirmAction === 'crafting'}
        onDidDismiss={() => setConfirmAction(null)}
        header="Ricalcola Crafting"
        message="Vuoi forzare il ricalcolo dei profitti di crafting?"
        buttons={[
          { text: 'Annulla', role: 'cancel' },
          { text: 'Ricalcola', handler: handleUpdateCrafting },
        ]}
      />
    </>
  );
};

export default AppHeader;
