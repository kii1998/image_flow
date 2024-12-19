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
        grid-template-columns: repeat(5, 1fr); /* 5 columns */
        gap: 15px;
        margin-top: 20px;
      }
      .image-item {
        position: relative;
        /* Ensures that each image item is a grid cell */
      }
      .line-number {
        position: absolute;
        top: 5px;
        left: 5px;
        background-color: rgba(255, 255, 255, 0.7);
        padding: 2px 5px;
        border-radius: 3px;
        font-weight: bold;
        z-index: 2;
      }
      .image-wrapper {
        position: relative;
      }
      .image-wrapper img {
        width: 100%;
        height: auto;
        object-fit: cover;
        border: 1px solid #ccc;
        border-radius: 5px;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        transform-origin: center center;
        z-index: 1; /* Base z-index */
        cursor: grab; /* Indicate draggable items */
      }
      .image-wrapper img:active {
        cursor: grabbing; /* Change cursor when dragging */
      }
      .image-wrapper img:hover {
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
          grid-template-columns: repeat(4, 1fr); /* 4 columns */
        }
      }

      @media (max-width: 992px) {
        .image-container {
          grid-template-columns: repeat(3, 1fr); /* 3 columns */
        }
      }

      @media (max-width: 768px) {
        .image-container {
          grid-template-columns: repeat(2, 1fr); /* 2 columns */
        }
      }

      @media (max-width: 576px) {
        .image-container {
          grid-template-columns: repeat(1, 1fr); /* 1 column */
        }
      }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="mb-4">Image URL Viewer</h1>
        <form id="image-form" method="POST">
            <div class="mb-3">
                <label for="urls" class="form-label">Enter Image URLs (one per line or separated by spaces):</label>
                <textarea class="form-control" id="urls" name="urls" rows="5" placeholder="Paste image URLs here...">${escapeHtml(urlsInput)}</textarea>
            </div>
            <button class="btn btn-primary" type="submit">Show Images</button>
        </form>

        ${images.length > 0 ? `
        <div id="image-container" class="image-container">
            <!-- Images will be loaded here -->
        </div>
        <div id="loading" class="text-center my-4" style="display: none;">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
        </div>
        ` : ''}
    </div>
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- SortableJS Library -->
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const imageContainer = document.getElementById('image-container');
        if (imageContainer) {
          // Initialize SortableJS
          const sortable = Sortable.create(imageContainer, {
            animation: 150, // Smooth animation when dragging
            ghostClass: 'sortable-ghost', // Class name for the drop placeholder
            chosenClass: 'sortable-chosen', // Class name for the chosen item
            dragClass: 'sortable-drag', // Class name for the dragged item
            onEnd: function (evt) {
              console.log('Image reordered');
              updateLineNumbers();
              saveOrderToLocalStorage();
            },
          });

          // Initial batch load
          let currentBatch = 0;
          const batchSize = 50;
          const totalImages = window.allImages.length;
          loadNextBatch();

          // Listen for scroll to load more images
          window.addEventListener('scroll', debounce(() => {
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
              loadNextBatch();
            }
          }, 200)); // Debounced to prevent excessive calls

          function loadNextBatch() {
            if ((currentBatch * batchSize) >= totalImages) return; // All images loaded
            document.getElementById('loading').style.display = 'block';
            setTimeout(() => { // Simulate async loading
              const start = currentBatch * batchSize;
              const end = Math.min(start + batchSize, totalImages);
              for (let i = start; i < end; i++) {
                const imgItem = createImageItem(i + 1, window.allImages[i]);
                imageContainer.appendChild(imgItem);
              }
              currentBatch++;
              document.getElementById('loading').style.display = 'none';
              updateLineNumbers();
            }, 500); // Simulate network delay
          }

          function createImageItem(lineNumber, src) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'image-item';

            const numberDiv = document.createElement('div');
            numberDiv.className = 'line-number';
            numberDiv.textContent = lineNumber;

            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'image-wrapper';

            const img = document.createElement('img');
            img.src = src;
            img.alt = 'Image ' + lineNumber;
            img.loading = 'lazy';
            img.onerror = function() { this.style.display = 'none'; };

            imageWrapper.appendChild(img);
            itemDiv.appendChild(numberDiv);
            itemDiv.appendChild(imageWrapper);

            return itemDiv;
          }

          function updateLineNumbers() {
            const numberDivs = imageContainer.querySelectorAll('.line-number');
            numberDivs.forEach((div, index) => {
              div.textContent = index + 1;
            });
          }

          // Debounce function to limit the rate at which a function can fire.
          function debounce(func, wait) {
            let timeout;
            return function(...args) {
              clearTimeout(timeout);
              timeout = setTimeout(() => func.apply(this, args), wait);
            };
          }

          // Persist image order using localStorage
          function saveOrderToLocalStorage() {
            const order = [];
            const images = document.querySelectorAll('.image-wrapper img');
            images.forEach(img => {
              order.push(img.src);
            });
            localStorage.setItem('imageOrder', JSON.stringify(order));
          }

          // Load saved order on page load
          const savedOrder = localStorage.getItem('imageOrder');
          if (savedOrder) {
            const order = JSON.parse(savedOrder);
            imageContainer.innerHTML = '';
            order.forEach((src, index) => {
              const imgItem = createImageItem(index + 1, src);
              imageContainer.appendChild(imgItem);
            });
            currentBatch = Math.ceil(order.length / batchSize);
            updateLineNumbers();
          }
        }
      });

      // Pass all images to the client side
      const allImages = ${JSON.stringify(images)};
      window.allImages = allImages;
    </script>
</body>
</html>
`

// Utility function to escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return ''
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
    })[s] || s
  })
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
function parseImageUrls(input, limit = 500) { // Increased limit to 500
  const urls = input.split(/\n+/).map(url => url.trim()).filter(url => url.length > 0)
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
