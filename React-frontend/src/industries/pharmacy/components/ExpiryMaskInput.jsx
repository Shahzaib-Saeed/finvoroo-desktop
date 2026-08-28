import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { expiryDisplayMask, formatExpiryMaskInput } from '../lib/expiry-mask';

/**
 * Pharmacy expiry cell — masked MM/YY entry (e.g. 12/26).
 */
export function ExpiryMaskInput({ value, onChange, onBlur, className, ...props }) {
  const display = expiryDisplayMask(value);

  const handleChange = (e) => {
    onChange?.(formatExpiryMaskInput(e.target.value));
  };

  const handleBlur = (e) => {
    const masked = expiryDisplayMask(formatExpiryMaskInput(e.target.value));
    if (masked !== expiryDisplayMask(value)) onChange?.(masked);
    onBlur?.(e);
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={5}
      placeholder={props.placeholder ?? 'MM/YY'}
      className={cn(className)}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
