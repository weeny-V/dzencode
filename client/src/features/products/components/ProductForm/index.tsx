'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import type { NewProduct } from '@/shared/api/types';
import { useFormDraft } from '@/shared/hooks/useFormDraft';
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
  draftKey?: string;
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
  draftKey,
  cancelHref,
  onSubmit,
}: ProductFormProps) {
  const t = useTranslations('ProductForm');
  const v = useTranslations('Validation');
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: emptyProductForm(initialOrder),
    mode: 'onTouched',
  });
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = form;
  const [submitError, setSubmitError] = useState<string>();
  const draft = useFormDraft(
    draftKey ?? 'product',
    form,
    emptyProductForm(initialOrder),
    (values) => ({
      ...values,
      order: orders.some((order) => String(order.id) === values.order) ? values.order : '',
      type: types.includes(values.type) ? values.type : '',
    }),
  );

  // `defaultValues` are read once, when the form mounts. If the order only arrives later (the list of orders was
  // refreshed after the form opened), select it now, without touching a choice the visitor already made.
  useEffect(() => {
    const value = orderToPreselect(getValues('order'), initialOrder);
    if (value !== undefined) setValue('order', value);
  }, [initialOrder, getValues, setValue]);

  return (
    <FormLayout
      title={t('title')}
      submitLabel={t('submit')}
      cancelHref={cancelHref}
      submitting={isSubmitting}
      error={submitError}
      onClear={() => {
        draft.clear();
        setSubmitError(undefined);
      }}
      draftUnavailable={draft.unavailable}
      onSubmit={(event) =>
        void handleSubmit(async (values) => {
          const snapshot = draft.snapshot();
          const error = await onSubmit(toNewProduct(values));
          if (error === undefined) draft.complete(snapshot);
          setSubmitError(error);
        })(event)
      }
    >
      <FormField
        label={t('name')}
        required
        wide
        error={errors.title?.message ? v(errors.title.message) : undefined}
      >
        {(control) => <input type="text" autoComplete="off" {...control} {...register('title')} />}
      </FormField>

      <FormField
        label={t('serial')}
        required
        error={errors.serialNumber?.message ? v(errors.serialNumber.message) : undefined}
      >
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

      <FormField
        label={t('type')}
        required
        error={errors.type?.message ? v(errors.type.message) : undefined}
      >
        {(control) => (
          <select {...control} {...register('type')}>
            <option value="">{t('selectType')}</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField
        label={t('order')}
        required
        wide
        error={errors.order?.message ? v(errors.order.message) : undefined}
      >
        {(control) => (
          <select {...control} {...register('order')}>
            <option value="">{t('selectOrder')}</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.title}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField
        label={t('start')}
        required
        error={errors.guaranteeStart?.message ? v(errors.guaranteeStart.message) : undefined}
      >
        {(control) => <input type="date" {...control} {...register('guaranteeStart')} />}
      </FormField>

      <FormField
        label={t('end')}
        required
        error={errors.guaranteeEnd?.message ? v(errors.guaranteeEnd.message) : undefined}
      >
        {(control) => <input type="date" {...control} {...register('guaranteeEnd')} />}
      </FormField>

      <FormField
        label={t('usd')}
        required
        error={errors.priceUsd?.message ? v(errors.priceUsd.message) : undefined}
      >
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

      <FormField
        label={t('uah')}
        required
        error={errors.priceUah?.message ? v(errors.priceUah.message) : undefined}
      >
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

      <CheckboxField label={t('isNew')}>
        {(control) => <input type="checkbox" {...control} {...register('isNew')} />}
      </CheckboxField>

      <FormField
        label={t('specification')}
        wide
        error={errors.specification?.message ? v(errors.specification.message) : undefined}
      >
        {(control) => <textarea rows={3} {...control} {...register('specification')} />}
      </FormField>
    </FormLayout>
  );
}
