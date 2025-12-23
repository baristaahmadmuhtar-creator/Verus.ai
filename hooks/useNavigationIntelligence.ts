
import { useState, useEffect, useRef } from 'react';

export const useNavigationIntelligence = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isUserActive, setIsUserActive] = useState(true);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSelectionActive, setIsSelectionActive] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const lastScrollY = useRef(0);
  const scrollThreshold = 15;
  const idleTimer = useRef<number | null>(null);

  const resetIdleTimer = () => {
    setIsUserActive(true);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      setIsUserActive(false);
    }, 15000);
  };

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const classList = document.body.classList;
      setIsOverlayOpen(classList.contains('hide-dock-system-forced') || document.body.style.overflow === 'hidden');
      setIsInputFocused(classList.contains('chat-input-focused'));
      setIsSelectionActive(classList.contains('selection-mode-active'));
      setIsHistoryOpen(classList.contains('history-drawer-open'));
    });

    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class', 'style'] 
    });

    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keypress', resetIdleTimer);
    resetIdleTimer();

    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      if (currentScrollY > lastScrollY.current + scrollThreshold && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current - scrollThreshold) {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
      resetIdleTimer();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keypress', resetIdleTimer);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      observer.disconnect();
    };
  }, []);

  // Rules for Hiding Sidebar completely:
  // 1. If any input is focused
  // 2. If SmartNotes selection is active
  // 3. If Chat History is open
  const isForcedStealth = isInputFocused || isSelectionActive || isHistoryOpen;
  
  // Standard stealth (auto-hide on scroll)
  const shouldShowNav = (isVisible || !isUserActive) && !isOverlayOpen && !isForcedStealth;

  return { shouldShowNav, isForcedStealth, isInputFocused, isHistoryOpen };
};
