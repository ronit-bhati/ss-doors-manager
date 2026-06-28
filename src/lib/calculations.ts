// Doors / Windows
// Output is ALWAYS in sqft, regardless of input unit.
// The formula just changes whether we divide by 144 (sq-inches -> sqft)
// or not (sq-feet -> sqft, already there).
export function calculateDoorItemValue({
  height,
  width,
  quantity,
  unit
}: {
  height: number;
  width: number;
  quantity: number;
  unit: string;
}): number {
  const rawArea = height * width * quantity;
  return unit === 'inches' ? rawArea / 144 : rawArea;
}

// Chaukhats / Moulding / FixGote
// A chaukhat has 3 sides: two verticals (height) + one top (width).
// No bottom threshold side on a door frame.
// Output is ALWAYS in running feet, regardless of input unit.
// If input unit is inches, we convert running inches to running feet by dividing by 12.
export function calculateChaukhatItemValue({
  height,
  width,
  quantity,
  unit
}: {
  height: number;
  width: number;
  quantity: number;
  unit: string;
}): number {
  const lengthPerItem = height + height + width;
  const rawLength = lengthPerItem * quantity;
  return unit === 'inches' ? rawLength / 12 : rawLength;
}

// Dispatcher - routes to the correct formula based on item_type.
export function calculateItemValue(item: {
  item_type: string;
  height: number;
  width: number;
  quantity: number;
  unit: string;
}): number {
  if (item.item_type === 'door_window') return calculateDoorItemValue(item);
  if (
    item.item_type === 'chaukhat' ||
    item.item_type === 'railing' ||
    item.item_type === 'fix_gola' ||
    item.item_type === 'moulding'
  ) {
    return calculateChaukhatItemValue(item);
  }
  throw new Error(`Unknown item_type: ${item.item_type}`);
}

interface SummaryItem {
  item_type: string;
  calculated_value: number;
  rate: number;
}

// Order totals
// Totals are calculated by summing the costs (calculated_value * rate) of each line item.
export function calculateOrderTotals(items: SummaryItem[]) {
  const doorsSubtotal = items
    .filter((i) => i.item_type === 'door_window')
    .reduce((sum, i) => sum + i.calculated_value, 0);

  const chaukhatSubtotal = items
    .filter((i) => i.item_type === 'chaukhat')
    .reduce((sum, i) => sum + i.calculated_value, 0);

  const railingsSubtotal = items
    .filter((i) => i.item_type === 'railing')
    .reduce((sum, i) => sum + i.calculated_value, 0);

  const fixGolaSubtotal = items
    .filter((i) => i.item_type === 'fix_gola')
    .reduce((sum, i) => sum + i.calculated_value, 0);

  const mouldingSubtotal = items
    .filter((i) => i.item_type === 'moulding')
    .reduce((sum, i) => sum + i.calculated_value, 0);

  const doorsAmount = items
    .filter((i) => i.item_type === 'door_window')
    .reduce((sum, i) => sum + i.calculated_value * (i.rate || 0), 0);

  const chaukhatAmount = items
    .filter((i) => i.item_type === 'chaukhat')
    .reduce((sum, i) => sum + i.calculated_value * (i.rate || 0), 0);

  const railingsAmount = items
    .filter((i) => i.item_type === 'railing')
    .reduce((sum, i) => sum + i.calculated_value * (i.rate || 0), 0);

  const fixGolaAmount = items
    .filter((i) => i.item_type === 'fix_gola')
    .reduce((sum, i) => sum + i.calculated_value * (i.rate || 0), 0);

  const mouldingAmount = items
    .filter((i) => i.item_type === 'moulding')
    .reduce((sum, i) => sum + i.calculated_value * (i.rate || 0), 0);

  return {
    doorsSubtotal,    // always sqft
    chaukhatSubtotal, // always running feet
    railingsSubtotal,
    fixGolaSubtotal,
    mouldingSubtotal,
    doorsAmount,
    chaukhatAmount,
    railingsAmount,
    fixGolaAmount,
    mouldingAmount,
    totalAmount: doorsAmount + chaukhatAmount + railingsAmount + fixGolaAmount + mouldingAmount
  };
}
