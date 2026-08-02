/**
 * search.js NexusAI Docs
 * Client-side endpoint search with ⌘K / Ctrl+K keyboard shortcut.
 * Reads from a hand-maintained search-index.json manifest.
 */

(function () {
  'use strict';

  /* ------------------------------------------------
     Search index all endpoints across all modules.
     Each entry: { method, path, module, href }
  ------------------------------------------------ */
  var INDEX = [
    // Auth
    { method: 'POST',   path: '/auth/register',             module: 'Auth',         href: 'pages/auth.html#register' },
    { method: 'POST',   path: '/auth/login',                module: 'Auth',         href: 'pages/auth.html#login' },
    { method: 'POST',   path: '/auth/refresh',              module: 'Auth',         href: 'pages/auth.html#refresh' },
    { method: 'POST',   path: '/auth/logout',               module: 'Auth',         href: 'pages/auth.html#logout' },
    { method: 'POST',   path: '/auth/logout-all',           module: 'Auth',         href: 'pages/auth.html#logout-all' },
    { method: 'POST',   path: '/auth/verify-email',         module: 'Auth',         href: 'pages/auth.html#verify-email' },
    { method: 'POST',   path: '/auth/resend-verification',  module: 'Auth',         href: 'pages/auth.html#resend-verification' },
    { method: 'POST',   path: '/auth/forgot-password',      module: 'Auth',         href: 'pages/auth.html#forgot-password' },
    { method: 'POST',   path: '/auth/reset-password',       module: 'Auth',         href: 'pages/auth.html#reset-password' },
    // User
    { method: 'GET',    path: '/users/me',                  module: 'User',         href: 'pages/user.html#me' },
    { method: 'PATCH',  path: '/users/me',                  module: 'User',         href: 'pages/user.html#update-me' },
    { method: 'PATCH',  path: '/users/me/password',         module: 'User',         href: 'pages/user.html#change-password' },
    { method: 'DELETE', path: '/users/me',                  module: 'User',         href: 'pages/user.html#delete-me' },
    // AI Chat
    { method: 'POST',   path: '/ai/chat',                   module: 'AI Chat',      href: 'pages/ai.html#chat' },
    // Conversation
    { method: 'GET',    path: '/conversations',             module: 'Conversation', href: 'pages/conversation.html#list' },
    { method: 'POST',   path: '/conversations',             module: 'Conversation', href: 'pages/conversation.html#create' },
    { method: 'GET',    path: '/conversations/:id',         module: 'Conversation', href: 'pages/conversation.html#get' },
    { method: 'PATCH',  path: '/conversations/:id',         module: 'Conversation', href: 'pages/conversation.html#update' },
    { method: 'DELETE', path: '/conversations/:id',         module: 'Conversation', href: 'pages/conversation.html#archive' },
    { method: 'GET',    path: '/conversations/:id/messages',module: 'Conversation', href: 'pages/conversation.html#messages' },
    { method: 'DELETE', path: '/conversations/:id/messages',module: 'Conversation', href: 'pages/conversation.html#clear-messages' },
    // Credits
    { method: 'GET',    path: '/credits/balance',           module: 'Credits',      href: 'pages/credit.html#balance' },
    { method: 'GET',    path: '/credits/history',           module: 'Credits',      href: 'pages/credit.html#history' },
    { method: 'POST',   path: '/credits/purchase',          module: 'Credits',      href: 'pages/credit.html#purchase' },
    // API Keys
    { method: 'GET',    path: '/api-keys',                  module: 'API Keys',     href: 'pages/api-keys.html#list' },
    { method: 'POST',   path: '/api-keys',                  module: 'API Keys',     href: 'pages/api-keys.html#create' },
    { method: 'PATCH',  path: '/api-keys/:id',              module: 'API Keys',     href: 'pages/api-keys.html#update' },
    { method: 'DELETE', path: '/api-keys/:id',              module: 'API Keys',     href: 'pages/api-keys.html#revoke' },
    { method: 'POST',   path: '/api-keys/:id/rotate',       module: 'API Keys',     href: 'pages/api-keys.html#rotate' },
    // Subscriptions
    { method: 'GET',    path: '/plans',                     module: 'Subscription', href: 'pages/subscription.html#plans' },
    { method: 'GET',    path: '/plans/:slug',               module: 'Subscription', href: 'pages/subscription.html#plan-detail' },
    { method: 'POST',   path: '/subscriptions',             module: 'Subscription', href: 'pages/subscription.html#subscribe' },
    { method: 'GET',    path: '/subscriptions/current',     module: 'Subscription', href: 'pages/subscription.html#current' },
    { method: 'POST',   path: '/subscriptions/cancel',      module: 'Subscription', href: 'pages/subscription.html#cancel' },
    // Analytics
    { method: 'GET',    path: '/analytics/overview',        module: 'Analytics',    href: 'pages/analytics.html#overview' },
    { method: 'GET',    path: '/analytics/daily',           module: 'Analytics',    href: 'pages/analytics.html#daily' },
    { method: 'GET',    path: '/analytics/models',          module: 'Analytics',    href: 'pages/analytics.html#models' },
    { method: 'GET',    path: '/analytics/api-keys',        module: 'Analytics',    href: 'pages/analytics.html#api-keys' },
    // Admin
    { method: 'GET',    path: '/admin/users',               module: 'Admin',        href: 'pages/admin.html#users' },
    { method: 'GET',    path: '/admin/users/:id',           module: 'Admin',        href: 'pages/admin.html#user-detail' },
    { method: 'PATCH',  path: '/admin/users/:id/ban',       module: 'Admin',        href: 'pages/admin.html#ban' },
    { method: 'PATCH',  path: '/admin/users/:id/unban',     module: 'Admin',        href: 'pages/admin.html#unban' },
    { method: 'POST',   path: '/admin/credits/adjust',      module: 'Admin',        href: 'pages/admin.html#credits-adjust' },
    { method: 'POST',   path: '/admin/plans',               module: 'Admin',        href: 'pages/admin.html#create-plan' },
    { method: 'PATCH',  path: '/admin/plans/:id',           module: 'Admin',        href: 'pages/admin.html#update-plan' },
    { method: 'GET',    path: '/admin/analytics/overview',  module: 'Admin',        href: 'pages/admin.html#analytics-overview' },
    { method: 'GET',    path: '/admin/analytics/users',     module: 'Admin',        href: 'pages/admin.html#analytics-users' },
  ];

  var METHOD_CLASSES = {
    GET:    'badge--get',
    POST:   'badge--post',
    PUT:    'badge--put',
    PATCH:  'badge--patch',
    DELETE: 'badge--delete',
  };

  /* ------------------------------------------------
     DOM refs (set on DOMContentLoaded)
  ------------------------------------------------ */
  var searchInput, resultsList, searchBox, focusedIndex;

  function buildBadge(method) {
    var span = document.createElement('span');
    span.className = 'badge ' + (METHOD_CLASSES[method] || '');
    span.setAttribute('aria-hidden', 'true');
    span.textContent = method;
    return span;
  }

  function renderResults(results) {
    resultsList.innerHTML = '';
    focusedIndex = -1;

    if (results.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'search-no-results';
      empty.textContent = 'no endpoints match';
      resultsList.appendChild(empty);
    } else {
      results.slice(0, 12).forEach(function (item, i) {
        var a = document.createElement('a');
        a.className = 'search-result-item';
        a.href = resolveHref(item.href);
        a.setAttribute('tabindex', '-1');
        a.dataset.index = i;

        a.appendChild(buildBadge(item.method));

        var path = document.createElement('span');
        path.className = 'search-result-item__path';
        path.textContent = item.path;
        a.appendChild(path);

        var mod = document.createElement('span');
        mod.className = 'search-result-item__module';
        mod.textContent = item.module;
        a.appendChild(mod);

        resultsList.appendChild(a);
      });
    }

    resultsList.classList.add('is-open');
  }

  /* Resolve href relative to current page location */
  function resolveHref(href) {
    // If we're on a pages/*.html, go up one level
    var isInPages = window.location.pathname.includes('/pages/');
    if (isInPages) {
      return '../' + href;
    }
    return href;
  }

  function filterIndex(query) {
    if (!query) return [];
    var q = query.toLowerCase();
    return INDEX.filter(function (item) {
      return (
        item.path.toLowerCase().includes(q) ||
        item.method.toLowerCase().includes(q) ||
        item.module.toLowerCase().includes(q)
      );
    });
  }

  function closeResults() {
    resultsList.classList.remove('is-open');
    resultsList.innerHTML = '';
    focusedIndex = -1;
  }

  function moveFocus(direction) {
    var items = resultsList.querySelectorAll('.search-result-item');
    if (!items.length) return;

    if (focusedIndex >= 0 && focusedIndex < items.length) {
      items[focusedIndex].classList.remove('is-focused');
    }

    focusedIndex = focusedIndex + direction;
    if (focusedIndex < 0) focusedIndex = items.length - 1;
    if (focusedIndex >= items.length) focusedIndex = 0;

    items[focusedIndex].classList.add('is-focused');
  }

  function initSearch() {
    searchInput = document.querySelector('.search-box__input');
    resultsList = document.querySelector('.search-results');
    searchBox = document.querySelector('.search-box');

    if (!searchInput || !resultsList) return;

    focusedIndex = -1;

    searchInput.addEventListener('input', function () {
      var q = searchInput.value.trim();
      if (!q) {
        closeResults();
        return;
      }
      renderResults(filterIndex(q));
    });

    searchInput.addEventListener('keydown', function (e) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          moveFocus(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          moveFocus(-1);
          break;
        case 'Enter': {
          var items = resultsList.querySelectorAll('.search-result-item');
          if (focusedIndex >= 0 && items[focusedIndex]) {
            window.location.href = items[focusedIndex].href;
          }
          break;
        }
        case 'Escape':
          closeResults();
          searchInput.blur();
          break;
      }
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!searchBox.contains(e.target)) {
        closeResults();
      }
    });
  }

  /* ------------------------------------------------
     ⌘K / Ctrl+K global shortcut
  ------------------------------------------------ */
  function initKeyboardShortcut() {
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initSearch();
    initKeyboardShortcut();
  });

})();
