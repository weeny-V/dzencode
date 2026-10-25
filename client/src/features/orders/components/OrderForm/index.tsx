'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import type { NewOrder, Warehouse } from '@/shared/api/types';
import { useAuthSession } from '@/shared/hooks/useAuthSession';
import { useFormDraft } from '@/shared/hooks/useFormDraft';
import { useMountedRef } from '@/shared/hooks/useMountedRef';
import { FormField } from '@/shared/ui/FormField';
import { FormLayout } from '@/shared/ui/FormLayout';

import { emptyOrderForm, orderFormSchema, type OrderFormValues, toNewOrder } from '../../schema';

interface OrderFormProps {
  warehouses: Warehouse[];
  /** Sends the order. Answers with the reason it was refused, or `undefined` when it was saved. */
  onSubmit: (order: NewOrder) => Promise<string | undefined>;
}

/** The form of a new order: a title, an optional description and an optional date. */
export function OrderForm({ onSubmit, warehouses }: OrderFormProps) {
  const mounted = useMountedRef();
  const session = useAuthSession();
  const t = useTranslations('OrderForm');
  const v = useTranslations('Validation');
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: emptyOrderForm,
    mode: 'onTouched',
  });
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = form;
  const [submitError, setSubmitError] = useState<string>();
  const draft = useFormDraft(
    'order',
    form,
    emptyOrderForm,
    (values) => ({
      ...values,
      warehouseId: warehouses.some((warehouse) => String(warehouse.id) === values.warehouseId)
        ? values.warehouseId
        : '',
    }),
    ['warehouseId'],
  );
  const warehouseId = useWatch({ control, name: 'warehouseId' });

  return (
    <FormLayout
      title={t('title')}
      submitLabel={t('submit')}
      cancelHref="/orders"
      submitting={isSubmitting}
      error={submitError}
      onClear={() => {
        draft.clear();
        setSubmitError(undefined);
      }}
      draftUnavailable={draft.unavailable}
      onSubmit={(event) =>
        void handleSubmit(async (values) => {
          if (
            values.warehouseId !== '' &&
            !warehouses.some((warehouse) => String(warehouse.id) === values.warehouseId)
          ) {
            setError('warehouseId', { message: 'staleWarehouse' });
            return;
          }
          const snapshot = draft.snapshot();
          const error = await onSubmit(toNewOrder(values));
          if (error === undefined) draft.complete(snapshot);
          if (mounted.current && session.isCurrent()) setSubmitError(error);
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
        label={t('date')}
        error={errors.date?.message ? v(errors.date.message) : undefined}
        hint={t('dateHint')}
      >
        {(control) => <input type="date" {...control} {...register('date')} />}
      </FormField>

      <FormField
        label={t('description')}
        wide
        error={errors.description?.message ? v(errors.description.message) : undefined}
      >
        {(control) => <textarea rows={4} {...control} {...register('description')} />}
      </FormField>
      <FormField
        label={t('warehouse')}
        wide
        hint={t('warehouseHint')}
        error={
          errors.warehouseId?.message
            ? errors.warehouseId.message === 'staleWarehouse'
              ? t('staleWarehouse')
              : v(errors.warehouseId.message)
            : undefined
        }
      >
        {(control) => (
          <select {...control} {...register('warehouseId')}>
            <option value="">{t('unassigned')}</option>
            {warehouseId !== '' &&
              !warehouses.some((warehouse) => String(warehouse.id) === warehouseId) && (
                <option value={warehouseId} disabled>
                  {t('unavailableWarehouse', { id: warehouseId })}
                </option>
              )}
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} — {warehouse.address}
              </option>
            ))}
          </select>
        )}
      </FormField>
    </FormLayout>
  );
}
