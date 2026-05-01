import console from "console";
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

let budgets = [];
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

const getPropertyAndValue = (input, properties, index, values) => {
  let property = input[index].startsWith("--");

  if (property) {
    properties.push(input[index]);

    const next = input[index + 1];

    if (next == undefined || next.startsWith("--")) {
      values.push(null);
      index += 1;
    }
  } else {
    let start = input[index].startsWith('"');
    let end = input[index].endsWith('"');

    if (start && end) {
      values.push(input[index]);
    } else if (start) {
      for (let j = index + 1; j < input.length; j++) {
        const finish = input[j].endsWith('"');

        if (finish) {
          values.push(input.splice(index, j)).join(" ");
          index = index + j;
          break;
        }
      }
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
  const finalValue = replaceSlashAndQuote(value);

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
};

const extractKeyAndValue = (
  input,
  hasToValidateBudget = false,
  isFieldRequired = false,
) => {
  const map = new Map();
  let index = 0;

  let count = 0;
  let isBudgetHigher = false;

  let properties = [];

  let messageObject = {
    error: false,
    message: "",
  };

  let values = [];

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

    isBudgetHigher = validateBudget(month, amount);
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

  return {
    ...messageObject,
    properties,
    map,
  };
};

export const add = (input, hasToValidateBudget) => {
  const { error, message, properties, map } = extractKeyAndValue(
    input,
    hasToValidateBudget,
    true,
  );

  if ((properties.length == 0 || properties.length > 0) && error) {
    console.log(message);
    return;
  }

  const now = new Date();

  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  map.forEach(
    (value) =>
      (expenseTrackerData = [
        ...expenseTrackerData,
        {
          ...value,
          id: expenseTrackerData.length + 1,
          date,
        },
      ]),
  );

  saveInfoInFile(expenseTrackerData);

  console.log(`Expense added successfully (ID: ${expenseTrackerData.length})`);
};

export const exportCSV = async () => {
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
  console.table(toPascalCaseKeys(expenseTrackerData));
};

export const summary = async (input) => {
  const { error, message, properties, map } = extractKeyAndValue(
    input,
    false,
    true,
  );

  let total = 0;
  let month = 0;

  await createAndReturnDataFileIfNotExists();

  let summary = [];
  summary = [...expenseTrackerData];

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
  const { error, message, properties, map } = extractKeyAndValue(
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
  await createAndReturnDataFileIfNotExists();
  let expenseTracker = [...expenseTrackerData];

  let dataFiltered = expenseTracker.filter(
    (item) => item.amount < amount,
  );

  console.log(dataFiltered);
};

export const budget = (input) => {
  const { error, message, properties, map } = extractKeyAndValue(
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

export const filterBudgetByMonth = (input, returnValues = false) => {
  const { error, message, properties, map } = extractKeyAndValue(
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

const validateBudget = (month, amount) => {
  let budgetFilteredByMonth = budgets.find(
    (item) => item.month == months.get(month),
  );

  if (budgetFilteredByMonth.budget == 0) return false;

  let summary = [...expenseTrackerData];

  summary = filterExpenseTrackerByMonthAndYear(summary, month);
  let total = sumAmount(summary) + amount;

  if (total > budgetFilteredByMonth.budget) return true;
  return false;
};

export const update = (input, hasToValidateBudget) => {
  const { error, message, properties, map } = extractKeyAndValue(
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
  if (!amount && !description) {
    console.log("At least one property and value must be provided");
    return;
  }

  let index = expenseTrackerData.findIndex((item) => item.id == id);

  if (amount) {
    expenseTrackerData[index].amount = amount;
  }

  if (description) {
    expenseTrackerData[index].description = description;
  }

  if (amount || description) {
    expenseTrackerData[index].date = new Date().toISOString().split("T")[0];
    saveInfoInFile(expenseTrackerData);

    console.log(`Expense updated successfully (ID: ${id})`);
  }
};

export const remove = (input) => {
  const { error, message, properties, map } = extractKeyAndValue(
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

  expenseTrackerData = expenseTrackerData.filter((e) => e.id != id);
  saveInfoInFile(expenseTrackerData);
  console.log(`Expense deleted successfully (ID: ${id})`);
};

export const validateInput = (properties, values, messageObject) => {
  let index = 0;
  let i = 0;

  do {
    let value = values[i];

    if (
      value != undefined &&
      value != null &&
      !isNaN(value) &&
      parseInt(value) < 0
    ) {
      messageObject.error = true;
      messageObject.message = `The ${properties[i]} should not be negative`;
      return messageObject;
    }

    if (
      value == undefined ||
      value == null ||
      value == "" ||
      value == '""' ||
      value.length == 0
    ) {
      messageObject.error = true;
      messageObject.message = `The ${properties[i]} should not be empty`;
      return messageObject;
    }

    i++;
  } while (i < values.length);
  return messageObject;
};
