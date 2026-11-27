import './dx-theme';
import config from 'devextreme/core/config';
import { loadMessages, locale } from 'devextreme/localization';
import deMessages from 'devextreme/localization/messages/de.json';
import { licenseKey } from '../../../.devextreme/license-key';

// Deutsche Texte, Zahlen und Datumsformate, Währung Euro. Der Lizenzschlüssel kommt aus der (nicht eingecheckten) Datei.
loadMessages(deMessages);
locale('de');
config({ licenseKey, defaultCurrency: 'EUR' });
