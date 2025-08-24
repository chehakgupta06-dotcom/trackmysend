// Example expense data
const expenses = [
    { category: 'Food', amount: 200 },
    { category: 'Rent', amount: 1200 },
    { category: 'Entertainment', amount: 150 },
    { category: 'Transport', amount: 100 },
  ];
  
  // Calculate total expenses
  const totalExpenses = expenses.reduce((total, expense) => total + expense.amount, 0);
  
  // Display total expenses
  document.getElementById('total-expenses').textContent = `$${totalExpenses.toFixed(2)}`;
  
  // Display category breakdown
  const categoryList = document.getElementById('category-list');
  expenses.forEach(expense => {
    const li = document.createElement('li');
    li.textContent = `${expense.category}: $${expense.amount.toFixed(2)}`;
    categoryList.appendChild(li);
  });