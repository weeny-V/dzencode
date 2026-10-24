'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import type { NewOrder } from '@/shared/api/types';
import { FormField } from '@/shared/ui/FormField';
import { FormLayout } from '@/shared/ui/FormLayout';

import { emptyOrderForm, orderFormSchema, type OrderFormValues, toNewOrder } from '../../schema';

interface OrderFormProps {
  /** Sends the order. Answers with the reason it was refused, or `undefined` when it was saved. */
  onSubmit: (order: NewOrder) => Promise<string | undefined>;
}

/** The form of a new order: a title, an optional description and an optional date. */
export function OrderForm({ onSubmit }: OrderFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: emptyOrderForm,
    // Errors appear when the visitor leaves a field or presses the button, then follow every change.
    mode: 'onTouched',
  });
  const [submitError, setSubmitError] = useState<string>();

  return (
    <FormLayout
      title="Новый приход"
      submitLabel="Создать приход"
      cancelHref="/orders"
      submitting={isSubmitting}
      error={submitError}
      onSubmit={(event) =>
        void handleSubmit(async (values) => {
          setSubmitError(await onSubmit(toNewOrder(values)));
        })(event)
      }
    >
      <FormField label="Название" required wide error={errors.title?.message}>
        {(control) => <input type="text" autoComplete="off" {...control} {...register('title')} />}
      </FormField>

      <FormField
        label="Дата"
        error={errors.date?.message}
        hint="Если не указана, будет сегодняшняя."
      >
        {(control) => <input type="date" {...control} {...register('date')} />}
      </FormField>

      <FormField label="Описание" wide error={errors.description?.message}>
        {(control) => <textarea rows={4} {...control} {...register('description')} />}
      </FormField>
    </FormLayout>
  );
}
