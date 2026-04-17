/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Modal elements */
const productModal = document.getElementById("productModal");
const modalClose = document.querySelector(".modal-close");
const modalBackdrop = document.querySelector(".modal-backdrop");

/* Helper function to open product details modal */
function openProductModal(product) {
  document.getElementById("modalTitle").textContent = product.name;
  document.getElementById("modalBrand").textContent = product.brand;
  document.getElementById("modalDescription").textContent = product.description;
  document.getElementById("modalProductImage").src = product.image;
  document.getElementById("modalProductImage").alt = product.name;

  productModal.classList.add("active");
  productModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

/* Helper function to close product details modal */
function closeProductModal() {
  productModal.classList.remove("active");
  productModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "auto";
}

let allProducts = [];
let currentProducts = [];
let selectedProductIds = [];
let hasCategorySelection = false;

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;
selectedProductsList.innerHTML = `
  <div class="selected-products-empty">No products selected yet</div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  if (allProducts.length > 0) {
    return allProducts;
  }

  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

function isProductSelected(productId) {
  return selectedProductIds.includes(productId);
}

function updateSelectedProductsList() {
  if (selectedProductIds.length === 0) {
    selectedProductsList.innerHTML = `
      <div class="selected-products-empty">No products selected yet</div>
    `;
    return;
  }

  const selectedProducts = selectedProductIds
    .map((productId) => allProducts.find((product) => product.id === productId))
    .filter(Boolean);

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product-item">
          <div>
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
          </div>
          <button class="remove-product-btn" data-remove-id="${product.id}">
            Remove
          </button>
        </div>
      `,
    )
    .join("");
}

function renderCurrentProducts() {
  displayProducts(currentProducts);
  updateSelectedProductsList();
}

function toggleProductSelection(productId) {
  if (isProductSelected(productId)) {
    selectedProductIds = selectedProductIds.filter((id) => id !== productId);
  } else {
    selectedProductIds = [...selectedProductIds, productId];
  }

  renderCurrentProducts();
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  currentProducts = products;

  if (products.length === 0) {
    if (!hasCategorySelection) {
      productsContainer.innerHTML = `
        <div class="placeholder-message">Select a category to view products</div>
      `;
      return;
    }

    productsContainer.innerHTML = `
      <div class="placeholder-message">No products found for this category</div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card ${isProductSelected(product.id) ? "selected" : ""}" data-product-id="${product.id}" role="button" tabindex="0" aria-pressed="${isProductSelected(product.id)}" data-product-index="${allProducts.findIndex((p) => p.id === product.id)}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `,
    )
    .join("");
}

productsContainer.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-product-btn");

  if (removeButton) {
    const productId = Number(removeButton.dataset.removeId);
    selectedProductIds = selectedProductIds.filter((id) => id !== productId);
    renderCurrentProducts();
    return;
  }

  const card = event.target.closest(".product-card");

  if (!card) {
    return;
  }

  /* Check if the click is on the image or product info area */
  const clickedElement = event.target.closest("img, .product-info");

  if (clickedElement) {
    /* Open modal if clicked on image or product info */
    const productId = Number(card.dataset.productId);
    const product = allProducts.find((p) => p.id === productId);
    if (product) {
      openProductModal(product);
    }
  } else {
    /* Toggle selection if clicked elsewhere on the card */
    toggleProductSelection(Number(card.dataset.productId));
  }
});

productsContainer.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest(".product-card");

  if (!card) {
    return;
  }

  event.preventDefault();
  toggleProductSelection(Number(card.dataset.productId));
});

/* Modal event listeners */
modalClose.addEventListener("click", closeProductModal);
modalBackdrop.addEventListener("click", closeProductModal);

/* Close modal when Escape key is pressed */
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && productModal.classList.contains("active")) {
    closeProductModal();
  }
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  hasCategorySelection = true;
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
  updateSelectedProductsList();
});

selectedProductsList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-product-btn");

  if (!removeButton) {
    return;
  }

  const productId = Number(removeButton.dataset.removeId);
  selectedProductIds = selectedProductIds.filter((id) => id !== productId);
  renderCurrentProducts();
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});

/* Helper function to get selected products with their details */
function getSelectedProductsData() {
  return selectedProductIds
    .map((productId) => allProducts.find((product) => product.id === productId))
    .filter(Boolean)
    .map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: product.description,
    }));
}

/* Helper function to call OpenAI API and generate routine */
async function generateRoutineFromAI(selectedProducts) {
  try {
    // Get API key from secrets.js
    if (!OPENAI_API_KEY || OPENAI_API_KEY === "your-api-key-here") {
      chatWindow.innerHTML = `
        <div class="chat-message error">
          <strong>API Key Not Configured</strong><br>
          Please add your OpenAI API key to the secrets.js file. Replace 'your-api-key-here' with your actual API key.
        </div>
      `;
      return;
    }

    // Show loading message
    chatWindow.innerHTML = `
      <div class="chat-message loading">
        <i class="fa-solid fa-spinner fa-spin"></i> Generating your personalized routine...
      </div>
    `;

    // Create the prompt for OpenAI
    const productsList = selectedProducts
      .map(
        (product) =>
          `- ${product.name} (${product.brand}) - Category: ${product.category}\n  Description: ${product.description}`,
      )
      .join("\n");

    const userMessage = `I have selected the following products for my skincare/haircare routine:\n\n${productsList}\n\nPlease create a detailed, personalized daily routine using these products. Include morning and evening routines, application order, timing, and tips for best results.`;

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a beauty and skincare expert. Provide clear, actionable routine recommendations based on the user's selected products.",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message ||
          "Failed to generate routine from OpenAI API",
      );
    }

    const data = await response.json();
    const routineText = data.choices[0].message.content;

    // Display the routine in chat window
    chatWindow.innerHTML = `
      <div class="chat-message routine">
        <h3>Your Personalized Routine</h3>
        <div class="routine-content">${formatRoutineText(routineText)}</div>
      </div>
    `;
  } catch (error) {
    chatWindow.innerHTML = `
      <div class="chat-message error">
        <strong>Error generating routine:</strong> ${error.message}
      </div>
    `;
    console.error("Error:", error);
  }
}

/* Helper function to format routine text with better styling */
function formatRoutineText(text) {
  return text
    .split("\n")
    .map((line) => {
      if (line.trim() === "") return "<br>";
      if (line.match(/^#+\s/)) {
        const level = line.match(/^#+/)[0].length;
        const content = line.replace(/^#+\s/, "");
        return `<h${level} style="margin-top: 12px; margin-bottom: 8px;">${content}</h${level}>`;
      }
      if (line.match(/^[-*•]\s/)) {
        return `<li>${line.replace(/^[-*•]\s/, "")}</li>`;
      }
      if (line.match(/^\d+\.\s/)) {
        return `<li>${line}</li>`;
      }
      return `<p>${line}</p>`;
    })
    .join("");
}

/* Generate Routine button click handler */
generateRoutineButton.addEventListener("click", async () => {
  const selectedProducts = getSelectedProductsData();

  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = `
      <div class="chat-message error">
        Please select at least one product before generating a routine.
      </div>
    `;
    return;
  }

  await generateRoutineFromAI(selectedProducts);
});
