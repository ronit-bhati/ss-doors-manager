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
  if (item.item_type === 'chaukhat') return calculateChaukhatItemValue(item);
  throw new Error(`Unknown item_type: ${item.item_type}`);
}

interface SummaryItem {
  item_type: string;
  calculated_value: number;
}

// Order totals
// Subtotals are summed across all line items of each type, then multiplied ONCE
// by the order-level rate. Rate meaning:
//   door_rate       -> price per sqft (same regardless of input unit, output is always sqft)
//   chaukhat_rate   -> price per running foot (same regardless of input unit, output is always running feet)
export function calculateOrderTotals(
  items: SummaryItem[],
  doorRate: number,
  chaukhatRate: number
) {
  const doorsSubtotal = items
    .filter((i) => i.item_type === 'door_window')
    .reduce((sum, i) => sum + i.calculated_value, 0);

  const chaukhatSubtotal = items
    .filter((i) => i.item_type === 'chaukhat')
    .reduce((sum, i) => sum + i.calculated_value, 0);

  const doorsAmount = doorsSubtotal * (doorRate || 0);
  const chaukhatAmount = chaukhatSubtotal * (chaukhatRate || 0);

  return {
    doorsSubtotal,    // always sqft
    chaukhatSubtotal, // always running feet
    doorsAmount,
    chaukhatAmount,
    totalAmount: doorsAmount + chaukhatAmount
  };
}
