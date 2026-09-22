import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { type IPropertyPaneConfiguration, PropertyPaneSlider, PropertyPaneTextField, PropertyPaneToggle } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';
import Importador from './components/Importador';
import { IImportadorProps } from './components/IImportadorProps';
import { AppConfiguration, DEFAULT_CONFIG, SiteConfiguration } from '../../models';
import { SharePointGateway } from '../../services/SharePointGateway';
import { DemoGateway } from '../../services/DemoGateway';

export interface IImportadorWebPartProps {
  sites: string; auditSiteUrl: string; maxRows: number; maxColumns: number; maxFileMb: number; batchSize: number; demoMode: boolean;
}

export default class ImportadorWebPart extends BaseClientSideWebPart<IImportadorWebPartProps> {
  public render(): void {
    let sites: SiteConfiguration[] = [];
    try {
      const parsed = JSON.parse(this.properties.sites || '[]');
      if (Array.isArray(parsed)) sites = parsed.filter(item => item && typeof item.url === 'string').map(item => ({ url: item.url, name: typeof item.name === 'string' ? item.name : item.url }));
    } catch { /* The empty configured-site list is safe; admins can correct JSON in the property pane. */ }
    const configuration: AppConfiguration = {
      ...DEFAULT_CONFIG, sites,
      auditSiteUrl: (this.properties.auditSiteUrl || '').trim(),
      maxRows: this.properties.maxRows || DEFAULT_CONFIG.maxRows,
      maxColumns: this.properties.maxColumns || DEFAULT_CONFIG.maxColumns,
      maxFileMb: this.properties.maxFileMb || DEFAULT_CONFIG.maxFileMb,
      batchSize: this.properties.batchSize || DEFAULT_CONFIG.batchSize
    };
    const props: IImportadorProps = { configuration, gateway: this.properties.demoMode ? new DemoGateway() : new SharePointGateway(this.context, configuration), userDisplayName: this.context.pageContext.user.displayName, environmentMessage: this.properties.demoMode ? 'Demonstração local — nenhum dado real' : this.context.sdks.microsoftTeams ? 'Microsoft Teams' : 'SharePoint' };
    ReactDom.render(React.createElement(Importador, props), this.domElement);
  }
  protected onThemeChanged(theme: IReadonlyTheme | undefined): void {
    if (!theme) return;
    this.domElement.dataset.theme = theme.isInverted ? 'dark' : 'light';
    if (theme.semanticColors) { this.domElement.style.setProperty('--bodyText', theme.semanticColors.bodyText || '#242424'); this.domElement.style.setProperty('--bodyBackground', theme.semanticColors.bodyBackground || '#fff'); this.domElement.style.setProperty('--link', theme.semanticColors.link || '#0f6cbd'); }
  }
  protected onDispose(): void { ReactDom.unmountComponentAtNode(this.domElement); }
  protected get dataVersion(): Version { return Version.parse('1.0'); }
  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return { pages: [{ header: { description: 'Configuração administrativa do importador' }, groups: [{ groupName: 'SharePoint', groupFields: [
      PropertyPaneTextField('sites', { label: 'Sites adicionais em JSON', multiline: true, description: 'Exemplo: [{"name":"Projetos","url":"https://contoso.sharepoint.com/sites/projetos"}]' }),
      PropertyPaneTextField('auditSiteUrl', { label: 'Auditoria central (opcional)', description: 'Deixe vazio para importar sem configuração adicional.' }),
      PropertyPaneToggle('demoMode', { label: 'Modo de demonstração', onText: 'Simulado', offText: 'SharePoint real' }),
      PropertyPaneSlider('maxRows', { label: 'Máximo de linhas', min: 100, max: 10000, step: 100 }),
      PropertyPaneSlider('maxColumns', { label: 'Máximo de colunas', min: 10, max: 100, step: 5 }),
      PropertyPaneSlider('maxFileMb', { label: 'Tamanho máximo em MB', min: 1, max: 50, step: 1 }),
      PropertyPaneSlider('batchSize', { label: 'Itens por lote', min: 1, max: 100, step: 1 })
    ] }] }] };
  }
}
