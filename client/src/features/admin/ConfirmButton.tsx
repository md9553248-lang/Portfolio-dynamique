import { useState } from 'react';
import { Button } from '../../components/ui';

interface ConfirmButtonProps {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  busy?: boolean;
  disabled?: boolean;
}

/**
 * Bouton de suppression en deux temps : un premier clic demande confirmation, le second exécute.
 * Évite les suppressions accidentelles sans recourir à une fenêtre modale.
 */
export function ConfirmButton({ label, confirmLabel, onConfirm, busy = false, disabled = false }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button variant="secondary" size="sm" disabled={disabled || busy} onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  }

  return (
    <span role="group" aria-label="Confirmation" style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <Button
        size="sm"
        loading={busy}
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setArmed(false)}>
        Annuler
      </Button>
    </span>
  );
}
