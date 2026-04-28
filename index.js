import { extractInput, add, budget, list, summary, filter, filterBudgetByMonth, update, remove, exportCSV, createAndReturnDataFileIfNotExists } from "./helper.js"

const main = async () => {
  process.stdin.on("data", async (data) => {
    const command = extractInput(data)[0];

    switch (command) {
      case "expense-tracker":
        const action = extractInput(data)[1];

        const handler = {
          add: add,
          budget: budget,
          list: list,
          summary: summary,
          filter: filter,
          filterBudget: filterBudgetByMonth,
          update: update,
          delete: remove,
          exportCSV: exportCSV
        };

        await handler[action]?.(extractInput(data).slice(2), (action == "add" || action == "update") ? true : false);

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


createAndReturnDataFileIfNotExists();
main();
