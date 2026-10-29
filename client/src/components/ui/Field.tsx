import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Field.module.css';

interface ControlA11yProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  required?: boolean;
  className?: string;
  children: (controlProps: ControlA11yProps) => ReactNode;
}

/** Enveloppe commune : libellé, aide, message d'erreur et attributs d'accessibilité reliés. */
export function Field({ label, hint, error, id, required, className, children }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={controlId} className={styles.label}>
        {label}
        {required && (
          <span aria-hidden="true" className={styles.required}>
            {' '}
            *
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {children({
        id: controlId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface SharedFieldProps {
  label: string;
  hint?: string;
  error?: string;
  fieldClassName?: string;
}

type TextFieldProps = SharedFieldProps & Omit<ComponentPropsWithoutRef<'input'>, 'className'>;

export function TextField({
  label,
  hint,
  error,
  fieldClassName,
  id,
  required,
  ...inputProps
}: TextFieldProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      id={id}
      required={required}
      className={fieldClassName}
    >
      {(a11y) => <input {...inputProps} {...a11y} required={required} className={styles.control} />}
    </Field>
  );
}

type TextAreaFieldProps = SharedFieldProps &
  Omit<ComponentPropsWithoutRef<'textarea'>, 'className'>;

export function TextAreaField({
  label,
  hint,
  error,
  fieldClassName,
  id,
  required,
  rows = 5,
  ...textareaProps
}: TextAreaFieldProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      id={id}
      required={required}
      className={fieldClassName}
    >
      {(a11y) => (
        <textarea
          {...textareaProps}
          {...a11y}
          rows={rows}
          required={required}
          className={cx(styles.control, styles.textarea)}
        />
      )}
    </Field>
  );
}
