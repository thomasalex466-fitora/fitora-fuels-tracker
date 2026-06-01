const STORAGE_KEY = "fitora-fuels-tracker-v1";

const ORDER_STATUSES = ["New", "Scheduled", "Delivered", "Paid", "Cancelled"];
const EXPENSE_CATEGORIES = [
  "Fuel purchase",
  "Transport",
  "Salary",
  "Maintenance",
  "Utilities",
  "Rent",
  "Tax",
  "Other",
];

const CUSTOM_PRODUCT_VALUE = "__custom__";
const MENU_GROUPS = [
  {
    category: "Fitora Hydrating Drinks",
    items: [
      { name: "Butter Milk", price: 20 },
      { name: "Soda Butter Milk", price: 30 },
    ],
  },
  {
    category: "Fitora Classic Chillers",
    items: [
      { name: "Fresh Lime", price: 20 },
      { name: "Soda Lime", price: 30 },
      { name: "Sarbath Lime", price: 35 },
      { name: "Special Soda Sarbath", price: 45 },
    ],
  },
  {
    category: "Fitora Fresh Juice",
    items: [
      { name: "Watermelon Juice", price: 40 },
      { name: "Pineapple Juice", price: 50 },
    ],
  },
  {
    category: "Fitora Cut Fruits Bowl",
    items: [
      { name: "Watermelon", price: 25 },
      { name: "Pineapple", price: 25 },
    ],
  },
  {
    category: "Fitora Special Lassi",
    items: [
      { name: "Plain Lassi", price: 30 },
      { name: "Pineapple Lassi", price: 60 },
      { name: "Mango Lassi", price: 70 },
    ],
  },
  {
    category: "Fitora Premium Shakes",
    items: [
      { name: "Watermelon Shake", price: 69 },
      { name: "Honey Mango Shake", price: 79 },
      { name: "Banana Peanut Shake", price: 119 },
      { name: "Fitora Special Shake", price: 129 },
    ],
  },
  {
    category: "Fitora Snack & Hot Beverages",
    items: [
      { name: "Special Munnar Tea", price: 15 },
      { name: "Coffee", price: 25 },
      { name: "Green Tea with Honey", price: 25 },
      { name: "Boiled Egg with Special Chutney", price: 25 },
    ],
  },
  {
    category: "Fitora Super Snacks",
    items: [
      { name: "Plain Maggi", price: 50 },
      { name: "Veg Masala Maggi", price: 65 },
      { name: "Mushroom Penni Pasta", price: 79 },
      { name: "Cheesy Macaroni Pasta", price: 79 },
      { name: "Tomato Twist Pasta", price: 79 },
      { name: "Veg Steamed Momos", price: 79 },
      { name: "Veg Pan Fried Momos", price: 99 },
      { name: "Chicken Steamed Momos", price: 89 },
      { name: "Chicken Pan Fried Momos", price: 129 },
    ],
  },
];
const MENU_ITEMS = MENU_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, category: group.category }))
);

let state = {
  orders: [],
  expenses: [],
  savedAt: null,
};

let filters = {
  period: "this-month",
  orderSearch: "",
  orderStatus: "all",
  expenseSearch: "",
  expenseCategory: "all",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
let deferredInstallPrompt = null;

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  openViewFromHash();
  populateMenuOptions();
  wireNavigation();
  wireForms();
  wireFilters();
  wireDataActions();
  wirePwaInstall();
  setDefaultDates();
  suggestNextOrderNumber();
  render();
  registerServiceWorker();
});

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state = {
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      savedAt: parsed.savedAt || null,
    };
  } catch {
    state = { orders: [], expenses: [], savedAt: null };
  }
}

function saveState() {
  state.savedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderSavedAt();
}

async function registerServiceWorker() {
  const appStatus = $("#appStatus");

  if (!("serviceWorker" in navigator)) {
    appStatus.textContent = "Offline install unavailable";
    return;
  }

  if (window.location.protocol === "file:") {
    appStatus.textContent = "Use a web link to install";
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("./sw.js");

    registration.addEventListener("updatefound", () => {
      appStatus.textContent = "Updating offline app";
      appStatus.className = "app-status ready";
    });

    await navigator.serviceWorker.ready;
    updateConnectivityStatus();
  } catch (error) {
    console.warn("Service worker registration failed", error);
    appStatus.textContent = "Offline setup unavailable";
  }
}

function updateConnectivityStatus() {
  const appStatus = $("#appStatus");
  const installButton = $("#installBtn");
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;

  if (isStandalone) {
    appStatus.textContent = "Installed";
    appStatus.className = "app-status ready";
    installButton.classList.add("hide");
    return;
  }

  if (!navigator.onLine) {
    appStatus.textContent = "Offline";
    appStatus.className = "app-status offline";
    return;
  }

  if (deferredInstallPrompt) {
    appStatus.textContent = "Ready to install";
    appStatus.className = "app-status ready";
    return;
  }

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    appStatus.textContent = "Offline ready";
    appStatus.className = "app-status ready";
    return;
  }

  if (window.location.protocol === "file:") {
    appStatus.textContent = "Use a web link to install";
    return;
  }

  appStatus.textContent = "Preparing offline mode";
}

function wireNavigation() {
  $$(".tab-button").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.tab, true));
  });

  $$("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.jump;
      showView(target, true);
      if (target === "orders") $("#customerName").focus();
      if (target === "expenses") $("#expenseVendor").focus();
    });
  });

  window.addEventListener("hashchange", openViewFromHash);
}

function wireForms() {
  $("#orderForm").addEventListener("submit", handleOrderSubmit);
  $("#expenseForm").addEventListener("submit", handleExpenseSubmit);
  $("#cancelOrderEdit").addEventListener("click", resetOrderForm);
  $("#cancelExpenseEdit").addEventListener("click", resetExpenseForm);
  $("#productName").addEventListener("change", handleMenuItemChange);

  ["#orderQuantity", "#orderRate", "#deliveryFee"].forEach((selector) => {
    $(selector).addEventListener("input", updateOrderPreview);
  });

  $("#expenseAmount").addEventListener("input", updateExpensePreview);
}

function wireFilters() {
  $("#periodFilter").addEventListener("change", (event) => {
    filters.period = event.target.value;
    render();
  });

  $("#orderSearch").addEventListener("input", (event) => {
    filters.orderSearch = event.target.value.trim().toLowerCase();
    renderOrdersTable();
  });

  $("#statusFilter").addEventListener("change", (event) => {
    filters.orderStatus = event.target.value;
    renderOrdersTable();
  });

  $("#expenseSearch").addEventListener("input", (event) => {
    filters.expenseSearch = event.target.value.trim().toLowerCase();
    renderExpensesTable();
  });

  $("#categoryFilter").addEventListener("change", (event) => {
    filters.expenseCategory = event.target.value;
    renderExpensesTable();
  });
}

function wireDataActions() {
  $("#backupBtn").addEventListener("click", exportBackup);
  $("#exportOrdersBtn").addEventListener("click", () => exportCsv("orders"));
  $("#exportExpensesBtn").addEventListener("click", () => exportCsv("expenses"));
  $("#importInput").addEventListener("change", importBackup);
  $("#clearBtn").addEventListener("click", clearAllData);
  $("#printBtn").addEventListener("click", () => window.print());
}

function wirePwaInstall() {
  const installButton = $("#installBtn");
  const appStatus = $("#appStatus");

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.classList.remove("hide");
    appStatus.textContent = "Ready to install";
    appStatus.className = "app-status ready";
  });

  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.classList.add("hide");
    appStatus.textContent = choice.outcome === "accepted" ? "Installed" : "Install later";
    appStatus.className = "app-status ready";
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installButton.classList.add("hide");
    appStatus.textContent = "Installed";
    appStatus.className = "app-status ready";
  });

  window.addEventListener("online", () => updateConnectivityStatus());
  window.addEventListener("offline", () => updateConnectivityStatus());
  updateConnectivityStatus();
}

function openViewFromHash() {
  const viewName = window.location.hash.replace("#", "");
  if (["dashboard", "orders", "expenses", "reports"].includes(viewName)) {
    showView(viewName);
  }
}

function showView(viewName, updateHash = false) {
  $$(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === viewName);
  });
  $$(".view").forEach((view) => {
    view.classList.toggle("active", view.dataset.view === viewName);
  });
  $("#viewTitle").textContent = titleCase(viewName);
  if (updateHash && window.location.hash !== `#${viewName}`) {
    history.replaceState(null, "", `#${viewName}`);
  }
}

function setDefaultDates() {
  const today = toDateInput(new Date());
  $("#orderDate").value = today;
  $("#expenseDate").value = today;
}

function populateMenuOptions() {
  const productSelect = $("#productName");
  const placeholder = productSelect.querySelector("option[value='']");
  productSelect.innerHTML = "";
  productSelect.appendChild(placeholder);

  MENU_GROUPS.forEach((group) => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.category;
    group.items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.name;
      option.dataset.price = String(item.price);
      option.dataset.category = group.category;
      option.textContent = `${item.name} - INR ${item.price}`;
      optgroup.appendChild(option);
    });
    productSelect.appendChild(optgroup);
  });

  const customOption = document.createElement("option");
  customOption.value = CUSTOM_PRODUCT_VALUE;
  customOption.textContent = "Custom item";
  productSelect.appendChild(customOption);
}

function suggestNextOrderNumber() {
  if ($("#orderId").value) return;
  const numbers = state.orders
    .map((order) => String(order.orderNumber || ""))
    .map((value) => {
      const match = value.match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .filter(Boolean);
  const next = numbers.length ? Math.max(...numbers) + 1 : 1001;
  $("#orderNumber").value = `FF-${next}`;
}

function handleOrderSubmit(event) {
  event.preventDefault();
  const selectedMenuItem = getSelectedMenuItem();
  const isCustomItem = $("#productName").value === CUSTOM_PRODUCT_VALUE;
  const customProduct = $("#customProductName").value.trim();

  const order = {
    id: $("#orderId").value || createId(),
    date: $("#orderDate").value,
    orderNumber: $("#orderNumber").value.trim(),
    customer: $("#customerName").value.trim(),
    contact: $("#customerContact").value.trim(),
    product: isCustomItem ? customProduct || "Custom item" : $("#productName").value,
    productCategory: selectedMenuItem?.category || (isCustomItem ? "Custom item" : ""),
    quantity: toNumber($("#orderQuantity").value),
    unit: $("#orderUnit").value,
    rate: toNumber($("#orderRate").value),
    deliveryFee: toNumber($("#deliveryFee").value),
    status: $("#orderStatus").value,
    payment: $("#orderPayment").value,
    notes: $("#orderNotes").value.trim(),
  };

  if (!order.date || !order.orderNumber || !order.customer) return;

  const existingIndex = state.orders.findIndex((item) => item.id === order.id);
  if (existingIndex >= 0) {
    state.orders[existingIndex] = order;
  } else {
    state.orders.push(order);
  }

  sortRecords();
  saveState();
  resetOrderForm();
  render();
}

function handleExpenseSubmit(event) {
  event.preventDefault();

  const expense = {
    id: $("#expenseId").value || createId(),
    date: $("#expenseDate").value,
    category: $("#expenseCategory").value,
    vendor: $("#expenseVendor").value.trim(),
    amount: toNumber($("#expenseAmount").value),
    method: $("#expenseMethod").value,
    notes: $("#expenseNotes").value.trim(),
  };

  if (!expense.date || !expense.vendor) return;

  const existingIndex = state.expenses.findIndex((item) => item.id === expense.id);
  if (existingIndex >= 0) {
    state.expenses[existingIndex] = expense;
  } else {
    state.expenses.push(expense);
  }

  sortRecords();
  saveState();
  resetExpenseForm();
  render();
}

function resetOrderForm() {
  $("#orderForm").reset();
  $("#orderId").value = "";
  $("#orderFormTitle").textContent = "Add order";
  $("#saveOrderBtn").textContent = "Save order";
  $("#cancelOrderEdit").classList.add("hide");
  $("#customProductWrap").classList.add("hide");
  $("#customProductName").value = "";
  $("#orderUnit").value = "item";
  $("#deliveryFee").value = "0";
  setDefaultDates();
  suggestNextOrderNumber();
  updateOrderPreview();
}

function resetExpenseForm() {
  $("#expenseForm").reset();
  $("#expenseId").value = "";
  $("#expenseFormTitle").textContent = "Add expense";
  $("#saveExpenseBtn").textContent = "Save expense";
  $("#cancelExpenseEdit").classList.add("hide");
  setDefaultDates();
  updateExpensePreview();
}

function editOrder(id) {
  const order = state.orders.find((item) => item.id === id);
  if (!order) return;

  $("#orderId").value = order.id;
  $("#orderDate").value = order.date;
  $("#orderNumber").value = order.orderNumber;
  $("#customerName").value = order.customer;
  $("#customerContact").value = order.contact || "";
  selectProductForEdit(order);
  $("#orderQuantity").value = order.quantity;
  $("#orderUnit").value = order.unit || "L";
  $("#orderRate").value = order.rate;
  $("#deliveryFee").value = order.deliveryFee || 0;
  $("#orderStatus").value = order.status;
  $("#orderPayment").value = order.payment;
  $("#orderNotes").value = order.notes || "";
  $("#orderFormTitle").textContent = "Edit order";
  $("#saveOrderBtn").textContent = "Update order";
  $("#cancelOrderEdit").classList.remove("hide");
  updateOrderPreview();
  showView("orders");
  $("#customerName").focus();
}

function editExpense(id) {
  const expense = state.expenses.find((item) => item.id === id);
  if (!expense) return;

  $("#expenseId").value = expense.id;
  $("#expenseDate").value = expense.date;
  $("#expenseCategory").value = expense.category;
  $("#expenseVendor").value = expense.vendor;
  $("#expenseAmount").value = expense.amount;
  $("#expenseMethod").value = expense.method;
  $("#expenseNotes").value = expense.notes || "";
  $("#expenseFormTitle").textContent = "Edit expense";
  $("#saveExpenseBtn").textContent = "Update expense";
  $("#cancelExpenseEdit").classList.remove("hide");
  updateExpensePreview();
  showView("expenses");
  $("#expenseVendor").focus();
}

function deleteOrder(id) {
  const order = state.orders.find((item) => item.id === id);
  if (!order) return;
  if (!window.confirm(`Delete order ${order.orderNumber}?`)) return;
  state.orders = state.orders.filter((item) => item.id !== id);
  saveState();
  render();
}

function deleteExpense(id) {
  const expense = state.expenses.find((item) => item.id === id);
  if (!expense) return;
  if (!window.confirm(`Delete expense for ${expense.vendor}?`)) return;
  state.expenses = state.expenses.filter((item) => item.id !== id);
  saveState();
  render();
}

function handleMenuItemChange() {
  const selectedValue = $("#productName").value;
  const selectedMenuItem = getSelectedMenuItem();

  $("#customProductWrap").classList.toggle("hide", selectedValue !== CUSTOM_PRODUCT_VALUE);

  if (selectedValue === CUSTOM_PRODUCT_VALUE) {
    $("#customProductName").focus();
    return;
  }

  if (selectedMenuItem) {
    $("#orderRate").value = selectedMenuItem.price;
    $("#orderUnit").value = "item";
    if (!$("#orderQuantity").value) {
      $("#orderQuantity").value = "1";
    }
  }

  updateOrderPreview();
}

function getSelectedMenuItem() {
  return MENU_ITEMS.find((item) => item.name === $("#productName").value);
}

function selectProductForEdit(order) {
  const productSelect = $("#productName");
  const existingOption = Array.from(productSelect.options).find(
    (option) => option.value === order.product
  );

  if (existingOption) {
    productSelect.value = order.product;
    $("#customProductWrap").classList.add("hide");
    $("#customProductName").value = "";
    return;
  }

  productSelect.value = CUSTOM_PRODUCT_VALUE;
  $("#customProductWrap").classList.remove("hide");
  $("#customProductName").value = order.product || "";
}

function updateOrderPreview() {
  const total =
    toNumber($("#orderQuantity").value) * toNumber($("#orderRate").value) +
    toNumber($("#deliveryFee").value);
  $("#orderPreview").textContent = `Total: ${formatMoney(total)}`;
}

function updateExpensePreview() {
  $("#expensePreview").textContent = `Amount: ${formatMoney(toNumber($("#expenseAmount").value))}`;
}

function render() {
  renderSavedAt();
  renderDashboard();
  renderOrdersTable();
  renderExpensesTable();
  renderReports();
  updateOrderPreview();
  updateExpensePreview();
}

function renderSavedAt() {
  $("#lastSaved").textContent = state.savedAt
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(state.savedAt))
    : "Not saved yet";
}

function renderDashboard() {
  const scopedOrders = ordersInPeriod();
  const scopedExpenses = expensesInPeriod();
  const revenue = scopedOrders.reduce((sum, order) => sum + orderTotal(order), 0);
  const expenses = scopedExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const profit = revenue - expenses;
  const pendingOrders = scopedOrders.filter((order) =>
    ["New", "Scheduled", "Delivered"].includes(order.status)
  );
  const pendingValue = pendingOrders.reduce((sum, order) => sum + orderTotal(order), 0);
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  $("#revenueMetric").textContent = formatMoney(revenue);
  $("#orderCountMetric").textContent = plural(scopedOrders.length, "order");
  $("#expenseMetric").textContent = formatMoney(expenses);
  $("#expenseCountMetric").textContent = plural(scopedExpenses.length, "entry", "entries");
  $("#profitMetric").textContent = formatMoney(profit);
  $("#marginMetric").textContent = `${round(margin)}% margin`;
  $("#pendingMetric").textContent = formatMoney(pendingValue);
  $("#pendingCountMetric").textContent = `${pendingOrders.length} pending`;

  renderStatusList(scopedOrders);
  renderCategoryList(scopedExpenses);
  renderActivity(scopedOrders, scopedExpenses);
}

function renderStatusList(orders) {
  const total = orders.reduce((sum, order) => sum + orderTotal(order), 0);
  $("#statusTotal").textContent = total ? formatMoney(total) : "";

  if (!orders.length) {
    $("#statusList").innerHTML = `<div class="empty-state">No orders in this period</div>`;
    return;
  }

  $("#statusList").innerHTML = ORDER_STATUSES.map((status) => {
    const matching = orders.filter((order) => order.status === status);
    const value = matching.reduce((sum, order) => sum + orderTotal(order), 0);
    const width = total > 0 ? Math.max(3, (value / total) * 100) : 0;
    return `
      <div class="progress-row">
        <div class="progress-meta">
          <span>${escapeHtml(status)} <span class="muted">${matching.length}</span></span>
          <strong>${formatMoney(value)}</strong>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${width}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderCategoryList(expenses) {
  const total = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  $("#expenseMixTotal").textContent = total ? formatMoney(total) : "";

  if (!expenses.length) {
    $("#categoryList").innerHTML = `<div class="empty-state">No expenses in this period</div>`;
    return;
  }

  const rows = EXPENSE_CATEGORIES.map((category) => {
    const matching = expenses.filter((expense) => expense.category === category);
    const value = matching.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
    return { category, count: matching.length, value };
  }).filter((row) => row.value > 0);

  $("#categoryList").innerHTML = rows.map((row) => {
    const width = total > 0 ? Math.max(3, (row.value / total) * 100) : 0;
    return `
      <div class="progress-row">
        <div class="progress-meta">
          <span>${escapeHtml(row.category)} <span class="muted">${row.count}</span></span>
          <strong>${formatMoney(row.value)}</strong>
        </div>
        <div class="progress-track">
          <div class="progress-fill orange" style="width: ${width}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderActivity(orders, expenses) {
  const activity = [
    ...orders.map((order) => ({
      date: order.date,
      type: "Order",
      title: `${order.orderNumber} - ${order.customer}`,
      meta: `${order.product} / ${order.status}`,
      value: orderTotal(order),
    })),
    ...expenses.map((expense) => ({
      date: expense.date,
      type: "Expense",
      title: expense.vendor,
      meta: expense.category,
      value: -toNumber(expense.amount),
    })),
  ]
    .sort((a, b) => parseDate(b.date) - parseDate(a.date))
    .slice(0, 8);

  $("#recentCount").textContent = activity.length ? `${activity.length} latest` : "";

  if (!activity.length) {
    $("#activityList").innerHTML = `<div class="empty-state">No recent activity</div>`;
    return;
  }

  $("#activityList").innerHTML = activity.map((item) => {
    const pillClass = item.type === "Expense" ? "danger" : "";
    return `
      <div class="activity-item">
        <div class="activity-title">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="muted">${formatDate(item.date)} / ${escapeHtml(item.meta)}</span>
        </div>
        <div>
          <span class="pill ${pillClass}">${escapeHtml(item.type)}</span>
          <strong>${formatMoney(item.value)}</strong>
        </div>
      </div>
    `;
  }).join("");
}

function renderOrdersTable() {
  const orders = filteredOrders();
  $("#orderTableCount").textContent = plural(orders.length, "order");

  if (!orders.length) {
    $("#ordersTable").innerHTML = `
      <tr>
        <td colspan="7"><div class="empty-state">No matching orders</div></td>
      </tr>
    `;
    return;
  }

  $("#ordersTable").innerHTML = orders.map((order) => `
    <tr>
      <td>${formatDate(order.date)}</td>
      <td><strong>${escapeHtml(order.orderNumber)}</strong></td>
      <td>
        ${escapeHtml(order.customer)}
        ${order.contact ? `<br><span class="muted">${escapeHtml(order.contact)}</span>` : ""}
      </td>
      <td>${escapeHtml(order.product)}${order.productCategory ? `<br><span class="muted">${escapeHtml(order.productCategory)}</span>` : ""}<br><span class="muted">${formatQuantity(order.quantity)} ${escapeHtml(order.unit)} x ${formatMoney(order.rate)}</span></td>
      <td><span class="pill ${statusClass(order.status)}">${escapeHtml(order.status)}</span></td>
      <td class="number-cell"><strong>${formatMoney(orderTotal(order))}</strong></td>
      <td>
        <div class="row-actions">
          <button type="button" data-edit-order="${order.id}">Edit</button>
          <button type="button" class="delete" data-delete-order="${order.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");

  $$("[data-edit-order]").forEach((button) => {
    button.addEventListener("click", () => editOrder(button.dataset.editOrder));
  });
  $$("[data-delete-order]").forEach((button) => {
    button.addEventListener("click", () => deleteOrder(button.dataset.deleteOrder));
  });
}

function renderExpensesTable() {
  const expenses = filteredExpenses();
  $("#expenseTableCount").textContent = plural(expenses.length, "entry", "entries");

  if (!expenses.length) {
    $("#expensesTable").innerHTML = `
      <tr>
        <td colspan="6"><div class="empty-state">No matching expenses</div></td>
      </tr>
    `;
    return;
  }

  $("#expensesTable").innerHTML = expenses.map((expense) => `
    <tr>
      <td>${formatDate(expense.date)}</td>
      <td><span class="pill warning">${escapeHtml(expense.category)}</span></td>
      <td>
        <strong>${escapeHtml(expense.vendor)}</strong>
        ${expense.notes ? `<br><span class="muted">${escapeHtml(expense.notes)}</span>` : ""}
      </td>
      <td>${escapeHtml(expense.method)}</td>
      <td class="number-cell"><strong>${formatMoney(expense.amount)}</strong></td>
      <td>
        <div class="row-actions">
          <button type="button" data-edit-expense="${expense.id}">Edit</button>
          <button type="button" class="delete" data-delete-expense="${expense.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");

  $$("[data-edit-expense]").forEach((button) => {
    button.addEventListener("click", () => editExpense(button.dataset.editExpense));
  });
  $$("[data-delete-expense]").forEach((button) => {
    button.addEventListener("click", () => deleteExpense(button.dataset.deleteExpense));
  });
}

function renderReports() {
  const orders = ordersInPeriod();
  const expenses = expensesInPeriod();
  const revenue = orders.reduce((sum, order) => sum + orderTotal(order), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const net = revenue - expenseTotal;

  $("#reportRevenue").textContent = formatMoney(revenue);
  $("#reportExpenses").textContent = formatMoney(expenseTotal);
  $("#reportNet").textContent = formatMoney(net);
  $("#dataTotals").textContent = `${plural(state.orders.length, "order")} / ${plural(
    state.expenses.length,
    "entry",
    "entries"
  )}`;

  const months = buildMonthlyRows();
  if (!months.length) {
    $("#reportBars").innerHTML = `<div class="empty-state">No report data</div>`;
    return;
  }

  const max = Math.max(...months.map((item) => Math.max(item.revenue, item.expenses)), 1);
  $("#reportBars").innerHTML = months.map((item) => `
    <div class="report-bar">
      <div class="report-bar-meta">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${formatMoney(item.revenue - item.expenses)}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${Math.max(3, (item.revenue / max) * 100)}%"></div>
      </div>
      <div class="progress-track">
        <div class="progress-fill orange" style="width: ${Math.max(3, (item.expenses / max) * 100)}%"></div>
      </div>
    </div>
  `).join("");
}

function filteredOrders() {
  return ordersInPeriod().filter((order) => {
    const haystack = [
      order.orderNumber,
      order.customer,
      order.contact,
      order.product,
      order.productCategory,
      order.status,
      order.payment,
      order.notes,
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !filters.orderSearch || haystack.includes(filters.orderSearch);
    const matchesStatus = filters.orderStatus === "all" || order.status === filters.orderStatus;
    return matchesSearch && matchesStatus;
  });
}

function filteredExpenses() {
  return expensesInPeriod().filter((expense) => {
    const haystack = [expense.category, expense.vendor, expense.method, expense.notes]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !filters.expenseSearch || haystack.includes(filters.expenseSearch);
    const matchesCategory =
      filters.expenseCategory === "all" || expense.category === filters.expenseCategory;
    return matchesSearch && matchesCategory;
  });
}

function ordersInPeriod() {
  return state.orders.filter((order) => isInSelectedPeriod(order.date));
}

function expensesInPeriod() {
  return state.expenses.filter((expense) => isInSelectedPeriod(expense.date));
}

function isInSelectedPeriod(value) {
  if (filters.period === "all") return true;
  const range = getPeriodRange(filters.period);
  const date = parseDate(value);
  return date >= range.start && date <= range.end;
}

function getPeriodRange(period) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  if (period === "last-month") {
    return {
      start: new Date(year, month - 1, 1),
      end: endOfDay(new Date(year, month, 0)),
    };
  }

  if (period === "quarter") {
    const startMonth = month - (month % 3);
    return {
      start: new Date(year, startMonth, 1),
      end: endOfDay(new Date(year, startMonth + 3, 0)),
    };
  }

  if (period === "year") {
    return {
      start: new Date(year, 0, 1),
      end: endOfDay(new Date(year, 11, 31)),
    };
  }

  return {
    start: new Date(year, month, 1),
    end: endOfDay(new Date(year, month + 1, 0)),
  };
}

function buildMonthlyRows() {
  const buckets = new Map();

  state.orders.forEach((order) => {
    const key = String(order.date || "").slice(0, 7);
    if (!key) return;
    const bucket = buckets.get(key) || { revenue: 0, expenses: 0 };
    bucket.revenue += orderTotal(order);
    buckets.set(key, bucket);
  });

  state.expenses.forEach((expense) => {
    const key = String(expense.date || "").slice(0, 7);
    if (!key) return;
    const bucket = buckets.get(key) || { revenue: 0, expenses: 0 };
    bucket.expenses += toNumber(expense.amount);
    buckets.set(key, bucket);
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 6)
    .reverse()
    .map(([key, value]) => ({
      label: new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(
        parseDate(`${key}-01`)
      ),
      ...value,
    }));
}

function exportBackup() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    orders: state.orders,
    expenses: state.expenses,
  };
  downloadText(
    `fitora-fuels-backup-${toDateInput(new Date())}.json`,
    JSON.stringify(payload, null, 2),
    "application/json"
  );
}

function exportCsv(kind) {
  const isOrders = kind === "orders";
  const rows = isOrders ? filteredOrders() : filteredExpenses();
  const headers = isOrders
    ? [
        "Date",
        "Order No",
        "Customer",
        "Contact",
        "Product",
        "Menu Category",
        "Quantity",
        "Unit",
        "Rate",
        "Delivery Fee",
        "Status",
        "Payment",
        "Total",
        "Notes",
      ]
    : ["Date", "Category", "Vendor", "Amount", "Paid By", "Notes"];

  const body = rows.map((row) =>
    isOrders
      ? [
          row.date,
          row.orderNumber,
          row.customer,
          row.contact,
          row.product,
          row.productCategory,
          row.quantity,
          row.unit,
          row.rate,
          row.deliveryFee,
          row.status,
          row.payment,
          orderTotal(row),
          row.notes,
        ]
      : [row.date, row.category, row.vendor, row.amount, row.method, row.notes]
  );

  const csv = [headers, ...body].map((row) => row.map(csvCell).join(",")).join("\n");
  downloadText(`fitora-fuels-${kind}-${toDateInput(new Date())}.csv`, csv, "text/csv");
}

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      if (!Array.isArray(parsed.orders) || !Array.isArray(parsed.expenses)) {
        throw new Error("Invalid backup");
      }
      if (!window.confirm("Importing this backup will replace the current tracker data.")) return;
      state = {
        orders: parsed.orders,
        expenses: parsed.expenses,
        savedAt: new Date().toISOString(),
      };
      sortRecords();
      saveState();
      render();
    } catch {
      window.alert("That backup file could not be imported.");
    } finally {
      event.target.value = "";
    }
  });
  reader.readAsText(file);
}

function clearAllData() {
  if (!window.confirm("Clear all Fitora Fuels tracker data from this browser?")) return;
  state = { orders: [], expenses: [], savedAt: null };
  localStorage.removeItem(STORAGE_KEY);
  resetOrderForm();
  resetExpenseForm();
  render();
}

function sortRecords() {
  state.orders.sort((a, b) => parseDate(b.date) - parseDate(a.date));
  state.expenses.sort((a, b) => parseDate(b.date) - parseDate(a.date));
}

function orderTotal(order) {
  return toNumber(order.quantity) * toNumber(order.rate) + toNumber(order.deliveryFee);
}

function statusClass(status) {
  if (status === "Cancelled") return "danger";
  if (status === "New" || status === "Scheduled") return "warning";
  return "";
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function endOfDay(date) {
  date.setHours(23, 59, 59, 999);
  return date;
}

function parseDate(value) {
  if (!value) return new Date(0);
  return new Date(`${value}T00:00:00`);
}

function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseDate(value));
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  const sign = amount < 0 ? "-" : "";
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: Math.abs(amount) % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${sign}INR ${formatted}`;
}

function formatQuantity(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function plural(count, singular, pluralWord = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralWord}`;
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadText(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
