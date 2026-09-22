import * as React from 'react';
import { ProgressIndicator } from '@fluentui/react';
import { ImportProgressData } from '../../../models';
export const ImportProgress: React.FC<{ value: ImportProgressData }> = ({ value }) => <ProgressIndicator label="Importando..." description={`${value.processed.toLocaleString('pt-BR')} de ${value.total.toLocaleString('pt-BR')} — ${value.imported} importados, ${value.failed} falhas, ${value.unknown} sem confirmação — aproximadamente ${value.remainingSeconds}s restantes`} percentComplete={value.percent / 100} />;
