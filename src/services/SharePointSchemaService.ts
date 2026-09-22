import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import { ColumnDefinition, FieldKind, ListDefinition, ListReference } from '../models';
import { can, guid, RestClient } from './RestClient';

export class SharePointSchemaService {
  public constructor(private rest: RestClient, private spFor: (url: string) => SPFI) {}
  public async load(ref: ListReference, contentTypeId?: string): Promise<ListDefinition> {
    const id = guid(ref.id); const site = this.rest.site(ref.siteUrl); const path = `web/lists(guid'${id}')`;
    // PnPjs reuses SPFx context for metadata. Writes use a non-retrying transport (see ImportService).
    const metadata: any = await this.spFor(site).web.lists.getById(id).select('Id', 'Title', 'BaseTemplate', 'Hidden', 'EffectiveBasePermissions', 'ValidationFormula')();
    if (metadata.Hidden || metadata.BaseTemplate !== 100) throw new Error('Esta lista não é compatível com a importação de itens.');
    if (!can(metadata.EffectiveBasePermissions, 1)) throw new Error('Você não tem permissão para ler esta lista.');
    const [fields, view, types, zone] = await Promise.all([
      this.rest.all(site, `${path}/fields?$select=Id,Title,InternalName,TypeAsString,Required,ReadOnlyField,Hidden,DefaultValue,SchemaXml&$top=200`),
      this.rest.get(site, `${path}/defaultview/viewfields`),
      this.rest.all(site, `${path}/contenttypes?$select=Name,StringId,Hidden&$top=100`),
      this.rest.get(site, 'web/RegionalSettings/TimeZone')
    ]);
    const contentTypes = types.filter((t: any) => !t.Hidden && String(t.StringId).startsWith('0x01')).map((t: any) => ({ id: t.StringId, name: t.Name }));
    const selected = contentTypeId || contentTypes[0]?.id;
    if (selected && !contentTypes.some(t => t.id === selected)) throw new Error('Tipo de conteúdo não disponível nesta lista.');
    const links = selected ? await this.rest.all(site, `${path}/contenttypes('${selected}')/fieldlinks?$select=Id,Name,Required,Hidden&$top=200`) : [];
    const columns: ColumnDefinition[] = fields.map((field: any) => this.column(field));
    for (const column of columns) {
      const link = links.find((l: any) => String(l.Id).toLowerCase() === column.id.toLowerCase());
      if (selected) { if (!link) column.hidden = true; else { column.required = !!link.Required; column.hidden = column.hidden || !!link.Hidden; } }
    }
    const order: string[] = view.Items?.results || view.Items || view.results || [];
    columns.sort((a, b) => { const ai = order.indexOf(a.internalName); const bi = order.indexOf(b.internalName); return (ai < 0 ? 9999 : ai) - (bi < 0 ? 9999 : bi) || a.title.localeCompare(b.title); });
    // Display/system fields can reuse the title of the real editable field (for example LinkTitle and Title).
    // They must not add misleading suffixes such as "(3)" to the mapping shown to the user.
    const writableColumns = columns.filter(column => !column.hidden && !column.readOnly);
    const titleCounts = new Map<string, number>();
    for (const column of writableColumns) { const key = column.title.toLocaleLowerCase(); titleCounts.set(key, (titleCounts.get(key) || 0) + 1); }
    const ordinals = new Map<string, number>();
    for (const column of writableColumns) {
      const key = column.title.toLocaleLowerCase(); const ordinal = (ordinals.get(key) || 0) + 1; ordinals.set(key, ordinal);
      column.header = titleCounts.get(key)! > 1 ? `${column.title} (${ordinal})` : column.title;
    }
    const schemaVersion = JSON.stringify({ columns, selected, zone, formula: metadata.ValidationFormula });
    return { ...ref, id, siteUrl: site, title: metadata.Title, columns, canAdd: can(metadata.EffectiveBasePermissions, 2), contentTypes, contentTypeId: selected, schemaVersion, timeZoneId: zone.Id, timeZoneDescription: zone.Description, validationFormula: metadata.ValidationFormula };
  }
  private column(field: any): ColumnDefinition {
    const xml = new DOMParser().parseFromString(field.SchemaXml || '<Field/>', 'application/xml').documentElement;
    const attribute = (key: string): string | undefined => xml.getAttribute(key) || undefined;
    const number = (key: string): number | undefined => { const value = attribute(key); return value !== undefined && Number.isFinite(Number(value)) ? Number(value) : undefined; };
    const type = String(field.TypeAsString); const kinds: string[] = ['Text', 'Note', 'Number', 'Currency', 'Boolean', 'DateTime', 'Choice', 'MultiChoice', 'Lookup', 'LookupMulti', 'User', 'UserMulti'];
    const kind: FieldKind = kinds.indexOf(type) >= 0 ? type as FieldKind : 'Unsupported';
    const system = ['Attachments', 'ContentType', 'ContentTypeId', 'ID', 'Author', 'Editor', 'Created', 'Modified', 'GUID', 'AppAuthor', 'AppEditor'].indexOf(field.InternalName) >= 0;
    return { id: String(field.Id), title: field.Title, header: field.Title, internalName: field.InternalName, nativeType: type, kind,
      required: !!field.Required, readOnly: !!field.ReadOnlyField || system, hidden: !!field.Hidden,
      defaultValue: field.DefaultValue === null ? undefined : field.DefaultValue,
      maxLength: number('MaxLength'), min: number('Min'), max: number('Max'), decimals: number('Decimals'), unique: attribute('EnforceUniqueValues') === 'TRUE',
      choices: Array.from(xml.getElementsByTagName('CHOICE')).map(c => c.textContent || ''), fillInChoice: attribute('FillInChoice') === 'TRUE', dateOnly: attribute('Format') === 'DateOnly',
      lookupList: attribute('List'), lookupWeb: attribute('WebId'), lookupField: attribute('ShowField') || 'Title', peopleOnly: attribute('UserSelectionMode') !== 'PeopleAndGroups', selectionGroup: number('UserSelectionScope') || 0 };
  }
}
