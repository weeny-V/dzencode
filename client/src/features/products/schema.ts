import { z } from 'zod';

import type { NewProduct } from '@/shared/api/types';
import {
  isValidIsoDate,
  moneyField,
  parseMoney,
  requiredDateField,
  textField,
  titleField,
  wholeNumberField,
} from '@/shared/lib/formSchema';

/** The fields of the "new product" form, all as the visitor typed them (strings; the checkbox is a boolean). */
export const productFormSchema = z
  .object({
    title: titleField('required'),
    serialNumber: wholeNumberField('required'),
    type: z.string().min(1, 'required'),
    order: z.string().min(1, 'required'),
    isNew: z.boolean(),
    specification: textField,
    guaranteeStart: requiredDateField,
    guaranteeEnd: requiredDateField,
    priceUsd: moneyField('required'),
    priceUah: moneyField('required'),
  })
  .refine(
    ({ guaranteeStart, guaranteeEnd }) =>
      // Compared only when both dates are whole: the fields word their own problems. ISO dates sort as text.
      !isValidIsoDate(guaranteeStart) ||
      !isValidIsoDate(guaranteeEnd) ||
      guaranteeEnd >= guaranteeStart,
    { path: ['guaranteeEnd'], message: 'guarantee' },
  );

export type ProductFormValues = z.infer<typeof productFormSchema>;

/** The empty form; `order` is preselected when the form is opened from the panel of an order. */
export const emptyProductForm = (orderId?: number): ProductFormValues => ({
  title: '',
  serialNumber: '',
  type: '',
  order: orderId === undefined ? '' : String(orderId),
  isNew: true,
  specification: '',
  guaranteeStart: '',
  guaranteeEnd: '',
  priceUsd: '',
  priceUah: '',
});

/**
 * The order to put into the select now, or `undefined` to leave it alone. The order the form was opened for can
 * show up in the list after the form is on screen (the list was reloaded): it is selected then, but only while the
 * visitor has not chosen anything themselves.
 */
export const orderToPreselect = (
  current: string,
  initialOrder: number | undefined,
): string | undefined =>
  current === '' && initialOrder !== undefined ? String(initialOrder) : undefined;

/**
 * The body of `POST /products` from checked form values. The two prices are the two currencies of the design,
 * UAH is the main one. There is no photo upload yet, so the photo stays empty.
 */
export const toNewProduct = (values: ProductFormValues): NewProduct => ({
  title: values.title.trim(),
  serialNumber: Number(values.serialNumber),
  isNew: values.isNew,
  photo: null,
  type: values.type,
  specification: values.specification.trim() === '' ? null : values.specification,
  guarantee: { start: values.guaranteeStart, end: values.guaranteeEnd },
  price: [
    { value: parseMoney(values.priceUsd), symbol: 'USD', isDefault: false },
    { value: parseMoney(values.priceUah), symbol: 'UAH', isDefault: true },
  ],
  order: Number(values.order),
});
