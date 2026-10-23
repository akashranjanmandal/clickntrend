import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, ChevronLeft, ChevronRight, Camera, Type, Image as ImageIcon,
  Trash2, Loader2, ShoppingBag, Pencil, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CustomizationData, Product } from '../types';
import { getImageUrl, formatCurrency } from '../utils/helpers';
import { publicFetch } from '../utils/apiFetch';

/** One customizable line of the combo. `key` is the item's index in the combo. */
export interface WizardItem {
  key: number;
  product: Product;
  quantity: number;
  imageUrl?: string;
}

interface DraftImage {
  id: string;
  preview: string;   // object URL while uploading, then the uploaded URL
  url?: string;      // set once uploaded
  uploading: boolean;
}

export interface ItemDraft {
  textLines: string[];
  images: DraftImage[];
}

export type WizardDrafts = Record<number, ItemDraft>;

interface Props {
  items: WizardItem[];
  drafts: WizardDrafts;
  onDraftsChange: (drafts: WizardDrafts) => void;
  totalPrice: number;
  onClose: () => void;
  onComplete: (customizations: Record<number, CustomizationData>) => void;
}

const emptyDraft = (product: Product): ItemDraft => ({
  textLines: Array(Math.max(product.max_customization_lines || 0, 0)).fill(''),
  images: [],
});

/** What a product still needs before it can be added (same rules as single products). */
export const missingFor = (product: Product, draft?: ItemDraft): string[] => {
  const missing: string[] = [];
  const maxLines = product.max_customization_lines || 0;
  const maxImages = product.max_customization_images || 0;
  if (maxLines > 0 && !(draft?.textLines || []).some(l => l.trim())) missing.push('text');
  if (maxImages > 0 && !(draft?.images || []).some(i => i.url)) missing.push('photo');
  return missing;
};

export const draftToCustomization = (draft: ItemDraft): CustomizationData => {
  const text = draft.textLines.map(l => l.trim()).filter(Boolean);
  const urls = draft.images.filter(i => i.url).map(i => i.url!) ;
  return {
    text_lines: text.length ? text : undefined,
    image_urls: urls.length ? urls : undefined,
    image_paths: urls,
    preview_urls: urls,
  };
};

const ComboCustomizationWizard: React.FC<Props> = ({
  items, drafts, onDraftsChange, totalPrice, onClose, onComplete,
}) => {
  const hasReview = items.length > 1;
  const lastStep = hasReview ? items.length : items.length - 1;
  const firstIncomplete = items.findIndex(it => missingFor(it.product, drafts[it.key]).length > 0);
  const [step, setStep] = useState(firstIncomplete >= 0 ? firstIncomplete : lastStep);
  const [direction, setDirection] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const isReview = hasReview && step === items.length;
  const item = !isReview ? items[step] : undefined;
  const draft = item ? (drafts[item.key] || emptyDraft(item.product)) : undefined;
  const anyUploading = Object.values(drafts).some(d => d.images.some(i => i.uploading));

  // Always merge into the latest drafts (uploads finish asynchronously)
  const updateDraft = (key: number, product: Product, change: (d: ItemDraft) => ItemDraft) => {
    const current = draftsRef.current;
    const next = { ...current, [key]: change(current[key] || emptyDraft(product)) };
    draftsRef.current = next;
    onDraftsChange(next);
  };

  const goTo = (target: number) => {
    setDirection(target > step ? 1 : -1);
    setShowErrors(false);
    setStep(target);
  };

  const handleNext = () => {
    if (item) {
      if (draft!.images.some(i => i.uploading)) { toast('Please wait — photos are still uploading'); return; }
      if (missingFor(item.product, draft).length > 0) { setShowErrors(true); return; }
    }
    if (step < lastStep) { goTo(step + 1); return; }
    finish();
  };

  const finish = () => {
    if (anyUploading) { toast('Please wait — photos are still uploading'); return; }
    const incomplete = items.findIndex(it => missingFor(it.product, drafts[it.key]).length > 0);
    if (incomplete >= 0) { goTo(incomplete); setShowErrors(true); return; }
    const result: Record<number, CustomizationData> = {};
    items.forEach(it => { result[it.key] = draftToCustomization(drafts[it.key] || emptyDraft(it.product)); });
    onComplete(result);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!item || !files || files.length === 0) return;
    const { product, key } = item;
    const maxImages = product.max_customization_images || 0;
    const room = maxImages - (draft?.images.length || 0);
    const picked = Array.from(files).filter(f => {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name} is not an image`); return false; }
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} is larger than 10 MB`); return false; }
      return true;
    });
    if (picked.length > room) toast.error(`Only ${room} more photo${room === 1 ? '' : 's'} allowed for this item`);
    const toUpload = picked.slice(0, Math.max(room, 0));
    if (toUpload.length === 0) return;

    const pending = toUpload.map(file => ({
      file,
      image: { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, preview: URL.createObjectURL(file), uploading: true } as DraftImage,
    }));
    updateDraft(key, product, d => ({ ...d, images: [...d.images, ...pending.map(p => p.image)] }));
    setShowErrors(false);

    await Promise.all(pending.map(async ({ file, image }, i) => {
      try {
        const fd = new FormData();
        fd.append('image', file);
        fd.append('product_id', product.id);
        fd.append('index', String(i));
        const res = await publicFetch('/api/upload/customization', { method: 'POST', body: fd, headers: {} });
        const url = res.image_url || res.url;
        if (!url) throw new Error('Upload failed');
        updateDraft(key, product, d => ({
          ...d,
          images: d.images.map(im => im.id === image.id ? { ...im, url, preview: url, uploading: false } : im),
        }));
      } catch (err: any) {
        toast.error(`Couldn't upload ${file.name}. Please try again.`);
        updateDraft(key, product, d => ({ ...d, images: d.images.filter(im => im.id !== image.id) }));
      } finally {
        URL.revokeObjectURL(image.preview);
      }
    }));
  };

  const content = (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-premium-charcoal/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white w-full sm:max-w-3xl h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        role="dialog" aria-modal="true" aria-label="Personalise your combo"
      >
        {/* Header + progress */}
        <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-premium-gold font-semibold">
                {isReview ? 'Final check' : `Item ${step + 1} of ${items.length}`}
              </p>
              <h2 className="font-serif text-xl sm:text-2xl text-premium-charcoal mt-0.5">
                {isReview ? 'Review your personalisation' : item!.product.name}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 text-gray-500" aria-label="Close (your progress is kept)">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {items.map((it, i) => {
              const done = missingFor(it.product, drafts[it.key]).length === 0;
              const active = i === step;
              return (
                <button
                  key={it.key}
                  onClick={() => goTo(i)}
                  className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border text-xs whitespace-nowrap transition-all ${
                    active ? 'border-premium-gold bg-premium-cream text-premium-charcoal shadow-sm'
                      : done ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className="relative">
                    <img src={getImageUrl(it.imageUrl || it.product.image_url)} alt="" className="h-6 w-6 rounded-full object-cover" />
                    {done && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-white">
                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span className="max-w-[120px] truncate">{it.product.name}</span>
                </button>
              );
            })}
            {hasReview && (
              <button
                onClick={() => goTo(items.length)}
                className={`px-3 py-1 rounded-full border text-xs whitespace-nowrap ${isReview ? 'border-premium-gold bg-premium-cream' : 'border-gray-200 text-gray-500'}`}
              >
                Review
              </button>
            )}
          </div>
          <div className="mt-3 h-1 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-premium-gold to-amber-400"
              animate={{ width: `${((step + 1) / (lastStep + 1)) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="p-5 sm:p-7"
            >
              {isReview ? (
                <div className="space-y-3">
                  {items.map((it, i) => {
                    const d = drafts[it.key];
                    const text = (d?.textLines || []).filter(l => l.trim());
                    return (
                      <div key={it.key} className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/60">
                        <img src={getImageUrl(it.imageUrl || it.product.image_url)} alt="" className="h-16 w-16 rounded-xl object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-premium-charcoal truncate">{it.product.name}{it.quantity > 1 && <span className="text-gray-400"> × {it.quantity}</span>}</p>
                            <button onClick={() => goTo(i)} className="flex items-center gap-1 text-xs text-premium-gold hover:text-premium-burgundy flex-shrink-0">
                              <Pencil className="h-3 w-3" /> Edit
                            </button>
                          </div>
                          {text.length > 0 && (
                            <p className="text-sm text-gray-600 mt-1">“{text.join(' / ')}”</p>
                          )}
                          {(d?.images || []).length > 0 && (
                            <div className="flex gap-1.5 mt-2">
                              {d!.images.map(im => <img key={im.id} src={im.preview} alt="" className="h-10 w-10 rounded-lg object-cover border" />)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <ItemEditor
                  item={item!}
                  draft={draft!}
                  showErrors={showErrors}
                  onText={(idx, value) => updateDraft(item!.key, item!.product, d => {
                    const lines = [...d.textLines]; lines[idx] = value; return { ...d, textLines: lines };
                  })}
                  onRemoveImage={id => updateDraft(item!.key, item!.product, d => ({ ...d, images: d.images.filter(im => im.id !== id) }))}
                  onPickFiles={() => fileInputRef.current?.click()}
                  onDropFiles={handleFiles}
                />
              )}
            </motion.div>
          </AnimatePresence>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
          />
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-7 py-4 border-t border-gray-100 bg-white flex items-center gap-3">
          <button
            onClick={() => (step === 0 ? onClose() : goTo(step - 1))}
            className="flex items-center gap-1 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" /> {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={handleNext}
            disabled={anyUploading && step === lastStep}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-premium-charcoal text-white font-medium hover:bg-black transition-colors disabled:opacity-60"
          >
            {step === lastStep ? (
              anyUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading photos…</>
                : <><ShoppingBag className="h-4 w-4" /> Add combo to cart · {formatCurrency(totalPrice)}</>
            ) : (
              <>
                <span className="truncate">
                  {step + 1 < items.length ? `Next: ${items[step + 1].product.name}` : 'Review'}
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(content, document.body);
};

interface EditorProps {
  item: WizardItem;
  draft: ItemDraft;
  showErrors: boolean;
  onText: (index: number, value: string) => void;
  onRemoveImage: (id: string) => void;
  onPickFiles: () => void;
  onDropFiles: (files: FileList | null) => void;
}

const ItemEditor: React.FC<EditorProps> = ({ item, draft, showErrors, onText, onRemoveImage, onPickFiles, onDropFiles }) => {
  const { product } = item;
  const maxLines = product.max_customization_lines || 0;
  const maxImages = product.max_customization_images || 0;
  const maxChars = product.max_customization_characters || 50;
  const missing = missingFor(product, draft);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="grid sm:grid-cols-[200px_1fr] gap-6">
      <div className="space-y-3">
        <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
          <img
            src={getImageUrl(item.imageUrl || product.image_url)}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={e => { e.currentTarget.src = '/logo.png'; }}
          />
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          {[maxLines > 0 && `up to ${maxLines} line${maxLines > 1 ? 's' : ''} of text`, maxImages > 0 && `up to ${maxImages} photo${maxImages > 1 ? 's' : ''}`]
            .filter(Boolean).join(' and ').replace(/^./, c => c.toUpperCase())} for this item.
          {item.quantity > 1 && ` Applies to all ${item.quantity} pieces.`}
        </p>
      </div>

      <div className="space-y-6">
        {showErrors && missing.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Please add {missing.map(m => (m === 'text' ? 'your text' : 'at least one photo')).join(' and ')} to continue.</span>
          </div>
        )}

        {maxImages > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-premium-charcoal">
                <ImageIcon className="h-4 w-4 text-premium-gold" /> Your photos
              </h3>
              <span className="text-xs text-gray-400">{draft.images.length}/{maxImages}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {draft.images.map(im => (
                <div key={im.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group">
                  <img src={im.preview} alt="" className="w-full h-full object-cover" />
                  {im.uploading ? (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  ) : (
                    <button
                      onClick={() => onRemoveImage(im.id)}
                      className="absolute top-1 right-1 p-1.5 rounded-full bg-white/90 text-red-600 shadow sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {draft.images.length < maxImages && (
                <button
                  onClick={onPickFiles}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); onDropFiles(e.dataTransfer.files); }}
                  className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
                    dragging ? 'border-premium-gold bg-premium-cream' : showErrors && missing.includes('photo') ? 'border-red-300 text-red-500' : 'border-gray-200 text-gray-500 hover:border-premium-gold hover:text-premium-gold'
                  }`}
                >
                  <Camera className="h-5 w-5" />
                  Add photo
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">JPG, PNG or WebP · up to 10 MB each · uploads instantly</p>
          </section>
        )}

        {maxLines > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-premium-charcoal mb-2">
              <Type className="h-4 w-4 text-premium-gold" /> Your text
            </h3>
            <div className="space-y-2">
              {draft.textLines.map((line, idx) => (
                <div key={idx} className="relative">
                  <input
                    type="text"
                    value={line}
                    maxLength={maxChars}
                    onChange={e => onText(idx, e.target.value)}
                    placeholder={maxLines > 1 ? `Line ${idx + 1}` : 'Your message'}
                    className={`w-full pl-4 pr-14 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-premium-gold/30 focus:border-premium-gold ${
                      showErrors && missing.includes('text') && idx === 0 ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">{line.length}/{maxChars}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ComboCustomizationWizard;
