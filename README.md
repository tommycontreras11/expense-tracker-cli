# 📊 Expense Tracker CLI

**Project URL:** https://roadmap.sh/projects/expense-tracker

A simple command-line interface (CLI) application to manage your daily expenses, track budgets, and analyze spending directly from your terminal.

---

## 🚀 Features

* Add and manage expenses
* View all recorded expenses in table format
* Generate summaries (total or by month)
* Filter expenses by amount
* Set monthly budgets
* Prevent overspending with budget validation
* Update existing expenses
* Delete expenses
* Export data to CSV
* Lightweight and file-based (no database required)

---

## 📦 Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd expense-tracker-cli
```

2. Make sure you are using Node.js (v18+ recommended).

---

## ▶️ Usage

Run the CLI:

```bash
node index.js
```

Then type commands directly in the terminal.

---

## 🧠 Command Structure

All commands start with:

```bash
expense-tracker <action> [options]
```

---

## ✨ Commands

### ➕ Add Expense

```bash
expense-tracker add --amount 100 --description "Groceries"
```

---

### 📋 List Expenses

```bash
expense-tracker list
```

---

### 📊 Summary

#### Total:

```bash
expense-tracker summary
```

#### By Month:

```bash
expense-tracker summary --month 5
```

---

### 🔍 Filter Expenses

```bash
expense-tracker filter --amount 50
```

Shows expenses **less than the given amount**

---

### 💰 Set Budget

```bash
expense-tracker budget --month 5 --amount 1000
```

---

### 📅 Filter Budget by Month

```bash
expense-tracker filterBudget --month 5
```

---

### ✏️ Update Expense

```bash
expense-tracker update --id 1 --amount 200 --description "Updated"
```

---

### ❌ Delete Expense

```bash
expense-tracker delete --id 1
```

---

### 📤 Export to CSV

```bash
expense-tracker exportCSV
```

---

## 🧾 Example Output

```bash
┌─────────┬────┬────────┬──────────────────────┬────────────┐
│ (index) │ ID │ Amount │ Description          │ Date       │
├─────────┼────┼────────┼──────────────────────┼────────────┤
│ 0       │ 1  │ 100    │ Groceries            │ 2026-05-01 │
│ 1       │ 2  │ 50     │ Lunch                │ 2026-05-01 │
└─────────┴────┴────────┴──────────────────────┴────────────┘

Total expenses: $150
```

---

## 🧠 How It Works

* Reads user input from the terminal (`stdin`)
* Parses commands using a custom argument extractor
* Stores data in a local JSON file:

```
expense-tracker.json
```

* Validates:
  * Required fields
  * Non-empty values
  * Non-negative numbers
* Applies budget checks before adding/updating expenses
* Uses JavaScript `Map` internally to structure parsed input

---

## ⚠️ Notes

* Months are represented numerically (`1 = January`, `12 = December`)
* Budget is stored in memory (not persisted to file)
* Dates are automatically generated
* If invalid input is provided, the CLI will display an error message
* If an ID is not found during update/delete, the operation will fail gracefully

---

## 🛑 Exit CLI

To exit the program:

```bash
exit
```

---

## 💡 Future Improvements (Ideas)

* Persist budgets to file
* Add categories (food, transport, etc.)
* Add colored output (`chalk`) 🎨
* Interactive prompts (inquirer)
* Better error messages and validation
* Support for recurring expenses
* Pagination for large datasets

---

## 🧑‍💻 Author

Tommy Contreras

---

## 📄 License

MIT
