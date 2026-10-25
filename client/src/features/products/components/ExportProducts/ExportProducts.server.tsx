import { ExportProducts } from '.';
import { dictionary } from './messages.server';

/** The localized export button of the products page. */
export async function ExportProductsControl() {
  const { locale, messages } = await dictionary();
  const { export: label, busy, cancel, failed, ...headers } = messages;
  return (
    <ExportProducts
      locale={locale}
      labels={{ export: label, busy, cancel, failed }}
      headers={headers}
    />
  );
}
