import fs from "fs/promises";

let expenseTrackerData = [];
const FILE_PATH = "./expense-tracker.json";

const createAndReturnDataFileIfNotExists = async () => {
  let data = "";

  try {
    data = await fs.readFile(FILE_PATH, "utf8");
  } catch (error) {
    if (error.code == "ENOENT") await saveExpenseTracker([]);
  }

  if (data) expenseTrackerData = JSON.parse(data);
};

let i = 0;

const saveExpenseTracker = async (data) => {
  await fs.writeFile(FILE_PATH, JSON.stringify(data), "utf8");
};

const getPropertyAndValue = (input) => {
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
        value = input;
        foundFinalValue = true;
      }
    }
}

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
    if (input[i].startsWith("--")) property = input[i].split("--")[1];
    else {
      if (input[i].endsWith('"')) {
        value += input[i];
        startWithQuote = false;
        foundFinalValue = true;
      } else if (input[i].startsWith('"') || startWithQuote) {
        value += input[i] + " ";
        startWithQuote = true;
      } else {
        value = input[i];
        foundFinalValue = true;
      }
    }

    if (foundFinalValue && !startWithQuote) {
      const replaceSlashAndQuote = value.includes('\"')
        ? value.replaceAll('\"', "")
        : value;

      if (map.has(index)) {
        const valueAtIndex = map.get(index);
        valueAtIndex[property] = replaceSlashAndQuote;
        if (count == countProperties) {
          index = 0;
          count = 0;
        }
      } else {
        map.set(expenseTrackerData.length + 1, {
          [property]: replaceSlashAndQuote,
        });
        index = expenseTrackerData.length + 1;
        count += 1;
      }

      value = "";
      property = "";
      foundFinalValue = false;
      startWithQuote = false;
    }
  }

  return map;
};

const add = (input) => {
  const propertyAndValue = extractKeyAndValue(input);

  propertyAndValue.forEach(
    (value) =>
      (expenseTrackerData = [
        ...expenseTrackerData,
        { ...value, id: expenseTrackerData.length + 1 },
      ]),
  );

  saveExpenseTracker(expenseTrackerData);
};

const main = async () => {
  process.stdin.on("data", async (data) => {
    const command = extractInput(data)[0];

    switch (command) {
      case "expense-tracker":
        const action = extractInput(data)[1];

        const handler = {
          add: add,
        };

        await handler[action]?.(extractInput(data).slice(2));

        break;
      case "exit":
        console.log("Exiting the program...");
        process.exit();
        break;

      default:
        console.log("Undefined command");
    }
  });
};

const extractInput = (data) => {
  return data.toString().trim().split(" ");
};

createAndReturnDataFileIfNotExists();
main();
