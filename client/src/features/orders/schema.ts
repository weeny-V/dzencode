import { z } from 'zod';

import type { NewOrder } from '@/shared/api/types';
import { optionalDateField, textField, titleField } from '@/shared/lib/formSchema';
import { MAX_INT } from '@/shared/lib/limits';

/** The fields of the "new order" form, all as the visitor typed them (strings). */
export const orderFormSchema = z.object({
  title: titleField('required'),
  description: textField,
  date: optionalDateField,
  warehouseId: z
    .string()
    .refine(
      (value) => value === '' || (/^[1-9]\d*$/.test(value) && Number(value) <= MAX_INT),
      'positive',
    ),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;

export const emptyOrderForm: OrderFormValues = {
  title: '',
  description: '',
  date: '',
  warehouseId: '',
};

/** The body of `POST /orders` from checked form values. A blank description or date is left out (the API fills it). */
export const toNewOrder = ({
  title,
  description,
  date,
  warehouseId,
}: OrderFormValues): NewOrder => ({
  title: title.trim(),
  description: description.trim() === '' ? null : description,
  ...(date === '' ? {} : { date }),
  warehouseId: warehouseId === '' ? null : Number(warehouseId),
});
