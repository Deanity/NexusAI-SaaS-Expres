/**
 * nav.js NexusAI Docs
 * Sidebar active state, mobile drawer toggle, smooth collapsible sections
 */

(function () {
  'use strict';

  /* ------------------------------------------------
     Active nav item
     Marks the current page's nav link as active
  ------------------------------------------------ */
  function setActiveNavItem() {
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split('/').pop() || 'index.html';

    document.querySelectorAll('.nav-item').forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href) return;

      const linkFile = href.split('/').pop();

      if (
        linkFile === currentFile ||
        (currentFile === '' && linkFile === 'index.html')
      ) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');

        // Scroll active item into view in the sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
          const itemTop = link.offsetTop;
          const sidebarHeight = sidebar.clientHeight;
          if (itemTop > sidebarHeight / 2) {
            sidebar.scrollTop = itemTop - sidebarHeight / 3;
          }
        }
      } else {
        link.classList.remove('is-active');
        link.removeAttribute('aria-current');
      }
    });
  }

  /* ------------------------------------------------
     Mobile drawer toggle
  ------------------------------------------------ */
  function initMobileDrawer() {
    const hamburger = document.querySelector('.topbar__hamburger');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (!hamburger || !sidebar) return;

    function openDrawer() {
      sidebar.classList.add('is-open');
      if (overlay) {
        overlay.classList.add('is-visible');
        overlay.setAttribute('aria-hidden', 'false');
      }
      hamburger.setAttribute('aria-expanded', 'true');
      sidebar.setAttribute('aria-hidden', 'false');
      // Trap focus inside sidebar
      const firstFocusable = sidebar.querySelector('a, button, input');
      if (firstFocusable) firstFocusable.focus();
    }

    function closeDrawer() {
      sidebar.classList.remove('is-open');
      if (overlay) {
        overlay.classList.remove('is-visible');
        overlay.setAttribute('aria-hidden', 'true');
      }
      hamburger.setAttribute('aria-expanded', 'false');
      sidebar.setAttribute('aria-hidden', 'true');
      hamburger.focus();
    }

    hamburger.addEventListener('click', function () {
      const isOpen = sidebar.classList.contains('is-open');
      isOpen ? closeDrawer() : openDrawer();
    });

    if (overlay) {
      overlay.addEventListener('click', closeDrawer);
    }

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    // Close drawer when a nav link is clicked on mobile
    sidebar.querySelectorAll('.nav-item').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.innerWidth < 768) {
          closeDrawer();
        }
      });
    });
  }

  /* ------------------------------------------------
     Collapsible param sections
     <button class="param-section__toggle" aria-expanded="false">
       Section name <span class="chevron">▾</span>
     </button>
     <div class="param-section__content">...</div>
  ------------------------------------------------ */
  function initCollapsibles() {
    document.querySelectorAll('.param-section__toggle').forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        const contentId = toggle.getAttribute('aria-controls');
        const content = contentId
          ? document.getElementById(contentId)
          : toggle.nextElementSibling;

        if (!content) return;

        if (isExpanded) {
          toggle.setAttribute('aria-expanded', 'false');
          content.classList.remove('is-open');
        } else {
          toggle.setAttribute('aria-expanded', 'true');
          content.classList.add('is-open');
        }
      });
    });

    // Open first section by default on each endpoint block
    document.querySelectorAll('.endpoint-block').forEach(function (block) {
      const firstToggle = block.querySelector('.param-section__toggle');
      if (firstToggle) {
        firstToggle.setAttribute('aria-expanded', 'true');
        const firstContent = firstToggle.nextElementSibling;
        if (firstContent) firstContent.classList.add('is-open');
      }
    });
  }

  /* ------------------------------------------------
     Highlight.js: auto-highlight all code blocks
  ------------------------------------------------ */
  function initHighlight() {
    if (typeof hljs !== 'undefined') {
      document.querySelectorAll('pre code').forEach(function (block) {
        hljs.highlightElement(block);
      });
    }
  }

  /* ------------------------------------------------
     Init
  ------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    setActiveNavItem();
    initMobileDrawer();
    initCollapsibles();
    initHighlight();
  });

})();
