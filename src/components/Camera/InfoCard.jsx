// src/components/Camera/InfoCard.jsx

import React from 'react';
import styles from './InfoCard.module.css'; // Usará su propio archivo CSS

export default function InfoCard({ icon, label, value, highlight = false }) {
  // Usamos una clase condicional: si 'highlight' es true, añade la clase 'highlighted'
  const cardClasses = `${styles.infoCard} ${highlight ? styles.highlighted : ''}`;

  return (
    <div className={cardClasses}>
      <div className={styles.infoIcon}>{icon}</div>
      <div className={styles.infoContent}>
        <div className={styles.infoLabel}>{label}</div>
        <div className={styles.infoValue}>{value}</div>
      </div>
    </div>
  );
}