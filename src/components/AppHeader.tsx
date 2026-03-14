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
  useIonToast,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { settingsOutline, layersOutline, storefrontOutline, hammerOutline } from 'ionicons/icons';
import { triggerPriceUpdate, triggerBlackMarketUpdate, triggerCraftingProfitUpdate, getRateLimitStatus } from '../services/api';
import type { RateLimitStatus } from '../types';
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
  const [presentToast] = useIonToast();

  const handleOpenPopover = async (e: React.MouseEvent) => {
    setPopoverEvent(e.nativeEvent);
    setPopoverOpen(true);
    try {
      const data = await getRateLimitStatus();
      setRateLimit(data);
    } catch { /* ignore */ }
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
