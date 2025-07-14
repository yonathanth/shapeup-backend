const asyncHandler = require("express-async-handler");
const prisma = require("../../prisma/client");

// Helper functions for data aggregation
const aggregateByHour = (transactions) => {
  const hourlyData = {};
  transactions.forEach((transaction) => {
    const hour = new Date(transaction.createdAt).getHours();
    const key = `${hour}:00`;
    if (!hourlyData[key]) {
      hourlyData[key] = { period: key, income: 0, expense: 0, net: 0 };
    }
    if (transaction.type === "Income") {
      hourlyData[key].income += transaction.amount;
    } else {
      hourlyData[key].expense += transaction.amount;
    }
    hourlyData[key].net = hourlyData[key].income - hourlyData[key].expense;
  });
  return Object.values(hourlyData).sort((a, b) =>
    a.period.localeCompare(b.period)
  );
};

const aggregateByDay = (transactions, days) => {
  const dailyData = {};
  transactions.forEach((transaction) => {
    const date = new Date(transaction.createdAt).toISOString().split("T")[0];
    if (!dailyData[date]) {
      dailyData[date] = { period: date, income: 0, expense: 0, net: 0 };
    }
    if (transaction.type === "Income") {
      dailyData[date].income += transaction.amount;
    } else {
      dailyData[date].expense += transaction.amount;
    }
    dailyData[date].net = dailyData[date].income - dailyData[date].expense;
  });
  return Object.values(dailyData).sort((a, b) =>
    a.period.localeCompare(b.period)
  );
};

const aggregateByWeek = (transactions) => {
  const weeklyData = {};
  transactions.forEach((transaction) => {
    const date = new Date(transaction.createdAt);
    const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
    const weekKey = weekStart.toISOString().split("T")[0];
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        period: `Week of ${weekKey}`,
        income: 0,
        expense: 0,
        net: 0,
      };
    }
    if (transaction.type === "Income") {
      weeklyData[weekKey].income += transaction.amount;
    } else {
      weeklyData[weekKey].expense += transaction.amount;
    }
    weeklyData[weekKey].net =
      weeklyData[weekKey].income - weeklyData[weekKey].expense;
  });
  return Object.values(weeklyData).sort((a, b) =>
    a.period.localeCompare(b.period)
  );
};

const aggregateByMonth = (transactions) => {
  const monthlyData = {};
  transactions.forEach((transaction) => {
    const date = new Date(transaction.createdAt);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        period: monthKey,
        income: 0,
        expense: 0,
        net: 0,
      };
    }
    if (transaction.type === "Income") {
      monthlyData[monthKey].income += transaction.amount;
    } else {
      monthlyData[monthKey].expense += transaction.amount;
    }
    monthlyData[monthKey].net =
      monthlyData[monthKey].income - monthlyData[monthKey].expense;
  });
  return Object.values(monthlyData).sort((a, b) =>
    a.period.localeCompare(b.period)
  );
};

const getTransactions = asyncHandler(async (req, res) => {
  const { filter } = req.query; // Get filter from query params
  const now = new Date();
  let startDate;

  // Determine the start date based on the filter
  if (filter === "daily") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (filter === "weekly") {
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    startDate = weekAgo;
  } else if (filter === "monthly") {
    const monthAgo = new Date();
    monthAgo.setMonth(now.getMonth() - 1);
    startDate = monthAgo;
  } else if (filter === "3months") {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    startDate = threeMonthsAgo;
  } else if (filter === "6months") {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    startDate = sixMonthsAgo;
  } else if (filter === "yearly") {
    const yearAgo = new Date();
    yearAgo.setFullYear(now.getFullYear() - 1);
    startDate = yearAgo;
  }

  // Fetch transactions with filtering (if a filter is provided)
  let transactions;
  if (startDate) {
    transactions = await prisma.transaction.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        createdAt: {
          gte: startDate, // Greater than or equal to the start date
        },
      },
    });
  } else {
    transactions = await prisma.transaction.findMany(); // Default: all-time
  }

  // Calculate income, expenses, and net balance
  const income = transactions
    .filter((t) => t.type === "Income")
    .reduce((acc, t) => acc + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "Expense")
    .reduce((acc, t) => acc + t.amount, 0);
  const net = income - expense;

  // Aggregate data for chart based on filter period
  let chartData = [];

  if (filter === "daily") {
    // Group by hour for daily view
    chartData = aggregateByHour(transactions);
  } else if (filter === "weekly") {
    // Group by day for weekly view
    chartData = aggregateByDay(transactions, 7);
  } else if (filter === "monthly") {
    // Group by day for monthly view
    chartData = aggregateByDay(transactions, 30);
  } else if (filter === "3months" || filter === "6months") {
    // Group by week for 3/6 months view
    chartData = aggregateByWeek(transactions);
  } else if (filter === "yearly") {
    // Group by month for yearly view
    chartData = aggregateByMonth(transactions);
  } else {
    // For all-time, group by month
    chartData = aggregateByMonth(transactions);
  }

  res.status(200).json({
    success: true,
    data: {
      transactions,
      chartData,
      summary: {
        income,
        expense,
        net,
      },
    },
  });
});

// Add a new transaction
const addTransaction = asyncHandler(async (req, res) => {
  const { name, category, amount, type } = req.body;

  // Validate required fields
  if (!name || !category || amount == null || !type) {
    return res.status(400).json({
      success: false,
      message: "All fields (name, category, amount, type) are required.",
    });
  }

  // Validate amount and type
  if (isNaN(amount) || amount < 0 || !["Income", "Expense"].includes(type)) {
    return res.status(400).json({
      success: false,
      message:
        "Amount must be a non-negative number, and type must be Income or Expense.",
    });
  }

  const newTransaction = await prisma.transaction.create({
    data: {
      name,
      category,
      amount: parseFloat(amount),
      type,
    },
  });

  res.status(201).json({
    success: true,
    message: "Transaction added successfully.",
    data: newTransaction,
  });
});

// Delete a transaction by ID
const deleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.transaction.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: "Transaction deleted successfully.",
  });
});

// Update a transaction by ID
const updateTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, category, amount, type } = req.body;

  if (!name || !category || amount == null || !type) {
    return res.status(400).json({
      success: false,
      message: "All fields (name, category, amount, type) are required.",
    });
  }

  if (isNaN(amount) || amount < 0 || !["Income", "Expense"].includes(type)) {
    return res.status(400).json({
      success: false,
      message:
        "Amount must be a non-negative number, and type must be Income or Expense.",
    });
  }

  const updatedTransaction = await prisma.transaction.update({
    where: { id },
    data: {
      name,
      category,
      amount: parseFloat(amount),
      type,
    },
  });

  res.status(200).json({
    success: true,
    message: "Transaction updated successfully.",
    data: updatedTransaction,
  });
});

module.exports = {
  getTransactions,
  addTransaction,
  deleteTransaction,
  updateTransaction,
};
