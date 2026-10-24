/**
 * Builds a parameterised `SET a = $1, b = $2` clause from an allowlist of column names.
 * Column names never come from the request, so unknown keys are ignored instead of
 * being injected into SQL (or crashing the query with "column does not exist").
 */
export function buildUpdate(
  body: Record<string, any>,
  allowed: readonly string[],
  opts: { extra?: string[]; startAt?: number } = {}
): { setClause: string; values: any[] } | null {
  const sets: string[] = [];
  const values: any[] = [];
  let n = opts.startAt ?? 1;
  for (const column of allowed) {
    if (body[column] === undefined) continue;
    sets.push(`${column} = $${n++}`);
    values.push(body[column]);
  }
  if (sets.length === 0) return null;
  return { setClause: [...sets, ...(opts.extra || [])].join(', '), values };
}

/** Product columns an admin may edit */
export const PRODUCT_FIELDS = [
  'name', 'description', 'price', 'original_price', 'discount_percentage', 'image_url', 'additional_images',
  'stock_quantity', 'sku', 'gender', 'category', 'is_customizable', 'customization_price',
  'max_customization_characters', 'max_customization_images', 'max_customization_lines',
  'is_active', 'has_colors', 'has_sizes', 'social_proof_enabled', 'social_proof_text',
  'social_proof_initial_count', 'social_proof_end_count',
] as const;

/**
 * INSERT counterpart of buildUpdate: allowed client fields first, then server-controlled
 * values (e.g. used_count: 0) that always win over anything the client sent.
 */
export function buildInsert(
  body: Record<string, any>,
  allowed: readonly string[],
  serverValues: Record<string, any> = {}
): { columns: string; placeholders: string; values: any[] } | null {
  const cols: string[] = [];
  const values: any[] = [];
  for (const column of allowed) {
    if (body[column] === undefined || column in serverValues) continue;
    cols.push(column);
    values.push(body[column]);
  }
  if (cols.length === 0) return null;
  for (const [column, value] of Object.entries(serverValues)) {
    cols.push(column);
    values.push(value);
  }
  return { columns: cols.join(', '), placeholders: values.map((_, i) => `$${i + 1}`).join(', '), values };
}

export const CATEGORY_FIELDS = [
  'name', 'description', 'icon', 'icon_type', 'image_url', 'color', 'hover_effect', 'display_order', 'gender', 'is_active',
] as const;

export const COUPON_FIELDS = [
  'code', 'description', 'discount_type', 'discount_value', 'min_order_amount', 'max_discount_amount',
  'usage_limit', 'per_user_limit', 'start_date', 'end_date', 'applicable_categories', 'is_active',
] as const;

export const LOGO_FIELDS = ['logo_url', 'favicon_url', 'start_date', 'end_date', 'is_active', 'notes'] as const;

export const POPUP_FIELDS = [
  'title', 'description', 'image_url', 'discount_text', 'discount_value', 'timer_enabled', 'timer_hours',
  'timer_minutes', 'timer_seconds', 'offer_text', 'cta_text', 'cta_link', 'cash_on_delivery_text',
  'prepaid_discount_text', 'is_active', 'display_frequency', 'start_date', 'end_date',
] as const;

export const COLOR_FIELDS = [
  'color_name', 'color_code', 'image_url', 'additional_images', 'stock_quantity', 'price_modifier', 'is_active', 'display_order',
] as const;

export const SIZE_FIELDS = ['size_name', 'size_code', 'stock_quantity', 'price_modifier', 'is_active', 'display_order'] as const;
