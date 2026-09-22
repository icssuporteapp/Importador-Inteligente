import * as React from 'react';
import { DefaultButton, Spinner, SpinnerSize } from '@fluentui/react';
export const TemplateGenerator: React.FC<{ disabled: boolean; loading: boolean; onDownload(): void }> = ({ disabled, loading, onDownload }) => <DefaultButton iconProps={{ iconName: 'ExcelDocument' }} disabled={disabled || loading} onClick={onDownload}>{loading ? <Spinner size={SpinnerSize.xSmall} label="Gerando template" /> : 'Baixar template'}</DefaultButton>;
