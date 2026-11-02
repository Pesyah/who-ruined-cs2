import { useTranslation } from 'react-i18next';
import { ErrorState } from '../shared/ui/States.js';

export function RouteError() {
  const { t } = useTranslation();
  return <main className="container route-error"><ErrorState message={t('error-general', 'Something went wrong. Please try again.')} retry={() => window.location.reload()}/></main>;
}

