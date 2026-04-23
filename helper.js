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
    if (error.code == "ENOENT") await saveExpenseTracker([]);
  }

  if (data) expenseTrackerData = JSON.parse(data);
};

const saveExpenseTracker = async (data) => {
  await fs.writeFile(FILE_PATH, JSON.stringify(data), "utf8");
};

const getPropertyAndValue = (
  input,
  property,
  value,
  startWithQuote,
  foundFinalValue,
) => {
  if (input.startsWith("--")) property = input.split("--")[1];
  else {
    if (input.endsWith('"')) {
      value += input;
      startWithQuote = false;
      foundFinalValue = true;
    } else if (input.startsWith('"') || startWithQuote) {
      value += input + " ";
      startWithQuote = true;
    } else {
      value = parseInt(input);
      foundFinalValue = true;
    }
  }

  return {
    property,
    value,
    startWithQuote,
    foundFinalValue,
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
  const replaceSlashAndQuote = isNaN(value)
    ? value.includes('\"')
      ? value.replaceAll('\"', "")
      : value
    : value;

  if (map.has(index)) {
    const valueAtIndex = map.get(index);
    valueAtIndex[property] = replaceSlashAndQuote;
    if (count == countProperties) {
      index = 0;
      count = 0;
    }
  } else {
    map.set(id, {
      [property]: replaceSlashAndQuote,
    });
    index = id;
    count += 1;
  }

  return {
    value,
    property,
    index,
    count,
    countProperties,
  };
};

const clearValues = (value, property, foundFinalValue, startWithQuote) => {
  value = "";
  property = "";
  foundFinalValue = false;
  startWithQuote = false;

  return {
    value,
    property,
    foundFinalValue,
    startWithQuote,
  };
};

const extractKeyAndValue = (input) => {
  const map = new Map();
  let property = "";
  let value = "";
  let startWithQuote = false;
  let foundFinalValue = false;
  let index = 0;

  let countProperties = input.filter((i) => i.startsWith("--")).length;

  let count = 0;

  for (let i = 0; i < input.length; i++) {
    ({ property, value, startWithQuote, foundFinalValue } = getPropertyAndValue(
      input[i],
      property,
      value,
      startWithQuote,
      foundFinalValue,
    ));

    if (foundFinalValue && !startWithQuote) {
      ({ value, property, index, count, countProperties } =
        saveExpenseTrackerOnMap(
          map,
          value,
          property,
          index,
          count,
          countProperties,
          expenseTrackerData.length + 1,
        ));

      ({ value, property, foundFinalValue, startWithQuote } = clearValues(
        value,
        property,
        foundFinalValue,
        startWithQuote,
      ));
    }
  }

  return map;
};

export const add = (input) => {
  const propertyAndValue = extractKeyAndValue(input);

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

  saveExpenseTracker(expenseTrackerData);

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

    summary = summary.filter(
      (s) =>
        s.date.split("-")[1] == (month > 9 ? month : `0${month}`) &&
        s.date.split("-")[0] == new Date().getFullYear(),
    );
  }

  total = summary.reduce((acc, current) => acc + current.amount, 0);
  console.log(
    `Total expenses${value.size > 0 ? ` for ${months.get(month)}` : ""}: $${total}`,
  );
};

export const update = (input) => {
  const value = extractKeyAndValue(input);
  let id = 0;
  let amount = 0;
  let description = "";

  value.forEach((i) => {
    id = i.id;
    amount = i.amount;
    description = i.description;
  });

  let index = expenseTrackerData.findIndex((e) => e.id == id);
  expenseTrackerData[index].amount = amount;
  expenseTrackerData[index].description = description;
  expenseTrackerData[index].date = new Date().toISOString().split("T")[0];

  saveExpenseTracker(expenseTrackerData);
};

export const remove = (input) => {
  const value = extractKeyAndValue(input);
  let id = 0;

  value.forEach((i) => (id = i.id));

  expenseTrackerData = expenseTrackerData.filter((e) => e.id != id);
  saveExpenseTracker(expenseTrackerData);
};
