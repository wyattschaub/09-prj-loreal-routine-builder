/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearchInput = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const clearSelectedProductsButton = document.getElementById(
  "clearSelectedProducts",
);
const generateRoutineButton = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

const SELECTED_PRODUCTS_STORAGE_KEY = "selectedProducts";

/* Keep app state in simple arrays for beginner-friendly logic */
let allProducts = [];
let selectedProducts = [];

/* Keep chat memory so the model remembers previous turns */
const chatSystemPrompt =
  "You are the L'Oréal Routine Builder assistant. Only answer questions related to L'Oréal products, beauty routines, skincare, haircare, makeup, or the selected products in this app. If the user asks about anything unrelated, politely refuse and invite them to ask a L'Oréal or routine question instead. Keep responses concise, clear, and beginner-friendly. You may use markdown-style formatting like **bold** and bullet lists.";
let chatHistory = [];

/* Small helper for appending chat messages instead of replacing the chat box */
function appendChatMessage(role, text, shouldFormat = false) {
  const messageRow = document.createElement("div");
  messageRow.className = `chat-message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";

  if (shouldFormat) {
    bubble.innerHTML = formatApiResponse(text);
  } else {
    bubble.textContent = text;
  }

  messageRow.appendChild(bubble);
  chatWindow.appendChild(messageRow);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return messageRow;
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category or search to view products
  </div>
`;

function showProductsPlaceholder(message) {
  productsContainer.innerHTML = `
    <div class="placeholder-message">${message}</div>
  `;
}

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Save current selected products in localStorage */
function saveSelectedProductsToStorage() {
  localStorage.setItem(
    SELECTED_PRODUCTS_STORAGE_KEY,
    JSON.stringify(selectedProducts),
  );
}

/* Read selected products from localStorage on page load */
function restoreSelectedProductsFromStorage() {
  const storedSelectedProducts = localStorage.getItem(
    SELECTED_PRODUCTS_STORAGE_KEY,
  );

  if (!storedSelectedProducts) {
    selectedProducts = [];
    return;
  }

  try {
    const parsedProducts = JSON.parse(storedSelectedProducts);
    selectedProducts = Array.isArray(parsedProducts) ? parsedProducts : [];
  } catch (error) {
    console.error("Could not parse selected products from storage:", error);
    selectedProducts = [];
  }
}

/* Show selected products in the box under the grid */
function renderSelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="selected-placeholder">No products selected yet.</p>
    `;
    clearSelectedProductsButton.disabled = true;
    return;
  }

  clearSelectedProductsButton.disabled = false;

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
    <div class="selected-product-item" data-product-id="${product.id}">
      <span>${product.name}</span>
      <button class="remove-selected-btn" data-remove-id="${product.id}" aria-label="Remove ${product.name}">
        Remove
      </button>
    </div>
  `,
    )
    .join("");
}

/* Update card styling so users can see what is currently selected */
function updateProductCardSelectionStyles() {
  const cards = productsContainer.querySelectorAll(".product-card");

  cards.forEach((card) => {
    const productId = Number(card.dataset.productId);
    const isSelected = selectedProducts.some(
      (product) => product.id === productId,
    );

    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-pressed", isSelected);
  });
}

/* Add or remove a product from selectedProducts */
function toggleSelectedProduct(productId) {
  const existingProductIndex = selectedProducts.findIndex(
    (product) => product.id === productId,
  );

  if (existingProductIndex >= 0) {
    selectedProducts.splice(existingProductIndex, 1);
  } else {
    const productToAdd = allProducts.find(
      (product) => product.id === productId,
    );

    if (productToAdd) {
      selectedProducts.push(productToAdd);
    }
  }

  saveSelectedProductsToStorage();
  renderSelectedProducts();
  updateProductCardSelectionStyles();
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-product-id="${product.id}" role="button" tabindex="0" aria-pressed="false">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p class="product-brand">${product.brand}</p>
        <p class="product-description">${product.description}</p>
      </div>
    </div>
  `,
    )
    .join("");

  updateProductCardSelectionStyles();
}

/* Apply both category and keyword filters to the full product list */
function applyProductFilters() {
  const selectedCategory = categoryFilter.value || "";
  const searchTerm = productSearchInput.value.trim().toLowerCase();

  if (!selectedCategory && !searchTerm) {
    showProductsPlaceholder("Select a category or search to view products");
    return;
  }

  const filteredProducts = allProducts.filter((product) => {
    const matchesCategory =
      !selectedCategory || product.category === selectedCategory;

    const searchTarget =
      `${product.name} ${product.brand} ${product.category} ${product.description}`.toLowerCase();
    const matchesSearch = !searchTerm || searchTarget.includes(searchTerm);

    return matchesCategory && matchesSearch;
  });

  if (filteredProducts.length === 0) {
    showProductsPlaceholder("No products match your search.");
    return;
  }

  displayProducts(filteredProducts);
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }

  applyProductFilters();
});

/* Filter products by name/keyword as user types */
productSearchInput.addEventListener("input", async () => {
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }

  applyProductFilters();
});

/* Click a tile to select/unselect a product */
productsContainer.addEventListener("click", (e) => {
  const productCard = e.target.closest(".product-card");

  if (!productCard) {
    return;
  }

  const productId = Number(productCard.dataset.productId);
  toggleSelectedProduct(productId);
});

/* Keyboard support: Enter or Space also toggles the selected tile */
productsContainer.addEventListener("keydown", (e) => {
  const productCard = e.target.closest(".product-card");

  if (!productCard) {
    return;
  }

  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    const productId = Number(productCard.dataset.productId);
    toggleSelectedProduct(productId);
  }
});

/* Remove button in Selected Products box */
selectedProductsList.addEventListener("click", (e) => {
  const removeButton = e.target.closest(".remove-selected-btn");

  if (!removeButton) {
    return;
  }

  const productIdToRemove = Number(removeButton.dataset.removeId);

  selectedProducts = selectedProducts.filter(
    (product) => product.id !== productIdToRemove,
  );

  saveSelectedProductsToStorage();
  renderSelectedProducts();
  updateProductCardSelectionStyles();
});

/* Clear all selected products */
clearSelectedProductsButton.addEventListener("click", () => {
  selectedProducts = [];
  saveSelectedProductsToStorage();
  renderSelectedProducts();
  updateProductCardSelectionStyles();
});

/* Show initial state for selected products */
restoreSelectedProductsFromStorage();
renderSelectedProducts();

/* Escape HTML before inserting generated text into the page */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* Convert simple markdown-style output to readable HTML */
function formatApiResponse(text) {
  const safeText = escapeHtml(text);
  const withBold = safeText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  const withBullets = withBold.replace(/^\s*[-*]\s+(.*)$/gm, "• $1");
  return withBullets.replace(/\n/g, "<br>");
}

/* Reuse the same selected-products JSON context for chat + routine calls */
function getSelectedProductsPayload() {
  return selectedProducts.map((product) => ({
    id: product.id,
    brand: product.brand,
    name: product.name,
    category: product.category,
    description: product.description,
  }));
}

/* Keep only recent messages so requests stay lightweight */
function addToChatHistory(role, content) {
  chatHistory.push({ role, content });

  if (chatHistory.length > 12) {
    chatHistory = chatHistory.slice(chatHistory.length - 12);
  }
}

/* Shared function for calling OpenAI chat completions */
async function fetchOpenAIResponse(messages) {
  const apiKey = typeof OPENAI_API_KEY !== "undefined" ? OPENAI_API_KEY : "";

  if (!apiKey) {
    throw new Error("Missing API key");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error("OpenAI request failed");
  }

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error("OpenAI response missing choices[0].message");
  }

  return data.choices[0].message.content;
}

/* Call OpenAI to generate a routine from selected product JSON */
async function generateRoutineFromSelectedProducts() {
  if (selectedProducts.length === 0) {
    appendChatMessage("assistant", "Please select at least one product first.");
    return;
  }

  appendChatMessage("user", "Generate a routine from my selected products.");
  const loadingMessage = appendChatMessage(
    "assistant",
    "Generating your routine...",
  );

  const selectedProductsPayload = getSelectedProductsPayload();

  const messages = [
    {
      role: "system",
      content: chatSystemPrompt,
    },
    {
      role: "user",
      content: `Use this selected products JSON to build a morning and night routine:\n\n${JSON.stringify(selectedProductsPayload, null, 2)}\n\nReturn simple steps and explain why each product fits.`,
    },
  ];

  try {
    const routineText = await fetchOpenAIResponse(messages);

    loadingMessage.remove();
    appendChatMessage("assistant", routineText, true);

    addToChatHistory(
      "user",
      "Generate a routine from my selected L'Oréal products.",
    );
    addToChatHistory("assistant", routineText);
  } catch (error) {
    console.error("Routine generation error:", error);
    loadingMessage.remove();

    if (error.message === "Missing API key") {
      appendChatMessage(
        "assistant",
        "Missing OPENAI_API_KEY. Add it in secrets.js before generating a routine.",
      );
      return;
    }

    appendChatMessage(
      "assistant",
      "Something went wrong while calling OpenAI. Please check your internet/API key and try again.",
    );
  }
}

/* Generate button handler */
generateRoutineButton.addEventListener(
  "click",
  generateRoutineFromSelectedProducts,
);

/* Send user chat input to OpenAI and show formatted response */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userMessage = userInput.value.trim();

  if (!userMessage) {
    return;
  }

  appendChatMessage("user", userMessage);
  const loadingMessage = appendChatMessage("assistant", "Thinking...");

  const selectedProductsPayload = getSelectedProductsPayload();

  const contextText = selectedProductsPayload.length
    ? `Selected products JSON:\n${JSON.stringify(selectedProductsPayload, null, 2)}`
    : "No products are currently selected.";

  const messages = [
    {
      role: "system",
      content: chatSystemPrompt,
    },
    ...chatHistory,
    {
      role: "system",
      content: `Current app context: ${contextText}`,
    },
    {
      role: "user",
      content: userMessage,
    },
  ];

  try {
    const apiText = await fetchOpenAIResponse(messages);

    loadingMessage.remove();
    appendChatMessage("assistant", apiText, true);

    addToChatHistory("user", userMessage);
    addToChatHistory("assistant", apiText);
  } catch (error) {
    console.error("Chat request error:", error);
    loadingMessage.remove();

    if (error.message === "Missing API key") {
      appendChatMessage(
        "assistant",
        "Missing OPENAI_API_KEY. Add it in secrets.js before chatting.",
      );
      return;
    }

    appendChatMessage(
      "assistant",
      "Could not get a response right now. Please try again.",
    );
  }

  userInput.value = "";
});
