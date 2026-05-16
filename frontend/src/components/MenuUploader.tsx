import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';

interface PreviewFile {
  id: string;
  file: File;
  url: string;
}

interface MenuUploaderProps {
  disabled?: boolean;
  onTryExample?: () => void;
  onSubmit: (files: File[]) => void;
}

const MAX_FILES = 5;

export function MenuUploader({
  disabled = false,
  onSubmit,
  onTryExample,
}: MenuUploaderProps) {
  const [items, setItems] = useState<PreviewFile[]>([]);
  const itemsRef = useRef<PreviewFile[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const totalSize = useMemo(
    () => items.reduce((sum, item) => sum + item.file.size, 0),
    [items],
  );

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith('image/'),
      );
      if (files.length > 0) addFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, []);

  function addFiles(files: File[]) {
    if (disabled) return;
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setItems((current) => {
      const created = imageFiles.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        url: URL.createObjectURL(file),
      }));
      const next = [
        ...current,
        ...created,
      ].slice(0, MAX_FILES);

      const retainedUrls = new Set(next.map((item) => item.url));
      current.forEach((item) => {
        if (!retainedUrls.has(item.url)) URL.revokeObjectURL(item.url);
      });
      created.forEach((item) => {
        if (!retainedUrls.has(item.url)) URL.revokeObjectURL(item.url);
      });
      return next;
    });
  }

  function removeFile(id: string) {
    setItems((current) => {
      const next = current.filter((item) => item.id !== id);
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return next;
    });
  }

  function clearFiles() {
    setItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
  }

  function handleInput(files: FileList | null) {
    if (!files) return;
    addFiles(Array.from(files));
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <input
        ref={galleryInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => handleInput(event.target.files)}
      />
      <input
        ref={cameraInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => handleInput(event.target.files)}
      />

      <div
        className="flex min-h-44 flex-col items-center justify-center gap-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">图片上传</h1>
          <p className="mt-2 text-sm text-slate-600">JPG / PNG / WEBP</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={disabled}
            onClick={() => cameraInputRef.current?.click()}
          >
            拍照
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={disabled}
            onClick={() => galleryInputRef.current?.click()}
          >
            选择图片
          </button>
          {onTryExample && (
            <button
              type="button"
              className="rounded-md border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-100 disabled:cursor-not-allowed disabled:text-teal-300"
              disabled={disabled}
              onClick={onTryExample}
            >
              试用示例
            </button>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
            <span>
              {items.length}/{MAX_FILES} 张 · {(totalSize / 1024 / 1024).toFixed(1)} MB
            </span>
            <button
              type="button"
              className="text-slate-500 hover:text-slate-950"
              disabled={disabled}
              onClick={clearFiles}
            >
              清空
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {items.map((item) => (
              <div
                key={item.id}
                className="relative aspect-[4/3] overflow-hidden rounded-md border border-slate-200 bg-slate-100"
              >
                <img
                  src={item.url}
                  alt={item.file.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white"
                  disabled={disabled}
                  onClick={() => removeFile(item.id)}
                  aria-label={`移除 ${item.file.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="w-full rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={disabled || items.length === 0}
            onClick={() => onSubmit(items.map((item) => item.file))}
          >
            {disabled ? '分析中' : '上传分析'}
          </button>
        </div>
      )}
    </section>
  );
}
