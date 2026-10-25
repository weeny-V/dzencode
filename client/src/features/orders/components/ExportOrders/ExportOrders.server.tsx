import { ExportOrders } from '.';
import { dictionary } from './messages.server';

/** The localized export button of the orders page. */
export async function ExportOrdersControl() {
  const { locale, messages } = await dictionary();
  const { export: label, busy, cancel, failed, ...headers } = messages;
  return (
    <ExportOrders
      locale={locale}
      labels={{ export: label, busy, cancel, failed }}
      headers={headers}
    />
  );
}
