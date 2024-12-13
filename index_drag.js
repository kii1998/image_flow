addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
  })
  
  const htmlTemplate = (images = [], urlsInput = "") => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <title>Image URL Viewer</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <!-- Bootstrap CSS for styling -->
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <!-- SortableJS CSS (optional if you want to style the drag handles) -->
      <style>
        body {
          background-color: #f8f9fa;
        }
        .container {
          max-width: 1200px; /* Increased width to better accommodate scaling */
          margin-top: 50px;
        }
        .image-container {
          display: grid;
          grid-template-columns: repeat(5, 1fr); /* Fixed 5 columns */
          gap: 15px;
          margin-top: 20px;
          /* No overflow properties to allow images to scale beyond their cells */
        }
        .image-container img {
          width: 100%;
          height: auto;
          object-fit: cover;
          border: 1px solid #ccc;
          border-radius: 5px;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          transform-origin: center center;
          position: relative; /* Necessary for z-index to work */
          z-index: 1; /* Base z-index */
          pointer-events: auto; /* Ensure hover works correctly */
          will-change: transform; /* Optimize performance */
          cursor: grab; /* Indicate draggable items */
        }
        .image-container img:active {
          cursor: grabbing; /* Change cursor when dragging */
        }
        .image-container img:hover {
          transform: scale(1.5); /* Enlarges the image to 1.5x */
          z-index: 10; /* Brings the hovered image above others */
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3); /* Adds depth */
        }
  
        /* Placeholder Styling */
        .sortable-ghost {
          opacity: 0.6;
          background-color: #ffeeba;
          border: 2px dashed #ffc107;
          border-radius: 5px;
          height: 100%;
        }
  
        /* Chosen Item Styling */
        .sortable-chosen {
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
        }
  
        /* Responsive Adjustments */
        @media (max-width: 1200px) {
          .image-container {
            grid-template-columns: repeat(4, 1fr);
          }
        }
  
        @media (max-width: 992px) {
          .image-container {
            grid-template-columns: repeat(3, 1fr);
          }
        }
  
        @media (max-width: 768px) {
          .image-container {
            grid-template-columns: repeat(2, 1fr);
          }
        }
  
        @media (max-width: 576px) {
          .image-container {
            grid-template-columns: repeat(1, 1fr);
          }
        }
      </style>
  </head>
  <body>
      <div class="container">
          <h1 class="mb-4">Image URL Viewer</h1>
          <form method="POST">
              <div class="mb-3">
                  <label for="urls" class="form-label">Enter Image URLs (one per line or separated by spaces):</label>
                  <textarea class="form-control" id="urls" name="urls" rows="5" placeholder="Paste image URLs here...">${escapeHtml(urlsInput)}</textarea>
              </div>
              <button class="btn btn-primary" type="submit">Show Images</button>
          </form>
  
          ${images.length > 0 ? `
          <div id="sortable" class="image-container">
              ${images.map(url => `<img src="${escapeHtml(url)}" alt="Image" loading="lazy" onerror="this.style.display='none'"/>`).join('')}
          </div>
          ` : ''}
      </div>
      <!-- Bootstrap JS -->
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      <!-- SortableJS Library -->
      <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
      <script>
        // Initialize SortableJS on the image container
        document.addEventListener('DOMContentLoaded', function() {
          var sortable = Sortable.create(document.getElementById('sortable'), {
            animation: 150, // Smooth animation when dragging
            ghostClass: 'sortable-ghost', // Class name for the drop placeholder
            chosenClass: 'sortable-chosen', // Class name for the chosen item
            dragClass: 'sortable-drag', // Class name for the dragged item
            forceFallback: false, // Use native drag and drop
            swapThreshold: 0.65, // Define how much the item needs to overlap to trigger a swap
            // Optional: Restrict to only drag images
            filter: '.no-drag',
            // Optional: Handle events after reordering
            onEnd: function (evt) {
              console.log('Image reordered');
              // Optionally, you can send the new order to the server or save it locally
            },
          });
        });
      </script>
  </body>
  </html>
  `
  
  // Utility function to escape HTML to prevent XSS
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"'`=\/]/g, function(s) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
      })[s] || s;
    });
  }
  
  async function handleRequest(request) {
    if (request.method === 'GET') {
      return new Response(htmlTemplate(), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      })
    } else if (request.method === 'POST') {
      const contentType = request.headers.get('Content-Type') || ''
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData()
        const urls = formData.get('urls') || ''
        const images = parseImageUrls(urls)
        return new Response(htmlTemplate(images, urls), {
          headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        })
      } else {
        return new Response('Unsupported Content-Type', { status: 400 })
      }
    } else {
      return new Response('Method Not Allowed', { status: 405 })
    }
  }
  
  // Function to parse image URLs from input
  function parseImageUrls(input, limit = 50) { // Example limit set to 50
    const urls = input.split(/\s+/).map(url => url.trim()).filter(url => url.length > 0)
    const validUrls = urls.filter(url => isValidUrl(url))
    return validUrls.slice(0, limit)
  }
  
  // Simple URL validation
  function isValidUrl(string) {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }
  