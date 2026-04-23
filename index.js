import { extractInput, add, list, summary, update, createAndReturnDataFileIfNotExists } from "./helper.js"

const main = async () => {
  process.stdin.on("data", async (data) => {
    const command = extractInput(data)[0];

    switch (command) {
      case "expense-tracker":
        const action = extractInput(data)[1];

        const handler = {
          add: add,
          list: list,
          summary: summary,
          update: update
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


createAndReturnDataFileIfNotExists();
main();
