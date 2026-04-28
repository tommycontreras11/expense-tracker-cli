import fs from "fs/promises";

let expenseTrackerData = [];
const FILE_PATH = "./expense-tracker.json";

const months = new Map([
  [1, "January"],
  [2, "February"],
  [3, "March"],
  [4, "April"],
  [5, "May"],
  [6, "June"],
  [7, "July"],
  [8, "August"],
  [9, "September"],
  [10, "October"],
  [11, "November"],
  [12, "December"],
]);

let budgets = []
months.forEach((value) => {
  budgets.push({ month: value, budget: 0 })
})

const toPascalCase = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const toPascalCaseKeys = (data) => {
  return data.map((obj) => {
    const newObject = {};
    for (const key in obj) {
      newObject[toPascalCase(key)] = obj[key];
    }
    return newObject;
  });
};

export const extractInput = (data) => {
  return data.toString().trim().split(" ");
};

export const createAndReturnDataFileIfNotExists = async () => {
  let data = "";

  try {
    data = await fs.readFile(FILE_PATH, "utf8");
  } catch (error) {
    if (error.code == "ENOENT") await saveInfoInFile([]);
  }

  if (data) expenseTrackerData = JSON.parse(data);
};

const saveInfoInFile = async (data) => {
  await fs.writeFile(FILE_PATH, JSON.stringify(data), "utf8");
};

const getPropertyAndValue = (input, index, values) => {
  let start = input[index].startsWith('"');
  let end = input[index].endsWith('"');

  if (start && end) {
    values.push(input[index]);
  } else if (start) {
    values.push(input[index] + " " + input[index + 1]);
    index = index + 1;
  } else {
    values.push(parseInt(input[index]));
  }

  return {
    values,
    i: index,
  };
};

const saveExpenseTrackerOnMap = (
  map,
  value,
  property,
  index,
  count,
  countProperties,
  id,
) => {
  const finalValue = replaceSlashAndQuote(value)

  if (map.has(index)) {
    const valueAtIndex = map.get(index);
    valueAtIndex[property] = finalValue;
    if (count == countProperties) {
      index = 0;
      count = 0;
    }
  } else {
    map.set(id, {
      [property]: finalValue,
    });
    index = id;
    count += 1;
  }

  return {
    index,
    count,
  };
};

const replaceSlashAndQuote = (value) => {
  return isNaN(value)
    ? value.includes('\"')
      ? value.replaceAll('\"', "")
      : value
    : value;
}

const extractKeyAndValue = (input, hasToValidateBudget = false) => {
  const map = new Map();
  let index = 0;

  let count = 0;
  let isBudgetHigher = false

  let properties = input.filter((i) => i.startsWith("--"));
  properties = properties.map((p) => p.replace("--", ""));

  input = input.filter((i) => i.startsWith("--") == false);

  let values = [];

  for (let i = 0; i < input.length; i++) {
    ({ values, i } = getPropertyAndValue(input, i, values));
  }

  if (hasToValidateBudget) {
    const amountIndex = properties.findIndex((i) => i == "amount")
    const amount = values[amountIndex]

    const month = new Date().getMonth() + 1
    
    isBudgetHigher = validateBudget(month, amount)
  }

  if (isBudgetHigher) {
    console.log("The total amount is higher than the budget")
  } else {
    for (let i = 0; i < values.length; i++) {
    ({ index, count } = saveExpenseTrackerOnMap(
      map,
      values[i],
      properties[i],
      index,
      count,
      properties.length,
      expenseTrackerData.length + 1,
    ));
  }
  }

  return map;
};

export const add = (input, validateBudget) => {
  const propertyAndValue = extractKeyAndValue(input, validateBudget);

  if (propertyAndValue.size == 0) return

  propertyAndValue.forEach(
    (value) =>
      (expenseTrackerData = [
        ...expenseTrackerData,
        {
          ...value,
          id: expenseTrackerData.length + 1,
          date: new Date().toISOString().split("T")[0],
        },
      ]),
  );

  saveInfoInFile(expenseTrackerData);

  console.log(`Expense added successfully (ID: ${expenseTrackerData.length})`);
};

export const list = async () => {
  console.table(toPascalCaseKeys(expenseTrackerData));
};

export const summary = async (input) => {
  const value = extractKeyAndValue(input);
  let total = 0;
  let month = 0;

  await createAndReturnDataFileIfNotExists();

  let summary = [];
  summary = [...expenseTrackerData];

  if (value.size > 0) {
    value.forEach((i) => (month = i.month));

    summary = filterExpenseTrackerByMonthAndYear(summary, month)
  }

  total = sumAmount(summary)
  console.log(
    `Total expenses${value.size > 0 ? ` for ${months.get(month)}` : ""}: $${total}`,
  );
};

const sumAmount = (expenseTracker) => {
  return expenseTracker.reduce((acc, current) => acc + current.amount, 0);
}

const filterExpenseTrackerByMonthAndYear = (expenseTracker, month) => {
  return expenseTracker.filter(
      (s) =>
        s.date.split("-")[1] == (month > 9 ? month : `0${month}`) &&
        s.date.split("-")[0] == new Date().getFullYear(),
    );
}

export const filter = async (input) => {
  const value = extractKeyAndValue(input);
  let category = "";

  value.forEach((item) => (category = item.category));
  await createAndReturnDataFileIfNotExists();
  let expenseTracker = [...expenseTrackerData];

  let dataFiltered = expenseTracker.filter(
    (item) => item.category.toLowerCase() == category.toLowerCase(),
  );

  console.log(dataFiltered);
};

export const budget = (input) => {
  const value = extractKeyAndValue(input);
  let month, amount = 0;

  value.forEach((item) => {
    month = months.get(item.month)
    amount = item.amount
  });

  let budgetFilteredByMonth = budgets.find((item) => item.month == month)
  budgetFilteredByMonth.budget += amount
}

export const filterBudgetByMonth = (input, returnValues = false) => {
  const value = extractKeyAndValue(input);
  let month = 0;

  value.forEach((item) => {
    month = months.get(item.month)
  });

  let budgetFilteredByMonth = budgets.filter((item) => item.month == month)

  if (returnValues) return budgetFilteredByMonth
  console.log(budgetFilteredByMonth)
}

const validateBudget = (month, amount) => {
  let budgetFilteredByMonth = budgets.find((item) => item.month == months.get(month))

  let summary = [...expenseTrackerData];
  
  summary = filterExpenseTrackerByMonthAndYear(summary, month)
  let total = sumAmount(summary) + amount

  if (total > budgetFilteredByMonth.budget) return true
  return false
}

export const update = (input, validateBudget) => {
  const value = extractKeyAndValue(input, validateBudget);
  let id = 0;
  let amount = 0;
  let description = "";

  value.forEach((item) => {
    id = item.id;
    amount = item.amount;
    description = item.description;
  });

  let index = expenseTrackerData.findIndex((item) => item.id == id);
  expenseTrackerData[index].amount = amount;
  expenseTrackerData[index].description = description;
  expenseTrackerData[index].date = new Date().toISOString().split("T")[0];

  saveInfoInFile(expenseTrackerData);
};

export const remove = (input) => {
  const value = extractKeyAndValue(input);
  let id = 0;

  value.forEach((i) => (id = i.id));

  expenseTrackerData = expenseTrackerData.filter((e) => e.id != id);
  saveInfoInFile(expenseTrackerData);
};
