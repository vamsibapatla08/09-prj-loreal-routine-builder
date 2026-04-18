/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const themeToggleButton = document.getElementById("themeToggleBtn");

/* Language and RTL elements 
const htmlElement = document.getElementById("htmlElement");
const enLangBtn = document.getElementById("enLangBtn");
const arLangBtn = document.getElementById("arLangBtn");*/

/* Helper function to set language and direction 
function setLanguage(lang) {
  const isRTL = lang === "ar";

  
  htmlElement.lang = lang;
  htmlElement.dir = isRTL ? "rtl" : "ltr";

  
  if (lang === "en") {
    enLangBtn.classList.add("active");
    arLangBtn.classList.remove("active");
  } else {
    enLangBtn.classList.remove("active");
    arLangBtn.classList.add("active");
  }

  
  localStorage.setItem("preferredLanguage", lang);
}*/

/* Modal elements */
const productModal = document.getElementById("productModal");
const modalClose = document.querySelector(".modal-close");
const modalBackdrop = document.querySelector(".modal-backdrop");

/* Confirmation modal elements */
const confirmationModal = document.getElementById("confirmationModal");
const confirmYesBtn = document.getElementById("confirmYesBtn");
const confirmNoBtn = document.getElementById("confirmNoBtn");

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

/* Helper function to open confirmation modal */
function openConfirmationModal() {
  confirmationModal.classList.add("active");
  confirmationModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

/* Helper function to close confirmation modal */
function closeConfirmationModal() {
  confirmationModal.classList.remove("active");
  confirmationModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "auto";
}

let allProducts = [];
let currentProducts = [];
let selectedProductIds = [];
let hasCategorySelection = false;
let conversationHistory = [];
let routineGenerated = false;
let currentSearchQuery = "";
let currentCategory = "";

/* localStorage key for saving selected products */
const STORAGE_KEY = "selectedProductIds";
const THEME_STORAGE_KEY = "preferredTheme";
const WORKER_ENDPOINT =
  typeof WORKER_URL !== "undefined" ? WORKER_URL.trim() : "";

/* Check that the worker endpoint was set in secrets.js */
function isWorkerConfigured() {
  return WORKER_ENDPOINT !== "";
}

/* Read assistant text from common response formats */
function getAssistantText(data) {
  if (data?.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  if (typeof data?.response === "string" && data.response.trim() !== "") {
    return data.response;
  }

  if (typeof data?.content === "string" && data.content.trim() !== "") {
    return data.content;
  }

  throw new Error("Worker returned an invalid response format.");
}

/* Send one chat completion request to your Cloudflare Worker */
async function requestWorker(messages, maxTokens = 1000) {
  if (!isWorkerConfigured()) {
    throw new Error(
      'Worker URL is missing. Add it in secrets.js as: const WORKER_URL = "https://late-leaf-b809.ravibapatla05usa.workers.dev/";',
    );
  }

  const response = await fetch(WORKER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        "Worker request failed. Please check your worker setup.",
    );
  }

  return getAssistantText(data);
}

/* Helper function to apply a visual theme and update button text/icon */
function applyTheme(theme) {
  const selectedTheme = theme === "dark" ? "dark" : "light";
  document.body.setAttribute("data-theme", selectedTheme);

  if (!themeToggleButton) {
    return;
  }

  if (selectedTheme === "dark") {
    themeToggleButton.innerHTML =
      '<i class="fa-solid fa-sun" aria-hidden="true"></i><span>Light Mode</span>';
    themeToggleButton.setAttribute("aria-label", "Switch to light mode");
    themeToggleButton.setAttribute("title", "Switch to light mode");
    return;
  }

  themeToggleButton.innerHTML =
    '<i class="fa-solid fa-moon" aria-hidden="true"></i><span>Dark Mode</span>';
  themeToggleButton.setAttribute("aria-label", "Switch to dark mode");
  themeToggleButton.setAttribute("title", "Switch to dark mode");
}

/* Toggle between dark and light themes and save preference */
function toggleTheme() {
  const currentTheme = document.body.getAttribute("data-theme") || "light";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

/* Helper functions for localStorage management */
function saveSelectedProductsToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProductIds));
}

function loadSelectedProductsFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    selectedProductIds = JSON.parse(saved);
  }
}

function clearAllSelectedProducts() {
  selectedProductIds = [];
  saveSelectedProductsToStorage();
  renderCurrentProducts();
}

/* Helper function to filter products based on category and search query */
async function applyFilters() {
  const products = await loadProducts();

  let filteredProducts = products;

  /* Apply category filter */
  if (currentCategory) {
    filteredProducts = filteredProducts.filter(
      (product) => product.category === currentCategory,
    );
  }

  /* Apply search filter */
  if (currentSearchQuery.trim()) {
    const query = currentSearchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query),
    );
  }

  displayProducts(filteredProducts);
  updateSelectedProductsList();
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Initialize: Load saved products from localStorage */
loadSelectedProductsFromStorage();

/* Update UI with saved products */
const initializeSavedProducts = async () => {
  await loadProducts();
  updateSelectedProductsList();
};

initializeSavedProducts();

/* Initialize theme - load from localStorage or default to light */
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
applyTheme(savedTheme);

if (themeToggleButton) {
  themeToggleButton.addEventListener("click", toggleTheme);
}

/* Initialize language - load from localStorage or default to English */
if (typeof setLanguage === "function") {
  const savedLanguage = localStorage.getItem("preferredLanguage") || "en";
  setLanguage(savedLanguage);
}

/* Language button event listeners */
if (
  typeof enLangBtn !== "undefined" &&
  typeof arLangBtn !== "undefined" &&
  typeof setLanguage === "function"
) {
  enLangBtn.addEventListener("click", () => setLanguage("en"));
  arLangBtn.addEventListener("click", () => setLanguage("ar"));
}

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

  /* Save to localStorage */
  saveSelectedProductsToStorage();
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
        <button class="view-details-btn" type="button" data-detail-id="${product.id}">View Details</button>
      </div>
    </div>
  `,
    )
    .join("");
}

productsContainer.addEventListener("click", (event) => {
  const detailsButton = event.target.closest(".view-details-btn");

  if (detailsButton) {
    const productId = Number(detailsButton.dataset.detailId);
    const product = allProducts.find((p) => p.id === productId);
    if (product) {
      openProductModal(product);
    }
    return;
  }

  const removeButton = event.target.closest(".remove-product-btn");

  if (removeButton) {
    const productId = Number(removeButton.dataset.removeId);
    selectedProductIds = selectedProductIds.filter((id) => id !== productId);
    saveSelectedProductsToStorage();
    renderCurrentProducts();
    return;
  }

  const card = event.target.closest(".product-card");

  if (!card) {
    return;
  }

  /* Toggle selection when clicking the card */
  toggleProductSelection(Number(card.dataset.productId));
});

productsContainer.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  if (event.target.closest(".view-details-btn")) {
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
  currentCategory = e.target.value;
  await applyFilters();
});

/* Filter and display products when search query changes */
productSearch.addEventListener("input", async (e) => {
  currentSearchQuery = e.target.value;

  /* If both search and category are empty, show placeholder */
  if (!currentSearchQuery.trim() && !currentCategory) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">Select a category to view products</div>
    `;
    updateSelectedProductsList();
    return;
  }

  await applyFilters();
});

selectedProductsList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-product-btn");

  if (!removeButton) {
    return;
  }

  const productId = Number(removeButton.dataset.removeId);
  selectedProductIds = selectedProductIds.filter((id) => id !== productId);
  /* Save to localStorage */
  saveSelectedProductsToStorage();
  renderCurrentProducts();
});

/* Chat form submission handler for follow-up questions */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!routineGenerated) {
    chatWindow.innerHTML = `
      <div class="chat-message error">
        Please generate a routine first before asking follow-up questions.
      </div>
    `;
    return;
  }

  const userInput = document.getElementById("userInput");
  const userMessage = userInput.value.trim();

  if (!userMessage) {
    return;
  }

  /* Clear input field */
  userInput.value = "";

  /* Display user message */
  chatWindow.innerHTML += `
    <div class="chat-message user-message">
      <strong>You:</strong> ${userMessage}
    </div>
  `;

  /* Add user message to conversation history */
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });
  

  /* Scroll to bottom */
  chatWindow.scrollTop = chatWindow.scrollHeight;

  /* Get AI response */
  await sendFollowUpQuestion(userMessage);
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
    if (!isWorkerConfigured()) {
      chatWindow.innerHTML = `
        <div class="chat-message error">
          <strong>Worker URL Not Configured</strong><br>
          Add your worker endpoint in secrets.js as: const WORKER_URL = "https://your-worker.workers.dev";
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

    const routineText = await requestWorker(
      [
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
      1500,
    );

    /* Clear conversation history and start fresh */
    conversationHistory = [];
    routineGenerated = true;

    /* Add system message and initial routine to conversation history */
    conversationHistory.push({
      role: "system",
      content:
        "You are a beauty and skincare expert. Provide clear, actionable advice about skincare, haircare, makeup, fragrance, and related beauty topics. Refer back to the routine you generated when answering follow-up questions.",
    });

    conversationHistory.push({
      role: "user",
      content: `I have selected the following products for my skincare/haircare routine:\n\n${selectedProducts
        .map(
          (product) =>
            `- ${product.name} (${product.brand}) - Category: ${product.category}\n  Description: ${product.description}`,
        )
        .join(
          "\n",
        )}\n\nPlease create a detailed, personalized daily routine using these products. Include morning and evening routines, application order, timing, and tips for best results.`,
    });

    conversationHistory.push({
      role: "assistant",
      content: routineText,
    });

    /* Display the routine in chat window */
    chatWindow.innerHTML = `
      <div class="chat-message ai-message">
        <strong>AI Beauty Assistant:</strong>
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

/* Helper function to send follow-up questions */
async function sendFollowUpQuestion(userMessage) {
  try {
    /* Show loading message */
    chatWindow.innerHTML += `
      <div class="chat-message loading">
        <i class="fa-solid fa-spinner fa-spin"></i> Thinking...
      </div>
    `;
    chatWindow.scrollTop = chatWindow.scrollHeight;

    const aiResponse = await requestWorker(conversationHistory, 1000);

    /* Add AI response to conversation history */
    conversationHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    /* Remove loading message and display AI response */
    const loadingMessage = chatWindow.querySelector(".loading");
    if (loadingMessage) {
      loadingMessage.remove();
    }

    chatWindow.innerHTML += `
      <div class="chat-message ai-message">
        <strong>AI Beauty Assistant:</strong> ${aiResponse}
      </div>
    `;

    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    const loadingMessage = chatWindow.querySelector(".loading");
    if (loadingMessage) {
      loadingMessage.remove();
    }

    chatWindow.innerHTML += `
      <div class="chat-message error">
        <strong>Error:</strong> ${error.message}
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

/* Clear All button click handler */
const clearAllBtn = document.getElementById("clearAllBtn");
clearAllBtn.addEventListener("click", () => {
  if (selectedProductIds.length === 0) {
    return;
  }

  openConfirmationModal();
});

/* Confirmation modal button handlers */
confirmYesBtn.addEventListener("click", () => {
  closeConfirmationModal();
  clearAllSelectedProducts();
});

confirmNoBtn.addEventListener("click", () => {
  closeConfirmationModal();
});

/* Close confirmation modal when clicking backdrop */
const confirmationBackdrop = confirmationModal.querySelector(".modal-backdrop");
confirmationBackdrop.addEventListener("click", closeConfirmationModal);

/* Close confirmation modal when Escape key is pressed */
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    confirmationModal.classList.contains("active")
  ) {
    closeConfirmationModal();
  }
});
