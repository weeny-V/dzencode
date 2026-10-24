import { z } from 'zod';

import type { NewOrder } from '@/shared/api/types';
import { optionalDateField, textField, titleField } from '@/shared/lib/formSchema';

/** The fields of the "new order" form, all as the visitor typed them (strings). */
export const orderFormSchema = z.object({
  title: titleField('Введите название прихода'),
  description: textField,
  date: optionalDateField,
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;

export const emptyOrderForm: OrderFormValues = { title: '', description: '', date: '' };

/** The body of `POST /orders` from checked form values. A blank description or date is left out (the API fills it). */
export const toNewOrder = ({ title, description, date }: OrderFormValues): NewOrder => ({
  title: title.trim(),
  description: description.trim() === '' ? null : description,
  ...(date === '' ? {} : { date }),
});
