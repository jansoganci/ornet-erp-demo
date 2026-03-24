import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Footer - App-wide footer
 * Sticks to bottom when content is short. Dark mode compatible.
 */
export function Footer() {
  const { t } = useTranslation('common');

  return (
    <footer
      className="mt-auto border-t border-neutral-200 dark:border-[#262626] bg-white dark:bg-[#171717] px-4 sm:px-6 lg:px-8 py-2 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-2"
      role="contentinfo"
    >
      <div className="flex flex-row flex-wrap items-center justify-center gap-x-2 gap-y-0 text-xs text-neutral-500 dark:text-neutral-400">
        <span>© {new Date().getFullYear()} {t('footer.copyright')}</span>
        <span className="text-neutral-300 dark:text-[#404040]">·</span>
        <Link to="/support" className="hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
          {t('footer.support')}
        </Link>
        <span className="text-neutral-300 dark:text-[#404040]">·</span>
        <Link to="/privacy" className="hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
          {t('footer.privacy')}
        </Link>
      </div>
    </footer>
  );
}
