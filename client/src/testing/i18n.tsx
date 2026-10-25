import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { renderToReadableStream, renderToStaticMarkup as staticMarkup } from 'react-dom/server';

import en1 from '@/app/(protected)/groups/messages/en.json';
import ru1 from '@/app/(protected)/groups/messages/ru.json';
import en3 from '@/app/(protected)/orders/messages/en.json';
import ru3 from '@/app/(protected)/orders/messages/ru.json';
import en5 from '@/app/(protected)/products/messages/en.json';
import ru5 from '@/app/(protected)/products/messages/ru.json';
import en8 from '@/app/(protected)/settings/messages/en.json';
import ru8 from '@/app/(protected)/settings/messages/ru.json';
import en9 from '@/app/(protected)/users/messages/en.json';
import ru9 from '@/app/(protected)/users/messages/ru.json';
import en0 from '@/app/error/messages/en.json';
import ru0 from '@/app/error/messages/ru.json';
import en2 from '@/app/not-found/messages/en.json';
import ru2 from '@/app/not-found/messages/ru.json';
import en7 from '@/app/root/messages/en.json';
import ru7 from '@/app/root/messages/ru.json';
import en10 from '@/features/api-status/components/ApiStatus/messages/en.json';
import ru10 from '@/features/api-status/components/ApiStatus/messages/ru.json';
import en11 from '@/features/app-shell/components/AppShell/messages/en.json';
import ru11 from '@/features/app-shell/components/AppShell/messages/ru.json';
import en12 from '@/features/confirmation/components/DeleteDialogHost/messages/en.json';
import ru12 from '@/features/confirmation/components/DeleteDialogHost/messages/ru.json';
import en13 from '@/features/locale/components/LocaleSwitcher/messages/en.json';
import ru13 from '@/features/locale/components/LocaleSwitcher/messages/ru.json';
import en14 from '@/features/navigation-menu/components/NavigationMenu/messages/en.json';
import ru14 from '@/features/navigation-menu/components/NavigationMenu/messages/ru.json';
import en15 from '@/features/orders/components/OrderForm/messages/en.json';
import ru15 from '@/features/orders/components/OrderForm/messages/ru.json';
import en16 from '@/features/orders/components/OrderItem/messages/en.json';
import ru16 from '@/features/orders/components/OrderItem/messages/ru.json';
import en17 from '@/features/orders/components/OrderPanel/messages/en.json';
import ru17 from '@/features/orders/components/OrderPanel/messages/ru.json';
import en18 from '@/features/orders/components/OrdersContent/messages/en.json';
import ru18 from '@/features/orders/components/OrdersContent/messages/ru.json';
import en19 from '@/features/products/components/ProductForm/messages/en.json';
import ru19 from '@/features/products/components/ProductForm/messages/ru.json';
import en20 from '@/features/products/components/ProductRow/messages/en.json';
import ru20 from '@/features/products/components/ProductRow/messages/ru.json';
import en21 from '@/features/products/components/ProductsContent/messages/en.json';
import ru21 from '@/features/products/components/ProductsContent/messages/ru.json';
import en22 from '@/features/products/components/TypeFilter/messages/en.json';
import ru22 from '@/features/products/components/TypeFilter/messages/ru.json';
import en23 from '@/features/sessions/components/SessionsCounter/messages/en.json';
import ru23 from '@/features/sessions/components/SessionsCounter/messages/ru.json';
import en24 from '@/features/top-menu/components/SearchField/messages/en.json';
import ru24 from '@/features/top-menu/components/SearchField/messages/ru.json';
import en25 from '@/features/top-menu/components/TopMenu/messages/en.json';
import ru25 from '@/features/top-menu/components/TopMenu/messages/ru.json';
import en26 from '@/shared/lib/calendar/messages/en.json';
import ru26 from '@/shared/lib/calendar/messages/ru.json';
import en27 from '@/shared/lib/formValidation/messages/en.json';
import ru27 from '@/shared/lib/formValidation/messages/ru.json';
import en28 from '@/shared/ui/ComingSoon/messages/en.json';
import ru28 from '@/shared/ui/ComingSoon/messages/ru.json';
import en29 from '@/shared/ui/ConfirmDialog/messages/en.json';
import ru29 from '@/shared/ui/ConfirmDialog/messages/ru.json';
import en30 from '@/shared/ui/FormLayout/messages/en.json';
import ru30 from '@/shared/ui/FormLayout/messages/ru.json';
import en31 from '@/shared/ui/GlobalError/messages/en.json';
import ru31 from '@/shared/ui/GlobalError/messages/ru.json';
import en32 from '@/shared/ui/Modal/messages/en.json';
import ru32 from '@/shared/ui/Modal/messages/ru.json';
import en33 from '@/shared/ui/NoResults/messages/en.json';
import ru33 from '@/shared/ui/NoResults/messages/ru.json';
import en34 from '@/shared/ui/RetryButton/messages/en.json';
import ru34 from '@/shared/ui/RetryButton/messages/ru.json';

import { TestAuth } from './auth';
export const testMessages = {
  ru: {
    ErrorPage: ru0,
    groups: ru1,
    'not-found': ru2,
    orders: ru3,
    products: ru5,
    root: ru7,
    settings: ru8,
    users: ru9,
    ApiStatus: ru10,
    AppShell: ru11,
    DeleteDialogHost: ru12,
    LocaleSwitcher: ru13,
    NavigationMenu: ru14,
    OrderForm: ru15,
    OrderItem: ru16,
    OrderPanel: ru17,
    OrdersContent: ru18,
    ProductForm: ru19,
    ProductRow: ru20,
    ProductsContent: ru21,
    TypeFilter: ru22,
    SessionsCounter: ru23,
    SearchField: ru24,
    TopMenu: ru25,
    Calendar: ru26,
    Validation: ru27,
    ComingSoon: ru28,
    ConfirmDialog: ru29,
    FormLayout: ru30,
    GlobalError: ru31,
    Modal: ru32,
    NoResults: ru33,
    RetryButton: ru34,
  },
  en: {
    ErrorPage: en0,
    groups: en1,
    'not-found': en2,
    orders: en3,
    products: en5,
    root: en7,
    settings: en8,
    users: en9,
    ApiStatus: en10,
    AppShell: en11,
    DeleteDialogHost: en12,
    LocaleSwitcher: en13,
    NavigationMenu: en14,
    OrderForm: en15,
    OrderItem: en16,
    OrderPanel: en17,
    OrdersContent: en18,
    ProductForm: en19,
    ProductRow: en20,
    ProductsContent: en21,
    TypeFilter: en22,
    SessionsCounter: en23,
    SearchField: en24,
    TopMenu: en25,
    Calendar: en26,
    Validation: en27,
    ComingSoon: en28,
    ConfirmDialog: en29,
    FormLayout: en30,
    GlobalError: en31,
    Modal: en32,
    NoResults: en33,
    RetryButton: en34,
  },
};
export function TestLocale({
  children,
  locale = 'ru',
}: {
  children: ReactNode;
  locale?: 'ru' | 'en';
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={testMessages[locale]} timeZone="UTC">
      <TestAuth>{children}</TestAuth>
    </NextIntlClientProvider>
  );
}
export function render(ui: ReactNode, options?: RenderOptions) {
  return rtlRender(ui, { wrapper: TestLocale, ...options });
}
export const renderToStaticMarkup = (ui: ReactNode) => staticMarkup(<TestLocale>{ui}</TestLocale>);
export async function renderServer(ui: ReactNode) {
  const stream = await renderToReadableStream(<TestLocale>{ui}</TestLocale>);
  await stream.allReady;
  return (await new Response(stream).text()).replaceAll('<!-- -->', '');
}
