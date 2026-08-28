import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MedicineThumb } from './MedicineThumb';
import { uploadMedicineImage } from '../lib/upload-medicine-image';

/**
 * Thumbnail that doubles as optional photo upload for a medicine.
 */
export function MedicineImageQuickAdd({
  productId,
  imageUrl,
  alt = '',
  size = 'md',
  onUploaded,
  className,
  editable = true,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !productId) return;
    setBusy(true);
    try {
      const saved = await uploadMedicineImage(productId, file);
      const url = saved?.image_url || saved?.image || null;
      onUploaded?.(url, saved);
      toast.success('Photo saved');
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('relative shrink-0', className)}>
      <MedicineThumb src={imageUrl} alt={alt} size={size} />
      {editable && productId ? (
        <>
          <button
            type="button"
            title={imageUrl ? 'Replace photo' : 'Add photo'}
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className={cn(
              'absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full',
              'border border-border bg-background text-muted-foreground shadow-sm',
              'hover:text-foreground hover:border-primary/40 transition-colors',
              busy && 'opacity-70',
            )}
          >
            {busy ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <ImagePlus className="size-3" />
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={onPick}
          />
        </>
      ) : null}
    </div>
  );
}
