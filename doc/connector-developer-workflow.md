# How to write and test a connector

This document tells you how to write and test a connector for
`governance-connector-framework`. Use this document with WebStorm or
Visual Studio Code. You must have access to the `external-connectors`
repository.

## Technical dictionary

This document uses these technical words. It uses each word for only one
meaning.

| Word | Meaning |
|---|---|
| repository | The `external-connectors` files and their history. |
| editor | WebStorm or Visual Studio Code. |
| terminal | The command line panel in the editor. |
| connector generator | The tool that makes the first files of a connector. |
| connector packager | The tool that builds a connector for use. |
| connector folder | The folder that has the code for one connector. |
| manifest file | The file `manifest.json`. It has data about a connector. |
| operation | An action that a connector can do, for example CREATE or GET. |
| the framework | `governance-connector-framework`. |

## Before you start

Make sure that the computer has Node.js, version 18 or later. Make sure
that the editor is on the computer.

## Step 1: Get the repository

1. Open the terminal.
2. Type this command:

   ```
   git clone <repository-url>
   ```

3. Enter the command.

Git makes a new folder. The folder has the name `external-connectors`.

## Step 2: Open the repository in the editor

1. Start the editor.
2. Use the File menu of the editor.
3. Select "Open."
4. Select the `external-connectors` folder.

The editor shows the files of the repository.

## Step 3: Install the dependencies

1. Open the terminal panel of the editor.
2. Make sure that the terminal path is the `external-connectors` folder.
3. Type this command:

   ```
   npm install
   ```

4. Enter the command.

NOTE: This command gets the packages that the repository needs. It also
gets the framework package from the `vendor` folder of the repository.

## Step 4: Start the connector generator

1. In the terminal, type this command:

   ```
   node scripts/connector-generator.mjs
   ```

2. Enter the command.

CAUTION: Do not send this command through a pipe. Do not send it through
a script. Type it directly in the terminal. If you do not obey this
instruction, the tool can fail.

## Step 5: Answer the questions of the connector generator

The connector generator asks you these questions:

1. The name of the connector.
2. The version of the connector.
3. The type of the connector.
4. The folder for the connector files.
5. The operations for the connector, for example CREATE, GET, UPDATE,
   DELETE, SEARCH, and SYNC.
6. The object classes for the connector, for example `User` and `Group`.
7. The configuration parameters for the connector, for example a URL or
   a key.
8. Three questions about the connector:
    - Is the connector for a system with a connection that stays open?
    - Are the add and remove operations of the connector safe to do two
      times?
    - Can the connector find an object by an equal match of its name?

Type an answer for each question. Enter each answer.

NOTE: Answer "yes" only when you are sure. If you are not sure, answer
"no." The framework uses "no" as the safe answer.

The connector generator makes a new folder. The folder has these files:

- `index.ts`
- `config.ts`
- `package.json`
- `manifest.json`

## Step 6: Examine the files that the connector generator makes

1. In the editor, open the connector folder.
2. Open the file `index.ts`. This file has the code for each operation.
3. Open the file `config.ts`. This file has the code for the
   configuration of the connector.
4. Open the file `manifest.json`. This file has data about the
   connector, for example its name, its version, and its answers to the
   three questions in step 5.

## Step 7: Write the code for each operation

The file `index.ts` has a function for each operation that you selected.
Each function has a TODO comment. The TODO comment shows you where to add
code.

1. Find the TODO comment for one operation.
2. Add the code that sends a request to the target system.
3. Add the code that gets the response from the target system.
4. Add the code that puts the data of the response into the correct
   format.

NOTE: Use the class `ConnectorError` for an error that you can identify.
The framework uses the error code to select the correct action.

5. Do steps 1 thru 4 again for each operation.

## Step 8: Check the code for errors

The editor shows an error below code that is not correct.

1. Correct each error that the editor shows.
2. Open the terminal.
3. Type this command:

   ```
   npx tsc --noEmit
   ```

4. Enter the command.

If the command shows no output, the code is correct.

## Step 9: Build the connector

1. In the terminal, make sure that the path is the `external-connectors`
   folder.
2. Type this command:

   ```
   npm run add-connector -- --src ./<connector-folder> --name <name> --type <type> --version <version> --entry ./index.ts --config ./config.ts
   ```

3. Put the correct values in place of `<connector-folder>`, `<name>`,
   `<type>`, and `<version>`.
4. Enter the command.

The connector packager makes a new folder: `dist/<name>`. This folder has
the built connector.

## Step 10: Make a separate folder to test the connector

1. Make a new folder. Do not put this folder inside the repository.
2. In the terminal, go to the new folder.
3. Type this command:

   ```
   npm init -y
   ```

4. Enter the command.

## Step 11: Install the framework package in the test folder

1. Copy the file `dist/<name>/index.js` from the repository to the test
   folder.
2. Copy the file `dist/<name>/config.js` from the repository to the test
   folder.
3. Copy the framework package file from the `vendor` folder of the
   repository to the test folder.
4. In the terminal, type this command:

   ```
   npm install ./<framework-package-file>
   ```

5. Put the correct file name in place of `<framework-package-file>`.
6. Enter the command.

## Step 12: Write a test script

1. In the test folder, make a new file. Give it the name `test.js`.
2. Add this code to the file:

   ```js
   import { buildConfiguration } from "./config.js";
   import factory from "./index.js";

   const rawConfig = {
     // Add the configuration values of the connector here.
   };

   const config = await buildConfiguration(rawConfig);
   const connector = factory(config);

   const schema = await connector.schema();
   console.log(JSON.stringify(schema, null, 2));
   ```

3. Add the correct configuration values for the connector.

NOTE: This script calls only the function `schema`. This function does
not need a connection to the target system. Use this script to make sure
that the connector loads and starts correctly. To test an operation like
CREATE or GET, add a call to that operation. You will then need correct
access data for the target system.

## Step 13: Start the test script

1. In the terminal, type this command:

   ```
   node test.js
   ```

2. Enter the command.

## Step 14: Read the result

1. Read the output in the terminal.
2. If the output shows the object classes and operations of the
   connector, the connector loads correctly.
3. If the output shows an error, read the error message.

## Step 15: Correct errors

1. If the test shows an error, find the cause of the error in the file
   `index.ts` or `config.ts`.
2. Correct the code.
3. Do steps 8 thru 14 again.
4. Do this until the test shows no error.