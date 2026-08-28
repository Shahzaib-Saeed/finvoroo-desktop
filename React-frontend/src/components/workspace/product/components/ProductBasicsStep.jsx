import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { PRODUCT_NAME_MAX_LENGTH } from '../constants';

function Field({ label, required, error, children, className }) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label className="text-[12px] font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function ProductPhoto({
  imagePreview,
  setImageFile,
  clearImage,
  inputId,
  show,
  compact = false,
}) {
  if (!show) return null;

  return (
    <div className={cn('shrink-0', compact ? 'w-[6.5rem]' : 'w-full max-w-[11rem]')}>
      <Label className="sr-only">Product photo</Label>
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-border/70 bg-muted/25',
          compact ? 'size-[6.5rem]' : 'aspect-square w-full',
        )}
      >
        {imagePreview ? (
          <>
            <img src={imagePreview} alt="" className="size-full object-cover" />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute top-1 right-1 size-6 shadow-sm"
              onClick={clearImage}
            >
              <X className="size-3" />
            </Button>
            <label
              htmlFor={inputId}
              className="absolute inset-x-0 bottom-0 cursor-pointer bg-black/50 py-0.5 text-center text-[10px] font-medium text-white"
            >
              Change
            </label>
          </>
        ) : (
          <label
            htmlFor={inputId}
            className="flex size-full cursor-pointer flex-col items-center justify-center gap-0.5 px-1.5 text-muted-foreground transition-colors hover:bg-muted/40"
          >
            <ImagePlus className="size-4 opacity-50" />
            <span className="text-[10px] font-medium text-center leading-tight">Photo</span>
          </label>
        )}
      </div>
      <Input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setImageFile?.(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function ProductBasicsStep({
  form,
  errors,
  isEdit,
  tracks,
  saving,
  imagePreview,
  setImageFile,
  clearImage,
  inputId,
  setField,
  categorySelect,
  brandSelect,
  typeField = null,
  variant = 'default',
  /** Extra row rendered under identity on the sheet (e.g. pricing). */
  afterIdentity = null,
}) {
  const isSheet = variant === 'sheet';

  const nameField = (
    <Field label="Name" required error={errors.name}>
      <Input
        value={form.name}
        maxLength={isEdit ? undefined : PRODUCT_NAME_MAX_LENGTH}
        onChange={(e) => setField('name', e.target.value)}
        placeholder="e.g. Wireless Mouse"
        className={cn(isSheet ? 'h-9' : 'h-11 text-base font-medium')}
        autoFocus={!tracks || !isSheet}
        disabled={saving}
      />
      {!isSheet ? (
        <p className="text-[11px] text-muted-foreground text-right tabular-nums">
          {form.name.length}
          {!isEdit && ` / ${PRODUCT_NAME_MAX_LENGTH}`}
        </p>
      ) : null}
    </Field>
  );

  const idFields = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="SKU" error={errors.sku}>
        <Input
          value={form.sku}
          onChange={(e) => setField('sku', e.target.value)}
          placeholder="Auto"
          disabled={saving}
        />
      </Field>
      <Field label="Barcode">
        <Input
          value={form.barcode}
          onChange={(e) => setField('barcode', e.target.value)}
          placeholder="Optional"
          disabled={saving}
        />
      </Field>
    </div>
  );

  const classificationFields = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Category">{categorySelect}</Field>
      <Field label="Brand">{brandSelect}</Field>
    </div>
  );

  const activeToggle = (
    <div className="flex items-center gap-2">
      <Switch
        checked={form.is_active}
        onCheckedChange={(v) => setField('is_active', v)}
        disabled={saving}
        id={`${inputId}-active`}
      />
      <Label
        htmlFor={`${inputId}-active`}
        className="text-xs font-medium cursor-pointer text-foreground"
      >
        Active
      </Label>
    </div>
  );

  if (isSheet) {
    return (
      <div className="space-y-3.5">
        <div className="flex gap-3.5 items-start">
          <ProductPhoto
            compact
            show={tracks}
            imagePreview={imagePreview}
            setImageFile={setImageFile}
            clearImage={clearImage}
            inputId={inputId}
          />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">{nameField}</div>
              {activeToggle}
            </div>
            {idFields}
          </div>
        </div>

        {classificationFields}
        {typeField}
        {afterIdentity}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start">
        <ProductPhoto
          show={tracks}
          imagePreview={imagePreview}
          setImageFile={setImageFile}
          clearImage={clearImage}
          inputId={inputId}
        />
        <div className="min-w-0 flex-1 w-full space-y-3">
          {nameField}
          {idFields}
          {classificationFields}
          {typeField}
          <div className="flex items-center gap-2.5 rounded-md border border-border/60 bg-muted/20 px-3 py-2.5 w-fit">
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setField('is_active', v)}
              disabled={saving}
            />
            <Label className="text-sm font-normal cursor-pointer">Available for sale</Label>
          </div>
        </div>
      </div>
    </div>
  );
}
