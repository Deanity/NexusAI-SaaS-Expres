/**
 * copy.js NexusAI Docs
 * Copy-to-clipboard for all code blocks.
 * Uses the Clipboard API with a fallback to execCommand.
 */

(function () {
  'use strict';

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for non-HTTPS or older browsers
    return new Promise(function (resolve, reject) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textarea);
        resolve();
      } catch (err) {
        document.body.removeChild(textarea);
        reject(err);
      }
    });
  }

  function initCopyButtons() {
    document.querySelectorAll('.code-block__copy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const block = btn.closest('.code-block');
        if (!block) return;

        const pre = block.querySelector('pre');
        const text = pre ? pre.innerText || pre.textContent : '';

        copyText(text)
          .then(function () {
            btn.classList.add('is-copied');
            const originalText = btn.innerHTML;
            btn.innerHTML = '✓ Copied';
            btn.setAttribute('aria-label', 'Copied!');

            setTimeout(function () {
              btn.classList.remove('is-copied');
              btn.innerHTML = originalText;
              btn.setAttribute('aria-label', 'Copy to clipboard');
            }, 2000);
          })
          .catch(function () {
            // Silent fail still usable without clipboard access
          });
      });
    });
  }

  /* Base URL copy button on landing page */
  function initBaseUrlCopy() {
    const btn = document.querySelector('.base-url-copy');
    if (!btn) return;

    btn.addEventListener('click', function () {
      const url = document.querySelector('.base-url-text');
      const text = url ? url.textContent.trim() : '';

      copyText(text)
        .then(function () {
          btn.textContent = '✓ Copied';
          setTimeout(function () {
            btn.textContent = 'Copy';
          }, 2000);
        })
        .catch(function () {});
    });
  }

  /* Auth Key Display: reveal / copy */
  function initAuthKeyDisplay() {
    document.querySelectorAll('.auth-key-display').forEach(function (display) {
      const valueEl = display.querySelector('.auth-key-display__value');
      const revealBtn = display.querySelector('.auth-key-reveal');
      const copyBtn = display.querySelector('.auth-key-copy');

      if (!valueEl) return;

      const maskedValue = valueEl.textContent.trim();
      // Store real value in data attribute
      const realValue = valueEl.dataset.real || maskedValue;

      let isRevealed = false;

      if (revealBtn) {
        revealBtn.addEventListener('click', function () {
          isRevealed = !isRevealed;

          if (isRevealed) {
            valueEl.textContent = realValue;
            valueEl.classList.remove('is-masked');
            revealBtn.textContent = 'Hide';
            revealBtn.setAttribute('aria-label', 'Hide API key');
          } else {
            valueEl.textContent = maskedValue;
            valueEl.classList.add('is-masked');
            revealBtn.textContent = 'Reveal';
            revealBtn.setAttribute('aria-label', 'Reveal API key');
          }
        });
      }

      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          copyText(realValue)
            .then(function () {
              copyBtn.textContent = '✓';
              setTimeout(function () { copyBtn.textContent = 'Copy'; }, 2000);
            })
            .catch(function () {});
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initCopyButtons();
    initBaseUrlCopy();
    initAuthKeyDisplay();
  });

})();
