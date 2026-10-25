import { FormMessages } from '@/shared/i18n/FormMessages.server';

import { dictionary } from '../OrderForm/messages.server';
import { NewOrderContainer } from '.';
export async function NewOrderContent() {
  return (
    <FormMessages name="OrderForm" dictionary={await dictionary()}>
      <NewOrderContainer />
    </FormMessages>
  );
}
