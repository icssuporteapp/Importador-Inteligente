import { AppConfiguration } from '../../../models';
import { Gateway } from '../../../services/contracts';

export interface IImportadorProps {
  configuration: AppConfiguration;
  gateway: Gateway;
  userDisplayName: string;
  environmentMessage: string;
}
