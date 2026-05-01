import console from "console";
import fs from "fs/promises";

let budgets = [];
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

months.forEach((value) => {
  budgets.push({ month: value, budget: 0 });
});

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

/*
 Split input into arguments while preserving quoted strings.
 - Matches sequences without spaces or quotes (e.g. --amount, 20)
 - OR matches text inside double quotes (e.g. "hello world")
 - Keeps quoted values as a single token
*/
export const extractInput = (data) => {
  const matches = data.toString().match(/(?:[^\s"]+|"[^"]*")+/g) || [];

  return matches.map((arg) => arg.replace(/^"(.*)"$/, "$1"));
};

const readData = async () => {
  try {
    const data = await fs.readFile(FILE_PATH, "utf8");

    if (!data.trim()) return [];

    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") return [];

    // handle corrupted JSON
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
};

const writeData = async (data) => {
  await fs.writeFile(
    FILE_PATH,
    JSON.stringify(data, null, 2),
    "utf8"
  );
};

export const initDataFile = async () => {
  try {
    await fs.access(FILE_PATH);
  } catch {
    await writeData([]);
  }
};

const getPropertyAndValue = (input, properties, index, values) => {
  let property = input[index].startsWith("--");

  if (property) {
    const next = input[index + 1];
    properties.push(input[index]);

    if (next == null || next == "null" || next === "" || next.startsWith("--")) {
      values.push(null);
      index += 1;
    }
  } else {
    const value = input[index];

    if (isNaN(input[index])) {
      values.push(input[index]);
    } else {
      values.push(parseInt(input[index]));
    }
  }

  return {
    values,
    properties,
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
  if (map.has(index)) {
    const valueAtIndex = map.get(index);
    valueAtIndex[property] = value;

    if (count == countProperties) {
      index = 0;
      count = 0;
    }
  } else {
    map.set(id, {
      [property]: value,
    });
    index = id;
    count += 1;
  }

  return {
    index,
    count,
  };
};

const extractKeyAndValue = async (
  input,
  hasToValidateBudget = false,
  isFieldRequired = false,
) => {
  const map = new Map();
  let index = 0,
    count = 0;
  let isBudgetHigher = false;

  let properties = [],
    values = [];

  let messageObject = {
    error: false,
    message: "",
  };

  for (let i = 0; i < input.length; i++) {
    ({ values, properties, i } = getPropertyAndValue(
      input,
      properties,
      i,
      values,
    ));
  }

  if (isFieldRequired) {
    if (properties.length == 0) {
      messageObject.error = true;
      messageObject.message = "Properties are required";
      return {
        ...messageObject,
        properties,
        map,
      };
    }
  }

  properties = properties.map((p) => p.replace("--", ""));

  let { error, message } = validateInput(properties, values, messageObject);

  if (error && isFieldRequired)
    return {
      error,
      message,
      properties,
      map,
    };

  if (hasToValidateBudget) {
    const amountIndex = properties.findIndex((i) => i == "amount");
    const amount = values[amountIndex];

    const month = new Date().getMonth() + 1;

    isBudgetHigher = await validateBudget(month, amount);
  }

  if (isBudgetHigher) {
    messageObject.error = true;
    messageObject.message = "The total amount is higher than the budget";
    return {
      ...messageObject,
      properties,
      map,
    };
  } else {
    let nextId = 0
    for (let i = 0; i < values.length; i++) {
      let expenseTrackerData = await readData();
      nextId = expenseTrackerData.length + 1;

      ({ index, count } = saveExpenseTrackerOnMap(
        map,
        values[i],
        properties[i],
        index,
        count,
        properties.length,
        nextId,
      ));
    }
  }

  return {
    ...messageObject,
    properties,
    map,
  };
};

export const add = async (input, hasToValidateBudget) => {
  const { error, message, properties, map } = await await extractKeyAndValue(
    input,
    hasToValidateBudget,
    true,
  );

  if ((properties.length == 0 || properties.length > 0) && error) {
    console.log(message);
    return;
  }

  const now = new Date();

  let expenseTrackerData = await readData();
  const nextId = expenseTrackerData.length + 1

  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  map.forEach(
    (value) =>
      (expenseTrackerData.push({
          ...value,
          id: nextId,
          date,
        })),
  );

  await writeData(expenseTrackerData);

  console.log(`Expense added successfully (ID: ${expenseTrackerData.length})`);
};

export const exportCSV = async () => {
  const expenseTrackerData = await readData();
  
  const data = objectsToRows(expenseTrackerData);
  const csvContent = data.map((row) => row.join(",")).join("\n");

  await fs.writeFile("data.csv", csvContent, "utf8");
};

function objectsToRows(data) {
  if (!data.length) return [];

  const headers = Object.keys(data[0]);

  const rows = data.map((obj) => headers.map((key) => obj[key]));

  return [headers, ...rows];
}

export const list = async () => {
  const expenseTrackerData = await readData();

  console.table(toPascalCaseKeys(expenseTrackerData));
};

export const summary = async (input) => {
  const { error, message, properties, map } = await extractKeyAndValue(
    input,
    false,
    true,
  );

  let total = 0;
  let month = 0;

  const expenseTrackerData = await readData();

  let summary = [...expenseTrackerData];
  summary = summary.filter((item) => item.amount != "null")

  if (properties.length > 0 && error) {
    console.log(message);
  }

  if (map.size > 0) {
    map.forEach((i) => (month = i.month));

    summary = filterExpenseTrackerByMonthAndYear(summary, month);
  }

  total = sumAmount(summary);
  console.log(
    `Total expenses${map.size > 0 ? ` for ${months.get(month)}` : ""}: $${total}`,
  );
};

const sumAmount = (expenseTracker) => {
  return expenseTracker.reduce((acc, current) => acc + current.amount, 0);
};

const filterExpenseTrackerByMonthAndYear = (expenseTracker, month) => {
  return expenseTracker.filter(
    (s) =>
      s.date.split("-")[1] == (month > 9 ? month : `0${month}`) &&
      s.date.split("-")[0] == new Date().getFullYear(),
  );
};

export const filter = async (input) => {
  const { error, message, properties, map } = await extractKeyAndValue(
    input,
    false,
    true,
  );

  if ((properties.length == 0 || properties.length > 0) && error) {
    console.log(message);
    return;
  }

  let amount = "";

  map.forEach((item) => (amount = item.amount));
  const expenseTrackerData = await readData();

  let expenseTracker = [...expenseTrackerData];

  let dataFiltered = expenseTracker.filter((item) => item.amount < amount);

  console.table(dataFiltered);
};

export const budget = async (input) => {
  const { error, message, properties, map } = await extractKeyAndValue(
    input,
    false,
    true,
  );

  if ((properties.length == 0 || properties.length > 0) && error) {
    console.log(message);
    return;
  }

  let month,
    amount = 0;

  map.forEach((item) => {
    month = months.get(item.month);
    amount = item.amount;
  });

  let budgetFilteredByMonth = budgets.find((item) => item.month == month);
  budgetFilteredByMonth.budget += amount;

  console.log(`Budget set for ${month} with amount ${amount}`);
};

export const filterBudgetByMonth = async (input, returnValues = false) => {
  const { error, message, properties, map } = await extractKeyAndValue(
    input,
    false,
    true,
  );

  if ((properties.length == 0 || properties.length > 0) && error) {
    console.log(message);
    return;
  }
  let month = 0;

  map.forEach((item) => {
    month = months.get(item.month);
  });

  let budgetFilteredByMonth = budgets.filter((item) => item.month == month);

  if (returnValues) return budgetFilteredByMonth;
  console.log(budgetFilteredByMonth);
};

const validateBudget = async (month, amount) => {
  let budgetFilteredByMonth = budgets.find(
    (item) => item.month == months.get(month),
  );

  if (budgetFilteredByMonth.budget == 0) return false;

  const expenseTrackerData = await readData();

  let summary = [...expenseTrackerData];

  summary = filterExpenseTrackerByMonthAndYear(summary, month);
  let total = sumAmount(summary) + amount;

  if (total > budgetFilteredByMonth.budget) return true;
  return false;
};

export const update = async (input, hasToValidateBudget) => {
  const { error, message, properties, map } = await extractKeyAndValue(
    input,
    hasToValidateBudget,
    true,
  );

  if ((properties.length == 0 || properties.length > 0) && error) {
    console.log(message);
    return;
  }

  let id = 0;
  let amount = 0;
  let description = "";

  map.forEach((item) => {
    id = item.id;
    amount = item?.amount;
    description = item?.description;
  });

  let expenseTrackerData = await readData();

  let index = expenseTrackerData.findIndex((item) => item.id == id);

  if(index == -1) {
    console.log("Id not found, please provide a valid one");
    return;
  }

  if (!amount && !description) {
    console.log("At least one property and value must be provided");
    return;
  }

  if (amount) {
    expenseTrackerData[index].amount = amount;
  }

  if (description) {
    expenseTrackerData[index].description = description;
  }

  if (amount || description) {
    expenseTrackerData[index].date = new Date().toISOString().split("T")[0];
    writeData(expenseTrackerData);

    console.log(`Expense updated successfully (ID: ${id})`);
  }
};

export const remove = async (input) => {
  const { error, message, properties, map } = await extractKeyAndValue(
    input,
    false,
    true,
  );

  if ((properties.length == 0 || properties.length > 0) && error) {
    console.log(message);
    return;
  }

  let id = 0;

  map.forEach((i) => (id = i.id));

  let expenseTrackerData = await readData();

  let index = expenseTrackerData.findIndex((item) => item.id == id);

  if(index == -1) {
    console.log("Id not found, please provide a valid one");
    return;
  }

  expenseTrackerData = expenseTrackerData.filter((e) => e.id != id);
  writeData(expenseTrackerData);
  console.log(`Expense deleted successfully (ID: ${id})`);
};

export const validateInput = (properties, values, messageObject) => {
  let index = 0;
  let i = 0;

  do {
    let value = values[i];

    if (value == null) {
      messageObject.error = true;
      messageObject.message = `The ${properties[i]} should not be empty`;
      return messageObject;
    }

    if (parseInt(value) < 0) {
      messageObject.error = true;
      messageObject.message = `The ${properties[i]} should not be negative`;
      return messageObject;
    }

    i++;
  } while (i < values.length);
  return messageObject;
};
