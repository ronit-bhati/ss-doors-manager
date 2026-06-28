import { useState, useEffect, memo } from 'react';
import { Trash2 } from 'lucide-react';
import { calculateDoorItemValue } from '../lib/calculations.ts';

interface DoorItem {
  id?: number;
  tempId?: string;
  label: string;
  height: number | '';
  width: number | '';
  quantity: number;
  rate: number | '';
}

interface DoorItemRowProps {
  item: DoorItem;
  unit: 'inches' | 'feet';
  onChange: (id: string | number, fields: Partial<DoorItem>) => void;
  onDelete: (id: string | number) => void;
  selected?: boolean;
  onSelect?: (id: string | number, checked: boolean) => void;
}

export const DoorItemRow = memo(function DoorItemRow({ item, unit, onChange, onDelete, selected, onSelect }: DoorItemRowProps) {
  const [label, setLabel] = useState(item.label || '');
  const [height, setHeight] = useState<number | ''>(item.height ? item.height : '');
  const [width, setWidth] = useState<number | ''>(item.width ? item.width : '');
  const [quantity, setQuantity] = useState<number | ''>(item.quantity ?? 1);
  const [rate, setRate] = useState<number | ''>(item.rate ?? 0);

  const rowId = item.id !== undefined ? item.id : (item.tempId || '');

  // Sync local state if item prop changes from outside (e.g. initial load or rate updates)
  useEffect(() => {
    setLabel(item.label || '');
    setHeight(item.height ? item.height : '');
    setWidth(item.width ? item.width : '');
    setQuantity(item.quantity ?? 1);
    setRate(item.rate ?? 0);
  }, [item.id, item.label, item.height, item.width, item.quantity, item.rate]);

  const heightVal = typeof height === 'number' ? height : 0;
  const widthVal = typeof width === 'number' ? width : 0;
  const quantityVal = quantity || 0;
  const rateVal = typeof rate === 'number' ? rate : 0;
  
  const liveSqft = calculateDoorItemValue({
    height: heightVal,
    width: widthVal,
    quantity: quantityVal,
    unit
  });

  const liveCost = liveSqft * rateVal;

  const handleRateBlur = () => {
    const valStr = String(rate).trim();
    const val = valStr === '' ? '' : parseFloat(valStr);

    if (val === '' || isNaN(val) || val < 0) {
      const originalVal = item.rate;
      const fallback = (typeof originalVal === 'number' && originalVal >= 0) ? originalVal : 0;
      setRate(fallback);
      if (item.rate !== fallback) {
        onChange(rowId, { rate: fallback });
      }
    } else {
      setRate(val);
      if (item.rate !== val) {
        onChange(rowId, { rate: val });
      }
    }
  };

  const handleLabelBlur = () => {
    const trimmed = label.trim();
    setLabel(trimmed);
    if (item.label !== trimmed) {
      onChange(rowId, { label: trimmed });
    }
  };

  const handleHeightBlur = () => {
    const valStr = String(height).trim();
    const val = valStr === '' ? '' : parseFloat(valStr);

    if (val === '' || isNaN(val) || val <= 0) {
      const originalVal = item.height;
      if (typeof originalVal === 'number' && originalVal > 0) {
        setHeight(originalVal);
      } else {
        setHeight('');
      }
    } else {
      setHeight(val);
      if (item.height !== val) {
        onChange(rowId, { height: val });
      }
    }
  };

  const handleWidthBlur = () => {
    const valStr = String(width).trim();
    const val = valStr === '' ? '' : parseFloat(valStr);

    if (val === '' || isNaN(val) || val <= 0) {
      const originalVal = item.width;
      if (typeof originalVal === 'number' && originalVal > 0) {
        setWidth(originalVal);
      } else {
        setWidth('');
      }
    } else {
      setWidth(val);
      if (item.width !== val) {
        onChange(rowId, { width: val });
      }
    }
  };

  const handleQuantityBlur = () => {
    const valStr = String(quantity).trim();
    const val = valStr === '' ? '' : parseInt(valStr, 10);

    if (val === '' || isNaN(val) || val <= 0) {
      const originalVal = item.quantity;
      const fallback = (typeof originalVal === 'number' && originalVal > 0) ? originalVal : 1;
      setQuantity(fallback);
      if (item.quantity !== fallback) {
        onChange(rowId, { quantity: fallback });
      }
    } else {
      setQuantity(val);
      if (item.quantity !== val) {
        onChange(rowId, { quantity: val });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const gridStyle = onSelect
    ? { gridTemplateColumns: '38px 2.2fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr auto' }
    : {};

  return (
    <div className="item-row-card" style={gridStyle}>
      {onSelect && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input
            type="checkbox"
            checked={selected || false}
            onChange={(e) => onSelect(rowId, e.target.checked)}
            className="form-checkbox"
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-accent-amber)', margin: 0 }}
            aria-label="Select row"
          />
        </div>
      )}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <input
          type="text"
          className="form-input table-inline-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleLabelBlur}
          onKeyDown={handleKeyDown}
          placeholder=""
          aria-label="Item Label"
        />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <input
          type="number"
          className="form-input table-inline-input"
          style={{ width: '100%', fontFamily: 'var(--font-display)' }}
          value={height}
          onChange={(e) => {
            const val = e.target.value === '' ? '' : parseFloat(e.target.value);
            setHeight(val);
          }}
          onBlur={handleHeightBlur}
          onKeyDown={handleKeyDown}
          placeholder={`H (${unit === 'inches' ? 'IN' : 'FT'})`}
          min={0}
          step="any"
          required
          aria-label={`Height in ${unit}`}
        />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <input
          type="number"
          className="form-input table-inline-input"
          style={{ width: '100%', fontFamily: 'var(--font-display)' }}
          value={width}
          onChange={(e) => {
            const val = e.target.value === '' ? '' : parseFloat(e.target.value);
            setWidth(val);
          }}
          onBlur={handleWidthBlur}
          onKeyDown={handleKeyDown}
          placeholder={`W (${unit === 'inches' ? 'IN' : 'FT'})`}
          min={0}
          step="any"
          required
          aria-label={`Width in ${unit}`}
        />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <input
          type="number"
          className="form-input table-inline-input"
          style={{ fontFamily: 'var(--font-display)' }}
          value={quantity}
          onChange={(e) => {
            const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
            setQuantity(val);
          }}
          onBlur={handleQuantityBlur}
          onKeyDown={handleKeyDown}
          placeholder="QTY"
          min={1}
          required
          aria-label="Quantity"
        />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <input
          type="number"
          className="form-input table-inline-input"
          style={{ width: '100%', fontFamily: 'var(--font-display)' }}
          value={rate}
          onChange={(e) => {
            const val = e.target.value === '' ? '' : parseFloat(e.target.value);
            setRate(val);
          }}
          onBlur={handleRateBlur}
          onKeyDown={handleKeyDown}
          placeholder="RATE (₹)"
          min={0}
          step="any"
          required
          aria-label="Rate"
        />
      </div>

      <div className="item-preview-value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', lineHeight: 1.25 }}>
        <div>
          AREA: <span style={{ fontWeight: 700 }}>{liveSqft.toFixed(2)}</span> SQFT
        </div>
        <div style={{ fontSize: '0.725rem', color: 'var(--color-emerald)', fontWeight: 600 }}>
          ₹{liveCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-danger"
        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginLeft: '0.5rem' }}
        onClick={() => onDelete(rowId)}
        aria-label="Delete item row"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
});
