import React from 'react';
import styles from './ColorPicker.module.css';

const PREDEFINED_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b', // Slate
];

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  return (
    <div className={styles.colorPicker}>
      {PREDEFINED_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className={`${styles.colorSwatch} ${color === c ? styles.active : ''}`}
          style={{ backgroundColor: c }}
          onClick={() => onChange(c)}
          title={`Select color ${c}`}
        />
      ))}
    </div>
  );
};
