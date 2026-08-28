import { useCallback, useRef, useState } from 'react';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACCEPT = 'image/jpeg,image/png,image/jpg,image/gif,image/webp,image/svg+xml';

export function SettingsLogoUpload({ preview, onChange, onRemove, disabled }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const pickFile = useCallback(
    (file) => {
      if (!file || disabled) return;
      onChange?.(file);
    },
    [disabled, onChange],
  );

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) pickFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) pickFile(file);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div
        className={cn(
          'relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/15 transition-colors',
          dragOver && 'border-primary bg-primary/5',
          preview && 'border-solid border-border bg-background',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {preview ? (
          <img src={preview} alt="Company logo preview" className="size-full object-contain p-2" />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground/60" aria-hidden />
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center gap-2 min-w-0">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-3.5" />
            {preview ? 'Replace logo' : 'Upload logo'}
          </Button>
          {preview ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
              disabled={disabled}
              onClick={() => {
                onRemove?.();
                if (inputRef.current) inputRef.current.value = '';
              }}
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Drag and drop or browse. Recommended 256×256 px or larger. PNG, JPG, WebP, SVG, or GIF.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={onInputChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
