import { useState, type FormEvent } from 'react';
import { useI18n } from '../../i18n';
import { Button } from './Button';
import { Sheet } from './Sheet';

interface PasswordDialogProps {
  roomName: string;
  onSubmit: (password: string | null) => void;
}

/** Substitui o `prompt()` nativo, que é feio e bloqueante no celular. */
export const PasswordDialog = ({ roomName, onSubmit }: PasswordDialogProps) => {
  const { t } = useI18n();
  const [value, setValue] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value) onSubmit(value);
  };

  return (
    <Sheet
      open
      onClose={() => onSubmit(null)}
      title={t('passwordFor', { room: roomName })}
      closeLabel={t('close')}
    >
      <form onSubmit={submit} className="flex flex-col gap-3 p-4">
        <input
          type="password"
          autoFocus
          autoComplete="off"
          placeholder={t('password')}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border-2 border-slate-600 bg-black p-3 text-2xl text-white outline-none focus:border-balatro-gold"
        />
        <div className="flex gap-2">
          <Button variant="neutral" block onClick={() => onSubmit(null)}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="gold" block disabled={!value}>
            {t('confirm')}
          </Button>
        </div>
      </form>
    </Sheet>
  );
};
