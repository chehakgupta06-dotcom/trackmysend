let budget = {
  amount: 0,
  period: 'monthly',
  spent: 0,
  startDate: null,
  endDate: null,
  savings: 0
};

let transactions = [];
let pendingBills = [];
let timelineChart;

document.addEventListener('DOMContentLoaded', () => {
  // Load saved data
  const savedBudget = localStorage.getItem('budget');
  const savedTransactions = localStorage.getItem('transactions');
  const savedBills = localStorage.getItem('pendingBills');

  if (savedBudget) budget = JSON.parse(savedBudget);
  if (savedTransactions) transactions = JSON.parse(savedTransactions);
  if (savedBills) pendingBills = JSON.parse(savedBills);

  // Initialize date inputs with current date
  document.getElementById('budget-start-date').valueAsDate = new Date();
  document.getElementById('budget-end-date').valueAsDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Set up event listeners
  document.getElementById('set-budget').addEventListener('click', setBudget);
  document.getElementById('add-transaction').addEventListener('click', addTransaction);
  document.getElementById('add-bill').addEventListener('click', addPendingBill);
  
  // Initialize the app
  updateDashboard();
  updateTransactionsList();
  updateAnalytics();
  displayPendingBills();
  checkBillsDueDate();
  checkBudgetStatus();

  // Set up voice recognition
  setupVoiceRecognition();
});

function setBudget() {
  const amount = parseFloat(document.getElementById('budget-amount').value);
  const period = document.getElementById('budget-period').value;
  const startDate = document.getElementById('budget-start-date').value;
  const endDate = document.getElementById('budget-end-date').value;

  if (!amount || !startDate || !endDate) {
    showAlert('warning', 'Please fill in all fields');
    return;
  }

  if (new Date(endDate) <= new Date(startDate)) {
    showAlert('warning', 'End date must be after start date');
    return;
  }

  budget = {
    amount,
    period,
    spent: 0,
    startDate,
    endDate,
    savings: 0
  };

  localStorage.setItem('budget', JSON.stringify(budget));
  updateDashboard();
  updateProgressBar();
  showAlert('success', 'Budget has been set successfully');
}

function addTransaction() {
  const type = document.getElementById('transaction-type').value;
  const amount = parseFloat(document.getElementById('transaction-amount').value);
  const category = document.getElementById('transaction-category').value;
  const description = document.getElementById('transaction-description').value;

  if (!amount || !description) {
    showAlert('warning', 'Please fill in all fields');
    return;
  }

  const transaction = {
    type,
    amount,
    category,
    description,
    date: new Date().toISOString()
  };

  if (type === 'expense') {
    if (budget.spent + amount > budget.amount) {
      showAlert('warning', 'This expense will exceed your budget! Please review your spending.');
    }
    budget.spent += amount;
  }

  transactions.push(transaction);
  localStorage.setItem('transactions', JSON.stringify(transactions));
  localStorage.setItem('budget', JSON.stringify(budget));

  updateDashboard();
  updateTransactionsList();
  updateAnalytics();
  updateProgressBar();
  checkBudgetStatus();

  // Clear form
  document.getElementById('transaction-amount').value = '';
  document.getElementById('transaction-description').value = '';
}

function addPendingBill() {
  const name = document.getElementById('bill-name').value;
  const amount = parseFloat(document.getElementById('bill-amount').value);
  const dueDate = document.getElementById('bill-due-date').value;

  if (!name || !amount || !dueDate) {
    showAlert('warning', 'Please fill in all bill details');
    return;
  }

  const bill = {
    name,
    amount,
    dueDate,
    paid: false
  };

  pendingBills.push(bill);
  localStorage.setItem('pendingBills', JSON.stringify(pendingBills));
  displayPendingBills();
  checkBillsDueDate();

  // Clear form
  document.getElementById('bill-name').value = '';
  document.getElementById('bill-amount').value = '';
  document.getElementById('bill-due-date').value = '';
}

function displayPendingBills() {
  const billsList = document.getElementById('pending-bills-list');
  billsList.innerHTML = '';

  pendingBills.forEach((bill, index) => {
    const dueDate = new Date(bill.dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    const billElement = document.createElement('div');
    billElement.className = 'bill-item';
    billElement.innerHTML = `
      <div class="bill-details">
        <h4>${bill.name}</h4>
        <p>Amount: ₹${bill.amount}</p>
        <p>Due: ${new Date(bill.dueDate).toLocaleDateString()}</p>
        <p class="days-remaining">Days remaining: ${daysUntilDue}</p>
      </div>
      <button onclick="markBillAsPaid(${index})" class="btn-primary">
        <i class="fas fa-check"></i> Mark as Paid
      </button>
    `;
    billsList.appendChild(billElement);
  });
}

function markBillAsPaid(index) {
  const bill = pendingBills[index];
  const transaction = {
    type: 'expense',
    amount: bill.amount,
    category: 'bills',
    description: `Paid bill: ${bill.name}`,
    date: new Date().toISOString()
  };

  transactions.push(transaction);
  budget.spent += bill.amount;
  pendingBills.splice(index, 1);

  localStorage.setItem('transactions', JSON.stringify(transactions));
  localStorage.setItem('budget', JSON.stringify(budget));
  localStorage.setItem('pendingBills', JSON.stringify(pendingBills));

  updateDashboard();
  updateTransactionsList();
  updateAnalytics();
  updateProgressBar();
  displayPendingBills();
  checkBudgetStatus();
}

function checkBillsDueDate() {
  const today = new Date();
  pendingBills.forEach(bill => {
    const dueDate = new Date(bill.dueDate);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue === 1) {
      showAlert('warning', `Bill "${bill.name}" is due tomorrow! Amount: ₹${bill.amount}`);
    }
  });
}

function checkBudgetStatus() {
  if (!budget.startDate || !budget.endDate) return;

  const today = new Date();
  const endDate = new Date(budget.endDate);
  const startDate = new Date(budget.startDate);
  
  // Check if budget period has ended
  if (today >= endDate) {
    const savings = budget.amount - budget.spent;
    if (savings > 0) {
      showAlert('success', `Congratulations! You saved ₹${savings} in this budget period!`);
      budget.savings += savings;
      localStorage.setItem('budget', JSON.stringify(budget));
    }
  } 
  // Check if budget is depleted before end date
  else if (budget.spent >= budget.amount) {
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    showAlert('warning', `Budget depleted with ${daysRemaining} days remaining in the period!`);
  }
}

function updateAnalytics() {
  const categoryList = document.getElementById('category-list');
  const chartCanvas = document.getElementById('spending-chart');
  const timelineCanvas = document.getElementById('expense-timeline-chart');
  categoryList.innerHTML = '';

  // Category totals
  const categoryTotals = {};
  transactions.forEach(transaction => {
    if (transaction.type === 'expense') {
      categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + transaction.amount;
    }
  });

  const totalSpent = budget.spent || 1;
  const labels = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals);

  // Category breakdown
  labels.forEach((cat, idx) => {
    const percent = ((values[idx] / totalSpent) * 100).toFixed(1);
    const div = document.createElement('div');
    div.className = 'card mb-4';
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <h3>${cat}</h3>
          <p>₹${values[idx].toFixed(2)}</p>
        </div>
        <div class="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div class="h-full bg-primary" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
    categoryList.appendChild(div);
  });

  // Category pie chart
  if (window.barChart) window.barChart.destroy();
  window.barChart = new Chart(chartCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Expenses by Category',
        data: values,
        backgroundColor: '#e50914',
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => `₹${value}`
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => `₹${ctx.parsed.y.toFixed(2)}`
          }
        }
      }
    }
  });

  // Timeline chart
  const timelineData = {};
  transactions.forEach(transaction => {
    if (transaction.type === 'expense') {
      const date = transaction.date.split('T')[0];
      timelineData[date] = (timelineData[date] || 0) + transaction.amount;
    }
  });

  const timelineDates = Object.keys(timelineData).sort();
  const timelineValues = timelineDates.map(date => timelineData[date]);

  if (timelineChart) timelineChart.destroy();
  timelineChart = new Chart(timelineCanvas, {
    type: 'line',
    data: {
      labels: timelineDates,
      datasets: [{
        label: 'Daily Expenses',
        data: timelineValues,
        borderColor: '#e50914',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => `₹${value}`
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => `₹${ctx.parsed.y.toFixed(2)}`
          }
        }
      }
    }
  });
}

function setupVoiceRecognition() {
  if ('webkitSpeechRecognition' in window) {
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    const micButton = document.createElement('button');
    micButton.innerHTML = '<i class="fas fa-microphone"></i>';
    micButton.className = 'btn-mic';
    document.querySelector('.form-container').appendChild(micButton);

    micButton.addEventListener('click', () => {
      if (confirm('Allow microphone access for voice input?')) {
        recognition.start();
        micButton.classList.add('listening');
      }
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      processVoiceCommand(transcript);
      micButton.classList.remove('listening');
    };

    recognition.onerror = () => {
      showAlert('warning', 'Voice recognition error. Please try again.');
      micButton.classList.remove('listening');
    };
  }
}

function processVoiceCommand(transcript) {
  // Example: "add expense 500 for food"
  const expenseMatch = transcript.match(/add expense (\d+) for (\w+)/);
  if (expenseMatch) {
    const amount = parseFloat(expenseMatch[1]);
    const category = expenseMatch[2];
    
    document.getElementById('transaction-type').value = 'expense';
    document.getElementById('transaction-amount').value = amount;
    document.getElementById('transaction-category').value = category;
    document.getElementById('transaction-description').value = `Voice entry: ${transcript}`;
    
    addTransaction();
    showAlert('success', 'Voice command processed successfully');
  } else {
    showAlert('warning', 'Could not understand voice command. Please try again.');
  }
}

// Update existing functions
function updateDashboard() {
  document.getElementById('total-budget').textContent = `₹${budget.amount.toFixed(2)}`;
  document.getElementById('amount-spent').textContent = `₹${budget.spent.toFixed(2)}`;
  document.getElementById('remaining-budget').textContent = `₹${(budget.amount - budget.spent).toFixed(2)}`;

  const progress = (budget.spent / budget.amount) * 100;
  const progressBar = document.getElementById('budget-progress');
  progressBar.style.width = `${Math.min(progress, 100)}%`;
  progressBar.style.backgroundColor = progress > 90 ? '#ff0000' : '#e50914';
}

function updateTransactionsList() {
  const list = document.getElementById('transactions-list');
  list.innerHTML = '';

  transactions.forEach(transaction => {
    const div = document.createElement('div');
    div.className = `transaction-item ${transaction.type}`;
    div.innerHTML = `
      <div class="transaction-info">
        <span class="transaction-amount">₹${transaction.amount.toFixed(2)}</span>
        <span class="transaction-category">${transaction.category}</span>
        <span class="transaction-description">${transaction.description}</span>
        <span class="transaction-date">${new Date(transaction.date).toLocaleDateString()}</span>
      </div>
    `;
    list.appendChild(div);
  });
}

// Language data

const translations = {
  en: {
    dashboard: {
      totalBudget: "Total Budget",
      amountSpent: "Amount Spent",
      remainingBudget: "Remaining Budget",
      budgetProgress: "Budget Progress",
      tryWebApp: "Try the web app or download the app for your devices",
      congratulations: "Congratulations! You saved",
      alert: "Alert",
      budgetExceeded: "Budget exceeded! Please review your spending.",
      timeRemaining: "Time remaining",
      days: "days"
    },
    budget: {
      setBudget: "Set Your Budget",
      budgetAmount: "Budget Amount",
      budgetPeriod: "Budget Period",
      setBudgetBtn: "Set Budget",
      startDate: "Start Date",
      endDate: "End Date",
      monthly: "Monthly",
      weekly: "Weekly",
      yearly: "Yearly"
    },
    transactions: {
      addTransaction: "Add Transaction",
      type: "Type",
      amount: "Amount",
      category: "Category",
      description: "Description",
      addTransactionBtn: "Add Transaction",
      expense: "Expense",
      income: "Income",
      food: "Food & Dining",
      transportation: "Transportation",
      entertainment: "Entertainment",
      utilities: "Utilities",
      shopping: "Shopping",
      other: "Other",
      reset: "Reset",
      pendingBills: "Pending Bills",
      dueDate: "Due Date",
      billName: "Bill Name"
    },
    analytics: {
      analyticsHeader: "Analytics",
      chartHeader: "Expenses by Category",
      expenseBreakdown: "Expense Breakdown",
      total: "Total"
    },
    feedback: {
      leave: "Leave Feedback",
      submit: "Submit Feedback",
      reset: "Reset",
      thankYou: "Thank you for your feedback!"
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      close: "Close"
    }
  },
  hi: {
    dashboard: {
      totalBudget: "कुल बजट",
      amountSpent: "खर्च राशि",
      remainingBudget: "बाकी बजट",
      budgetProgress: "बजट प्रगति",
      tryWebApp: "वेब ऐप का प्रयास करें या अपने उपकरणों के लिए ऐप डाउनलोड करें",
      congratulations: "बधाई हो! आपने बचाया",
      alert: "चेतावनी",
      budgetExceeded: "बजट पार हो गया! कृपया अपने खर्च की समीक्षा करें।",
      timeRemaining: "शेष समय",
      days: "दिन"
    },
    budget: {
      setBudget: "अपना बजट सेट करें",
      budgetAmount: "बजट राशि",
      budgetPeriod: "बजट अवधि",
      setBudgetBtn: "बजट सेट करें",
      startDate: "आरंभ तिथि",
      endDate: "समाप्ति तिथि",
      monthly: "मासिक",
      weekly: "साप्ताहिक",
      yearly: "वार्षिक"
    },
    transactions: {
      addTransaction: "लेन-देन जोड़ें",
      type: "प्रकार",
      amount: "राशि",
      category: "श्रेणी",
      description: "विवरण",
      addTransactionBtn: "लेन-देन जोड़ें",
      expense: "व्यय",
      income: "आय",
      food: "भोजन और खाना",
      transportation: "परिवहन",
      entertainment: "मनोरंजन",
      utilities: "उपयोगिताएं",
      shopping: "खरीदारी",
      other: "अन्य",
      reset: "रीसेट",
      pendingBills: "बकाया बिल",
      dueDate: "नियत तारीख",
      billName: "बिल का नाम"
    },
    analytics: {
      analyticsHeader: "विश्लेषण",
      chartHeader: "श्रेणी के अनुसार खर्च",
      expenseBreakdown: "व्यय विश्लेषण",
      total: "कुल"
    },
    feedback: {
      leave: "प्रतिक्रिया दें",
      submit: "प्रतिक्रिया भेजें",
      reset: "रीसेट",
      thankYou: "आपकी प्रतिक्रिया के लिए धन्यवाद!"
    },
    common: {
      save: "सहेजें",
      cancel: "रद्द करें",
      delete: "हटाएं",
      edit: "संपादित करें",
      close: "बंद करें"
    }
  },
  ta: {
    dashboard: {
      totalBudget: "மொத்த பட்ஜெட்",
      amountSpent: "செலவின் தொகை",
      remainingBudget: "மீதமுள்ள பட்ஜெட்",
      budgetProgress: "பட்ஜெட் முன்னேற்றம்",
      tryWebApp: "வெப் பயன்பாட்டை முயற்சிக்கவும் அல்லது உங்கள் சாதனங்களுக்கான பயன்பாட்டை பதிவிறக்கவும்"
    },
    budget: {
      setBudget: "உங்கள் பட்ஜெட்டை அமைக்கவும்",
      budgetAmount: "பட்ஜெட் தொகை",
      budgetPeriod: "பட்ஜெட் காலம்",
      setBudgetBtn: "பட்ஜெட்டை அமைக்கவும்"
    },
    transactions: {
      addTransaction: "பரிவர்த்தனையைச் சேர்க்கவும்",
      type: "வகை",
      amount: "தொகை",
      category: "வகை",
      description: "விளக்கம்",
      addTransactionBtn: "பரிவர்த்தனையைச் சேர்க்கவும்"
    },
    analytics: {
      analyticsHeader: "ஆய்வுகள்",
      chartHeader: "வகை வாரியாக செலவுகள்"
    },
  },
  ja: {
    dashboard: {
      totalBudget: "総予算",
      amountSpent: "使った金額",
      remainingBudget: "残りの予算",
      budgetProgress: "予算の進捗",
      tryWebApp: "Webアプリを試すか、デバイス用アプリをダウンロードしてください"
    },
    budget: {
      setBudget: "予算を設定する",
      budgetAmount: "予算額",
      budgetPeriod: "予算期間",
      setBudgetBtn: "予算を設定する"
    },
    transactions: {
      addTransaction: "取引を追加",
      type: "種類",
      amount: "金額",
      category: "カテゴリー",
      description: "説明",
      addTransactionBtn: "取引を追加"
    },
    analytics: {
      analyticsHeader: "分析",
      chartHeader: "カテゴリー別費用"
    },
    fr: {
      dashboard: "Tableau de bord",
      settings: "Paramètres",
      feedback: "Laisser un commentaire",
      // Add more translations...
    },
    en: {
      dashboard: "Dashboard",
      settings: "Settings",
      feedback: "Leave Feedback",
      // Add more translations...
    },
  }
};

// Apply translations dynamically across all pages
const languageSelect = document.getElementById("language-select");
languageSelect.addEventListener("change", () => {
  const selectedLanguage = languageSelect.value;
  applyTranslations(selectedLanguage);
});

function applyTranslations(language) {
  // Dashboard translations
  document.getElementById("total-budget").previousElementSibling.textContent = translations[language].dashboard.totalBudget;
  document.getElementById("amount-spent").previousElementSibling.textContent = translations[language].dashboard.amountSpent;
  document.getElementById("remaining-budget").previousElementSibling.textContent = translations[language].dashboard.remainingBudget;
  document.querySelector(".progress-container h3").textContent = translations[language].dashboard.budgetProgress;
  document.querySelector(".app-links h3").textContent = translations[language].dashboard.tryWebApp;

  // Budget page translations
  document.querySelector("#budget h3").textContent = translations[language].budget.setBudget;
  document.querySelector("label[for='budget-amount']").textContent = translations[language].budget.budgetAmount;
  document.querySelector("label[for='budget-period']").textContent = translations[language].budget.budgetPeriod;
  document.getElementById("set-budget").textContent = translations[language].budget.setBudgetBtn;

  // Transactions page translations
  document.querySelector("#transactions h3").textContent = translations[language].transactions.addTransaction;
  document.querySelector("label[for='transaction-type']").textContent = translations[language].transactions.type;
  document.querySelector("label[for='transaction-amount']").textContent = translations[language].transactions.amount;
  document.querySelector("label[for='transaction-category']").textContent = translations[language].transactions.category;
  document.querySelector("label[for='transaction-description']").textContent = translations[language].transactions.description;
  document.getElementById("add-transaction").textContent = translations[language].transactions.addTransactionBtn;

  // Analytics page translations
  document.querySelector("#analytics h3").textContent = translations[language].analytics.analyticsHeader;
  document.querySelector(".chart-container h3").textContent = translations[language].analytics.chartHeader;
}

// Theme toggle
document.querySelector('.theme-toggle')?.addEventListener('click', () => {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
});

// Navigation
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', e => {
    const pageId = link.getAttribute('data-page');
  
    if (pageId) {
      e.preventDefault(); // Only prevent default for internal navigation
      document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(pageId).classList.add('active');
      if (pageId === 'analytics') updateAnalytics();
    } 
  });
});

// Save data
function saveData() {
  localStorage.setItem('budget', JSON.stringify(budget));
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Load and Apply Language on Page Load
window.addEventListener('load', () => {
  const savedLanguage = localStorage.getItem('selectedLanguage') || 'en'; // Default to English
  applyLanguage(savedLanguage); // Apply the saved language
  displayFeedbacks(); // Display feedbacks on page load
});

// Your Existing Functions Follow Below

// Monitor Monthly Budget and Handle Savings
function monitorMonthlyBudget() {
  const savings = budget.amount - budget.spent;

  if (savings > 0) {
    showAlert('success', `Congratulations! You saved ₹${savings.toFixed(2)} this month.`);
    budget.savings = (budget.savings || 0) + savings; // Accumulate savings
    saveData();
    promptDonation(savings);
  } else {
    showAlert('info', "You’ve spent your budget this month. Let's try saving next month!");
  }

  // Reset monthly budget for the next cycle
  budget.spent = 0;
  saveData();
  updateDashboard();
}

function promptDonation(savings) {
  const donate = confirm(
    `Would you like to donate ₹${savings.toFixed(2)} to a cause?`
  );

  if (donate) {
    budget.savings -= savings; // Deduct donated amount from savings
    saveData();
    showAlert('success', `Thank you for donating ₹${savings.toFixed(2)}!`);
    // You can integrate a backend donation API here
  } else {
    showAlert('info', "Savings retained. Keep up the great work!");
  }
}

// Dashboard Update
function updateDashboard() {
  document.getElementById('total-budget').textContent = `₹${budget.amount.toFixed(2)}`;
  document.getElementById('amount-spent').textContent = `₹${budget.spent.toFixed(2)}`;
  document.getElementById('remaining-budget').textContent = `₹${(budget.amount - budget.spent).toFixed(2)}`;
  document.getElementById('saved-amount').textContent = `₹${(budget.savings || 0).toFixed(2)}`; // Display savings

  const percent = (budget.spent / budget.amount) * 100;
  document.getElementById('budget-progress').style.width = `${Math.min(percent, 100)}%`;

  if (percent >= 100) showAlert('warning', 'You have exceeded your budget!');
  else if (percent >= 80) showAlert('warning', 'You have spent 80% of your budget!');
  else if (percent >= 50) showAlert('info', 'You’ve spent 50% of your budget.');
}

// Transactions List
function updateTransactionsList() {
  const container = document.getElementById('transactions-list');
  container.innerHTML = '';
  transactions.forEach(t => {
    const div = document.createElement('div');
    div.className = 'transaction-item';
    div.innerHTML = `
      <div>
        <strong>${t.description}</strong>
        <div>${t.category} • ${t.date}</div>
      </div>
      <div class="${t.type === 'expense' ? 'text-red-500' : 'text-green-500'}">
        ${t.type === 'expense' ? '-' : '+'}$${t.amount.toFixed(2)}
      </div>
    `;
    container.appendChild(div);
  });
}

function submitFeedback() {
  const feedback = document.getElementById('feedback-text').value.trim();

  if (feedback) {
    // Retrieve existing feedbacks from localStorage
    const existingFeedbacks = JSON.parse(localStorage.getItem('feedbacks')) || [];
    
    // Add the new feedback to the array
    existingFeedbacks.push(feedback);
    
    // Save updated feedbacks back to localStorage
    localStorage.setItem('feedbacks', JSON.stringify(existingFeedbacks));

    // Append the new feedback to the display area immediately
    const feedbackContainer = document.getElementById('feedback-display');
    const feedbackItem = document.createElement('div');
    feedbackItem.textContent = `#${existingFeedbacks.length}: ${feedback}`;
    feedbackItem.classList.add('feedback-item'); // Optional for styling
    feedbackContainer.appendChild(feedbackItem);

    alert('Thank you for your feedback!');
    // Do NOT clear the text area here; leave it for the user to decide when to clear
  } else {
    alert('Please write something before submitting.');
  }
}

function resetFeedback() {
  const feedbackField = document.getElementById('feedback-text');
  feedbackField.value = ''; // Clear the input field
  alert('Feedback form has been reset.');
}

function displayFeedbacks() {
  const feedbackContainer = document.getElementById('feedback-display');
  feedbackContainer.innerHTML = ''; // Clear previous feedbacks

  const feedbacks = JSON.parse(localStorage.getItem('feedbacks')) || [];
  
  feedbacks.forEach((feedback, index) => {
    const feedbackItem = document.createElement('div');
    feedbackItem.textContent = `#${index + 1}: ${feedback}`;
    feedbackItem.classList.add('feedback-item'); // Optional for styling
    feedbackContainer.appendChild(feedbackItem);
  });
}

function clearFeedbackData() {
  if (confirm('Are you sure you want to clear all feedbacks?')) {
    localStorage.removeItem('feedbacks');
    displayFeedbacks(); // Update display
    alert('All feedbacks have been cleared.');
  }
}

// Chart.js Analytics
let barChart;

function updateAnalytics() {
  const categoryList = document.getElementById('category-list');
  const chartCanvas = document.getElementById('spending-chart');
  categoryList.innerHTML = '';

  const categoryTotals = {};
  transactions.forEach(transaction => {
    if (transaction.type === 'expense') {
      categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + transaction.amount;
    }
  });

  const totalSpent = budget.spent || 1; // prevent division by zero
  const labels = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals);

  // Side breakdown
  labels.forEach((cat, idx) => {
    const percent = ((values[idx] / totalSpent) * 100).toFixed(1);
    const div = document.createElement('div');
    div.className = 'card mb-4';
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <h3>${cat}</h3>
          <p>$${values[idx].toFixed(2)}</p>
        </div>
        <div class="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div class="h-full bg-primary" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
    categoryList.appendChild(div);
  });

  // Bar Chart
  if (barChart) barChart.destroy();

  barChart = new Chart(chartCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Expenses by Category',
        data: values,
        backgroundColor: '#e50914',
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-color') },
          grid: { color: getComputedStyle(document.body).getPropertyValue('--border-color') }
        },
        y: {
          beginAtZero: true,
          ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-color') },
          grid: { color: getComputedStyle(document.body).getPropertyValue('--border-color') }
        }
      },
      plugins: {
        legend: { labels: { color: getComputedStyle(document.body).getPropertyValue('--text-color') } },
        tooltip: { callbacks: { label: ctx => `$${ctx.parsed.y.toFixed(2)}` } }
      }
    }
  });
}

// Alert system
function showAlert(type, message) {
  const div = document.createElement('div');
  div.className = `alert ${type}`;
  div.innerHTML = `
    <div class="alert-content">
      <i class="fas ${type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    </div>
    <button class="alert-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
  `;
  document.querySelector('.container').prepend(div);
  setTimeout(() => div.remove(), 5000);
}

// Reset functionality
document.querySelectorAll('#reset-data').forEach(button => {
  button.addEventListener('click', function() {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      localStorage.clear();
      budget = {
        amount: 0,
        period: 'monthly',
        spent: 0,
        startDate: null,
        endDate: null,
        savings: 0
      };
      transactions = [];
      pendingBills = [];
      updateDashboard();
      updateTransactionsList();
      updatePendingBillsList();
      updateAnalytics();
      alert('All data has been reset successfully!');
    }
  });
});

// Voice Recognition Setup
let recognition;
try {
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
} catch (e) {
  console.error('Speech recognition not supported:', e);
}

// Add voice input button to transactions page
const transactionsPage = document.getElementById('transactions');
const voiceButton = document.createElement('button');
voiceButton.className = 'btn-mic';
voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
voiceButton.title = 'Click to speak transaction details';
transactionsPage.appendChild(voiceButton);

// Voice recognition logic
voiceButton.addEventListener('click', function() {
  if (!recognition) {
    alert('Speech recognition is not supported in your browser');
    return;
  }

  voiceButton.classList.add('listening');
  recognition.start();
});

recognition.onresult = function(event) {
  const text = event.results[0][0].transcript.toLowerCase();
  console.log('Voice input:', text);
  
  // Parse voice input (format: "add expense 500 for food")
  const match = text.match(/add (expense|income) (\d+) for (\w+)/);
  if (match) {
    const type = match[1];
    const amount = parseFloat(match[2]);
    const category = match[3];
    
    document.getElementById('transaction-type').value = type;
    document.getElementById('transaction-amount').value = amount;
    document.getElementById('transaction-category').value = category;
    document.getElementById('transaction-description').value = `Added via voice: ${text}`;
    
    // Automatically add the transaction
    addTransaction();
  } else {
    alert('Could not understand. Please try again with format: "add expense 500 for food"');
  }
};

recognition.onend = function() {
  voiceButton.classList.remove('listening');
};

// Fix scrolling issue by updating CSS in JavaScript
document.querySelector('.container').style.height = '100%';
document.querySelector('.container').style.maxHeight = 'none';
document.querySelector('.container').style.overflow = 'auto';

// Update feedback submission
async function submitFeedback() {
  const name = document.getElementById('feedback-name').value.trim();
  const email = document.getElementById('feedback-email').value.trim();
  const rating = document.querySelector('.rating .active') ? 
    document.querySelectorAll('.rating .active').length : 0;
  const feedback = document.getElementById('feedback-text').value.trim();

  if (!name || !email || !feedback) {
    alert('Please fill in all required fields');
    return;
  }

  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    alert('Please enter a valid email address');
    return;
  }

  try {
    // Store feedback locally as backup
    const feedbackData = {
      name,
      email,
      rating,
      feedback,
      timestamp: new Date().toISOString()
    };
    
    let storedFeedback = JSON.parse(localStorage.getItem('feedback') || '[]');
    storedFeedback.push(feedbackData);
    localStorage.setItem('feedback', JSON.stringify(storedFeedback));

    // Send email using EmailJS
    emailjs.init("sfEsyfn3fwvKKXaAm"); // Replace with your EmailJS user ID
    await emailjs.send("service_lxnti3n", "template_9gkt27u", {
      to_email: "chehakgupta06@gmail.com",
      from_name: name,
      from_email: email,
      rating: rating,
      message: feedback
    });

    alert('Thank you for your feedback!');
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Error sending feedback:', error);
    alert('Your feedback has been saved locally, but there was an error sending the email. Please try again later.');
  }
}

// Star rating functionality
document.querySelectorAll('.rating i').forEach((star, index) => {
  star.addEventListener('click', () => {
    document.querySelectorAll('.rating i').forEach((s, i) => {
      s.classList.toggle('active', i <= index);
    });
  });
});

// Update progress bar based on budget spent
function updateProgressBar() {
  const progressBar = document.getElementById('budget-progress');
  if (!progressBar) return;

  // Calculate percentage of budget spent
  const totalBudget = budget.amount;
  const totalSpent = budget.spent;
  
  if (totalBudget <= 0) {
    progressBar.style.width = '0%';
    progressBar.style.backgroundColor = '#4CAF50';
    document.getElementById('progress-text').textContent = 'No budget set';
    return;
  }
  
  const progressPercentage = Math.min((totalSpent / totalBudget) * 100, 100);
  
  // Update progress bar width and color
  progressBar.style.width = `${progressPercentage}%`;
  
  // Change color based on percentage of budget spent
  if (progressPercentage < 50) {
    progressBar.style.backgroundColor = '#4CAF50'; // Green for less than 50% spent
  } else if (progressPercentage < 80) {
    progressBar.style.backgroundColor = '#FFA500'; // Orange for 50-80% spent
  } else {
    progressBar.style.backgroundColor = '#FF0000'; // Red for over 80% spent
  }

  // Add transition effect
  progressBar.style.transition = 'width 0.5s ease-in-out, background-color 0.5s ease-in-out';
  
  // Update progress text
  const progressText = document.getElementById('progress-text');
  if (progressText) {
    const remainingBudget = totalBudget - totalSpent;
    progressText.textContent = `₹${totalSpent.toFixed(2)} spent of ₹${totalBudget.toFixed(2)} (${Math.round(progressPercentage)}%)`;
    
    // Add warning if close to budget
    if (progressPercentage >= 80) {
      progressText.style.color = '#FF0000';
      progressText.style.fontWeight = 'bold';
    } else {
      progressText.style.color = 'var(--text-secondary)';
      progressText.style.fontWeight = 'normal';
    }
  }
}

// Update the addTransaction function to include progress bar update
const originalAddTransaction = addTransaction;
addTransaction = function() {
  originalAddTransaction.apply(this, arguments);
  updateProgressBar();
};

// Update the setBudget function to include progress bar update
const originalSetBudget = setBudget;
setBudget = function() {
  originalSetBudget.apply(this, arguments);
  updateProgressBar();
};

// Call updateProgressBar when page loads
document.addEventListener('DOMContentLoaded', function() {
  updateProgressBar();
});
