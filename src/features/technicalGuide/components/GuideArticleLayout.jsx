import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageContainer, PageHeader } from '../../../components/layout';

/**
 * Shared layout for technical guide articles (typography + back link).
 */
export function GuideArticleLayout({ title, children }) {
  const { t } = useTranslation('technicalGuide');

  return (
    <PageContainer maxWidth="full" padding="default" className="space-y-6">
      <div>
        <Link
          to="/technical-guide"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {t('article.backToList')}
        </Link>
      </div>
      <PageHeader title={title} />
      <article className="w-full text-base leading-relaxed text-neutral-800 dark:text-neutral-200">
        {children}
      </article>
    </PageContainer>
  );
}
