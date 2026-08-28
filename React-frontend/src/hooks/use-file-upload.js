import { useCallback, useRef, useState } from 'react';

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function makeFileId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function previewForFile(file) {
  if (file instanceof File && file.type?.startsWith('image/')) {
    return URL.createObjectURL(file);
  }
  return null;
}

/**
 * @param {object} options
 * @param {number} [options.maxFiles]
 * @param {number} [options.maxSize]
 * @param {string} [options.accept]
 * @param {boolean} [options.multiple]
 * @param {(items: Array<{ id: string, file: File, preview: string|null }>) => void} [options.onFilesAdded]
 */
export function useFileUpload({
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024,
  accept = '*',
  multiple = true,
  onFilesAdded,
} = {}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState([]);
  const dragCounterRef = useRef(0);

  const validateAndMap = useCallback(
    (fileList, existingCount = 0) => {
      const files = Array.from(fileList || []);
      const nextErrors = [];
      const accepted = [];

      for (const file of files) {
        if (existingCount + accepted.length >= maxFiles) {
          nextErrors.push(`Maximum of ${maxFiles} file${maxFiles === 1 ? '' : 's'} allowed.`);
          break;
        }
        if (file.size > maxSize) {
          nextErrors.push(`"${file.name}" exceeds ${formatBytes(maxSize)}.`);
          continue;
        }
        accepted.push({
          id: makeFileId(),
          file,
          preview: previewForFile(file),
        });
        if (!multiple) break;
      }

      return { accepted, nextErrors };
    },
    [maxFiles, maxSize, multiple],
  );

  const emitFiles = useCallback(
    (fileList, existingCount = 0) => {
      const { accepted, nextErrors } = validateAndMap(fileList, existingCount);
      setErrors(nextErrors);
      if (accepted.length > 0) {
        onFilesAdded?.(accepted);
      }
    },
    [onFilesAdded, validateAndMap],
  );

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      emitFiles(e.dataTransfer?.files);
    },
    [emitFiles],
  );

  const getInputProps = useCallback(
    () => ({
      type: 'file',
      accept,
      multiple: multiple && maxFiles > 1,
      onChange: (e) => {
        emitFiles(e.target.files);
        e.target.value = '';
      },
    }),
    [accept, emitFiles, maxFiles, multiple],
  );

  return [
    { isDragging, errors },
    {
      inputRef,
      openFileDialog,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      getInputProps,
    },
  ];
}
