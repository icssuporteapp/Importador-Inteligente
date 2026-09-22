import * as React from 'react';
import { ValidationResult } from '../../../models';
import styles from './Importador.module.scss';
export const ValidationDashboard: React.FC<{ result: ValidationResult }> = ({ result }) => <div className={styles.metrics} aria-label="Resumo da validação">
  {[['Registros', result.total], ['Linhas válidas', result.valid], ['Linhas inválidas', result.invalid], ['Problemas de estrutura', result.errors.filter(e => e.severity === 'error' && !e.line).length], ['Avisos', result.errors.filter(e => e.severity === 'warning').length]].map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}
</div>;
