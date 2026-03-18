import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Hook to block navigation when a form has unsaved changes.
 *
 * useBlocker intercepts ALL internal navigation automatically:
 * sidebar NavLinks, browser back/forward, programmatic navigate().
 * beforeunload handles tab close and page refresh separately.
 *
 * @param {Object} options
 * @param {boolean} options.isDirty - Whether the form has unsaved changes
 * @param {React.RefObject<boolean>} [options.skipBlockingRef] - When .current is true, do not block (e.g. after successful save)
 *
 * Returns the native blocker object: { state, proceed, reset }
 */
export function useUnsavedChanges({ isDirty, skipBlockingRef }) {
  // Block all internal navigation while form is dirty (read ref inside predicate so it's evaluated at block-time)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !(skipBlockingRef?.current) &&
      isDirty &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Block tab close / page refresh (native browser dialog) — read ref at event time
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const skip = skipBlockingRef?.current;
      if (!skip && isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, skipBlockingRef]);

  return blocker;
}
