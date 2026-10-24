'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import type { NewProduct } from '@/shared/api/types';
import { CheckboxField, FormField } from '@/shared/ui/FormField';
import { FormLayout } from '@/shared/ui/FormLayout';

import type { OrderOption } from '../../api/products';
import {
  emptyProductForm,
  orderToPreselect,
  productFormSchema,
  type ProductFormValues,
  toNewProduct,
} from '../../schema';

interface ProductFormProps {
  /** Type names for the "Тип" select. */
  types: readonly string[];
  /** Orders for the "Приход" select. */
  orders: readonly OrderOption[];
  /** The order to preselect (the form was opened from its panel). */
  initialOrder?: number;
  /** Where "Отмена" leads. */
  cancelHref: string;
  /** Sends the product. Answers with the reason it was refused, or `undefined` when it was saved. */
  onSubmit: (product: NewProduct) => Promise<string | undefined>;
}

/** The form of a new product. The prices are the two currencies of the design, UAH is the main one. */
export function ProductForm({
  types,
  orders,
  initialOrder,
  cancelHref,
  onSubmit,
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: emptyProductForm(initialOrder),
    // Errors appear when the visitor leaves a field or presses the button, then follow every change.
    mode: 'onTouched',
  });
  const [submitError, setSubmitError] = useState<string>();

  // `defaultValues` are read once, when the form mounts. If the order only arrives later (the list of orders was
  // refreshed after the form opened), select it now, without touching a choice the visitor already made.
  useEffect(() => {
    const value = orderToPreselect(getValues('order'), initialOrder);
    if (value !== undefined) setValue('order', value);
  }, [initialOrder, getValues, setValue]);

  return (
    <FormLayout
      title="Новый продукт"
      submitLabel="Создать продукт"
      cancelHref={cancelHref}
      submitting={isSubmitting}
      error={submitError}
      onSubmit={(event) =>
        void handleSubmit(async (values) => {
          setSubmitError(await onSubmit(toNewProduct(values)));
        })(event)
      }
    >
      <FormField label="Название" required wide error={errors.title?.message}>
        {(control) => <input type="text" autoComplete="off" {...control} {...register('title')} />}
      </FormField>

      <FormField label="Серийный номер" required error={errors.serialNumber?.message}>
        {(control) => (
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            {...control}
            {...register('serialNumber')}
          />
        )}
      </FormField>

      <FormField label="Тип" required error={errors.type?.message}>
        {(control) => (
          <select {...control} {...register('type')}>
            <option value="">Выберите тип</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField label="Приход" required wide error={errors.order?.message}>
        {(control) => (
          <select {...control} {...register('order')}>
            <option value="">Выберите приход</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.title}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField label="Гарантия с" required error={errors.guaranteeStart?.message}>
        {(control) => <input type="date" {...control} {...register('guaranteeStart')} />}
      </FormField>

      <FormField label="Гарантия по" required error={errors.guaranteeEnd?.message}>
        {(control) => <input type="date" {...control} {...register('guaranteeEnd')} />}
      </FormField>

      <FormField label="Цена, $" required error={errors.priceUsd?.message}>
        {(control) => (
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            {...control}
            {...register('priceUsd')}
          />
        )}
      </FormField>

      <FormField label="Цена, UAH" required error={errors.priceUah?.message}>
        {(control) => (
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            {...control}
            {...register('priceUah')}
          />
        )}
      </FormField>

      <CheckboxField label="Новый продукт (не Б / У)">
        {(control) => <input type="checkbox" {...control} {...register('isNew')} />}
      </CheckboxField>

      <FormField label="Спецификация" wide error={errors.specification?.message}>
        {(control) => <textarea rows={3} {...control} {...register('specification')} />}
      </FormField>
    </FormLayout>
  );
}
