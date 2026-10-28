/**
 * CWTSConnect — Universal Document & Image Viewer Modal
 * Provides in-app modal preview for images and PDF documents
 * Eliminates the need to open external tabs when viewing student CMO requirements
 */

(function () {
  'use strict';

  // Viewer state
  const state = {
    isOpen: false,
    url: '',
    title: '',
    fileName: '',
    status: '',
    date: '',
    isImage: false,
    zoom: 1.0,
    minZoom: 0.25,
    maxZoom: 4.0,
    rotation: 0,
    panX: 0,
    panY: 0,
    isDragging: false,
    startX: 0,
    startY: 0
  };

  let modalEl = null;
  let imgEl = null;
  let iframeEl = null;
  let spinnerEl = null;
  let zoomLabelEl = null;
  let zoomControlsEl = null;

  /**
   * Helper to format date string
   */
  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * Checks if URL or filename indicates an image
   */
  function isImageUrl(url, fileName) {
    const target = (fileName || url || '').toLowerCase();
    if (/\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i.test(target)) return true;
    if (url && url.includes('/image/upload/')) return true;
    if (url && url.includes('cloudinary') && !url.endsWith('.pdf')) return true;
    return false;
  }

  /**
   * Builds the modal DOM element and inserts it into document.body
   */
  function createModalDOM() {
    if (document.getElementById('cwtsDocViewerModal')) {
      return document.getElementById('cwtsDocViewerModal');
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'cwtsDocViewerModal';
    backdrop.className = 'doc-viewer-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Document Viewer');

    backdrop.innerHTML = `
      <div class="doc-viewer-modal clean-lightbox" id="docViewerContainer">
        
        <!-- Floating Close Button -->
        <button type="button" class="doc-close-btn floating-close" id="docCloseBtn" title="Close Preview (Esc)" aria-label="Close Preview">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <!-- Modal Body -->
        <div class="doc-viewer-body checkerboard" id="docViewerBody">
          
          <!-- Loading Spinner -->
          <div class="doc-viewer-spinner" id="docViewerSpinner">
            <div class="doc-spinner-ring"></div>
            <span>Loading preview...</span>
          </div>

          <!-- Image Stage -->
          <div class="doc-image-viewport" id="docImageViewport">
            <img src="" alt="Preview" class="doc-preview-image" id="docPreviewImage" draggable="false" />
          </div>

          <!-- PDF Frame (Hidden by default) -->
          <iframe src="" class="doc-pdf-viewport" id="docPdfViewport" style="display: none;" title="PDF Preview"></iframe>

        </div>

      </div>
    `;

    document.body.appendChild(backdrop);
    bindEvents(backdrop);
    return backdrop;
  }

  /**
   * Applies current transform (zoom, pan, rotation) to preview image
   */
  function updateImageTransform() {
    if (!imgEl) return;
    imgEl.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom}) rotate(${state.rotation}deg)`;
    if (zoomLabelEl) {
      zoomLabelEl.textContent = `${Math.round(state.zoom * 100)}%`;
    }
  }

  /**
   * Resets transform to defaults
   */
  function resetTransform() {
    state.zoom = 1.0;
    state.rotation = 0;
    state.panX = 0;
    state.panY = 0;
    updateImageTransform();
  }

  /**
   * Zoom controls
   */
  function zoomIn() {
    state.zoom = Math.min(state.maxZoom, parseFloat((state.zoom + 0.25).toFixed(2)));
    updateImageTransform();
  }

  function zoomOut() {
    state.zoom = Math.max(state.minZoom, parseFloat((state.zoom - 0.25).toFixed(2)));
    updateImageTransform();
  }

  function rotate() {
    state.rotation = (state.rotation + 90) % 360;
    updateImageTransform();
  }

  /**
   * Binds user interaction listeners
   */
  function bindEvents(backdrop) {
    modalEl = backdrop;
    imgEl = backdrop.querySelector('#docPreviewImage');
    iframeEl = backdrop.querySelector('#docPdfViewport');
    spinnerEl = backdrop.querySelector('#docViewerSpinner');
    zoomLabelEl = backdrop.querySelector('#docZoomLabel');
    zoomControlsEl = backdrop.querySelector('#docZoomControls');

    const viewport = backdrop.querySelector('#docImageViewport');
    const container = backdrop.querySelector('#docViewerContainer');
    const closeBtn = backdrop.querySelector('#docCloseBtn');
    const footerCloseBtn = backdrop.querySelector('#docFooterCloseBtn');
    const zoomInBtn = backdrop.querySelector('#docZoomInBtn');
    const zoomOutBtn = backdrop.querySelector('#docZoomOutBtn');
    const rotateBtn = backdrop.querySelector('#docRotateBtn');

    // Close handlers
    if (closeBtn) closeBtn.addEventListener('click', closeDocumentViewer);
    if (footerCloseBtn) footerCloseBtn.addEventListener('click', closeDocumentViewer);

    backdrop.addEventListener('click', (e) => {
      // If clicking backdrop area outside container, close
      if (e.target === backdrop || e.target === viewport) {
        closeDocumentViewer();
      }
    });

    // Zoom Buttons (if present)
    if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
    if (zoomLabelEl) zoomLabelEl.addEventListener('click', resetTransform);
    if (rotateBtn) rotateBtn.addEventListener('click', rotate);

    // Disable right-click context menu (prevents "Save image as...", "Copy image address", etc.)
    if (viewport) viewport.addEventListener('contextmenu', (e) => e.preventDefault());
    if (imgEl) imgEl.addEventListener('contextmenu', (e) => e.preventDefault());
    if (container) {
      container.addEventListener('contextmenu', (e) => {
        if (state.isImage) e.preventDefault();
      });
    }

    // Disable image dragging to desktop or browser tab
    if (imgEl) imgEl.addEventListener('dragstart', (e) => e.preventDefault());

    // Mouse Wheel Zoom
    if (viewport) {
      viewport.addEventListener('wheel', (e) => {
        if (!state.isImage) return;
        e.preventDefault();
        if (e.deltaY < 0) {
          zoomIn();
        } else {
          zoomOut();
        }
      }, { passive: false });

      // Double-click to toggle zoom (fit <-> 1.5x)
      viewport.addEventListener('dblclick', (e) => {
        if (!state.isImage) return;
        e.preventDefault();
        if (state.zoom > 1.1) {
          resetTransform();
        } else {
          state.zoom = 1.75;
          updateImageTransform();
        }
      });

      // Drag / Pan Image
      viewport.addEventListener('mousedown', (e) => {
        if (!state.isImage) return;
        state.isDragging = true;
        state.startX = e.clientX - state.panX;
        state.startY = e.clientY - state.panY;
        viewport.classList.add('is-dragging');
      });
    }

    window.addEventListener('mousemove', (e) => {
      if (!state.isDragging || !state.isImage) return;
      e.preventDefault();
      state.panX = e.clientX - state.startX;
      state.panY = e.clientY - state.startY;
      updateImageTransform();
    });

    window.addEventListener('mouseup', () => {
      if (state.isDragging) {
        state.isDragging = false;
        if (viewport) viewport.classList.remove('is-dragging');
      }
    });

    // Keyboard Shortcuts (Esc, +, -, and block Ctrl+S saving)
    window.addEventListener('keydown', (e) => {
      if (!state.isOpen) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault(); // Block saving image to disk
      } else if (e.key === 'Escape') {
        closeDocumentViewer();
      } else if (state.isImage && (e.key === '+' || e.key === '=')) {
        zoomIn();
      } else if (state.isImage && (e.key === '-' || e.key === '_')) {
        zoomOut();
      } else if (state.isImage && (e.key === 'r' || e.key === 'R')) {
        rotate();
      }
    });
  }

  /**
   * Opens the Document Viewer Modal
   * Can accept either an options object or multiple positional arguments
   */
  function openDocumentViewer(urlOrOptions, title, fileName, status, date) {
    let opts = {};
    if (typeof urlOrOptions === 'object' && urlOrOptions !== null) {
      opts = urlOrOptions;
    } else {
      opts = {
        url: urlOrOptions,
        title: title || 'Document Preview',
        fileName: fileName || '',
        status: status || '',
        date: date || ''
      };
    }

    if (!opts.url || opts.url === 'null' || opts.url === 'undefined' || String(opts.url).includes('/undefined')) {
      console.warn('[DocViewer] Invalid or missing URL provided for document preview:', opts.url);
      return;
    }

    const backdrop = createModalDOM();
    state.isOpen = true;
    state.url = opts.url;
    state.title = opts.title || 'Document Preview';
    state.fileName = opts.fileName || (opts.url.split('/').pop().split('?')[0] || 'document');
    state.status = (opts.status || '').toLowerCase();
    state.date = opts.date || '';
    state.isImage = isImageUrl(opts.url, state.fileName);

    resetTransform();

    // Populate Headers (if present)
    const titleEl = backdrop.querySelector('#docViewerTitle');
    const filenameEl = backdrop.querySelector('#docViewerFilename');
    const statusPill = backdrop.querySelector('#docViewerStatusPill');
    const dateEl = backdrop.querySelector('#docViewerDate');
    const hintsEl = backdrop.querySelector('#docViewerHints');
    const iconBadge = backdrop.querySelector('#docViewerIcon');

    if (titleEl) titleEl.textContent = state.title;
    if (filenameEl) filenameEl.textContent = state.fileName;

    if (dateEl) {
      if (state.date) {
        dateEl.textContent = `Submitted: ${formatDisplayDate(state.date)}`;
        dateEl.style.display = 'inline';
      } else {
        dateEl.style.display = 'none';
      }
    }

    // Status pill
    if (statusPill) {
      if (state.status) {
        statusPill.textContent = state.status;
        statusPill.className = `doc-viewer-status-pill ${state.status}`;
        statusPill.style.display = 'inline-block';
      } else {
        statusPill.style.display = 'none';
      }
    }

    // Spinner
    if (spinnerEl) {
      spinnerEl.style.display = 'flex';
      spinnerEl.style.opacity = '1';
    }

    if (state.isImage) {
      // IMAGE MODE
      if (zoomControlsEl) zoomControlsEl.style.display = 'inline-flex';
      if (hintsEl) hintsEl.style.display = 'flex';
      if (iframeEl) {
        iframeEl.style.display = 'none';
        iframeEl.src = '';
      }
      if (imgEl) imgEl.style.display = 'block';

      if (iconBadge) {
        iconBadge.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        `;
      }

      // Set image source and dismiss spinner on load
      if (imgEl) {
        imgEl.onload = function () {
          if (spinnerEl) {
            spinnerEl.style.opacity = '0';
            setTimeout(() => { if (spinnerEl) spinnerEl.style.display = 'none'; }, 200);
          }
        };

        imgEl.onerror = function () {
          if (spinnerEl) {
            spinnerEl.innerHTML = `
              <div style="color: #ef4444; text-align: center; padding: 20px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="margin-bottom: 8px;">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p style="margin: 0; font-weight: 600;">Unable to render image preview.</p>
                <p style="margin: 4px 0 0; font-size: 0.8rem; color: #94a3b8;">Click "Download" or "Open in new tab" above to access the file.</p>
              </div>
            `;
          }
        };

        imgEl.src = state.url;
      }
    } else {
      // PDF / DOCUMENT MODE
      if (zoomControlsEl) zoomControlsEl.style.display = 'none';
      if (hintsEl) hintsEl.style.display = 'none';
      if (imgEl) {
        imgEl.style.display = 'none';
        imgEl.src = '';
      }
      if (iframeEl) {
        iframeEl.style.display = 'block';

        iframeEl.onload = function () {
          if (spinnerEl) {
            spinnerEl.style.opacity = '0';
            setTimeout(() => { if (spinnerEl) spinnerEl.style.display = 'none'; }, 200);
          }
        };

        iframeEl.src = `${state.url}#toolbar=1&navpanes=0`;
      }

      // Update Icon to Document Icon (if present)
      if (iconBadge) {
        iconBadge.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
          </svg>
        `;
      }
    }

    // Show backdrop
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent page scroll behind modal
  }

  /**
   * Closes Document Viewer Modal
   */
  function closeDocumentViewer() {
    if (!modalEl) return;
    modalEl.classList.remove('active');
    state.isOpen = false;
    document.body.style.overflow = '';

    if (iframeEl) {
      iframeEl.src = '';
    }
    if (imgEl) {
      imgEl.src = '';
    }
  }

  // Pre-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createModalDOM);
  } else {
    createModalDOM();
  }

  // Export globally
  window.openDocumentViewer = openDocumentViewer;
  window.closeDocumentViewer = closeDocumentViewer;
  window.previewDocument = openDocumentViewer;

})();
