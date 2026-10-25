'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import type { NewOrder } from '@/shared/api/types';
import { useFormDraft } from '@/shared/hooks/useFormDraft';
import { FormField } from '@/shared/ui/FormField';
import { FormLayout } from '@/shared/ui/FormLayout';

import { emptyOrderForm, orderFormSchema, type OrderFormValues, toNewOrder } from '../../schema';

interface OrderFormProps {
  /** Sends the order. Answers with the reason it was refused, or `undefined` when it was saved. */
  onSubmit: (order: NewOrder) => Promise<string | undefined>;
}

/** The form of a new order: a title, an optional description and an optional date. */
export function OrderForm({ onSubmit }: OrderFormProps) {
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
    formState: { errors, isSubmitting },
  } = form;
  const [submitError, setSubmitError] = useState<string>();
  const draft = useFormDraft('order', form, emptyOrderForm);

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
          const snapshot = draft.snapshot();
          const error = await onSubmit(toNewOrder(values));
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
    </FormLayout>
  );
}
