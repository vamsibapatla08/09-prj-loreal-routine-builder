/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

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
    <div class="product-card ${isProductSelected(product.id) ? "selected" : ""}" data-product-id="${product.id}" role="button" tabindex="0" aria-pressed="${isProductSelected(product.id)}">
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

  toggleProductSelection(Number(card.dataset.productId));
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

generateRoutineButton.addEventListener("click", () => {
  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});
