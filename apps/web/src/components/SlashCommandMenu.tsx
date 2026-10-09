import React, { useEffect, useRef } from 'react';
import styles from './SlashCommandMenu.module.css';

export interface SlashCommand {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  icon: React.ReactNode;
  action: () => void;
}

interface SlashCommandMenuProps {
  query: string;
  position: { top: number; left: number };
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  commands: SlashCommand[];
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  query,
  position,
  selectedIndex,
  onSelect,
  onClose,
  commands,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter commands by query
  const filtered = commands.filter(cmd => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.keywords.some(k => k.toLowerCase().includes(q))
    );
  });

  // Auto-scroll selected item into view
  useEffect(() => {
    if (!menuRef.current) return;
    const items = menuRef.current.querySelectorAll(`.${styles.itemBtn}`);
    const selectedItem = items[selectedIndex] as HTMLElement;
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Click outside listener
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  if (filtered.length === 0) {
    return (
      <div
        ref={menuRef}
        className={styles.slashMenu}
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
      >
        <div className={styles.emptyResults}>No matching commands</div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className={styles.slashMenu}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseDown={e => e.preventDefault()} // Prevent editor blur
    >
      <div className={styles.menuHeader}>Basic Blocks</div>
      <div className={styles.itemList}>
        {filtered.map((cmd, idx) => (
          <button
            key={cmd.id}
            type="button"
            className={`${styles.itemBtn} ${idx === selectedIndex ? styles.isSelected : ''}`}
            onClick={() => onSelect(cmd)}
          >
            <div className={styles.iconWrapper}>{cmd.icon}</div>
            <div className={styles.itemText}>
              <span className={styles.itemTitle}>{cmd.title}</span>
              <span className={styles.itemDescription}>{cmd.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
