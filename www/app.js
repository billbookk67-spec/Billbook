// ==========================================
// BillBook - Core Application JavaScript
// ==========================================

// Configure your backend API Base URL here
// For local testing: http://localhost:5000/api
// For production: change to your deployed cloud URL (e.g., https://yourdomain.com/api)
const API_URL = 'https://billing-app-ccvg.onrender.com/api';

// Helper to safely render icons if lucide is available (offline resilience)
function safeCreateIcons() {
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  } else {
    console.warn('Lucide icons script not loaded or offline.');
  }
}

// Database state (synced with backend)
let state = {
  invoices: [],
  products: [],
  customers: [],
  profile: {}
};

// Authentication State Management
const SESSION_KEY = 'bb_session';

// Setup Auth Gate Event Listeners and checks
function setupAuthGate() {
  const session = localStorage.getItem(SESSION_KEY);
  const loginView = document.getElementById('view-login');
  const appContainer = document.getElementById('app');
  
  const cardWelcome = document.getElementById('login-card-welcome');
  const cardSignIn = document.getElementById('login-card-signin');
  const cardSignUp = document.getElementById('login-card-signup');
  const cardGoogle = document.getElementById('login-card-google');
  const cardGoogleCustom = document.getElementById('login-card-google-custom');

  // Sub-card navigation helper
  function showCard(activeCard) {
    [cardWelcome, cardSignIn, cardSignUp, cardGoogle, cardGoogleCustom].forEach(card => {
      card.style.display = card === activeCard ? 'flex' : 'none';
    });
  }

  if (session) {
    // User is logged in
    loginView.style.display = 'none';
    appContainer.style.display = 'flex';
    // Initialize DB loading and UI population
    loadDB().then(() => {
      refreshAllUI();
    });
  } else {
    // User is logged out
    loginView.style.display = 'flex';
    appContainer.style.display = 'none';
    showCard(cardWelcome); // Default to welcome onboarding screen
  }

  // 1. Welcome Screen buttons
  document.getElementById('btn-google-welcome').onclick = () => {
    showCard(cardGoogle);
    renderGoogleAccounts(cardGoogle, cardSignIn, cardGoogleCustom);
  };

  document.getElementById('btn-welcome-signup').onclick = () => {
    showCard(cardSignUp);
  };

  document.getElementById('btn-welcome-login').onclick = () => {
    showCard(cardSignIn);
  };

  // 2. Back Navigation to Welcome Screen
  document.getElementById('link-signin-back').onclick = (e) => {
    e.preventDefault();
    showCard(cardWelcome);
  };

  document.getElementById('link-signup-back').onclick = (e) => {
    e.preventDefault();
    showCard(cardWelcome);
  };

  // 3. Toggles between Sign In and Sign Up
  document.getElementById('link-show-signup').onclick = (e) => {
    e.preventDefault();
    showCard(cardSignUp);
  };
  
  document.getElementById('link-show-signin').onclick = (e) => {
    e.preventDefault();
    showCard(cardSignIn);
  };

  // 4. Email Sign-In Submission
  const loginForm = document.getElementById('form-login');
  loginForm.onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    // Mock login success
    localStorage.setItem(SESSION_KEY, email);
    setupAuthGate();
  };

  // 5. Email Sign-Up Submission
  const signupForm = document.getElementById('form-signup');
  signupForm.onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    // Mock registration success
    alert(`Account registered successfully for ${name}! Please log in.`);
    // Autofill email in sign-in card
    document.getElementById('login-email').value = email;
    showCard(cardSignIn);
  };

  // 6. Back/Cancel buttons inside Google selector views
  document.getElementById('btn-cancel-google').onclick = () => {
    showCard(cardWelcome);
  };

  document.getElementById('btn-back-google-list').onclick = () => {
    showCard(cardGoogle);
  };

  // 7. Custom Google Email Login form submit
  const googleCustomForm = document.getElementById('form-google-custom');
  googleCustomForm.onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('google-custom-email').value;
    localStorage.setItem(SESSION_KEY, email);
    setupAuthGate();
  };

  // 8. Settings Logout Button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (confirm('Are you sure you want to log out of your session?')) {
        localStorage.removeItem(SESSION_KEY);
        setupAuthGate();
      }
    };
  }
}

// Render Google Accounts List inside Auth Gate Card
function renderGoogleAccounts(cardGoogle, cardSignIn, cardGoogleCustom) {
  const listContainer = document.getElementById('google-accounts-list-page');
  
  const mockAccounts = [
    { name: 'Nithin Kumar', email: 'nithin.k@gmail.com', initials: 'NK' },
    { name: 'Intern Spark', email: 'intern@sparktech.io', initials: 'IS' }
  ];

  listContainer.innerHTML = '';
  
  // Render default accounts list
  mockAccounts.forEach(acc => {
    const item = document.createElement('div');
    item.className = 'google-account-item';
    item.innerHTML = `
      <div class="google-avatar">${acc.initials}</div>
      <div class="google-info">
        <span class="google-name">${acc.name}</span>
        <span class="google-email">${acc.email}</span>
      </div>
    `;
    item.onclick = () => {
      localStorage.setItem(SESSION_KEY, acc.email);
      setupAuthGate();
    };
    listContainer.appendChild(item);
  });

  // Render "Use another account" button at the bottom of the list
  const useAnotherItem = document.createElement('div');
  useAnotherItem.className = 'google-account-item';
  useAnotherItem.style.borderStyle = 'dashed';
  useAnotherItem.innerHTML = `
    <div class="google-avatar" style="background: rgba(255,255,255,0.05); color: var(--color-text-muted);">+</div>
    <div class="google-info" style="justify-content: center;">
      <span class="google-name" style="color: var(--color-primary); font-weight: 600;">Use another account</span>
    </div>
  `;
  useAnotherItem.onclick = () => {
    // Clear inputs and switch card
    document.getElementById('form-google-custom').reset();
    cardGoogleCustom.style.display = 'flex';
    cardGoogle.style.display = 'none';
  };
  listContainer.appendChild(useAnotherItem);
}

// Asynchronous DB sync from Backend REST API
async function loadDB() {
  // If not logged in, skip fetching
  if (!localStorage.getItem(SESSION_KEY)) return;

  try {
    const [productsRes, customersRes, invoicesRes, profileRes] = await Promise.all([
      fetch(`${API_URL}/products`),
      fetch(`${API_URL}/customers`),
      fetch(`${API_URL}/invoices`),
      fetch(`${API_URL}/profile`)
    ]);

    if (!productsRes.ok || !customersRes.ok || !invoicesRes.ok || !profileRes.ok) {
      throw new Error('One or more backend requests failed.');
    }

    state.products = await productsRes.json();
    state.customers = await customersRes.json();
    state.invoices = await invoicesRes.json();
    state.profile = await profileRes.json();
  } catch (err) {
    console.error('API connection failed. Falling back to local values.', err);
    alert('Could not connect to the backend server. Please verify the server is running at: ' + API_URL);
  }
}

// Trigger Demo Data population on Backend
async function loadDemoData() {
  const demoCustomers = [
    { id: 'c1', name: 'Aarav Mehta', email: 'aarav.mehta@gmail.com', phone: '+91 98123 45678', address: 'Apartment 4B, Skyview Towers, Sector 62, Noida' },
    { id: 'c2', name: 'Priya Sharma', email: 'priya.sharma@yahoo.com', phone: '+91 88776 55443', address: '12, MG Road, Camp, Pune, Maharashtra' },
    { id: 'c3', name: 'Vikram Singh', email: 'vikram.singh@outlook.com', phone: '+91 76543 21098', address: 'Plot 45, Industrial Area, Sector 5, Panchkula, HR' }
  ];

  const demoProducts = [
    { id: 'p1', name: 'Aegis Gaming Mouse', sku: 'AEG-MS-01', price: 1299.00, tax: 18, stock: 42 },
    { id: 'p2', name: 'Mechanical Keyboard Blue Switch', sku: 'MCH-KB-BL', price: 3499.00, tax: 18, stock: 15 },
    { id: 'p3', name: 'USB-C Multiport Adapter 8-in-1', sku: 'USB-HUB-8', price: 1899.00, tax: 12, stock: 3 },
    { id: 'p4', name: 'Ultra-Wide Monitor 29"', sku: 'MON-UW-29', price: 16499.00, tax: 18, stock: 8 },
    { id: 'p5', name: 'High-Speed HDMI Cable 2m', sku: 'CBL-HDMI-2M', price: 299.00, tax: 18, stock: 65 }
  ];

  const demoInvoices = [
    {
      id: 'inv1',
      number: 'INV-2026-0001',
      date: '2026-06-01',
      dueDate: '2026-06-16',
      customerId: 'c1',
      customerName: 'Aarav Mehta',
      items: [
        { productId: 'p1', name: 'Aegis Gaming Mouse', sku: 'AEG-MS-01', price: 1299.00, qty: 1, taxRate: 18, amount: 1299.00 }
      ],
      subtotal: 1299.00,
      discountPercent: 10,
      discountAmount: 129.90,
      taxAmount: 210.44,
      total: 1379.54,
      paymentMode: 'UPI',
      status: 'Paid',
      notes: 'Demo paid invoice.'
    },
    {
      id: 'inv2',
      number: 'INV-2026-0002',
      date: '2026-06-05',
      dueDate: '2026-06-20',
      customerId: 'c2',
      customerName: 'Priya Sharma',
      items: [
        { productId: 'p2', name: 'Mechanical Keyboard Blue Switch', sku: 'MCH-KB-BL', price: 3499.00, qty: 2, taxRate: 18, amount: 6998.00 },
        { productId: 'p3', name: 'USB-C Multiport Adapter 8-in-1', sku: 'USB-HUB-8', price: 1899.00, qty: 1, taxRate: 12, amount: 1899.00 }
      ],
      subtotal: 8897.00,
      discountPercent: 0,
      discountAmount: 0.00,
      taxAmount: 1487.52,
      total: 10384.52,
      paymentMode: 'Bank Transfer',
      status: 'Unpaid',
      notes: 'Demo outstanding invoice.'
    }
  ];

  try {
    const importPayload = {
      invoices: demoInvoices,
      products: demoProducts,
      customers: demoCustomers,
      profile: state.profile
    };

    const res = await fetch(`${API_URL}/db/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(importPayload)
    });

    if (!res.ok) throw new Error('Database import failed on backend.');
    
    await loadDB();
    refreshAllUI();
  } catch (err) {
    alert('Failed to load demo data: ' + err.message);
  }
}

// DOM Events & Navigation Router
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Auth Gate
  setupAuthGate();
  
  // Create icons initially
  safeCreateIcons();
  
  // Set current date on dashboard
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateEl = document.getElementById('dashboard-date');
  if (dateEl) {
    dateEl.innerText = new Date().toLocaleDateString('en-US', options);
  }

  // Switch tabs
  const navItems = document.querySelectorAll('.app-nav .nav-item');
  const views = document.querySelectorAll('.content-view');
  
  navItems.forEach(item => {
    item.addEventListener('click', async () => {
      const targetViewId = item.getAttribute('data-view');
      
      navItems.forEach(n => n.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      
      item.classList.add('active');
      document.getElementById(targetViewId).classList.add('active');
      
      // Sync fresh data from server on tab click
      await loadDB();

      if (targetViewId === 'view-dashboard') {
        refreshDashboard();
      } else if (targetViewId === 'view-invoices') {
        refreshInvoicesTable();
      } else if (targetViewId === 'view-inventory') {
        refreshInventoryTable();
      } else if (targetViewId === 'view-customers') {
        refreshCustomersTable();
      } else if (targetViewId === 'view-settings') {
        loadSettingsForm();
      }
    });
  });

  // Handle Quick Navigation buttons on dashboard
  document.querySelector('.btn-nav-invoices').addEventListener('click', () => {
    document.querySelector('.app-nav [data-view="view-invoices"]').click();
  });
  document.querySelector('.btn-nav-inventory').addEventListener('click', () => {
    document.querySelector('.app-nav [data-view="view-inventory"]').click();
  });

  // Theme Toggle Listener
  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
  });

  // Modals close button handlers
  setupModalCloseButtons();
  
  // Initialize invoicing builder
  setupInvoiceBuilderListeners();

  // Populate UI on first run
  refreshAllUI();
});

function refreshAllUI() {
  refreshDashboard();
  refreshInvoicesTable();
  refreshInventoryTable();
  refreshCustomersTable();
  loadSettingsForm();
}

// Modal helper functions
function setupModalCloseButtons() {
  const closeItemModal = () => document.getElementById('modal-item').style.display = 'none';
  document.querySelectorAll('.btn-close-item').forEach(btn => btn.addEventListener('click', closeItemModal));

  const closeCustomerModal = () => document.getElementById('modal-customer').style.display = 'none';
  document.querySelectorAll('.btn-close-customer').forEach(btn => btn.addEventListener('click', closeCustomerModal));

  const closeInvoiceDetailModal = () => document.getElementById('modal-invoice-detail').style.display = 'none';
  document.querySelectorAll('.btn-close-invoice-detail').forEach(btn => btn.addEventListener('click', closeInvoiceDetailModal));
}

// Dashboard Stats & Custom SVG Charting
function refreshDashboard() {
  const totalRevenue = state.invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const pendingRevenue = state.invoices
    .filter(inv => inv.status === 'Unpaid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const pendingCount = state.invoices.filter(inv => inv.status === 'Unpaid').length;
  
  document.getElementById('stat-revenue').innerText = formatCurrency(totalRevenue);
  document.getElementById('stat-invoice-count').innerText = state.invoices.length;
  document.getElementById('stat-unpaid').innerText = formatCurrency(pendingRevenue);
  document.getElementById('stat-unpaid-count').innerText = `${pendingCount} outstanding bill${pendingCount === 1 ? '' : 's'}`;
  document.getElementById('stat-products-count').innerText = state.products.length;

  // Render recent invoices (last 5)
  const recentInvoicesTable = document.getElementById('table-recent-invoices').getElementsByTagName('tbody')[0];
  recentInvoicesTable.innerHTML = '';
  
  const sortedInvoices = [...state.invoices].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent5 = sortedInvoices.slice(0, 5);

  if (recent5.length === 0) {
    recentInvoicesTable.innerHTML = `<tr><td colspan="5" class="empty-state">No invoices generated yet. Click "+" in Invoices tab.</td></tr>`;
  } else {
    recent5.forEach(inv => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${inv.number}</strong></td>
        <td>${inv.customerName}</td>
        <td>${formatDate(inv.date)}</td>
        <td>${formatCurrency(inv.total)}</td>
        <td><span class="status-badge ${inv.status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}">${inv.status}</span></td>
      `;
      recentInvoicesTable.appendChild(row);
    });
  }

  // Stock alerts (stock <= 5)
  const lowStockList = document.getElementById('low-stock-list');
  lowStockList.innerHTML = '';
  const lowStockItems = state.products.filter(p => p.stock <= 5);

  if (lowStockItems.length === 0) {
    lowStockList.innerHTML = `<li class="empty-state">All products are adequately stocked.</li>`;
  } else {
    lowStockItems.forEach(item => {
      const li = document.createElement('li');
      li.className = 'alert-item';
      li.innerHTML = `
        <div>
          <span class="alert-item-name">${item.name}</span>
          <br><small style="color:var(--color-text-muted)">SKU: ${item.sku}</small>
        </div>
        <span class="alert-item-stock">${item.stock} left</span>
      `;
      lowStockList.appendChild(li);
    });
  }

  drawSalesChart();
}

function drawSalesChart() {
  const chartLabels = document.getElementById('chart-labels');
  const chartLinePath = document.getElementById('chart-line-path');
  const chartAreaPath = document.getElementById('chart-area-path');
  const chartDots = document.getElementById('chart-dots');
  
  chartLabels.innerHTML = '';
  chartDots.innerHTML = '';
  chartLinePath.setAttribute('d', '');
  chartAreaPath.setAttribute('d', '');

  const last7 = [...state.invoices]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7);

  if (last7.length < 2) {
    chartLinePath.setAttribute('d', 'M 40,120 L 480,120');
    chartAreaPath.setAttribute('d', 'M 40,120 L 480,120 L 480,170 L 40,170 Z');
    chartLabels.innerHTML = '<span class="chart-label">No data</span><span class="chart-label">Need at least 2 bills to plot</span>';
    return;
  }

  const maxTotal = Math.max(...last7.map(inv => inv.total));
  const height = 150;
  const startX = 40;
  const endX = 460;
  const stepX = (endX - startX) / (last7.length - 1);
  const scaleY = maxTotal > 0 ? height / maxTotal : 1;

  let points = [];
  
  last7.forEach((inv, index) => {
    const x = startX + (index * stepX);
    const y = 170 - (inv.total * scaleY);
    points.push({ x, y, val: inv.total, num: inv.number });
    
    const label = document.createElement('span');
    label.className = 'chart-label';
    label.innerText = inv.number.split('-').pop();
    chartLabels.appendChild(label);
  });

  let dLine = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    dLine += ` L ${points[i].x},${points[i].y}`;
  }

  let dArea = `${dLine} L ${points[points.length - 1].x},170 L ${points[0].x},170 Z`;
  
  chartLinePath.setAttribute('d', dLine);
  chartAreaPath.setAttribute('d', dArea);

  points.forEach(pt => {
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', pt.x);
    dot.setAttribute('cy', pt.y);
    dot.setAttribute('r', '5');
    dot.setAttribute('class', 'chart-line-dot');
    
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${pt.num}: ${formatCurrency(pt.val)}`;
    dot.appendChild(title);
    
    chartDots.appendChild(dot);
  });
}

// Inventory CRUD
function refreshInventoryTable() {
  const tbody = document.getElementById('inventory-list-body');
  const query = document.getElementById('search-inventory').value.toLowerCase();
  
  tbody.innerHTML = '';
  
  const filtered = state.products.filter(p => 
    p.name.toLowerCase().includes(query) || 
    p.sku.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No products found matching "${query}"</td></tr>`;
    return;
  }

  filtered.forEach(p => {
    const isLow = p.stock <= 5;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="product-cell">
          <span style="font-weight: 600;">${p.name}</span>
        </div>
      </td>
      <td><code>${p.sku}</code></td>
      <td>${formatCurrency(p.price)}</td>
      <td>${p.tax}%</td>
      <td>
        <span class="stock-value ${isLow ? 'stock-low' : ''}">${p.stock} units</span>
      </td>
      <td>
        <span class="status-badge ${p.stock > 0 ? 'badge-paid' : 'badge-unpaid'}">
          ${p.stock > 0 ? 'In Stock' : 'Out of Stock'}
        </span>
      </td>
      <td>
        <div class="row-actions">
          <button class="action-btn btn-edit-item" data-id="${p.id}" title="Edit"><i data-lucide="edit"></i></button>
          <button class="action-btn btn-delete btn-delete-item" data-id="${p.id}" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  safeCreateIcons();
  
  document.querySelectorAll('.btn-edit-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openItemModal(id);
    });
  });

  document.querySelectorAll('.btn-delete-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      deleteItem(id);
    });
  });
}

function openItemModal(id = null) {
  const modal = document.getElementById('modal-item');
  const title = document.getElementById('item-modal-title');
  const form = document.getElementById('form-item');
  
  form.reset();
  
  if (id) {
    title.innerText = 'Edit Product';
    const p = state.products.find(item => item.id === id);
    if (p) {
      document.getElementById('item-id').value = p.id;
      document.getElementById('item-name').value = p.name;
      document.getElementById('item-sku').value = p.sku;
      document.getElementById('item-price').value = p.price;
      document.getElementById('item-tax').value = p.tax;
      document.getElementById('item-stock').value = p.stock;
    }
  } else {
    title.innerText = 'Add New Product';
    document.getElementById('item-id').value = '';
  }
  
  modal.style.display = 'flex';
}

async function saveItem(e) {
  e.preventDefault();
  const id = document.getElementById('item-id').value || 'prod_' + Date.now();
  const name = document.getElementById('item-name').value;
  const sku = document.getElementById('item-sku').value.toUpperCase();
  const price = parseFloat(document.getElementById('item-price').value);
  const tax = parseInt(document.getElementById('item-tax').value) || 0;
  const stock = parseInt(document.getElementById('item-stock').value) || 0;

  const payload = { name, sku, price, tax, stock };
  const isEdit = !!document.getElementById('item-id').value;

  try {
    const res = await fetch(`${API_URL}/products${isEdit ? '/' + id : ''}`, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit ? payload : { id, ...payload })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error.');

    await loadDB();
    document.getElementById('modal-item').style.display = 'none';
    refreshInventoryTable();
    refreshDashboard();
  } catch (err) {
    alert('Failed to save item: ' + err.message);
  }
}

async function deleteItem(id) {
  if (confirm('Are you sure you want to delete this product?')) {
    try {
      const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete.');
      await loadDB();
      refreshInventoryTable();
      refreshDashboard();
    } catch (err) {
      alert(err.message);
    }
  }
}

// Customers CRUD
function refreshCustomersTable() {
  const tbody = document.getElementById('customers-list-body');
  const query = document.getElementById('search-customers').value.toLowerCase();
  
  tbody.innerHTML = '';
  
  const filtered = state.customers.filter(c => 
    c.name.toLowerCase().includes(query) || 
    (c.email && c.email.toLowerCase().includes(query)) ||
    c.phone.includes(query)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No customers found matching "${query}"</td></tr>`;
    return;
  }

  filtered.forEach(c => {
    const outstanding = state.invoices
      .filter(inv => inv.customerId === c.id && inv.status === 'Unpaid')
      .reduce((sum, inv) => sum + inv.total, 0);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${c.name}</strong></td>
      <td>${c.email || '<span style="color:var(--color-text-muted)">-</span>'}</td>
      <td>${c.phone}</td>
      <td><span class="text-truncate" style="max-width: 200px; display:inline-block">${c.address || '-'}</span></td>
      <td>
        <span class="${outstanding > 0 ? 'text-danger' : 'text-success'}" style="font-weight:bold">
          ${formatCurrency(outstanding)}
        </span>
      </td>
      <td>
        <div class="row-actions">
          <button class="action-btn btn-edit-customer" data-id="${c.id}" title="Edit"><i data-lucide="edit"></i></button>
          <button class="action-btn btn-delete btn-delete-customer" data-id="${c.id}" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  safeCreateIcons();
  
  document.querySelectorAll('.btn-edit-customer').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openCustomerModal(id);
    });
  });

  document.querySelectorAll('.btn-delete-customer').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      deleteCustomer(id);
    });
  });
}

function openCustomerModal(id = null) {
  const modal = document.getElementById('modal-customer');
  const title = document.getElementById('customer-modal-title');
  const form = document.getElementById('form-customer');
  
  form.reset();
  
  if (id) {
    title.innerText = 'Edit Customer Details';
    const c = state.customers.find(client => client.id === id);
    if (c) {
      document.getElementById('customer-id').value = c.id;
      document.getElementById('customer-name').value = c.name;
      document.getElementById('customer-email').value = c.email;
      document.getElementById('customer-phone').value = c.phone;
      document.getElementById('customer-address').value = c.address;
    }
  } else {
    title.innerText = 'Add New Customer';
    document.getElementById('customer-id').value = '';
  }
  
  modal.style.display = 'flex';
}

async function saveCustomer(e) {
  e.preventDefault();
  const id = document.getElementById('customer-id').value || 'cust_' + Date.now();
  const name = document.getElementById('customer-name').value;
  const email = document.getElementById('customer-email').value;
  const phone = document.getElementById('customer-phone').value;
  const address = document.getElementById('customer-address').value;

  const payload = { name, email, phone, address };
  const isEdit = !!document.getElementById('customer-id').value;

  try {
    const res = await fetch(`${API_URL}/customers${isEdit ? '/' + id : ''}`, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit ? payload : { id, ...payload })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error.');

    await loadDB();
    document.getElementById('modal-customer').style.display = 'none';
    refreshCustomersTable();
    
    // If builder is active, refresh customer dropdown
    const builderActive = document.getElementById('modal-invoice').style.display === 'block';
    if (builderActive) {
      populateCustomerSelect(id);
    }
  } catch (err) {
    alert('Failed to save client: ' + err.message);
  }
}

async function deleteCustomer(id) {
  try {
    const res = await fetch(`${API_URL}/customers/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Delete failed.');

    await loadDB();
    refreshCustomersTable();
  } catch (err) {
    alert(err.message);
  }
}

// Invoices List
let activeFilter = 'all';

function refreshInvoicesTable() {
  const tbody = document.getElementById('invoice-list-body');
  const query = document.getElementById('search-invoices').value.toLowerCase();
  
  tbody.innerHTML = '';
  
  let filtered = state.invoices.filter(inv => 
    inv.number.toLowerCase().includes(query) || 
    inv.customerName.toLowerCase().includes(query)
  );

  if (activeFilter === 'paid') {
    filtered = filtered.filter(inv => inv.status === 'Paid');
  } else if (activeFilter === 'unpaid') {
    filtered = filtered.filter(inv => inv.status === 'Unpaid');
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No invoices found matching current filters.</td></tr>`;
    return;
  }

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  filtered.forEach(inv => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${inv.number}</strong></td>
      <td>${inv.customerName}</td>
      <td>${formatDate(inv.date)}</td>
      <td>${formatDate(inv.dueDate)}</td>
      <td><span style="font-weight:600">${formatCurrency(inv.total)}</span></td>
      <td>
        <span class="status-badge ${inv.status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}">
          ${inv.status}
        </span>
      </td>
      <td>
        <div class="row-actions">
          <button class="action-btn btn-view-invoice" data-id="${inv.id}" title="View Details"><i data-lucide="eye"></i></button>
          <button class="action-btn btn-toggle-status" data-id="${inv.id}" title="Toggle status"><i data-lucide="refresh-cw"></i></button>
          <button class="action-btn btn-delete btn-delete-invoice" data-id="${inv.id}" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  safeCreateIcons();

  document.querySelectorAll('.btn-view-invoice').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      viewInvoiceDetail(id);
    });
  });

  document.querySelectorAll('.btn-toggle-status').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      toggleInvoiceStatus(id);
    });
  });

  document.querySelectorAll('.btn-delete-invoice').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      deleteInvoice(id);
    });
  });
}

async function toggleInvoiceStatus(id) {
  const inv = state.invoices.find(invoice => invoice.id === id);
  if (inv) {
    const newStatus = inv.status === 'Paid' ? 'Unpaid' : 'Paid';
    try {
      const res = await fetch(`${API_URL}/invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status.');
      await loadDB();
      refreshInvoicesTable();
      refreshDashboard();
    } catch (err) {
      alert(err.message);
    }
  }
}

async function deleteInvoice(id) {
  if (confirm('Are you sure you want to delete this invoice? Product stocks will be restored.')) {
    try {
      const res = await fetch(`${API_URL}/invoices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete invoice.');
      await loadDB();
      refreshInvoicesTable();
      refreshDashboard();
    } catch (err) {
      alert(err.message);
    }
  }
}

// Bind Filter chip listeners
document.querySelectorAll('.filter-chips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.getAttribute('data-filter');
    refreshInvoicesTable();
  });
});

// Search filters keyup
document.getElementById('search-invoices').addEventListener('keyup', refreshInvoicesTable);
document.getElementById('search-inventory').addEventListener('keyup', refreshInventoryTable);
document.getElementById('search-customers').addEventListener('keyup', refreshCustomersTable);

// Fullscreen Invoice Builder Engine
function setupInvoiceBuilderListeners() {
  document.getElementById('btn-new-invoice').addEventListener('click', openInvoiceBuilder);
  document.getElementById('btn-close-invoice-builder').addEventListener('click', closeInvoiceBuilder);
  document.getElementById('btn-add-item-row').addEventListener('click', () => addInvoiceItemRow());
  document.getElementById('btn-save-invoice').addEventListener('click', saveInvoice);
  
  document.getElementById('btn-quick-add-customer').addEventListener('click', () => {
    openCustomerModal();
  });
  
  document.getElementById('inv-discount-percent').addEventListener('input', calculateInvoiceTotals);
  document.getElementById('inv-discount-percent').addEventListener('change', calculateInvoiceTotals);
}

function openInvoiceBuilder() {
  if (state.customers.length === 0) {
    alert('Please add a client/customer before creating an invoice!');
    document.querySelector('.app-nav [data-view="view-customers"]').click();
    return;
  }
  if (state.products.length === 0) {
    alert('Please add products to your inventory before creating an invoice!');
    document.querySelector('.app-nav [data-view="view-inventory"]').click();
    return;
  }

  const overlay = document.getElementById('modal-invoice');
  overlay.style.display = 'block';

  const dateStr = new Date().toISOString().split('T')[0];
  document.getElementById('inv-date').value = dateStr;
  
  const future = new Date();
  future.setDate(future.getDate() + 15);
  document.getElementById('inv-due-date').value = future.toISOString().split('T')[0];

  const prefix = `INV-${new Date().getFullYear()}-`;
  const pad = '0000';
  const lastIndex = state.invoices.length + 1;
  const invNumber = prefix + (pad + lastIndex).slice(-4);
  document.getElementById('inv-number').value = invNumber;

  document.getElementById('inv-discount-percent').value = 0;
  document.getElementById('inv-notes').value = 'Thank you for your business! Payment is due within 15 days.';
  document.getElementById('inv-payment-status').value = 'Unpaid';
  document.getElementById('inv-payment-mode').value = 'UPI';

  populateCustomerSelect();
  document.getElementById('invoice-items-tbody').innerHTML = '';
  addInvoiceItemRow();
}

function closeInvoiceBuilder() {
  document.getElementById('modal-invoice').style.display = 'none';
}

function populateCustomerSelect(selectedId = '') {
  const select = document.getElementById('inv-customer-select');
  select.innerHTML = '<option value="" disabled selected>-- Select a Client --</option>';
  
  state.customers.forEach(cust => {
    const opt = document.createElement('option');
    opt.value = cust.id;
    opt.innerText = `${cust.name} (${cust.phone})`;
    if (cust.id === selectedId) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function addInvoiceItemRow() {
  const tbody = document.getElementById('invoice-items-tbody');
  const tr = document.createElement('tr');
  const rowIndex = tbody.children.length;
  
  let productOptions = '<option value="" disabled selected>-- Choose Product --</option>';
  state.products.forEach(p => {
    productOptions += `<option value="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>${p.name} (SKU: ${p.sku} | Left: ${p.stock})</option>`;
  });

  tr.innerHTML = `
    <td>
      <select class="item-select" data-row="${rowIndex}" required>
        ${productOptions}
      </select>
    </td>
    <td>
      <input type="number" class="item-qty" data-row="${rowIndex}" value="1" min="1" required>
    </td>
    <td>
      <input type="number" class="item-price" data-row="${rowIndex}" step="0.01" min="0" required>
    </td>
    <td>
      <input type="number" class="item-tax" data-row="${rowIndex}" min="0" max="100" value="0">
    </td>
    <td>
      <span class="item-row-total" data-row="${rowIndex}">₹0.00</span>
    </td>
    <td>
      <button type="button" class="action-btn btn-delete btn-delete-row" title="Remove row">
        <i data-lucide="trash-2"></i>
      </button>
    </td>
  `;

  tbody.appendChild(tr);
  safeCreateIcons();

  const selectEl = tr.querySelector('.item-select');
  const qtyEl = tr.querySelector('.item-qty');
  const priceEl = tr.querySelector('.item-price');
  const taxEl = tr.querySelector('.item-tax');
  const deleteBtn = tr.querySelector('.btn-delete-row');

  selectEl.addEventListener('change', () => {
    const prodId = selectEl.value;
    const prod = state.products.find(p => p.id === prodId);
    if (prod) {
      priceEl.value = prod.price;
      taxEl.value = prod.tax;
      qtyEl.max = prod.stock;
      updateRowTotal(rowIndex);
    }
  });

  const recalculateRow = () => updateRowTotal(rowIndex);
  qtyEl.addEventListener('input', recalculateRow);
  priceEl.addEventListener('input', recalculateRow);
  taxEl.addEventListener('input', recalculateRow);

  deleteBtn.addEventListener('click', () => {
    tr.remove();
    reindexRows();
    calculateInvoiceTotals();
  });
}

function reindexRows() {
  const tbody = document.getElementById('invoice-items-tbody');
  Array.from(tbody.children).forEach((tr, index) => {
    tr.querySelectorAll('[data-row]').forEach(el => {
      el.setAttribute('data-row', index);
    });
  });
}

function updateRowTotal(index) {
  const row = document.querySelector(`#invoice-items-tbody tr:nth-child(${index + 1})`);
  if (!row) return;

  const qty = parseInt(row.querySelector('.item-qty').value) || 0;
  const price = parseFloat(row.querySelector('.item-price').value) || 0;
  
  const total = qty * price;
  row.querySelector('.item-row-total').innerText = formatCurrency(total);

  calculateInvoiceTotals();
}

function calculateInvoiceTotals() {
  const tbody = document.getElementById('invoice-items-tbody');
  const rows = Array.from(tbody.children);
  
  let subtotal = 0;
  let totalTax = 0;

  rows.forEach(row => {
    const select = row.querySelector('.item-select');
    if (!select.value) return;
    
    const qty = parseInt(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const taxRate = parseFloat(row.querySelector('.item-tax').value) || 0;

    const rowSubtotal = qty * price;
    subtotal += rowSubtotal;
    
    const rowTax = rowSubtotal * (taxRate / 100);
    totalTax += rowTax;
  });

  const discountPercent = parseFloat(document.getElementById('inv-discount-percent').value) || 0;
  const discountAmount = subtotal * (discountPercent / 100);
  
  let adjustedTax = totalTax;
  if (discountPercent > 0) {
    adjustedTax = 0;
    rows.forEach(row => {
      const select = row.querySelector('.item-select');
      if (!select.value) return;
      
      const qty = parseInt(row.querySelector('.item-qty').value) || 0;
      const price = parseFloat(row.querySelector('.item-price').value) || 0;
      const taxRate = parseFloat(row.querySelector('.item-tax').value) || 0;

      const rowSubtotal = qty * price;
      const rowDiscount = rowSubtotal * (discountPercent / 100);
      const rowAdjustedSub = rowSubtotal - rowDiscount;
      adjustedTax += rowAdjustedSub * (taxRate / 100);
    });
  }

  const grandTotal = subtotal - discountAmount + adjustedTax;

  document.getElementById('inv-summary-subtotal').innerText = formatCurrency(subtotal);
  document.getElementById('inv-summary-tax').innerText = formatCurrency(adjustedTax);
  document.getElementById('inv-summary-total').innerText = formatCurrency(grandTotal);
}

async function saveInvoice() {
  const customerId = document.getElementById('inv-customer-select').value;
  const number = document.getElementById('inv-number').value;
  const date = document.getElementById('inv-date').value;
  const dueDate = document.getElementById('inv-due-date').value;
  const paymentMode = document.getElementById('inv-payment-mode').value;
  const status = document.getElementById('inv-payment-status').value;
  const notes = document.getElementById('inv-notes').value;
  
  if (!customerId) {
    alert('Please select a customer.');
    return;
  }
  if (!date || !dueDate) {
    alert('Please pick Invoice & Due dates.');
    return;
  }

  const rows = Array.from(document.getElementById('invoice-items-tbody').children);
  if (rows.length === 0) {
    alert('Please add at least one item row.');
    return;
  }

  let items = [];
  let stockCheckPassed = true;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const productId = row.querySelector('.item-select').value;
    const qty = parseInt(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const taxRate = parseFloat(row.querySelector('.item-tax').value) || 0;

    if (!productId) {
      alert(`Please select a product on row ${i + 1}`);
      return;
    }
    if (qty <= 0) {
      alert(`Quantity must be greater than 0 on row ${i + 1}`);
      return;
    }

    const prod = state.products.find(p => p.id === productId);
    if (!prod) return;

    if (prod.stock < qty) {
      alert(`Insufficient stock for "${prod.name}" (Requested: ${qty}, Stock: ${prod.stock})`);
      stockCheckPassed = false;
      return;
    }

    items.push({
      productId,
      name: prod.name,
      sku: prod.sku,
      price,
      qty,
      taxRate,
      amount: qty * price
    });
  }

  if (!stockCheckPassed) return;

  let subtotal = 0;
  items.forEach(item => subtotal += item.amount);

  const discountPercent = parseFloat(document.getElementById('inv-discount-percent').value) || 0;
  const discountAmount = subtotal * (discountPercent / 100);

  let taxAmount = 0;
  items.forEach(item => {
    const itemDiscount = item.amount * (discountPercent / 100);
    const itemSub = item.amount - itemDiscount;
    taxAmount += itemSub * (item.taxRate / 100);
  });

  const total = subtotal - discountAmount + taxAmount;
  const cust = state.customers.find(c => c.id === customerId);

  const newInvoice = {
    id: 'inv_' + Date.now(),
    number,
    date,
    dueDate,
    customerId,
    customerName: cust.name,
    items,
    subtotal,
    discountPercent,
    discountAmount,
    taxAmount,
    total,
    paymentMode,
    status,
    notes
  };

  try {
    const res = await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newInvoice)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error.');

    await loadDB();
    closeInvoiceBuilder();
    refreshAllUI();
    viewInvoiceDetail(newInvoice.id);
  } catch (err) {
    alert('Failed to save invoice: ' + err.message);
  }
}

// Invoice Preview & Print
function viewInvoiceDetail(id) {
  const inv = state.invoices.find(invoice => invoice.id === id);
  if (!inv) return;

  document.getElementById('doc-company-name').innerText = state.profile.name;
  document.getElementById('doc-company-details').innerHTML = `
    ${state.profile.address}<br>
    Email: ${state.profile.email} | Phone: ${state.profile.phone} ${state.profile.taxId ? '| GSTIN: ' + state.profile.taxId : ''}
  `;

  const statusEl = document.getElementById('doc-invoice-status');
  statusEl.innerText = inv.status.toUpperCase();
  if (inv.status === 'Paid') {
    statusEl.className = 'invoice-badge-status';
  } else {
    statusEl.className = 'invoice-badge-status unpaid';
  }

  const cust = state.customers.find(c => c.id === inv.customerId) || { name: inv.customerName, phone: '', address: '' };
  document.getElementById('doc-customer-details').innerHTML = `
    <strong>${cust.name}</strong><br>
    ${cust.phone ? 'Phone: ' + cust.phone : ''}<br>
    ${cust.address ? 'Address: ' + cust.address : ''}
  `;

  document.getElementById('doc-invoice-number').innerText = inv.number;
  document.getElementById('doc-invoice-date').innerText = formatDate(inv.date);
  document.getElementById('doc-invoice-due-date').innerText = formatDate(inv.dueDate);
  document.getElementById('doc-payment-mode').innerText = inv.paymentMode;

  const tbody = document.getElementById('doc-items-tbody');
  tbody.innerHTML = '';
  inv.items.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.name}</td>
      <td><code>${item.sku}</code></td>
      <td class="text-right">${formatCurrency(item.price)}</td>
      <td class="text-right">${item.qty}</td>
      <td class="text-right">${item.taxRate}%</td>
      <td class="text-right">${formatCurrency(item.amount)}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('doc-notes').innerText = inv.notes || '-';
  document.getElementById('doc-subtotal').innerText = formatCurrency(inv.subtotal);
  document.getElementById('doc-discount-percent').innerText = inv.discountPercent;
  document.getElementById('doc-discount').innerText = formatCurrency(inv.discountAmount);
  document.getElementById('doc-tax').innerText = formatCurrency(inv.taxAmount);
  document.getElementById('doc-total').innerText = formatCurrency(inv.total);

  document.getElementById('btn-share-invoice').onclick = () => {
    const textStr = `Invoice: ${inv.number}\nTotal Amount: ${formatCurrency(inv.total)}\nStatus: ${inv.status}\nSent via BillBook.`;
    if (navigator.share) {
      navigator.share({
        title: `Bill ${inv.number}`,
        text: textStr,
        url: window.location.href
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(textStr);
      alert('Invoice description copied to clipboard!');
    }
  };

  document.getElementById('btn-print-invoice').onclick = () => {
    window.print();
  };

  document.getElementById('modal-invoice-detail').style.display = 'flex';
}

// Settings Profile & Backup Restore
function loadSettingsForm() {
  document.getElementById('company-name').value = state.profile.name;
  document.getElementById('company-email').value = state.profile.email;
  document.getElementById('company-phone').value = state.profile.phone;
  document.getElementById('company-address').value = state.profile.address;
  document.getElementById('company-tax-id').value = state.profile.taxId;
  document.getElementById('company-currency').value = state.profile.currency;
}

document.getElementById('form-business-profile').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById('company-name').value,
    email: document.getElementById('company-email').value,
    phone: document.getElementById('company-phone').value,
    address: document.getElementById('company-address').value,
    taxId: document.getElementById('company-tax-id').value,
    currency: document.getElementById('company-currency').value
  };

  try {
    const res = await fetch(`${API_URL}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Save failed.');
    
    await loadDB();
    alert('Company Profile Saved Successfully!');
    refreshDashboard();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('btn-load-sample').addEventListener('click', () => {
  if (confirm('Load demo products, clients and invoices? Existing data will be wiped.')) {
    loadDemoData();
  }
});

document.getElementById('btn-reset-data').addEventListener('click', async () => {
  if (confirm('CRITICAL: This will permanently wipe all server database items. Proceed?')) {
    try {
      const resetPayload = { invoices: [], products: [], customers: [], profile: state.profile };
      const res = await fetch(`${API_URL}/db/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetPayload)
      });
      if (!res.ok) throw new Error('Wipe failed.');
      
      await loadDB();
      refreshAllUI();
      alert('Wiped all data successfully.');
    } catch (err) {
      alert(err.message);
    }
  }
});

document.getElementById('btn-trigger-import').addEventListener('click', () => {
  document.getElementById('file-import').click();
});

document.getElementById('btn-export-data').addEventListener('click', async () => {
  try {
    const res = await fetch(`${API_URL}/db/export`);
    const dbData = await res.json();
    
    const blob = new Blob([JSON.stringify(dbData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billbook_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Export failed: ' + err.message);
  }
});

document.getElementById('file-import').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      
      if (imported.invoices && imported.products && imported.customers && imported.profile) {
        if (confirm('Valid backup detected. Overwrite current backend database?')) {
          const res = await fetch(`${API_URL}/db/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imported)
          });
          if (!res.ok) throw new Error('Import failed.');
          
          await loadDB();
          refreshAllUI();
          alert('Database restored successfully!');
        }
      } else {
        alert('Invalid database format.');
      }
    } catch (err) {
      alert('Error parsing file: ' + err.message);
    }
  };
  reader.readAsText(file);
});

// Helpers
function formatCurrency(amount) {
  const symbol = state.profile.currency || '₹';
  return symbol + ' ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Bind CRUD triggers
document.getElementById('btn-add-item').addEventListener('click', () => openItemModal());
document.getElementById('form-item').addEventListener('submit', saveItem);

document.getElementById('btn-add-customer').addEventListener('click', () => openCustomerModal());
document.getElementById('form-customer').addEventListener('submit', saveCustomer);
